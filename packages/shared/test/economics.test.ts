import { describe, expect, it } from "vitest";
import {
  annualFeeDrag,
  breakEvenVaults,
  cacheBreakEvenHitRate,
  cacheHitCeiling,
  costAlarmThresholdUsd,
  costPerDecisionUsd,
  dayEconomics,
  lifetimeValueUsd,
  MODEL_PRICES,
  maxChurnForCac,
  maxDecisionsForMargin,
  monthlyContributionUsd,
} from "../src/index.ts";

const sonnet = MODEL_PRICES["anthropic/claude-sonnet-5.5"] as (typeof MODEL_PRICES)[string];

describe("rev. 2 flat-fee cost table (historical check of the cost model)", () => {
  it("reproduces ~$0.018 per decision without caching (6k in, 500 out, ~6% fee)", () => {
    expect(costPerDecisionUsd({ price: sonnet, caching: false, platformFee: 0.06 })).toBeCloseTo(0.018, 3);
  });

  it("reproduces the quiet / typical / busy margins", () => {
    const c = 0.018;
    const rows = [
      [10, 0.03, 0.79],
      [20, 0.05, 0.59],
      [30, 0.08, 0.37],
    ] as const;
    for (const [decisions, gasUsd, margin] of rows) {
      expect(dayEconomics({ feeUsd: 0.99, decisions, costPerDecisionUsd: c, gasUsd }).marginPct).toBeCloseTo(margin, 2);
    }
  });

  it("reproduces ~$17/month contribution and break-even vault counts", () => {
    const m = monthlyContributionUsd({ feeUsd: 0.99, typicalDailyCostUsd: 0.41 });
    expect(m.revenueUsd).toBeCloseTo(29.7);
    expect(m.contributionUsd).toBeCloseTo(17.4);
    expect(breakEvenVaults(3_100, m.contributionUsd)).toBe(179);
    expect(breakEvenVaults(1_000, m.contributionUsd)).toBe(58);
  });
});

describe("caching", () => {
  it("caching beats plain input above ~21% hit rate for Sonnet 5.5", () => {
    expect(cacheBreakEvenHitRate(sonnet)).toBeCloseTo(0.208, 2);
  });

  it("an 80% hit rate roughly halves the cost per decision", () => {
    const cached = costPerDecisionUsd({ price: sonnet, cacheHitRate: 0.8, platformFee: 0.055 });
    expect(cached).toBeCloseTo(0.0104, 3);
  });

  it("hit-rate ceiling is (k-1)/k", () => {
    expect(cacheHitCeiling(1)).toBe(0);
    expect(cacheHitCeiling(10)).toBeCloseTo(0.9);
  });
});

describe("flat-fee margin rule (rev. 2 analysis)", () => {
  it("the $0.022 alarm is too loose: total cache failure ($0.0206) would not trip it", () => {
    const noCache = costPerDecisionUsd({ price: sonnet, cacheHitRate: 0, platformFee: 0.055 });
    expect(noCache).toBeLessThan(0.022);
    // The real threshold that keeps 30% at a 30-decision cap with $0.08 gas:
    expect(costAlarmThresholdUsd({ feeUsd: 0.99, decisionCap: 30, gasUsdAtCap: 0.08 })).toBeCloseTo(0.0204, 4);
  });

  it("lowers the decision cap when costs rise", () => {
    expect(maxDecisionsForMargin({ feeUsd: 0.99, costPerDecisionUsd: 0.018, gasUsdAtCap: 0.08 })).toBe(34);
    expect(maxDecisionsForMargin({ feeUsd: 0.99, costPerDecisionUsd: 0.03, gasUsdAtCap: 0.08 })).toBe(20);
    expect(maxDecisionsForMargin({ feeUsd: 0.99, costPerDecisionUsd: 0.03, gasUsdAtCap: 1 })).toBe(0);
  });
});

describe("user side and LTV", () => {
  it("fee drag on the $250 minimum is ~144.5% a year", () => {
    expect(annualFeeDrag(250, 0.99)).toBeCloseTo(1.4454, 3);
    expect(annualFeeDrag(1_000, 0.99)).toBeCloseTo(0.3614, 3);
  });

  it("LTV collapses with churn and referral share", () => {
    const base = { monthlyRevenueUsd: 29.7, monthlyCostUsd: 12.3 };
    expect(lifetimeValueUsd({ ...base, monthlyChurn: 0.1 })).toBeCloseTo(174, 0);
    expect(lifetimeValueUsd({ ...base, monthlyChurn: 0.25, referralShare: 0.3, trialCostUsd: 1.23 })).toBeCloseTo(
      33.2,
      0,
    );
  });

  it("finds the churn ceiling for a given CAC", () => {
    expect(maxChurnForCac({ monthlyContributionUsd: 17.4, cacUsd: 150 })).toBeCloseTo(0.116, 3);
  });
});
