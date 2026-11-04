/**
 * OpenRouter client helpers (SPEC 6.1): one OpenAI-compatible endpoint for every model.
 *
 * Cost-relevant choices (docs/ECONOMICS.md):
 * - The prompt is laid out cache-first: system prompt, then the market snapshot (identical for
 *   every vault in a tick) with an explicit `cache_control` breakpoint, then the vault's own data.
 *   Anthropic only caches with explicit breakpoints through OpenRouter; OpenAI caches the prefix
 *   automatically. Nothing per-vault may appear before the breakpoint.
 * - No `provider.order`: it disables OpenRouter's sticky routing, which is what keeps cache hits.
 * - `max_tokens` is capped: output tokens are 5× the price of input.
 * - Providers may not train on prompts (`data_collection: "deny"`, `zdr`).
 */
import { MODEL_PRICES, type ModelPrice } from "@blast-agents/shared";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> };

/**
 * Builds the messages so the cacheable prefix is byte-identical across vaults. `sharedJson` must
 * be serialized once per tick and reused for every vault.
 */
export function buildCachedMessages(args: { system: string; sharedJson: string; vaultJson: string }): ChatMessage[] {
  return [
    { role: "system", content: args.system },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `MARKET (same for every agent this tick):\n${args.sharedJson}`,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: `YOUR VAULT:\n${args.vaultJson}` },
      ],
    },
  ];
}

/** Request fields beyond the OpenAI schema that OpenRouter understands. */
export const OPENROUTER_REQUEST_EXTRAS = {
  provider: { require_parameters: true, data_collection: "deny", zdr: true, allow_fallbacks: true },
  usage: { include: true },
} as const;

/**
 * Runs the first call alone, then the rest with bounded concurrency. Parallel calls sent before
 * the first cache write lands all miss and all pay the write price; one warm-up per tick and
 * model avoids that (docs/ECONOMICS.md recommendation 3).
 */
export async function warmUpThenFanOut<T, R>(items: T[], run: (item: T) => Promise<R>, concurrency = 8): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  results[0] = await run(items[0] as T);
  let next = 1;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await run(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length - 1) }, worker));
  return results;
}

/** Upper bound on output tokens per decision (~500 tokens of JSON). At 2,000, a capped day loses money. */
export const MAX_OUTPUT_TOKENS = 600;

/** Usage as OpenRouter reports it on a chat completion. */
export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  /** Charged credits in USD, when usage accounting is on. */
  cost?: number;
};

export type DecisionUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  /** "reported" from OpenRouter's `usage.cost`, else "estimated" from the price table. */
  costSource: "reported" | "estimated";
};

/** Normalizes OpenRouter usage; estimates cost from the price table when it isn't reported. */
export function toDecisionUsage(
  model: string,
  usage: OpenRouterUsage | undefined,
  prices = MODEL_PRICES,
): DecisionUsage {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const cachedTokens = usage?.prompt_tokens_details?.cached_tokens ?? 0;
  const cacheWriteTokens = usage?.prompt_tokens_details?.cache_write_tokens ?? 0;
  if (typeof usage?.cost === "number") {
    return { inputTokens, outputTokens, cachedTokens, cacheWriteTokens, costUsd: usage.cost, costSource: "reported" };
  }
  const p: ModelPrice | undefined = prices[model];
  const plain = Math.max(0, inputTokens - cachedTokens - cacheWriteTokens);
  const costUsd = p
    ? (plain * p.inputPerM +
        cachedTokens * p.cacheReadPerM +
        cacheWriteTokens * p.cacheWritePerM +
        outputTokens * p.outputPerM) /
      1e6
    : 0;
  return { inputTokens, outputTokens, cachedTokens, cacheWriteTokens, costUsd, costSource: "estimated" };
}

export type ModelFailure = "out_of_credits" | "rate_or_budget_limited" | "timeout" | "invalid_output" | "error";

/**
 * Maps a failed call to a reason. Every failure is a hold (no trade, no fund risk). 402 means the
 * OpenRouter balance is empty: the platform spend guard must stop all calls and alert, not retry.
 */
export function classifyModelError(error: unknown): ModelFailure {
  const status = (error as { status?: number } | null)?.status;
  if (status === 402) return "out_of_credits";
  if (status === 403 || status === 429) return "rate_or_budget_limited";
  if ((error as Error | null)?.message === "model timeout") return "timeout";
  return "error";
}
