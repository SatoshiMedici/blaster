/**
 * The curated model catalog (docs/ECONOMICS.md, reports/Blast Agents models fees referrals.md).
 *
 * Not every model: the ones other trading agents and the public trading arenas actually use,
 * in three price tiers. Every call goes through OpenRouter (SPEC 6.1). A model is offered to
 * users only once its prices are confirmed against OpenRouter's live catalog
 * (`reconcileCatalog`), because the user's price is computed from them.
 */
import { z } from "zod";

/** USD per 1M tokens on OpenRouter. */
export type ModelPrice = {
  inputPerM: number;
  outputPerM: number;
  /** Cached prefix read. When unknown, set equal to `inputPerM` (no discount assumed). */
  cacheReadPerM: number;
  /** Cached prefix write. When unknown, set equal to `inputPerM`. */
  cacheWritePerM: number;
};

export const ModelTier = z.enum(["premium", "standard", "budget"]);
export type ModelTier = z.infer<typeof ModelTier>;

export type CatalogModel = {
  /** Stable key stored on vaults and trades. */
  key: string;
  label: string;
  maker: "anthropic" | "openai" | "xai" | "google" | "deepseek";
  /** OpenRouter slug. */
  slug: string;
  tier: ModelTier;
  price: ModelPrice;
  /** True when the prices were confirmed from a primary source; otherwise `reconcileCatalog` must confirm them before the model is offered. */
  priceVerified: boolean;
  /** Why it is in the catalog: evidence of use in trading. */
  evidence: string;
};

/** OpenRouter slugs: `maker/model`, lowercase. */
const SLUG = /^[a-z0-9-]+\/[a-z0-9.-]+$/;

export const MODEL_CATALOG: readonly CatalogModel[] = [
  {
    key: "claude",
    label: "Claude Sonnet 5.5",
    maker: "anthropic",
    slug: "anthropic/claude-sonnet-5.5",
    tier: "premium",
    price: { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.1, cacheWritePerM: 2.5 },
    priceVerified: true,
    evidence:
      "Claude Sonnet ran in Alpha Arena seasons 1 and 1.5; Anthropic is listed first among ElizaOS providers; offered by Senpi.",
  },
  {
    key: "chatgpt",
    label: "GPT-6.1 Sol",
    maker: "openai",
    slug: "openai/gpt-6.1-sol",
    tier: "premium",
    price: { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.1, cacheWritePerM: 2.5 },
    priceVerified: true,
    evidence: "GPT models ran in Alpha Arena seasons 1 and 1.5; offered by Senpi.",
  },
  {
    key: "grok",
    label: "Grok 4.7",
    maker: "xai",
    slug: "x-ai/grok-4.7",
    tier: "standard",
    price: { inputPerM: 2, outputPerM: 6, cacheReadPerM: 2, cacheWritePerM: 2 },
    priceVerified: false,
    evidence: "Grok 4.20 won Alpha Arena season 1.5 (US stocks, +12%); offered by Senpi.",
  },
  {
    key: "gemini-flash",
    label: "Gemini 3.5 Flash",
    maker: "google",
    slug: "google/gemini-3.5-flash",
    tier: "standard",
    price: { inputPerM: 1.5, outputPerM: 9, cacheReadPerM: 1.5, cacheWritePerM: 1.5 },
    priceVerified: false,
    evidence: "Gemini ran in Alpha Arena seasons 1 and 1.5; Gemini Flash is ElizaOS's OpenRouter default.",
  },
  {
    key: "deepseek",
    label: "DeepSeek V4 Pro",
    maker: "deepseek",
    slug: "deepseek/deepseek-v4-pro",
    tier: "standard",
    price: { inputPerM: 0.66, outputPerM: 1.98, cacheReadPerM: 0.66, cacheWritePerM: 0.66 },
    priceVerified: false,
    evidence: "DeepSeek V3.1 finished second in Alpha Arena season 1 (crypto, about +5%).",
  },
  {
    key: "deepseek-flash",
    label: "DeepSeek V4.1 Flash",
    maker: "deepseek",
    slug: "deepseek/deepseek-v4.1-flash",
    tier: "budget",
    price: { inputPerM: 0.045, outputPerM: 0.5, cacheReadPerM: 0.045, cacheWritePerM: 0.045 },
    priceVerified: false,
    evidence:
      "The most-used model on OpenRouter by tokens (Oct 2026); the DeepSeek line placed second in Alpha Arena season 1.",
  },
  {
    key: "claude-haiku",
    label: "Claude Haiku 5.5",
    maker: "anthropic",
    slug: "anthropic/claude-haiku-5.5",
    tier: "budget",
    price: { inputPerM: 0.1, outputPerM: 0.5, cacheReadPerM: 0.01, cacheWritePerM: 0.125 },
    priceVerified: false,
    evidence: "Budget sibling of Sonnet with the same strict-JSON behaviour; for small vaults and high activity.",
  },
];

for (const m of MODEL_CATALOG) if (!SLUG.test(m.slug)) throw new Error(`bad OpenRouter slug ${m.slug}`);

export const DEFAULT_MODEL_KEY = "claude";

export function catalogModel(key: string): CatalogModel {
  const m = MODEL_CATALOG.find((x) => x.key === key);
  if (!m) throw new Error(`unknown model ${key}`);
  return m;
}

/** Slug → price, for cost estimates from usage. */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = Object.fromEntries(
  MODEL_CATALOG.map((m) => [m.slug, m.price]),
);

/** One entry of OpenRouter's `GET /api/v1/models` (prices are USD per token, as strings). */
export type OpenRouterModelEntry = {
  id: string;
  pricing: { prompt: string; completion: string; input_cache_read?: string; input_cache_write?: string };
  supported_parameters?: string[];
};

export type CatalogStatus = { key: string; offered: boolean; reason: string; live?: ModelPrice };

/**
 * Confirms each model against OpenRouter's live catalog before it is offered: the slug must exist,
 * strict structured outputs must be supported, and live prices must not exceed ours by more than
 * `tolerance` (a higher live price would sell decisions below cost). Run at API startup and daily.
 */
export function reconcileCatalog(live: OpenRouterModelEntry[], tolerance = 0.02): CatalogStatus[] {
  const byId = new Map(live.map((e) => [e.id, e]));
  return MODEL_CATALOG.map((m) => {
    const e = byId.get(m.slug);
    if (!e) return { key: m.key, offered: false, reason: "slug not on OpenRouter" };
    if (
      e.supported_parameters &&
      !e.supported_parameters.includes("structured_outputs") &&
      !e.supported_parameters.includes("response_format")
    ) {
      return { key: m.key, offered: false, reason: "no structured outputs" };
    }
    const perM = (s: string | undefined, fallback: number) => (s === undefined ? fallback : Number(s) * 1e6);
    const livePrice: ModelPrice = {
      inputPerM: perM(e.pricing.prompt, Number.POSITIVE_INFINITY),
      outputPerM: perM(e.pricing.completion, Number.POSITIVE_INFINITY),
      cacheReadPerM: perM(e.pricing.input_cache_read, perM(e.pricing.prompt, Number.POSITIVE_INFINITY)),
      cacheWritePerM: perM(e.pricing.input_cache_write, perM(e.pricing.prompt, Number.POSITIVE_INFINITY)),
    };
    const over = (k: keyof ModelPrice) => livePrice[k] > m.price[k] * (1 + tolerance);
    const dearer = (["inputPerM", "outputPerM", "cacheReadPerM", "cacheWritePerM"] as const).filter(over);
    if (dearer.length)
      return { key: m.key, offered: false, reason: `live price above catalog: ${dearer.join(", ")}`, live: livePrice };
    return { key: m.key, offered: true, reason: "confirmed", live: livePrice };
  });
}

/** Models offered without a live check: only those with primary-source prices. */
export const offeredWithoutLiveCheck = () => MODEL_CATALOG.filter((m) => m.priceVerified).map((m) => m.key);

/** Leaderboard eligibility (SPEC 9.1). The value floor is for *ranking* only, not a deposit minimum. */
export const LEADERBOARD_ELIGIBILITY = { minAgeDays: 7, minVaultValueUsd: 250, minTradesInPeriod: 5 } as const;
