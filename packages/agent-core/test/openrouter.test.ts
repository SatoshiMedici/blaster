import { describe, expect, it } from "vitest";
import { buildCachedMessages, classifyModelError, toDecisionUsage } from "../src/openrouter.ts";
import { OpenRouterTrader } from "../src/traders.ts";

describe("prompt layout for caching", () => {
  it("keeps the cached prefix byte-identical across vaults", () => {
    const shared = JSON.stringify([{ launch_id: "a" }]);
    const a = buildCachedMessages({ system: "S", sharedJson: shared, vaultJson: '{"v":1}' });
    const b = buildCachedMessages({ system: "S", sharedJson: shared, vaultJson: '{"v":2}' });
    const prefix = (m: typeof a) => JSON.stringify([m[0], m[1]?.role === "user" ? m[1].content[0] : null]);
    expect(prefix(a)).toBe(prefix(b));
    expect(a[1]?.role === "user" && a[1].content[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(a[1]?.role === "user" && a[1].content[1]?.cache_control).toBeUndefined();
  });
});

describe("OpenRouterTrader", () => {
  it("sends strict JSON schema, capped output, privacy routing and no provider.order", async () => {
    let body: Record<string, unknown> = {};
    const client = {
      chat: {
        completions: {
          create: async (b: never) => {
            body = b as Record<string, unknown>;
            return {
              choices: [{ message: { content: '{"summary":"hold","actions":[]}' } }],
              usage: {
                prompt_tokens: 6000,
                completion_tokens: 400,
                prompt_tokens_details: { cached_tokens: 5000 },
                cost: 0.009,
              },
            };
          },
        },
      },
    };
    const t = new OpenRouterTrader("claude", "anthropic/claude-sonnet-5.5", client);
    const r = await t.decide({
      market: [],
      marketJson: "[]",
      me: { sui_balance: 1, spendable_sui: 1, positions: [], spent_today_sui: 0 },
      opponent: "x",
    });
    expect(r.summary).toBe("hold");
    expect(r.usage).toMatchObject({ costUsd: 0.009, costSource: "reported", cachedTokens: 5000 });
    expect(body.model).toBe("anthropic/claude-sonnet-5.5");
    expect(body.max_tokens).toBeLessThanOrEqual(600);
    expect((body.response_format as { json_schema: { strict: boolean } }).json_schema.strict).toBe(true);
    const provider = body.provider as Record<string, unknown>;
    expect(provider).toMatchObject({ data_collection: "deny", zdr: true, require_parameters: true });
    expect(provider.order).toBeUndefined();
  });
});

describe("usage and errors", () => {
  it("estimates cost from the price table when OpenRouter doesn't report it", () => {
    const u = toDecisionUsage("anthropic/claude-sonnet-5.5", {
      prompt_tokens: 6000,
      completion_tokens: 500,
      prompt_tokens_details: { cached_tokens: 5000 },
    });
    // 1000 plain × $2 + 5000 cached × $0.10 + 500 out × $10, per 1M
    expect(u.costUsd).toBeCloseTo(0.0075, 6);
    expect(u.costSource).toBe("estimated");
  });

  it("classifies failures; every one is a hold", () => {
    expect(classifyModelError({ status: 402 })).toBe("out_of_credits");
    expect(classifyModelError({ status: 429 })).toBe("rate_or_budget_limited");
    expect(classifyModelError(new Error("model timeout"))).toBe("timeout");
    expect(classifyModelError(new Error("boom"))).toBe("error");
  });
});
