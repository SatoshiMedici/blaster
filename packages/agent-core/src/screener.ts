/**
 * Global, plain-code launch screening (docs/ECONOMICS.md recommendation 1). Runs once per tick
 * for the whole platform, not per vault: only launches that pass become `new_launch` /
 * `progress_cross` triggers and appear in the model's market snapshot. This keeps LLM spend
 * proportional to *interesting* launches instead of launches × vaults, and shrinks the prompt.
 */
import type { VenueId } from "@blast-agents/shared";
import type { LaunchView } from "./snapshot.ts";

export type ScreenConfig = {
  /** Curve sells lose this share to the creator burn; above it a round trip is uneconomic. */
  maxSellBurnPct: number;
  /** Skip launches too early to have a market, or too close to graduation to enter. */
  minProgressPct: number;
  maxProgressPct: number;
  /** Real SUI already in the curve. */
  minRealReserveSui: number;
  maxTradeFeePct: number;
  /** Most launches kept in the snapshot (largest real reserve first). Bounds prompt size. */
  maxLaunches: number;
};

export const DEFAULT_SCREEN: ScreenConfig = {
  maxSellBurnPct: 10,
  minProgressPct: 1,
  maxProgressPct: 90,
  minRealReserveSui: 50,
  maxTradeFeePct: 2,
  maxLaunches: 15,
};

export type ScreenResult = { kept: LaunchView[]; rejected: Array<{ launch_id: string; why: string }> };

/**
 * Held launches are always kept, so the agent can always see and sell what it owns. Launches on
 * venues the owner hasn't allowed are dropped (the vault would refuse those buys anyway).
 */
export function screenLaunches(
  launches: LaunchView[],
  heldLaunchIds: ReadonlySet<string>,
  cfg = DEFAULT_SCREEN,
  allowedVenues?: ReadonlySet<VenueId>,
): ScreenResult {
  const rejected: ScreenResult["rejected"] = [];
  const pass: LaunchView[] = [];
  for (const l of launches) {
    if (heldLaunchIds.has(l.launch_id)) {
      pass.push(l);
      continue;
    }
    const why =
      allowedVenues && !allowedVenues.has(l.venue)
        ? "venue not allowed by owner"
        : l.lifecycle !== "Live"
          ? `lifecycle ${l.lifecycle}`
          : l.creator_sell_burn_pct > cfg.maxSellBurnPct
            ? "sell burn too high"
            : l.trade_fee_pct > cfg.maxTradeFeePct
              ? "trade fee too high"
              : l.progress_to_graduation_pct < cfg.minProgressPct
                ? "too early"
                : l.progress_to_graduation_pct > cfg.maxProgressPct
                  ? "too close to graduation"
                  : l.real_reserve_sui < cfg.minRealReserveSui
                    ? "reserve too small"
                    : null;
    if (why) rejected.push({ launch_id: l.launch_id, why });
    else pass.push(l);
  }
  const held = pass.filter((l) => heldLaunchIds.has(l.launch_id));
  const rest = pass
    .filter((l) => !heldLaunchIds.has(l.launch_id))
    .sort((a, b) => b.real_reserve_sui - a.real_reserve_sui || a.launch_id.localeCompare(b.launch_id));
  const room = Math.max(0, cfg.maxLaunches - held.length);
  for (const l of rest.slice(room)) rejected.push({ launch_id: l.launch_id, why: "snapshot full" });
  // Stable order so the serialized snapshot (the cached prompt prefix) is identical across vaults.
  const kept = [...held, ...rest.slice(0, room)].sort((a, b) => a.launch_id.localeCompare(b.launch_id));
  return { kept, rejected };
}
