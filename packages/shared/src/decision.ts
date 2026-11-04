import { z } from "zod";

/**
 * What a model may propose for a vault. `join_opening_round` is deliberately absent:
 * opening rounds and presales pay the transaction sender, which would be our operator (SPEC 5.4.1).
 */
export const VaultAction = z.object({
  action: z.enum(["buy", "sell"]),
  launch_id: z.string().min(1).max(100),
  /** SUI to spend for buy. 0 for sell. */
  amount_sui: z.number().min(0),
  /** Share of the position to sell, 0-1. 0 for buy. */
  sell_fraction: z.number().min(0).max(1),
  reason: z.string().max(500),
});
export type VaultAction = z.infer<typeof VaultAction>;

export const Decision = z.object({
  summary: z.string().max(1_000),
  actions: z.array(VaultAction).max(10),
});
export type Decision = z.infer<typeof Decision>;

export const VerdictOutcome = z.enum(["executed", "clamped", "rejected", "simulated"]);
export type VerdictOutcome = z.infer<typeof VerdictOutcome>;

/** JSON schema handed to both providers. Strict: every field required, nothing extra. */
export const DECISION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions"],
  properties: {
    summary: { type: "string", description: "One or two sentences on your view this tick." },
    actions: {
      type: "array",
      description: "Empty array = hold.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action", "launch_id", "amount_sui", "sell_fraction", "reason"],
        properties: {
          action: { type: "string", enum: ["buy", "sell"] },
          launch_id: { type: "string" },
          amount_sui: { type: "number" },
          sell_fraction: { type: "number" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;
