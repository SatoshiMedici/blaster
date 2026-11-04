import { describe, expect, it } from "vitest";
import { CostMonitor, creditRunway, DecisionCap, PlatformSpendGuard } from "../src/budget.ts";

const DAY = 86_400_000;

describe("DecisionCap", () => {
  it("allows 30 decisions per vault per UTC day, then holds until tomorrow", () => {
    const cap = new DecisionCap(30);
    for (let i = 0; i < 30; i++) expect(cap.tryConsume("v", 10)).toBe(true);
    expect(cap.tryConsume("v", 10)).toBe(false);
    expect(cap.tryConsume("w", 10)).toBe(true);
    expect(cap.remaining("v", DAY + 1)).toBe(30);
    expect(cap.tryConsume("v", DAY + 1)).toBe(true);
  });
});

describe("PlatformSpendGuard", () => {
  it("trips at the daily budget and reopens the next day", () => {
    const g = new PlatformSpendGuard(10);
    g.record(9.99, 0);
    expect(g.allow(0)).toBe(true);
    g.record(0.02, 0);
    expect(g.allow(0)).toBe(false);
    expect(g.allow(DAY)).toBe(true);
  });

  it("a kill or empty balance stays until an operator resets it", () => {
    const g = new PlatformSpendGuard(10);
    g.kill("out_of_credits");
    expect(g.allow(DAY * 5)).toBe(false);
    g.reset();
    expect(g.allow(DAY * 5)).toBe(true);
  });
});

describe("creditRunway", () => {
  it("alerts under 7 days of spend", () => {
    expect(creditRunway({ creditsRemainingUsd: 60, trailingDailySpendUsd: 10 }).alert).toBe(true);
    expect(creditRunway({ creditsRemainingUsd: 80, trailingDailySpendUsd: 10 }).alert).toBe(false);
  });
});

describe("CostMonitor", () => {
  const opts = { decisionCap: 30, gasUsdAtCap: 0.08, minCacheHitRate: 0.5, minSample: 10 };

  it("is quiet when cached costs are normal", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.01, inputTokens: 6_000, cachedTokens: 5_000 });
    expect(m.report().alarms).toEqual([]);
    expect(m.report().recommendedCap).toBe(30);
  });

  it("flags a silent cache failure even while cost is under $0.022", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.0206, inputTokens: 6_000, cachedTokens: 0 });
    const r = m.report();
    expect(r.alarms).toContain("cache_hit_rate");
    expect(r.alarms).toContain("cost_per_decision");
  });

  it("recommends a lower cap when costs rise", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.03, inputTokens: 6_000, cachedTokens: 5_000 });
    expect(m.report().recommendedCap).toBe(20);
    expect(m.report().alarms).toContain("decision_cap_lowered");
  });
});
