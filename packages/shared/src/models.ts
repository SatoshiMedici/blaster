import { z } from "zod";

/** The model's maker. Every call goes through OpenRouter (SPEC 6.1). */
export const Provider = z.enum(["anthropic", "openai", "xai"]);
export type Provider = z.infer<typeof Provider>;

/** A selectable model. IDs come from config so they can change without a deploy (SPEC 6.1). */
export const ModelOption = z.object({
  /** Stable key stored on vaults and trades, e.g. "claude". */
  key: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string(),
  provider: Provider,
  /** OpenRouter slug, e.g. "anthropic/claude-sonnet-5.5". Pin dated slugs where offered. */
  modelId: z.string().regex(/^[a-z0-9-]+\/[a-z0-9.-]+$/),
  enabled: z.boolean(),
});
export type ModelOption = z.infer<typeof ModelOption>;

export const DEFAULT_MODELS: ModelOption[] = [
  { key: "claude", label: "Claude", provider: "anthropic", modelId: "anthropic/claude-sonnet-5.5", enabled: true },
  { key: "chatgpt", label: "ChatGPT", provider: "openai", modelId: "openai/gpt-6.1-sol", enabled: true },
  // "Lite" candidates (~20× cheaper per decision): arena-test decision quality before enabling.
  {
    key: "claude-lite",
    label: "Claude Lite",
    provider: "anthropic",
    modelId: "anthropic/claude-haiku-5.5",
    enabled: false,
  },
  { key: "chatgpt-lite", label: "ChatGPT Lite", provider: "openai", modelId: "openai/gpt-6-luna", enabled: false },
];

/** Leaderboard eligibility (SPEC 9.1): age, the $250 minimum deposit, trades in the period. */
export const LEADERBOARD_ELIGIBILITY = { minAgeDays: 7, minDepositUsd: 250, minTradesInPeriod: 5 } as const;
