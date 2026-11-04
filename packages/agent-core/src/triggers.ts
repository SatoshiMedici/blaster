/**
 * Rule-based triggers (SPEC 1b cost control 1, SPEC 6 cadence): plain code watches the market
 * every 60 s and calls the model only when something relevant changed for this vault.
 *
 * Triggers:
 * - `vault_created`: the first decision (SPEC 3.1: the first decision within about a minute)
 * - `new_launch`: a tradable launch this vault hasn't been shown yet
 * - `progress_cross`: a launch's curve crossed 50% or 80% since the vault last decided
 * - `position_move`: a held position's value moved more than 10% since the last decision
 * - `scheduled`: 4 hours since the last decision
 *
 * Cost note (docs/ECONOMICS.md): new launches arrive for every vault at once, so they would burn
 * the daily decision cap early. Non-urgent triggers are therefore coalesced: they wait until
 * `minGapMs` after the last decision, and the next decision covers all launches seen meanwhile.
 * `vault_created` and `position_move` are urgent and skip the gap (risk on held money).
 */

export type TriggerReason = "vault_created" | "new_launch" | "progress_cross" | "position_move" | "scheduled";

export const URGENT_TRIGGERS: ReadonlySet<TriggerReason> = new Set(["vault_created", "position_move"]);

export type TriggerConfig = {
  progressThresholdsPct: number[];
  positionMovePct: number;
  scheduledEveryMs: number;
  /** Minimum time between decisions for non-urgent triggers (coalescing window). */
  minGapMs: number;
};

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  progressThresholdsPct: [50, 80],
  positionMovePct: 10,
  scheduledEveryMs: 4 * 60 * 60_000,
  minGapMs: 30 * 60_000,
};

/** What the vault "knew" at its last decision. Persisted per vault (Redis/Postgres in step 5). */
export type VaultTriggerState = {
  lastDecisionAtMs: number | null;
  seenLaunchIds: string[];
  /** Launch progress (%) at the last decision. */
  progressAtDecision: Record<string, number>;
  /** Held position values (SUI) at the last decision. */
  positionValueAtDecision: Record<string, number>;
};

export const initialTriggerState = (): VaultTriggerState => ({
  lastDecisionAtMs: null,
  seenLaunchIds: [],
  progressAtDecision: {},
  positionValueAtDecision: {},
});

export type MarketView = Array<{ launch_id: string; progress_to_graduation_pct: number }>;
export type PositionsView = Array<{ launch_id: string; value_sui: number }>;

export type TriggerResult = {
  /** Call the model now. */
  fire: boolean;
  /** Everything that changed since the last decision. */
  reasons: TriggerReason[];
  /** Non-empty when triggers exist but the coalescing gap holds them back. */
  waitingForGap: boolean;
};

export function evaluateTriggers(
  state: VaultTriggerState,
  market: MarketView,
  positions: PositionsView,
  nowMs: number,
  cfg: TriggerConfig = DEFAULT_TRIGGER_CONFIG,
): TriggerResult {
  const reasons = new Set<TriggerReason>();
  if (state.lastDecisionAtMs === null) reasons.add("vault_created");

  const seen = new Set(state.seenLaunchIds);
  for (const l of market) {
    if (!seen.has(l.launch_id)) reasons.add("new_launch");
    const before = state.progressAtDecision[l.launch_id];
    if (
      before !== undefined &&
      cfg.progressThresholdsPct.some((t) => before < t && l.progress_to_graduation_pct >= t)
    ) {
      reasons.add("progress_cross");
    }
  }

  for (const p of positions) {
    const before = state.positionValueAtDecision[p.launch_id];
    if (before === undefined || before <= 0) continue;
    if ((Math.abs(p.value_sui - before) / before) * 100 > cfg.positionMovePct) reasons.add("position_move");
  }

  if (state.lastDecisionAtMs !== null && nowMs - state.lastDecisionAtMs >= cfg.scheduledEveryMs)
    reasons.add("scheduled");

  const list = [...reasons];
  const urgent = list.some((r) => URGENT_TRIGGERS.has(r));
  const gapOpen = state.lastDecisionAtMs === null || nowMs - state.lastDecisionAtMs >= cfg.minGapMs;
  const fire = list.length > 0 && (urgent || gapOpen);
  return { fire, reasons: list, waitingForGap: list.length > 0 && !fire };
}

/** State after a decision ran on this snapshot (also after a hold: the model saw it). */
export function recordDecision(
  market: MarketView,
  positions: PositionsView,
  nowMs: number,
  prev: VaultTriggerState,
): VaultTriggerState {
  const live = new Set(market.map((l) => l.launch_id));
  return {
    lastDecisionAtMs: nowMs,
    // Keep only ids still in the market so the state stays small.
    seenLaunchIds: [...new Set([...prev.seenLaunchIds.filter((id) => live.has(id)), ...live])],
    progressAtDecision: Object.fromEntries(market.map((l) => [l.launch_id, l.progress_to_graduation_pct])),
    positionValueAtDecision: Object.fromEntries(positions.map((p) => [p.launch_id, p.value_sui])),
  };
}
