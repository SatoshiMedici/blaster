/**
 * Unit-economics model (SPEC 1b "Pricing and unit economics", docs/ECONOMICS.md).
 *
 * Pure functions over plain numbers (USD). The worker uses these to enforce the pricing rule
 * ("the worst-case day keeps at least a 30% margin") against *measured* costs, and the docs and
 * tests use them to keep the plan's tables honest. Defaults are research-backed estimates as of
 * Nov 2026; replace them with arena measurements.
 */

/** Price of one model on OpenRouter, USD per 1M tokens. */
export type ModelPrice = {
  inputPerM: number;
  outputPerM: number;
  /** Cached prefix read. */
  cacheReadPerM: number;
  /** Cached prefix write (Anthropic 5-minute TTL = 1.25× input). */
  cacheWritePerM: number;
};

/**
 * OpenRouter list prices, Nov 2026. Sonnet 5.5 cache read reflects the Oct 2026 cut ($0.10).
 * GPT-6.1 Sol's $2.50 cache write is listed by third parties only: treat as conservative.
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  "anthropic/claude-sonnet-5.5": { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.1, cacheWritePerM: 2.5 },
  "openai/gpt-6.1-sol": { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.1, cacheWritePerM: 2.5 },
  // Cheap tier candidates (~20× cheaper); not enabled in the UI.
  "anthropic/claude-haiku-5.5": { inputPerM: 0.1, outputPerM: 0.5, cacheReadPerM: 0.01, cacheWritePerM: 0.125 },
  "openai/gpt-6-luna": { inputPerM: 0.1, outputPerM: 0.5, cacheReadPerM: 0.01, cacheWritePerM: 0.125 },
};

/** Token shape of one decision. The shared prefix (system prompt + market snapshot) is cacheable. */
export type DecisionShape = { sharedPrefixTokens: number; vaultTokens: number; outputTokens: number };

/** ~6k input (5k shared market prefix + 1k vault-specific) and 500 output, per SPEC 1b. */
export const DEFAULT_DECISION_SHAPE: DecisionShape = {
  sharedPrefixTokens: 5_000,
  vaultTokens: 1_000,
  outputTokens: 500,
};

/**
 * OpenRouter takes no inference markup; its fee is on credit purchases: 5% for crypto/USDC
 * (our top-up path, SPEC 6.1), 5.5% for card. SPEC 1b's "about 6%" is a conservative round-up.
 */
export const OPENROUTER_FEE = { crypto: 0.05, card: 0.055 } as const;

const PER_M = 1_000_000;

/**
 * USD per decision. `cacheHitRate` = share of decisions whose prefix is read from cache; the rest
 * write it (with caching on) or pay plain input (with caching off).
 */
export function costPerDecisionUsd(args: {
  price: ModelPrice;
  shape?: DecisionShape;
  cacheHitRate?: number;
  caching?: boolean;
  platformFee?: number;
}): number {
  const shape = args.shape ?? DEFAULT_DECISION_SHAPE;
  const caching = args.caching ?? true;
  const hit = caching ? clamp01(args.cacheHitRate ?? 0) : 0;
  const prefixMissRate = caching ? args.price.cacheWritePerM : args.price.inputPerM;
  const prefix = (shape.sharedPrefixTokens / PER_M) * (hit * args.price.cacheReadPerM + (1 - hit) * prefixMissRate);
  const rest =
    (shape.vaultTokens / PER_M) * args.price.inputPerM + (shape.outputTokens / PER_M) * args.price.outputPerM;
  return (prefix + rest) * (1 + (args.platformFee ?? OPENROUTER_FEE.crypto));
}

/**
 * Best possible hit rate when `k` decisions share one tick's snapshot and one warm-up request
 * writes the cache first: (k-1)/k. At 30 decisions/vault/day and 1,440 ticks/day,
 * k ≈ vaults × 30 / 1440.
 */
export function cacheHitCeiling(decisionsSharingSnapshot: number): number {
  return decisionsSharingSnapshot <= 1 ? 0 : (decisionsSharingSnapshot - 1) / decisionsSharingSnapshot;
}

/** Caching beats no caching once the hit rate passes this (≈21% for Sonnet 5.5). */
export function cacheBreakEvenHitRate(price: ModelPrice): number {
  return (price.cacheWritePerM - price.inputPerM) / (price.cacheWritePerM - price.cacheReadPerM);
}

export type DayInputs = {
  feeUsd: number;
  decisions: number;
  costPerDecisionUsd: number;
  /** Agent trades + the daily `charge_fee` tx, USD. */
  gasUsd: number;
};

export function dayEconomics(d: DayInputs) {
  const aiUsd = d.decisions * d.costPerDecisionUsd;
  const costUsd = aiUsd + d.gasUsd;
  const marginUsd = d.feeUsd - costUsd;
  return { aiUsd, costUsd, marginUsd, marginPct: d.feeUsd > 0 ? marginUsd / d.feeUsd : 0 };
}

/** SPEC 1b rule: the worst-case (capped) day must keep at least this margin. */
export const MIN_WORST_CASE_MARGIN = 0.3;

/**
 * Largest per-vault daily decision cap that keeps the worst-case day at `minMargin`, given a
 * measured cost per decision. The worker lowers its cap to this when costs rise (SPEC 1b:
 * "lower the decision cap or raise the fee").
 */
export function maxDecisionsForMargin(args: {
  feeUsd: number;
  costPerDecisionUsd: number;
  gasUsdAtCap: number;
  minMargin?: number;
}): number {
  const budget = args.feeUsd * (1 - (args.minMargin ?? MIN_WORST_CASE_MARGIN)) - args.gasUsdAtCap;
  if (budget <= 0 || args.costPerDecisionUsd <= 0) return 0;
  return Math.floor(budget / args.costPerDecisionUsd);
}

/** Highest average cost per decision at which `decisionCap` still keeps `minMargin`. */
export function costAlarmThresholdUsd(args: {
  feeUsd: number;
  decisionCap: number;
  gasUsdAtCap: number;
  minMargin?: number;
}): number {
  return (args.feeUsd * (1 - (args.minMargin ?? MIN_WORST_CASE_MARGIN)) - args.gasUsdAtCap) / args.decisionCap;
}

/** Monthly contribution per paying vault (30-day month). */
export function monthlyContributionUsd(args: { feeUsd: number; typicalDailyCostUsd: number; days?: number }) {
  const days = args.days ?? 30;
  return {
    revenueUsd: args.feeUsd * days,
    costUsd: args.typicalDailyCostUsd * days,
    contributionUsd: (args.feeUsd - args.typicalDailyCostUsd) * days,
  };
}

/** Paying vaults needed to cover fixed monthly costs. */
export function breakEvenVaults(fixedMonthlyUsd: number, contributionPerVaultMonthUsd: number): number {
  return contributionPerVaultMonthUsd > 0
    ? Math.ceil(fixedMonthlyUsd / contributionPerVaultMonthUsd)
    : Number.POSITIVE_INFINITY;
}

/**
 * Lifetime contribution of a user who converts after the trial: monthly contribution × expected
 * paid lifetime (1 / churn), minus the trial cost and any referral share of revenue.
 */
export function lifetimeValueUsd(args: {
  monthlyRevenueUsd: number;
  monthlyCostUsd: number;
  monthlyChurn: number;
  /** Share of fee revenue paid to referrers (e.g. 0.3). */
  referralShare?: number;
  trialCostUsd?: number;
}): number {
  if (args.monthlyChurn <= 0 || args.monthlyChurn > 1) throw new Error("monthlyChurn must be in (0, 1]");
  const perMonth = args.monthlyRevenueUsd * (1 - (args.referralShare ?? 0)) - args.monthlyCostUsd;
  return perMonth / args.monthlyChurn - (args.trialCostUsd ?? 0);
}

/** Highest monthly churn at which LTV still covers `cacUsd`. */
export function maxChurnForCac(args: {
  monthlyContributionUsd: number;
  cacUsd: number;
  trialCostUsd?: number;
}): number {
  const need = args.cacUsd + (args.trialCostUsd ?? 0);
  return need <= 0 ? 1 : Math.min(1, args.monthlyContributionUsd / need);
}

/** The fee as a share of the deposit per year (365-day convention). $0.99 on $250 ≈ 144.5%. */
export function annualFeeDrag(depositUsd: number, feeUsdPerDay: number): number {
  return depositUsd > 0 ? (feeUsdPerDay * 365) / depositUsd : Number.POSITIVE_INFINITY;
}

/** Monthly return the agent must make before fees just for the user to break even. */
export function breakEvenMonthlyReturn(depositUsd: number, feeUsdPerDay: number): number {
  return depositUsd > 0 ? (feeUsdPerDay * 30) / depositUsd : Number.POSITIVE_INFINITY;
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
