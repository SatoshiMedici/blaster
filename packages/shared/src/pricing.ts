/**
 * Pricing (SPEC 1b as revised; docs/ECONOMICS.md). Pure functions; no I/O.
 *
 * The user picks a model and an activity level. The daily price is derived from what that plan
 * costs us, so every plan pays for its model calls and gas and still leaves a margin after the 30%
 * referral share:
 *
 *   daily price = (decisions/day × cost per decision + gas per day) / (1 − referral − margin)
 *
 * There is no minimum deposit and no platform cap on decisions: the user's plan is the budget.
 * Small vaults are protected by showing the fee as a yearly share of the vault and recommending
 * the most active plan that stays under a sensible share, not by refusing them.
 *
 * Money rules: USD as integer micro-dollars, SUI as MIST; fees round down when converted to SUI
 * (never overcharge) and prices round up to the cent when quoted (never sell below cost).
 */
import {
  ACTIVITY_LEVELS,
  type ActivityChoice,
  type ActivityLevel,
  CUSTOM_DECISIONS_RANGE,
  resolveActivity,
} from "./activity.ts";
import { costPerDecisionUsd, OPENROUTER_FEE } from "./economics.ts";
import { type CatalogModel, catalogModel } from "./models.ts";

export const PRICING = {
  /** Share of collected fees paid to the user's referrer (owner decision). */
  referralShare: 0.3,
  /** Margin kept on a referred user's fee after the referral payout and all variable costs. */
  minMarginAfterReferral: 0.3,
  /** Cache hit rate assumed when pricing. Conservative: real rates at scale are 80–95%. */
  pricingCacheHitRate: 0.5,
  /** OpenRouter credit fee (USDC top-ups). */
  openRouterFee: OPENROUTER_FEE.crypto,
  /** Gas: a Blast trade through the vault costs ~$0.001–0.007; assume one trade per two decisions at $0.005. */
  gasUsdPerDecision: 0.0025,
  /** The daily `charge_fee` transaction (batched) and other per-day overhead. */
  gasUsdPerDay: 0.002,
  /** Smallest daily price (covers per-vault RPC, indexing and payments overhead). */
  minDailyPriceUsd: 0.02,
  /** Free trial: days, once per wallet; the trial runs at most this activity. */
  trialDays: 3,
  trialMaxDecisionsPerDay: 24,
  /**
   * On-chain `daily_fee_cap` = this × the plan's daily price in SUI at approval. 3× absorbs a 67%
   * SUI fall (a 2× cap binds for ~20% of vaults within 6 months; 3× for ~5%) and leaves room to
   * raise activity without a new signature. We still charge only the plan's USD price each day.
   */
  feeCapMultiplier: 3,
  /** Fee-drag bands for the Choose screen, as a yearly share of the vault value. */
  feeDrag: { comfortable: 0.1, high: 0.3 },
} as const;

export type PricingPolicy = typeof PRICING;

const MIST_PER_SUI = 1_000_000_000n;

const toMicros = (usd: number): bigint => {
  if (!Number.isFinite(usd) || usd < 0) throw new Error(`invalid USD amount: ${usd}`);
  return BigInt(Math.round(usd * 1e6));
};

const ceilCents = (usd: number) => Math.ceil(usd * 100 - 1e-9) / 100;

// === Plan prices ===

/** Our variable cost of one decision on `model`: AI (at the pricing cache-hit rate) plus gas. */
export function decisionCostUsd(model: CatalogModel, policy: PricingPolicy = PRICING): number {
  const ai = costPerDecisionUsd({
    price: model.price,
    cacheHitRate: policy.pricingCacheHitRate,
    platformFee: policy.openRouterFee,
  });
  return ai + policy.gasUsdPerDecision;
}

export type PlanQuote = {
  modelKey: string;
  activity: ActivityLevel;
  /** Our expected variable cost per day if the whole budget is used. */
  costUsdPerDay: number;
  /** What the user pays per day while running, rounded up to the cent. */
  priceUsdPerDay: number;
  /** Price per decision the user effectively pays (for the Choose screen). */
  priceUsdPerDecision: number;
  /** Our margin on a referred user (worst case) and on a direct user. */
  marginReferred: number;
  marginDirect: number;
};

/** The daily price of a plan (model × activity). */
export function quotePlan(modelKey: string, activity: ActivityChoice, policy: PricingPolicy = PRICING): PlanQuote {
  const model = catalogModel(modelKey);
  const level = resolveActivity(activity);
  const costUsdPerDay = level.decisionsPerDay * decisionCostUsd(model, policy) + policy.gasUsdPerDay;
  const keep = 1 - policy.referralShare - policy.minMarginAfterReferral;
  if (keep <= 0) throw new Error("referral share + margin must be below 100%");
  const priceUsdPerDay = ceilCents(Math.max(policy.minDailyPriceUsd, costUsdPerDay / keep));
  return {
    modelKey,
    activity: level,
    costUsdPerDay,
    priceUsdPerDay,
    priceUsdPerDecision: priceUsdPerDay / level.decisionsPerDay,
    marginReferred: (priceUsdPerDay * (1 - policy.referralShare) - costUsdPerDay) / priceUsdPerDay,
    marginDirect: (priceUsdPerDay - costUsdPerDay) / priceUsdPerDay,
  };
}

// === Fee drag (protecting small vaults without a minimum deposit) ===

export type FeeDrag = { annualShare: number; band: "comfortable" | "high" | "extreme" };

/** The plan's fee as a yearly share of the vault, and how the Choose screen should flag it. */
export function feeDrag(priceUsdPerDay: number, vaultUsd: number, policy: PricingPolicy = PRICING): FeeDrag {
  const annualShare = vaultUsd > 0 ? (priceUsdPerDay * 365) / vaultUsd : Number.POSITIVE_INFINITY;
  const band =
    annualShare <= policy.feeDrag.comfortable ? "comfortable" : annualShare <= policy.feeDrag.high ? "high" : "extreme";
  return { annualShare, band };
}

/**
 * The most active plan whose fee stays within `maxAnnualShare` of the vault per year (default: the
 * "comfortable" band). Tries the presets from most to least active, then the largest custom budget
 * that fits. The Choose screen preselects it; the user may still pick any plan. Returns null only
 * when even one decision a day costs more than the share (then: cheaper model or larger deposit).
 */
export function recommendPlan(
  modelKey: string,
  vaultUsd: number,
  maxAnnualShare: number = PRICING.feeDrag.comfortable,
  policy: PricingPolicy = PRICING,
): PlanQuote | null {
  const fits = (q: PlanQuote) => feeDrag(q.priceUsdPerDay, vaultUsd, policy).annualShare <= maxAnnualShare;
  for (const level of ["intense", "active", "steady", "watchful"] as const) {
    const q = quotePlan(modelKey, { level }, policy);
    if (fits(q)) return q;
  }
  // Largest custom budget under the share: invert the price formula, then confirm with a quote.
  const maxPrice = (maxAnnualShare * vaultUsd) / 365;
  const keep = 1 - policy.referralShare - policy.minMarginAfterReferral;
  const n = Math.min(
    ACTIVITY_LEVELS.watchful.decisionsPerDay - 1,
    Math.floor((maxPrice * keep - policy.gasUsdPerDay) / decisionCostUsd(catalogModel(modelKey), policy)),
  );
  for (let d = n; d >= CUSTOM_DECISIONS_RANGE.min; d--) {
    const q = quotePlan(modelKey, { level: "custom", decisionsPerDay: d }, policy);
    if (fits(q)) return q;
  }
  return null;
}

// === SUI conversion and the on-chain fee cap ===

/** USD → MIST at `suiUsd` dollars per SUI, rounded down. */
export function usdToMist(usd: number, suiUsd: number): bigint {
  const price = toMicros(suiUsd);
  if (price === 0n) throw new Error("SUI price must be positive");
  return (toMicros(usd) * MIST_PER_SUI) / price;
}

/** MIST → USD at `suiUsd`, for display and accounting. */
export function mistToUsd(mist: bigint, suiUsd: number): number {
  return (Number(mist) / 1e9) * suiUsd;
}

/**
 * Fee terms written on-chain when the user starts or changes a plan. The **fee cap** is the most
 * the contract will ever let us take from the vault in one day: an allowance the user approves,
 * like a card spending limit. It is set at 3× the plan's daily price in SUI so a SUI price fall
 * doesn't stop collection; we still only charge the plan's USD price each day.
 */
export function quoteFeeTerms(priceUsdPerDay: number, suiUsd: number, policy: PricingPolicy = PRICING) {
  const dailyFeeMist = usdToMist(priceUsdPerDay, suiUsd);
  return { dailyFeeMist, dailyFeeCapMist: dailyFeeMist * BigInt(policy.feeCapMultiplier) };
}

/** A plan change that costs more than the approved cap allows needs a new user signature. */
export function planChangeNeedsSignature(newPriceUsdPerDay: number, suiUsd: number, dailyFeeCapMist: bigint): boolean {
  return usdToMist(newPriceUsdPerDay, suiUsd) > dailyFeeCapMist;
}

/** One price observation from one source (e.g. Pyth, CoinGecko, Binance). */
export type PriceQuote = { source: string; suiUsd: number; observedAtMs: number };

export type PriceCheck = { maxAgeMs: number; maxDeviationBps: number; minSources: number };

/** Defaults: fresh within 5 minutes, at least 2 sources, within 2% of each other. */
export const DEFAULT_PRICE_CHECK: PriceCheck = { maxAgeMs: 5 * 60_000, maxDeviationBps: 200, minSources: 2 };

/**
 * Median of fresh quotes, refusing to price anything when sources are stale or disagree. A fee is
 * only ever charged from a price that passed this check; otherwise the day's charge is skipped.
 */
export function aggregatePrice(quotes: PriceQuote[], nowMs: number, check = DEFAULT_PRICE_CHECK): number {
  const fresh = quotes
    .filter((q) => nowMs - q.observedAtMs <= check.maxAgeMs && Number.isFinite(q.suiUsd) && q.suiUsd > 0)
    .map((q) => q.suiUsd)
    .sort((a, b) => a - b);
  if (fresh.length < check.minSources)
    throw new Error(`need ${check.minSources} fresh SUI prices, have ${fresh.length}`);
  const lo = fresh[0] as number;
  const hi = fresh[fresh.length - 1] as number;
  if (((hi - lo) / lo) * 10_000 > check.maxDeviationBps) throw new Error(`SUI price sources disagree: ${lo}..${hi}`);
  const mid = Math.floor(fresh.length / 2);
  return fresh.length % 2 ? (fresh[mid] as number) : ((fresh[mid - 1] as number) + (fresh[mid] as number)) / 2;
}

/**
 * Refuses to charge on a price that jumped more than `maxMoveBps` since the last accepted price
 * (default ±25%). A bad feed then skips one day's fee instead of overcharging every vault.
 */
export function checkDailyPriceMove(suiUsd: number, previousSuiUsd: number | null, maxMoveBps = 2_500): boolean {
  if (previousSuiUsd === null || previousSuiUsd <= 0) return true;
  return (Math.abs(suiUsd - previousSuiUsd) / previousSuiUsd) * 10_000 <= maxMoveBps;
}

/**
 * Fee-cap headroom: with a 3× cap, a 67% SUI fall makes the cap bind. Ask the user to re-approve
 * once today's fee needs more than `alertAt` of the cap, before it binds.
 */
export function feeCapHeadroom(args: {
  priceUsdPerDay: number;
  suiUsd: number;
  dailyFeeCapMist: bigint;
  alertAt?: number;
}) {
  const needMist = usdToMist(args.priceUsdPerDay, args.suiUsd);
  const usedShare =
    args.dailyFeeCapMist > 0n ? Number(needMist) / Number(args.dailyFeeCapMist) : Number.POSITIVE_INFINITY;
  return { needMist, usedShare, askReapproval: usedShare > (args.alertAt ?? 0.8), capBinds: usedShare > 1 };
}

export type FeeDecision =
  /** Charge this much; `capped` when SUI fell so far that the cap, not the plan price, applies. */
  | { kind: "charge"; mist: bigint; capped: boolean }
  /** The vault can't pay: pause the agent (`pause_by_agent(1)`) and notify. Never sell to pay. */
  | { kind: "pause_insufficient_sui"; neededMist: bigint }
  | { kind: "skip"; reason: "not_due" | "paused" | "fee_off" };

/**
 * What the operator does at the start of a vault's day: the plan is prepaid, so a user can't use a
 * day and pause before paying. The contract enforces the cap and once-a-day; this decides the amount.
 */
export function decideDailyFee(args: {
  priceUsdPerDay: number;
  suiUsd: number;
  dailyFeeCapMist: bigint;
  vaultSuiMist: bigint;
  feeDue: boolean;
  paused: boolean;
}): FeeDecision {
  if (args.paused) return { kind: "skip", reason: "paused" };
  if (!args.feeDue) return { kind: "skip", reason: "not_due" };
  if (args.dailyFeeCapMist === 0n) return { kind: "skip", reason: "fee_off" };
  const planMist = usdToMist(args.priceUsdPerDay, args.suiUsd);
  const capped = planMist > args.dailyFeeCapMist;
  const mist = capped ? args.dailyFeeCapMist : planMist;
  if (mist > args.vaultSuiMist) return { kind: "pause_insufficient_sui", neededMist: mist };
  return { kind: "charge", mist, capped };
}

// === Trial ===

/** Free days to write on-chain at creation: 3, once per wallet. No deposit condition. */
export function trialDaysFor(args: { walletHasUsedTrial: boolean }, policy: PricingPolicy = PRICING): number {
  return args.walletHasUsedTrial ? 0 : policy.trialDays;
}

/** During the trial the agent runs the user's plan, up to the trial's activity ceiling. */
export function trialDecisionsPerDay(plan: ActivityLevel, policy: PricingPolicy = PRICING): number {
  return Math.min(plan.decisionsPerDay, policy.trialMaxDecisionsPerDay);
}

// === Treasury ===

/**
 * Treasury currency check. Revenue arrives in SUI, costs are in USD. This only *proposes* a
 * SUI→USDC conversion; moving treasury funds needs human approval.
 */
export function treasuryCurrencyReport(args: {
  treasurySuiMist: bigint;
  suiUsd: number;
  monthlyUsdCosts: number;
  /** Months of USD costs to keep in SUI before proposing a conversion. */
  keepMonthsInSui?: number;
}) {
  const heldUsd = mistToUsd(args.treasurySuiMist, args.suiUsd);
  const keepUsd = args.monthlyUsdCosts * (args.keepMonthsInSui ?? 1);
  const excessUsd = Math.max(0, heldUsd - keepUsd);
  return {
    heldUsd,
    monthsOfCostsCovered: args.monthlyUsdCosts > 0 ? heldUsd / args.monthlyUsdCosts : Number.POSITIVE_INFINITY,
    proposeConvertMist: excessUsd > 0 ? usdToMist(excessUsd, args.suiUsd) : 0n,
    requiresHumanApproval: true as const,
  };
}
