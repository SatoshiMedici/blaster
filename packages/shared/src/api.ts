import { z } from "zod";
import { OnChainLimits, PRESET_IDS, RiskSettings, u64String } from "./limits.ts";

export const SuiAddress = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "expected a 32-byte 0x address");
export const ObjectId = SuiAddress;
export const Digest = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "expected a base58 digest");

export const AuthChallengeBody = z.object({ address: SuiAddress });
export const AuthVerifyBody = z.object({
  address: SuiAddress,
  nonce: z.string().min(16),
  /** Serialized personal-message signature from the wallet. */
  signature: z.string().min(1),
});

/**
 * Body of `POST /vaults/prepare` (the Start screen). Fee terms are not in the body: the server sets
 * them from config and returns them with the PTB, so the user approves exactly what is signed.
 */
export const PrepareVaultBody = z.object({
  model: z.string(),
  preset: z.enum(PRESET_IDS),
  settings: RiskSettings,
  depositMist: u64String,
});
export type PrepareVaultBody = z.infer<typeof PrepareVaultBody>;

export const ConfirmVaultBody = z.object({ digest: Digest });

export const PatchVaultBody = z
  .object({ model: z.string().optional(), limits: OnChainLimits.optional() })
  .refine((b) => b.model !== undefined || b.limits !== undefined, "nothing to change");

export const LeaderboardQuery = z.object({
  period: z.enum(["7d", "30d", "all"]).default("30d"),
  sort: z.enum(["return_drawdown", "twr", "pnl", "win_rate", "volume"]).default("return_drawdown"),
  preset: z.enum(PRESET_IDS).optional(),
});

export const VaultStatus = z.enum(["pending", "running", "paused", "halted", "closed"]);
export type VaultStatus = z.infer<typeof VaultStatus>;
