import { z } from "zod";
import { u64String } from "./limits.ts";
import { PRICING } from "./pricing.ts";

/** Free trial days: 3, once per wallet, no deposit condition. See `trialDaysFor`. */
export const DEFAULT_FREE_DAYS = PRICING.trialDays;

/**
 * Fee terms the user approves with their plan and that the vault stores on-chain: "up to
 * `dailyFeeCap` per day while running", paid only to `treasury`, nothing for `freeDays`. The cap
 * comes from `quoteFeeTerms` (3× the plan's daily price in SUI); the operator charges only the
 * plan's USD price each day (`decideDailyFee`).
 */
export const FeeTerms = z.object({
  dailyFeeCapMist: u64String,
  treasury: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  freeDays: z.number().int().min(0).max(365),
});
export type FeeTerms = z.infer<typeof FeeTerms>;
