import { z } from "zod";

/** u64 carried as a decimal string over JSON. */
export const u64String = z
  .string()
  .regex(/^\d+$/, "must be an unsigned integer string")
  .refine((s) => BigInt(s) < 2n ** 64n, "exceeds u64");

/** Mirrors `blast_agent_vault::vault::Limits`. All SUI amounts in MIST. */
export const OnChainLimits = z.object({
  maxTrade: u64String,
  maxPerLaunch: u64String,
  maxDailySpend: u64String,
  maxOpenPositions: z.number().int().min(0).max(1000),
  /** Always true in v1; the contract rejects false. */
  minOutRequired: z.literal(true),
});
export type OnChainLimits = z.infer<typeof OnChainLimits>;

/** A preset as shares of the deposit (basis points) plus counts. SPEC 3.1 step 5. */
export const RiskSettings = z
  .object({
    perTradeBps: z.number().int().min(1).max(10_000),
    perLaunchBps: z.number().int().min(1).max(10_000),
    dailySpendBps: z.number().int().min(1).max(10_000),
    maxOpenPositions: z.number().int().min(1).max(50),
    /** Off-chain stop: the operator pauses its own trading at this drawdown. */
    drawdownStopBps: z.number().int().min(100).max(10_000),
  })
  .refine((r) => r.perTradeBps <= r.perLaunchBps, "per-trade must not exceed per-launch");
export type RiskSettings = z.infer<typeof RiskSettings>;

export const PRESET_IDS = ["careful", "balanced", "degen"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/** The risk slider starts here (SPEC 1b). */
export const DEFAULT_PRESET: PresetId = "balanced";

export const RISK_PRESETS: Record<PresetId, { label: string; settings: RiskSettings }> = {
  careful: {
    label: "Careful",
    settings: {
      perTradeBps: 200,
      perLaunchBps: 500,
      dailySpendBps: 1_000,
      maxOpenPositions: 3,
      drawdownStopBps: 1_500,
    },
  },
  balanced: {
    label: "Balanced",
    settings: {
      perTradeBps: 500,
      perLaunchBps: 1_500,
      dailySpendBps: 3_000,
      maxOpenPositions: 5,
      drawdownStopBps: 3_000,
    },
  },
  degen: {
    label: "Degen",
    settings: {
      perTradeBps: 1_000,
      perLaunchBps: 2_500,
      dailySpendBps: 6_000,
      maxOpenPositions: 8,
      drawdownStopBps: 5_000,
    },
  },
};

const share = (amount: bigint, bps: number) => (amount * BigInt(bps)) / 10_000n;

/** Converts a preset to the on-chain limits for a given deposit (SPEC: "converted to SUI at confirmation"). */
export function settingsToLimits(settings: RiskSettings, depositMist: bigint): OnChainLimits {
  return {
    maxTrade: share(depositMist, settings.perTradeBps).toString(),
    maxPerLaunch: share(depositMist, settings.perLaunchBps).toString(),
    maxDailySpend: share(depositMist, settings.dailySpendBps).toString(),
    maxOpenPositions: settings.maxOpenPositions,
    minOutRequired: true,
  };
}
