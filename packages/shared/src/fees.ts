import { z } from "zod";
import { u64String } from "./limits.ts";

import { PRICING } from "./pricing.ts";

/** Free trial days (SPEC 1b: 3 days, once per wallet, minimum deposit required). See `trialDaysFor`. */
export const DEFAULT_FREE_DAYS = PRICING.trialDays;

/**
 * Fee terms the user approves on the Start screen and that the vault stores on-chain (SPEC 1b):
 * "up to `dailyFeeCap` per day while running", paid only to `treasury`, nothing for `freeDays`.
 * The cap is set by `quoteFeeTerms` (2× the day's $0.99 in SUI); the operator charges only the
 * day's USD-equivalent (`decideDailyFee`).
 */
export const FeeTerms = z.object({
  dailyFeeCapMist: u64String,
  treasury: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  freeDays: z.number().int().min(0).max(365),
});
export type FeeTerms = z.infer<typeof FeeTerms>;
