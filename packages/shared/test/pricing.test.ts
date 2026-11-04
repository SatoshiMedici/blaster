import { describe, expect, it } from "vitest";
import {
  aggregatePrice,
  catalogModel,
  checkDailyPriceMove,
  decideDailyFee,
  decisionCostUsd,
  feeCapHeadroom,
  feeDrag,
  PRICING,
  planChangeNeedsSignature,
  quoteFeeTerms,
  quotePlan,
  recommendPlan,
  resolveActivity,
  treasuryCurrencyReport,
  trialDaysFor,
  trialDecisionsPerDay,
  usdToMist,
} from "../src/index.ts";

describe("plan prices", () => {
  it("prices Claude Sonnet at Steady (24/day) at $1.01/day", () => {
    // 0.5 cache hits: (5k × $1.30 + 1k × $2 + 500 × $10)/1M × 1.05 = $0.014175 + $0.0025 gas
    expect(decisionCostUsd(catalogModel("claude"))).toBeCloseTo(0.016675, 6);
    const q = quotePlan("claude", { level: "steady" });
    expect(q.priceUsdPerDay).toBe(1.01);
  });

  it("scales with the activity the user picks; no platform cap", () => {
    const prices = (["watchful", "steady", "active", "intense"] as const).map(
      (level) => quotePlan("claude", { level }).priceUsdPerDay,
    );
    expect(prices).toEqual([0.26, 1.01, 3.01, 12.02]);
    expect(quotePlan("claude", { level: "custom", decisionsPerDay: 1_440 }).priceUsdPerDay).toBeGreaterThan(50);
  });

  it("keeps at least 30% margin after the 30% referral payout on every model and level", () => {
    for (const key of ["claude", "chatgpt", "grok", "gemini-flash", "deepseek", "deepseek-flash", "claude-haiku"]) {
      for (const level of ["watchful", "steady", "active", "intense"] as const) {
        const q = quotePlan(key, { level });
        expect(q.marginReferred).toBeGreaterThanOrEqual(PRICING.minMarginAfterReferral - 1e-9);
        expect(q.marginDirect).toBeGreaterThanOrEqual(0.6 - 1e-9);
      }
    }
  });

  it("budget models make small vaults affordable", () => {
    expect(quotePlan("claude-haiku", { level: "steady" }).priceUsdPerDay).toBe(0.2);
    expect(quotePlan("claude-haiku", { level: "custom", decisionsPerDay: 1 }).priceUsdPerDay).toBe(
      PRICING.minDailyPriceUsd,
    );
  });
});

describe("protecting small vaults without a minimum deposit", () => {
  it("flags fee drag as a yearly share of the vault", () => {
    expect(feeDrag(1.01, 5_000).band).toBe("comfortable");
    expect(feeDrag(1.01, 1_000).band).toBe("extreme");
    expect(feeDrag(0.2, 1_000).band).toBe("comfortable");
    expect(feeDrag(0.2, 500).band).toBe("high");
  });

  it("recommends the most active plan under 10%/yr, down to a custom budget", () => {
    expect(recommendPlan("claude", 50_000)?.activity.id).toBe("intense");
    expect(recommendPlan("claude", 4_000)?.activity.id).toBe("steady");
    const small = recommendPlan("claude-haiku", 100);
    expect(small?.activity.id).toBe("custom");
    expect(feeDrag(small?.priceUsdPerDay ?? 0, 100).annualShare).toBeLessThanOrEqual(0.1);
    expect(recommendPlan("claude", 20)).toBeNull();
  });
});

describe("activity levels", () => {
  it("spreads a custom budget over the day", () => {
    const one = resolveActivity({ level: "custom", decisionsPerDay: 1 });
    expect(one.scheduledEveryMs).toBe(24 * 3_600_000);
    const many = resolveActivity({ level: "custom", decisionsPerDay: 1_440 });
    expect(many.minGapMs).toBe(60_000);
  });
});

describe("fee in SUI and the fee cap", () => {
  it("converts USD to MIST with integer math, rounding down", () => {
    expect(usdToMist(0.99, 3.3)).toBe(300_000_000n);
    expect(usdToMist(1, 3)).toBe(333_333_333n);
  });

  it("sets the on-chain cap at 3× the plan's daily price", () => {
    const t = quoteFeeTerms(1.01, 1.01);
    expect(t.dailyFeeMist).toBe(1_000_000_000n);
    expect(t.dailyFeeCapMist).toBe(3_000_000_000n);
  });

  it("a plan change above the approved cap needs a new signature", () => {
    const { dailyFeeCapMist } = quoteFeeTerms(1.01, 1);
    expect(planChangeNeedsSignature(3.01, 1, dailyFeeCapMist)).toBe(false);
    expect(planChangeNeedsSignature(12.02, 1, dailyFeeCapMist)).toBe(true);
  });

  it("charges the plan price, falls back to the cap after a >50% SUI drop, pauses when short", () => {
    const cap = 600_000_000n;
    const base = { priceUsdPerDay: 0.99, dailyFeeCapMist: cap, vaultSuiMist: 10n ** 12n, feeDue: true, paused: false };
    expect(decideDailyFee({ ...base, suiUsd: 3.3 })).toEqual({ kind: "charge", mist: 300_000_000n, capped: false });
    expect(decideDailyFee({ ...base, suiUsd: 1 })).toEqual({ kind: "charge", mist: cap, capped: true });
    expect(decideDailyFee({ ...base, suiUsd: 3.3, vaultSuiMist: 1n }).kind).toBe("pause_insufficient_sui");
    expect(decideDailyFee({ ...base, suiUsd: 3.3, feeDue: false })).toEqual({ kind: "skip", reason: "not_due" });
    expect(decideDailyFee({ ...base, suiUsd: 3.3, paused: true })).toEqual({ kind: "skip", reason: "paused" });
  });

  it("asks for re-approval at 80% of the cap, before it binds", () => {
    const { dailyFeeCapMist } = quoteFeeTerms(1, 1);
    expect(feeCapHeadroom({ priceUsdPerDay: 1, suiUsd: 1, dailyFeeCapMist }).askReapproval).toBe(false);
    expect(feeCapHeadroom({ priceUsdPerDay: 1, suiUsd: 0.4, dailyFeeCapMist }).askReapproval).toBe(true);
    expect(feeCapHeadroom({ priceUsdPerDay: 1, suiUsd: 0.3, dailyFeeCapMist }).capBinds).toBe(true);
  });

  it("only prices from fresh, agreeing sources, and refuses >25% daily jumps", () => {
    const now = 1_000_000;
    const q = (source: string, suiUsd: number, age = 0) => ({ source, suiUsd, observedAtMs: now - age });
    expect(aggregatePrice([q("pyth", 3.3), q("cg", 3.31)], now)).toBeCloseTo(3.305);
    expect(() => aggregatePrice([q("pyth", 3.3)], now)).toThrow();
    expect(() => aggregatePrice([q("pyth", 3.3), q("cg", 3.5)], now)).toThrow();
    expect(() => aggregatePrice([q("pyth", 3.3), q("cg", 3.3, 10 * 60_000)], now)).toThrow();
    expect(checkDailyPriceMove(1.2, 1)).toBe(true);
    expect(checkDailyPriceMove(1.3, 1)).toBe(false);
  });
});

describe("trial and treasury", () => {
  it("3 trial days once per wallet, with no deposit condition, capped at Steady activity", () => {
    expect(trialDaysFor({ walletHasUsedTrial: false })).toBe(3);
    expect(trialDaysFor({ walletHasUsedTrial: true })).toBe(0);
    expect(trialDecisionsPerDay(resolveActivity({ level: "intense" }))).toBe(24);
    expect(trialDecisionsPerDay(resolveActivity({ level: "watchful" }))).toBe(6);
  });

  it("proposes (never executes) converting treasury SUI above one month of USD costs", () => {
    const r = treasuryCurrencyReport({ treasurySuiMist: 10_000n * 10n ** 9n, suiUsd: 1, monthlyUsdCosts: 4_400 });
    expect(r.proposeConvertMist).toBe(5_600n * 10n ** 9n);
    expect(r.requiresHumanApproval).toBe(true);
  });
});
