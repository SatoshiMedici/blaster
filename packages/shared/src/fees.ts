import { z } from "zod";
import { u64String } from "./limits.ts";

/** Days Blast covers at signup before the first daily fee (SPEC 1b). */
export const DEFAULT_FREE_DAYS = 7;

/**
 * Fee terms the user approves on the Start screen and that the vault stores on-chain (SPEC 1b):
 * "up to `dailyFeeCap` per day while running", paid only to `treasury`, nothing for `freeDays`.
 * The exact SUI amount is still open: it is set once the real AI cost per vault per day is
 * measured in the arena phase.
 */
export const FeeTerms = z.object({
  dailyFeeCapMist: u64String,
  treasury: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  freeDays: z.number().int().min(0).max(365),
});
export type FeeTerms = z.infer<typeof FeeTerms>;
