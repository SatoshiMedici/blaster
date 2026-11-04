import { describe, expect, it } from "vitest";
import {
  aggregatePrice,
  annualFeeDrag,
  breakEvenVaults,
  cacheBreakEvenHitRate,
  cacheHitCeiling,
  costAlarmThresholdUsd,
  costPerDecisionUsd,
  dayEconomics,
  decideDailyFee,
  lifetimeValueUsd,
  MODEL_PRICES,
  maxChurnForCac,
  maxDecisionsForMargin,
  minDepositMist,
  monthlyContributionUsd,
  PRICING,
  quoteFeeTerms,
  trialDaysFor,
  usdToMist,
} from "../src/index.ts";

const sonnet = MODEL_PRICES["anthropic/claude-sonnet-5.5"] as (typeof MODEL_PRICES)[string];

describe("SPEC 1b cost table", () => {
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

describe("pricing rule", () => {
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

describe("fee in SUI", () => {
  it("converts USD to MIST with integer math, rounding down", () => {
    expect(usdToMist(0.99, 3.3)).toBe(300_000_000n);
    expect(usdToMist(1, 3)).toBe(333_333_333n);
  });

  it("sets the on-chain cap at 2× the day's fee", () => {
    const t = quoteFeeTerms(3.3);
    expect(t.dailyFeeMist).toBe(300_000_000n);
    expect(t.dailyFeeCapMist).toBe(600_000_000n);
  });

  it("charges the USD equivalent, falls back to the cap after a >50% SUI drop, pauses when short", () => {
    const cap = 600_000_000n;
    expect(
      decideDailyFee({ suiUsd: 3.3, dailyFeeCapMist: cap, vaultSuiMist: 10n ** 12n, feeDue: true, paused: false }),
    ).toEqual({
      kind: "charge",
      mist: 300_000_000n,
      capped: false,
    });
    expect(
      decideDailyFee({ suiUsd: 1, dailyFeeCapMist: cap, vaultSuiMist: 10n ** 12n, feeDue: true, paused: false }),
    ).toEqual({
      kind: "charge",
      mist: cap,
      capped: true,
    });
    expect(
      decideDailyFee({ suiUsd: 3.3, dailyFeeCapMist: cap, vaultSuiMist: 1n, feeDue: true, paused: false }).kind,
    ).toBe("pause_insufficient_sui");
    expect(
      decideDailyFee({ suiUsd: 3.3, dailyFeeCapMist: cap, vaultSuiMist: 1n, feeDue: false, paused: false }).kind,
    ).toBe("skip");
  });

  it("only prices from fresh, agreeing sources", () => {
    const now = 1_000_000;
    const q = (source: string, suiUsd: number, age = 0) => ({ source, suiUsd, observedAtMs: now - age });
    expect(aggregatePrice([q("pyth", 3.3), q("cg", 3.31)], now)).toBeCloseTo(3.305);
    expect(() => aggregatePrice([q("pyth", 3.3)], now)).toThrow();
    expect(() => aggregatePrice([q("pyth", 3.3), q("cg", 3.5)], now)).toThrow();
    expect(() => aggregatePrice([q("pyth", 3.3), q("cg", 3.3, 10 * 60_000)], now)).toThrow();
  });
});

describe("trial and minimum deposit", () => {
  it("minimum deposit is $250 in SUI, rounded up", () => {
    expect(minDepositMist(2.5)).toBe(100_000_000_000n);
  });

  it("gives 3 trial days once per wallet, only at the minimum deposit", () => {
    const min = minDepositMist(2.5);
    expect(trialDaysFor({ walletHasUsedTrial: false, depositMist: min, suiUsd: 2.5 })).toBe(PRICING.trialDays);
    expect(trialDaysFor({ walletHasUsedTrial: false, depositMist: min - 1n, suiUsd: 2.5 })).toBe(0);
    expect(trialDaysFor({ walletHasUsedTrial: true, depositMist: min, suiUsd: 2.5 })).toBe(0);
  });
});

describe("fee-cap headroom, price jumps and treasury", () => {
  it("asks for re-approval at 80% of the cap, before it binds", async () => {
    const { feeCapHeadroom, quoteFeeTerms } = await import("../src/index.ts");
    const { dailyFeeCapMist } = quoteFeeTerms(1); // approved at $1/SUI: cap = 1.98 SUI
    expect(feeCapHeadroom({ suiUsd: 1, dailyFeeCapMist }).askReapproval).toBe(false);
    expect(feeCapHeadroom({ suiUsd: 0.6, dailyFeeCapMist }).askReapproval).toBe(true); // needs 83%
    expect(feeCapHeadroom({ suiUsd: 0.45, dailyFeeCapMist }).capBinds).toBe(true);
  });

  it("refuses to charge on a >25% day-over-day price jump", async () => {
    const { checkDailyPriceMove } = await import("../src/index.ts");
    expect(checkDailyPriceMove(1.2, 1)).toBe(true);
    expect(checkDailyPriceMove(1.3, 1)).toBe(false);
    expect(checkDailyPriceMove(1.3, null)).toBe(true);
  });

  it("proposes (never executes) converting treasury SUI above one month of USD costs", async () => {
    const { treasuryCurrencyReport } = await import("../src/index.ts");
    const r = treasuryCurrencyReport({ treasurySuiMist: 10_000n * 10n ** 9n, suiUsd: 1, monthlyUsdCosts: 4_400 });
    expect(r.proposeConvertMist).toBe(5_600n * 10n ** 9n);
    expect(r.requiresHumanApproval).toBe(true);
  });
});
