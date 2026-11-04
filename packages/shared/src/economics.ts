/**
 * Unit-economics model (docs/ECONOMICS.md).
 *
 * Pure functions over plain numbers (USD): cost per decision, caching, daily margin, break-even,
 * lifetime value and fee drag. `pricing.ts` builds plan prices on top of these; the docs and tests
 * use them to keep the numbers honest. Defaults are research-backed estimates as of Nov 2026;
 * replace them with arena measurements.
 */

import type { ModelPrice } from "./models.ts";

/** Token shape of one decision. The shared prefix (system prompt + market snapshot) is cacheable. */
export type DecisionShape = { sharedPrefixTokens: number; vaultTokens: number; outputTokens: number };

/** ~6k input (5k shared market prefix + 1k vault-specific) and 500 output per decision. */
export const DEFAULT_DECISION_SHAPE: DecisionShape = {
  sharedPrefixTokens: 5_000,
  vaultTokens: 1_000,
  outputTokens: 500,
};

/**
 * OpenRouter takes no inference markup; its fee is on credit purchases: 5% for crypto/USDC
 * (our top-up path, SPEC 6.1), 5.5% for card.
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
 * writes the cache first: (k-1)/k. With D decisions per vault per day and 1,440 ticks/day,
 * k ≈ vaults × D / 1440 (higher when triggers fire for many vaults on the same tick).
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

/** Default minimum margin for `maxDecisionsForMargin` / `costAlarmThresholdUsd` (a cost-share rule: cost ≤ 70% of revenue). */
export const MIN_WORST_CASE_MARGIN = 0.3;

/**
 * Largest per-vault daily decision cap that keeps the worst-case day at `minMargin`, given a
 * measured cost per decision. Useful for fixed-fee analysis (SPEC 1b's original flat fee:
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

/** A daily fee as a share of the deposit per year (365-day convention). $0.99/day on $250 ≈ 144.5%. */
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
