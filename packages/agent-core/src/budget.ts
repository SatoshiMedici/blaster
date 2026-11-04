/**
 * Spend guards (docs/ECONOMICS.md, SPEC 10). Pure, in-memory state; the worker persists it in
 * Redis in step 5. Every guard fails closed: when in doubt, hold.
 *
 * There is no platform cap on decisions: each vault's budget is the plan its owner chose and
 * prepaid (`quotePlan`). The platform guard exists only as a kill switch for incidents.
 */
import { type PlanQuote, PRICING } from "@blast-agents/shared";

const utcDay = (ms: number) => Math.floor(ms / 86_400_000);

/** Per-vault decision budget for the UTC day, from the owner's plan. Past it, the agent holds. */
export class DecisionBudget {
  readonly #used = new Map<string, { day: number; count: number }>();

  used(vaultId: string, nowMs: number): number {
    const e = this.#used.get(vaultId);
    return e && e.day === utcDay(nowMs) ? e.count : 0;
  }

  remaining(vaultId: string, budget: number, nowMs: number): number {
    return Math.max(0, budget - this.used(vaultId, nowMs));
  }

  /** Reserves one decision against `budget` (the plan's decisions per day); false means hold. */
  tryConsume(vaultId: string, budget: number, nowMs: number): boolean {
    const count = this.used(vaultId, nowMs);
    if (count >= budget) return false;
    this.#used.set(vaultId, { day: utcDay(nowMs), count: count + 1 });
    return true;
  }
}

/**
 * Per-vault AI dollar ceiling per UTC day: the cost the plan's price was built on, plus headroom.
 * A backstop against runaway loops or a model whose real cost exceeds its catalog price.
 */
export class VaultSpendLedger {
  readonly #spent = new Map<string, { day: number; usd: number }>();

  /** The ceiling for a plan: its expected daily cost × `headroom`. */
  static ceilingFor(plan: Pick<PlanQuote, "costUsdPerDay">, headroom = 1.25): number {
    return plan.costUsdPerDay * headroom;
  }

  spentToday(vaultId: string, nowMs: number): number {
    const e = this.#spent.get(vaultId);
    return e && e.day === utcDay(nowMs) ? e.usd : 0;
  }

  allow(vaultId: string, ceilingUsd: number, nowMs: number): boolean {
    return this.spentToday(vaultId, nowMs) < ceilingUsd;
  }

  record(vaultId: string, costUsd: number, nowMs: number): void {
    this.#spent.set(vaultId, { day: utcDay(nowMs), usd: this.spentToday(vaultId, nowMs) + costUsd });
  }
}

export type GuardState = "open" | "budget_exhausted" | "killed" | "out_of_credits";

/**
 * Platform kill switch: trips on a daily platform AI budget (an incident ceiling, set well above
 * the sum of prepaid plans), on a manual kill, or on an OpenRouter 402 (empty balance). Budget
 * trips reset on the next UTC day; kills and out-of-credits need an operator to `reset()`.
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

/** Low-credit alert at about 7 days of spend. */
export function creditRunway(args: { creditsRemainingUsd: number; trailingDailySpendUsd: number; alertDays?: number }) {
  const days =
    args.trailingDailySpendUsd > 0 ? args.creditsRemainingUsd / args.trailingDailySpendUsd : Number.POSITIVE_INFINITY;
  return { daysLeft: days, alert: days < (args.alertDays ?? 7) };
}

/**
 * Cache-hit floor to alarm on: 80% of the best possible (k−1)/k for `k` decisions sharing a tick's
 * snapshot on one model. Below it, caching is silently failing.
 */
export function cacheHitAlarmFloor(decisionsPerTickPerModel: number): number {
  return decisionsPerTickPerModel <= 1 ? 0 : 0.8 * ((decisionsPerTickPerModel - 1) / decisionsPerTickPerModel);
}

export type CostAlarm = "referred_margin" | "cost_above_pricing" | "cache_hit_rate";

/**
 * Rolling cost monitor for one model. Compares the measured cost per decision with the cost its
 * price was built on (`decisionCostUsd`) and alarms when:
 * - `referred_margin`: the margin on a referred user, at measured cost, falls under `minReferredMargin` (20%);
 * - `cost_above_pricing`: measured cost exceeds the pricing assumption (re-price before it bites);
 * - `cache_hit_rate`: caching is failing (a silent ~2× cost increase on premium models).
 */
export class CostMonitor {
  #n = 0;
  #costUsd = 0;
  #inputTokens = 0;
  #cachedTokens = 0;

  constructor(
    readonly opts: {
      /** Cost per decision (AI + gas) the model's price assumes. */
      pricedCostPerDecisionUsd: number;
      /** Gas share of that cost, added to the measured AI cost. */
      gasUsdPerDecision?: number;
      minReferredMargin?: number;
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
    const gas = this.opts.gasUsdPerDecision ?? PRICING.gasUsdPerDecision;
    const measured = this.#n ? this.#costUsd / this.#n + gas : 0;
    const cacheHitRate = this.#inputTokens ? this.#cachedTokens / this.#inputTokens : 0;
    // The price per decision implied by the pricing rule for this cost assumption.
    const keep = 1 - PRICING.referralShare - PRICING.minMarginAfterReferral;
    const pricePerDecision = this.opts.pricedCostPerDecisionUsd / keep;
    const referredMargin = measured
      ? (pricePerDecision * (1 - PRICING.referralShare) - measured) / pricePerDecision
      : 1;
    const alarms: CostAlarm[] = [];
    if (this.#n >= (this.opts.minSample ?? 50)) {
      if (referredMargin < (this.opts.minReferredMargin ?? 0.2)) alarms.push("referred_margin");
      if (measured > this.opts.pricedCostPerDecisionUsd) alarms.push("cost_above_pricing");
      if (cacheHitRate < this.opts.minCacheHitRate) alarms.push("cache_hit_rate");
    }
    return { decisions: this.#n, measuredCostPerDecisionUsd: measured, cacheHitRate, referredMargin, alarms };
  }
}
