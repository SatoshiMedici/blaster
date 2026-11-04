import type { VenueId } from "@blast-agents/shared";
import { launchProgressBps } from "@interest-protocol/blast-launchpad-sdk/market-data";
import type { LaunchState } from "@interest-protocol/blast-launchpad-sdk/state";
import { normalizeStructTag } from "@mysten/sui/utils";
import { balanceOf, client, getLaunches, launchpad, recentLaunchIds } from "./chain.ts";
import { LIMITS, MAX_LAUNCHES_IN_SNAPSHOT, MIST_PER_SUI, SUI_TYPE } from "./config.ts";

const toSui = (mist: bigint): number => Number(mist) / 1e9;
const pct = (bps: bigint): number => Number(bps) / 100;

/** What both models see about one launch. Name and symbol are written by creators: untrusted. */
export type LaunchView = {
  launch_id: string;
  /** Which launchpad this launch trades on. */
  venue: VenueId;
  untrusted_symbol: string;
  untrusted_name: string;
  lifecycle: LaunchState["lifecycle"];
  minutes_since_public: number | null;
  progress_to_graduation_pct: number;
  fdv_sui: number;
  real_reserve_sui: number;
  graduation_target_sui: number;
  trade_fee_pct: number;
  creator_sell_burn_pct: number;
  opening_round: { seconds_left: number; pot_sui: number } | null;
  /** Creator bought before the public could (only possible without an opening round). */
  had_opening_round: boolean;
};

export type PositionView = { launch_id: string; tokens: string; value_sui: number };

export type AgentView = {
  sui_balance: number;
  spendable_sui: number;
  positions: PositionView[];
  spent_today_sui: number;
};

/** One market snapshot, shared by both agents so the comparison is fair. */
/** `json` is the serialized launches, built once per tick so every agent's prompt prefix is identical (prompt caching). */
export type Market = { at: string; launches: LaunchView[]; json: string; states: Map<string, LaunchState> };

const metadataCache = new Map<string, { symbol: string; name: string }>();
async function metadata(coinType: string) {
  const cached = metadataCache.get(coinType);
  if (cached) return cached;
  const { coinMetadata } = await client.core.getCoinMetadata({ coinType });
  const value = {
    symbol: (coinMetadata?.symbol ?? "?").slice(0, 16),
    name: (coinMetadata?.name ?? "?").slice(0, 40),
  };
  metadataCache.set(coinType, value);
  return value;
}

export async function readMarket(now = Date.now()): Promise<Market> {
  const ids = await recentLaunchIds(MAX_LAUNCHES_IN_SNAPSHOT);
  const all = await getLaunches(ids);
  // Only SUI-quoted launches that can still be traded or joined.
  const tradable = all.filter(
    (l) =>
      normalizeStructTag(l.quoteType) === normalizeStructTag(SUI_TYPE) &&
      (l.lifecycle === "Live" || l.lifecycle === "OpeningRound"),
  );
  const states = new Map(tradable.map((l) => [l.objectId, l]));
  const launches = await Promise.all(
    tradable.map(async (l): Promise<LaunchView> => {
      const meta = await metadata(l.memeType);
      const roundEnd = l.publicStartMs === null ? null : l.publicStartMs + l.openingRoundMs;
      return {
        launch_id: l.objectId,
        venue: "blast",
        untrusted_symbol: meta.symbol,
        untrusted_name: meta.name,
        lifecycle: l.lifecycle,
        minutes_since_public: l.publicStartMs === null ? null : Math.floor((now - Number(l.publicStartMs)) / 60_000),
        progress_to_graduation_pct: pct(launchProgressBps(l)),
        fdv_sui:
          l.memeReserve === 0n ? 0 : toSui(((l.virtualQuote + l.realQuoteReserve) * l.atomicSupply) / l.memeReserve),
        real_reserve_sui: toSui(l.realQuoteReserve),
        graduation_target_sui: toSui(l.graduationTarget),
        trade_fee_pct: pct(l.quoteFeeBps),
        creator_sell_burn_pct: pct(l.sellBurnBps),
        opening_round:
          l.lifecycle === "OpeningRound" && roundEnd !== null
            ? {
                seconds_left: Math.max(0, Math.floor((Number(roundEnd) - now) / 1000)),
                pot_sui: toSui(l.openingRoundQuote),
              }
            : null,
        had_opening_round: l.openingRoundMs > 0n,
      };
    }),
  );
  launches.sort((a, b) => a.launch_id.localeCompare(b.launch_id));
  return { at: new Date(now).toISOString(), launches, json: JSON.stringify(launches), states };
}

/** The agent's own wallet: SUI and every launch it holds, valued at an executable curve sell. */
export async function readAgent(
  address: string,
  market: Market,
  heldLaunchIds: Iterable<string>,
  spentTodayMist: bigint,
): Promise<{ view: AgentView; positionMist: Map<string, bigint>; tokens: Map<string, bigint> }> {
  const sui = await balanceOf(address);
  const positionMist = new Map<string, bigint>();
  const tokens = new Map<string, bigint>();
  const positions: PositionView[] = [];
  for (const id of new Set(heldLaunchIds)) {
    const state = market.states.get(id) ?? (await launchpad.getLaunch(id).catch(() => undefined));
    if (!state) continue;
    const held = await balanceOf(address, state.memeType);
    if (held === 0n) continue;
    tokens.set(id, held);
    let value = 0n;
    if (state.lifecycle === "Live") {
      value = await launchpad
        .previewSell(id, held)
        .then((p) => p.quoteOutNet)
        .catch(() => 0n);
    }
    positionMist.set(id, value);
    positions.push({ launch_id: id, tokens: held.toString(), value_sui: toSui(value) });
  }
  const spendable = sui > LIMITS.gasReserveMist ? sui - LIMITS.gasReserveMist : 0n;
  return {
    view: {
      sui_balance: toSui(sui),
      spendable_sui: toSui(spendable),
      positions,
      spent_today_sui: toSui(spentTodayMist),
    },
    positionMist,
    tokens,
  };
}

export const suiToMist = (sui: number): bigint => BigInt(Math.floor(sui * Number(MIST_PER_SUI)));
