import { z } from "zod";
import { ActivityChoice } from "./activity.ts";
import { OnChainLimits, PRESET_IDS, RiskSettings, u64String } from "./limits.ts";
import { REFERRAL_CODE } from "./referrals.ts";

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
 * Body of `POST /vaults/prepare` (the Start screen): the plan (model × activity), the risk limits
 * and the deposit. There is no minimum deposit. Fee terms are not in the body: the server prices
 * the plan (`quotePlan`, `quoteFeeTerms`) and returns them with the PTB, so the user approves
 * exactly what is signed.
 */
export const PrepareVaultBody = z.object({
  model: z.string(),
  activity: ActivityChoice,
  preset: z.enum(PRESET_IDS),
  settings: RiskSettings,
  depositMist: u64String.refine((s) => BigInt(s) > 0n, "deposit must be positive"),
  /** Referral code, bound once per owner wallet at the first vault. */
  referralCode: z.string().regex(REFERRAL_CODE).optional(),
});
export type PrepareVaultBody = z.infer<typeof PrepareVaultBody>;

export const ConfirmVaultBody = z.object({ digest: Digest });

/**
 * `PATCH /vaults/:id`. Model and activity changes are off-chain (next tick) unless the new plan's
 * price exceeds the approved fee cap (`planChangeNeedsSignature`); limit changes always return a
 * PTB to sign.
 */
export const PatchVaultBody = z
  .object({ model: z.string().optional(), activity: ActivityChoice.optional(), limits: OnChainLimits.optional() })
  .refine((b) => b.model !== undefined || b.activity !== undefined || b.limits !== undefined, "nothing to change");

export const LeaderboardQuery = z.object({
  period: z.enum(["7d", "30d", "all"]).default("30d"),
  sort: z.enum(["return_drawdown", "twr", "pnl", "win_rate", "volume"]).default("return_drawdown"),
  preset: z.enum(PRESET_IDS).optional(),
});

export const VaultStatus = z.enum(["pending", "running", "paused", "halted", "closed"]);
export type VaultStatus = z.infer<typeof VaultStatus>;
