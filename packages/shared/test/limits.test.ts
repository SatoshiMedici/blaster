import { describe, expect, it } from "vitest";
import { Decision, RISK_PRESETS, RiskSettings, settingsToLimits, suiToMist } from "../src/index.ts";

describe("settingsToLimits", () => {
  it("converts the Balanced preset for a 100 SUI deposit", () => {
    const limits = settingsToLimits(RISK_PRESETS.balanced.settings, suiToMist(100));
    expect(limits).toEqual({
      maxTrade: "5000000000",
      maxPerLaunch: "15000000000",
      maxDailySpend: "30000000000",
      maxOpenPositions: 5,
      minOutRequired: true,
    });
  });

  it("matches the SPEC table for every preset", () => {
    const table = { careful: [2, 5, 10, 3, 15], balanced: [5, 15, 30, 5, 30], degen: [10, 25, 60, 8, 50] };
    for (const [id, [t, l, d, p, dd]] of Object.entries(table)) {
      const s = RISK_PRESETS[id as keyof typeof RISK_PRESETS].settings;
      expect([
        s.perTradeBps / 100,
        s.perLaunchBps / 100,
        s.dailySpendBps / 100,
        s.maxOpenPositions,
        s.drawdownStopBps / 100,
      ]).toEqual([t, l, d, p, dd]);
    }
  });

  it("rejects per-trade above per-launch", () => {
    const bad = { ...RISK_PRESETS.careful.settings, perTradeBps: 900 };
    expect(RiskSettings.safeParse(bad).success).toBe(false);
  });
});

describe("suiToMist", () => {
  it("parses decimals exactly", () => {
    expect(suiToMist("1.5")).toBe(1_500_000_000n);
    expect(suiToMist("0.000000001")).toBe(1n);
    expect(suiToMist(2)).toBe(2_000_000_000n);
  });
  it("rejects negatives", () => {
    expect(() => suiToMist(-1)).toThrow();
  });
});

describe("Decision", () => {
  it("rejects join_opening_round for vaults", () => {
    const r = Decision.safeParse({
      summary: "x",
      actions: [{ action: "join_opening_round", launch_id: "0x1", amount_sui: 1, sell_fraction: 0, reason: "" }],
    });
    expect(r.success).toBe(false);
  });
});
