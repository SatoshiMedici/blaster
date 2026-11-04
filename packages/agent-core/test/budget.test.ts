import { catalogModel, decisionCostUsd, quotePlan } from "@blast-agents/shared";
import { describe, expect, it } from "vitest";
import { CostMonitor, creditRunway, DecisionBudget, PlatformSpendGuard, VaultSpendLedger } from "../src/budget.ts";

const DAY = 86_400_000;

describe("DecisionBudget", () => {
  it("allows each vault exactly its own plan's decisions per UTC day", () => {
    const b = new DecisionBudget();
    for (let i = 0; i < 6; i++) expect(b.tryConsume("small", 6, 10)).toBe(true);
    expect(b.tryConsume("small", 6, 10)).toBe(false);
    for (let i = 0; i < 288; i++) expect(b.tryConsume("big", 288, 10)).toBe(true);
    expect(b.remaining("small", 6, DAY + 1)).toBe(6);
  });
});

describe("VaultSpendLedger", () => {
  it("stops a vault at 125% of its plan's expected daily cost", () => {
    const plan = quotePlan("claude", { level: "steady" });
    const ceiling = VaultSpendLedger.ceilingFor(plan);
    const l = new VaultSpendLedger();
    l.record("v", ceiling - 0.001, 0);
    expect(l.allow("v", ceiling, 0)).toBe(true);
    l.record("v", 0.01, 0);
    expect(l.allow("v", ceiling, 0)).toBe(false);
    expect(l.allow("v", ceiling, DAY)).toBe(true);
  });
});

describe("PlatformSpendGuard", () => {
  it("trips at the incident budget and reopens the next day", () => {
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
  const priced = decisionCostUsd(catalogModel("claude")); // AI at 50% hits + gas
  const opts = { pricedCostPerDecisionUsd: priced, minCacheHitRate: 0.5, minSample: 10 };

  it("is quiet when cached costs are at or below the pricing assumption", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.0104, inputTokens: 6_000, cachedTokens: 4_800 });
    expect(m.report().alarms).toEqual([]);
    expect(m.report().referredMargin).toBeGreaterThan(0.3);
  });

  it("flags a silent cache failure and a cost above what the price assumed", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.0205, inputTokens: 6_000, cachedTokens: 0 });
    expect(m.report().alarms).toEqual(expect.arrayContaining(["cache_hit_rate", "cost_above_pricing"]));
  });

  it("flags when the referred margin falls under 20%", () => {
    const m = new CostMonitor(opts);
    for (let i = 0; i < 20; i++) m.record({ costUsd: 0.03, inputTokens: 6_000, cachedTokens: 5_000 });
    expect(m.report().alarms).toContain("referred_margin");
  });
});
