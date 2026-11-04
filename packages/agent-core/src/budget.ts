/**
 * Spend guards (SPEC 1b cost controls 2 and 4, SPEC 10). Pure, in-memory state; the worker
 * persists it in Redis in step 5. Every guard fails closed: when in doubt, hold.
 */
import { costAlarmThresholdUsd, maxDecisionsForMargin, PRICING } from "@blast-agents/shared";

const utcDay = (ms: number) => Math.floor(ms / 86_400_000);

/** Hard cap: N AI decisions per vault per UTC day (SPEC 1b: 30). Past it, the agent holds. */
export class DecisionCap {
  readonly #used = new Map<string, { day: number; count: number }>();
  constructor(public cap = 30) {}

  remaining(vaultId: string, nowMs: number): number {
    const e = this.#used.get(vaultId);
    return e && e.day === utcDay(nowMs) ? Math.max(0, this.cap - e.count) : this.cap;
  }

  /** Reserves one decision; false means hold until tomorrow. */
  tryConsume(vaultId: string, nowMs: number): boolean {
    const day = utcDay(nowMs);
    const e = this.#used.get(vaultId);
    const count = e && e.day === day ? e.count : 0;
    if (count >= this.cap) return false;
    this.#used.set(vaultId, { day, count: count + 1 });
    return true;
  }
}

/**
 * Per-vault AI dollar ceiling per UTC day, from measured `usage` (docs/ECONOMICS.md
 * recommendation 5). A backstop against runaway loops that doesn't rely on decision counts:
 * at the default $0.45, a capped day still keeps the 30% margin on a $0.99 fee with gas.
 */
export class VaultSpendLedger {
  readonly #spent = new Map<string, { day: number; usd: number }>();
  constructor(public ceilingUsd = 0.45) {}

  spentToday(vaultId: string, nowMs: number): number {
    const e = this.#spent.get(vaultId);
    return e && e.day === utcDay(nowMs) ? e.usd : 0;
  }

  allow(vaultId: string, nowMs: number): boolean {
    return this.spentToday(vaultId, nowMs) < this.ceilingUsd;
  }

  record(vaultId: string, costUsd: number, nowMs: number): void {
    this.#spent.set(vaultId, { day: utcDay(nowMs), usd: this.spentToday(vaultId, nowMs) + costUsd });
  }
}

export type GuardState = "open" | "budget_exhausted" | "killed" | "out_of_credits";

/**
 * Platform-wide guard: a daily AI budget with a kill switch. Trips on the budget, on a manual
 * kill, or on an OpenRouter 402 (empty balance). Budget trips reset on the next UTC day; kills
 * and out-of-credits need an operator to `reset()`.
 */
export class PlatformSpendGuard {
  #day = -1;
  #spentUsd = 0;
  #state: GuardState = "open";
  constructor(public dailyBudgetUsd: number) {}

  #roll(nowMs: number) {
    const d = utcDay(nowMs);
    if (d !== this.#day) {
      this.#day = d;
      this.#spentUsd = 0;
      if (this.#state === "budget_exhausted") this.#state = "open";
    }
  }

  allow(nowMs: number): boolean {
    this.#roll(nowMs);
    return this.#state === "open";
  }

  record(costUsd: number, nowMs: number): void {
    this.#roll(nowMs);
    this.#spentUsd += costUsd;
    if (this.#state === "open" && this.#spentUsd >= this.dailyBudgetUsd) this.#state = "budget_exhausted";
  }

  kill(reason: "killed" | "out_of_credits" = "killed") {
    this.#state = reason;
  }

  reset() {
    this.#state = "open";
  }

  status(nowMs: number) {
    this.#roll(nowMs);
    return { state: this.#state, spentTodayUsd: this.#spentUsd, budgetUsd: this.dailyBudgetUsd };
  }
}

/**
 * What the worker does after a failed model call. Every failure is already a hold; an empty
 * OpenRouter balance (402) also stops all calls platform-wide until an operator tops up.
 */
export function onModelFailure(guard: PlatformSpendGuard, failure: string): "hold" | "hold_and_stop_all" {
  if (failure === "out_of_credits") {
    guard.kill("out_of_credits");
    return "hold_and_stop_all";
  }
  return "hold";
}

/**
 * Cache-hit floor to alarm on: 80% of the best possible (k−1)/k for `k` decisions sharing a tick's
 * snapshot on one model. Below it, caching is silently failing.
 */
export function cacheHitAlarmFloor(decisionsPerTickPerModel: number): number {
  return decisionsPerTickPerModel <= 1 ? 0 : 0.8 * ((decisionsPerTickPerModel - 1) / decisionsPerTickPerModel);
}

/** Low-credit alert (SPEC 1b: at ~7 days of spend). */
export function creditRunway(args: { creditsRemainingUsd: number; trailingDailySpendUsd: number; alertDays?: number }) {
  const days =
    args.trailingDailySpendUsd > 0 ? args.creditsRemainingUsd / args.trailingDailySpendUsd : Number.POSITIVE_INFINITY;
  return { daysLeft: days, alert: days < (args.alertDays ?? 7) };
}

export type CostAlarm = "cost_per_decision" | "cache_hit_rate" | "decision_cap_lowered";

/**
 * Rolling cost monitor. Alarms when the average cost per decision passes the level that keeps the
 * pricing rule (30% worst-case margin at the cap), or when the cache hit rate falls under a floor:
 * a silent cache failure roughly doubles AI cost but would stay under a flat $0.022 alarm.
 * It also returns the decision cap the worker should use given measured costs.
 */
export class CostMonitor {
  #n = 0;
  #costUsd = 0;
  #inputTokens = 0;
  #cachedTokens = 0;

  constructor(
    readonly opts: {
      feeUsd?: number;
      decisionCap: number;
      gasUsdAtCap: number;
      minCacheHitRate: number;
      /** Ignore alarms until this many decisions are in the window. */
      minSample?: number;
    },
  ) {}

  record(u: { costUsd: number; inputTokens: number; cachedTokens: number }) {
    this.#n += 1;
    this.#costUsd += u.costUsd;
    this.#inputTokens += u.inputTokens;
    this.#cachedTokens += u.cachedTokens;
  }

  report() {
    const feeUsd = this.opts.feeUsd ?? PRICING.feeUsdPerDay;
    const avgCostUsd = this.#n ? this.#costUsd / this.#n : 0;
    const cacheHitRate = this.#inputTokens ? this.#cachedTokens / this.#inputTokens : 0;
    const thresholdUsd = costAlarmThresholdUsd({
      feeUsd,
      decisionCap: this.opts.decisionCap,
      gasUsdAtCap: this.opts.gasUsdAtCap,
    });
    const recommendedCap = avgCostUsd
      ? Math.min(
          this.opts.decisionCap,
          maxDecisionsForMargin({ feeUsd, costPerDecisionUsd: avgCostUsd, gasUsdAtCap: this.opts.gasUsdAtCap }),
        )
      : this.opts.decisionCap;
    const alarms: CostAlarm[] = [];
    if (this.#n >= (this.opts.minSample ?? 50)) {
      if (avgCostUsd > thresholdUsd) alarms.push("cost_per_decision");
      if (cacheHitRate < this.opts.minCacheHitRate) alarms.push("cache_hit_rate");
      if (recommendedCap < this.opts.decisionCap) alarms.push("decision_cap_lowered");
    }
    return { decisions: this.#n, avgCostUsd, cacheHitRate, thresholdUsd, recommendedCap, alarms };
  }
}
