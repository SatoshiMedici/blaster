import { z } from "zod";

export const Provider = z.enum(["anthropic", "openai", "xai"]);
export type Provider = z.infer<typeof Provider>;

/** A selectable model. IDs come from config so they can change without a deploy (SPEC 6.1). */
export const ModelOption = z.object({
  /** Stable key stored on vaults and trades, e.g. "claude". */
  key: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string(),
  provider: Provider,
  modelId: z.string(),
  enabled: z.boolean(),
});
export type ModelOption = z.infer<typeof ModelOption>;

export const DEFAULT_MODELS: ModelOption[] = [
  { key: "claude", label: "Claude", provider: "anthropic", modelId: "claude-sonnet-5-5", enabled: true },
  { key: "chatgpt", label: "ChatGPT", provider: "openai", modelId: "gpt-6.1-sol", enabled: true },
  { key: "grok", label: "Grok", provider: "xai", modelId: "grok-4.7", enabled: false },
];
