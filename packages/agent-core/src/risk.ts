import { launchpad } from "./chain.ts";
import { LIMITS } from "./config.ts";
import type { Market } from "./snapshot.ts";
import { suiToMist } from "./snapshot.ts";
import type { Action } from "./traders.ts";

export type Order =
  | { kind: "buy"; launchId: string; quoteMist: bigint; minMemeOut: bigint; reason: string }
  | { kind: "join"; launchId: string; quoteMist: bigint; reason: string }
  | { kind: "sell"; launchId: string; memeAmount: bigint; minQuoteOut: bigint; reason: string };

export type Verdict = { action: Action; order?: Order; rejected?: string };

const BPS = 10_000n;
const lessSlippage = (amount: bigint) => (amount * (BPS - LIMITS.slippageBps)) / BPS;

/**
 * Plain code, no AI: turns each proposed action into an order or a rejection.
 * Sizes are clamped, never raised; anything unclear is rejected.
 */
export async function check(
  actions: Action[],
  ctx: {
    market: Market;
    spendableMist: bigint;
    spentTodayMist: bigint;
    positionMist: Map<string, bigint>;
    tokens: Map<string, bigint>;
    halted: boolean;
  },
): Promise<Verdict[]> {
  const verdicts: Verdict[] = [];
  let spendable = ctx.spendableMist;
  let spentToday = ctx.spentTodayMist;
  let openPositions = [...ctx.tokens.values()].filter((t) => t > 0n).length;

  for (const [i, action] of actions.entries()) {
    const reject = (rejected: string) => verdicts.push({ action, rejected });
    if (i >= LIMITS.maxActionsPerTick) {
      reject("too many actions this tick");
      continue;
    }
    const launch = ctx.market.states.get(action.launch_id);
    if (!launch) {
      reject("launch not in market snapshot");
      continue;
    }

    if (action.action === "sell") {
      const held = ctx.tokens.get(action.launch_id) ?? 0n;
      const fraction = Math.min(Math.max(action.sell_fraction, 0), 1);
      const amount = (held * BigInt(Math.floor(fraction * 10_000))) / BPS;
      if (launch.lifecycle !== "Live") {
        reject(`launch is ${launch.lifecycle}`);
        continue;
      }
      if (amount === 0n) {
        reject("nothing to sell");
        continue;
      }
      const preview = await launchpad.previewSell(action.launch_id, amount).catch(() => null);
      if (!preview || preview.quoteOutNet === 0n) {
        reject("sell would return nothing");
        continue;
      }
      verdicts.push({
        action,
        order: {
          kind: "sell",
          launchId: launch.objectId,
          memeAmount: amount,
          minQuoteOut: lessSlippage(preview.quoteOutNet),
          reason: action.reason,
        },
      });
      continue;
    }

    // buy / join: spending SUI
    if (ctx.halted) {
      reject("drawdown limit hit: buying is halted");
      continue;
    }
    if (launch.sellBurnBps > LIMITS.maxSellBurnBps) {
      reject("creator sell burn too high");
      continue;
    }
    let spend = suiToMist(Math.max(action.amount_sui, 0));
    const inPosition = ctx.positionMist.get(action.launch_id) ?? 0n;
    const caps = [
      LIMITS.maxTradeMist,
      LIMITS.maxPositionMist - inPosition,
      LIMITS.maxDailySpendMist - spentToday,
      spendable,
    ];
    for (const cap of caps) if (spend > cap) spend = cap;
    if (spend <= 0n) {
      reject("no budget left under the limits");
      continue;
    }
    const isNew = inPosition === 0n && !ctx.tokens.get(action.launch_id);
    if (isNew && openPositions >= LIMITS.maxOpenPositions) {
      reject("max open positions");
      continue;
    }

    if (action.action === "join_opening_round") {
      if (launch.lifecycle !== "OpeningRound") {
        reject(`launch is ${launch.lifecycle}`);
        continue;
      }
      verdicts.push({
        action,
        order: { kind: "join", launchId: launch.objectId, quoteMist: spend, reason: action.reason },
      });
    } else {
      if (launch.lifecycle !== "Live") {
        reject(`launch is ${launch.lifecycle}`);
        continue;
      }
      const preview = await launchpad.previewBuy(action.launch_id, spend).catch(() => null);
      if (!preview || preview.memeOutNet === 0n) {
        reject("buy would return nothing");
        continue;
      }
      verdicts.push({
        action,
        order: {
          kind: "buy",
          launchId: launch.objectId,
          quoteMist: spend,
          minMemeOut: lessSlippage(preview.memeOutNet),
          reason: action.reason,
        },
      });
    }
    spendable -= spend;
    spentToday += spend;
    if (isNew) openPositions += 1;
  }
  return verdicts;
}
