import { describe, expect, it } from "vitest";
import { MODEL_CATALOG, offeredWithoutLiveCheck, reconcileCatalog } from "../src/index.ts";

describe("model catalog", () => {
  it("is a curated set across three tiers with unique keys and slugs", () => {
    expect(MODEL_CATALOG.length).toBeGreaterThanOrEqual(4);
    expect(MODEL_CATALOG.length).toBeLessThanOrEqual(8);
    expect(new Set(MODEL_CATALOG.map((m) => m.key)).size).toBe(MODEL_CATALOG.length);
    expect(new Set(MODEL_CATALOG.map((m) => m.tier))).toEqual(new Set(["premium", "standard", "budget"]));
  });

  it("offers only primary-source-priced models without a live check", () => {
    expect(offeredWithoutLiveCheck()).toEqual(["claude", "chatgpt"]);
  });

  it("refuses a model whose live price is above the catalog, or that is missing", () => {
    const entry = (id: string, prompt: number, completion: number, cacheRead = prompt, cacheWrite = prompt) => ({
      id,
      pricing: {
        prompt: String(prompt / 1e6),
        completion: String(completion / 1e6),
        input_cache_read: String(cacheRead / 1e6),
        input_cache_write: String(cacheWrite / 1e6),
      },
      supported_parameters: ["structured_outputs"],
    });
    const status = reconcileCatalog([
      entry("anthropic/claude-sonnet-5.5", 2, 10, 0.1, 2.5),
      entry("x-ai/grok-4.7", 3, 6),
      entry("anthropic/claude-haiku-5.5", 0.1, 0.5), // no cache discount live: we assumed one
    ]);
    const by = Object.fromEntries(status.map((s) => [s.key, s]));
    expect(by.claude?.offered).toBe(true);
    expect(by.grok?.offered).toBe(false);
    expect(by.grok?.reason).toMatch(/live price above catalog/);
    expect(by["claude-haiku"]).toMatchObject({ offered: false });
    expect(by.chatgpt).toMatchObject({ offered: false, reason: "slug not on OpenRouter" });
  });
});
