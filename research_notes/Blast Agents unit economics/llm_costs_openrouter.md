# LLM cost per decision via OpenRouter (as of 2026-11-04)

Method note: openrouter.ai (and getmaxim.ai) could not be fetched from this session (DNS blocked by the session's network allowlist). Everything sourced to openrouter.ai below comes from **search-result snippets** of openrouter.ai pages, not a full page read. Figures from third-party trackers/blogs are marked as such. The live JSON at `https://openrouter.ai/api/v1/models` (fields `pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, `pricing.input_cache_write`, `supported_parameters`) is the authoritative source and should be checked once the domain is allowed, ideally from code at startup.

Workload assumed throughout (from the brief): 6,000 input tokens = 5,000-token shared prefix (system prompt + market snapshot, identical for every vault within a 60 s tick) + 1,000 per-vault tokens; 500 output tokens; up to 30 decisions/vault/day.

## 1. List prices on OpenRouter for the models in the plan (and whether the slugs exist)

### Takeaway

Both slugs in the plan exist on OpenRouter, and both list at **$2 / 1M input and $10 / 1M output**, so the plan's base rates check out. Cache prices: Sonnet 5.5 cache read **$0.10/1M** (cut from $0.20 in October 2026), cache write $2.50 (5 min) / $4.00 (1 h). GPT-6.1 Sol cached input is **$0.10/1M**, and third-party tables also show a $2.50 cache-write line (unconfirmed).

### Cited Findings

- `anthropic/claude-sonnet-5.5` exists on OpenRouter. The OpenRouter compare page for Sonnet 5 vs 5.5 shows $2/M input and $10/M output with a 1M-token context for both — [OpenRouter compare (snippet)](https://openrouter.ai/compare/anthropic/claude-sonnet-5/anthropic/claude-sonnet-5.5); the model ID is confirmed by [LLM Reference](https://www.llmreference.com/model/claude-sonnet-5-5/openrouter); and a 128K max output is reported by [Bifrost/getmaxim](https://www.getmaxim.ai/bifrost/llm-cost-calculator/provider/openrouter/model/claude-sonnet-5.5).
- Sonnet 5.5 across providers: the input price ranges from $2.00 to $2.20/M, and Anthropic's direct price is $2/$10 — [PricePerToken](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-5.5).
- Sonnet 5.5 cache write: **$2.50/M (5-minute TTL)** and **$4.00/M (1-hour TTL)**, i.e. 1.25x and 2x the $2 base — [Apidog pricing table](https://apidog.com/blog/claude-sonnet-5-5-pricing/); [eesel](https://www.eesel.ai/blog/claude-sonnet-5-5-pricing).
- Sonnet 5.5 cache read was **cut 50%, from $0.20 to $0.10/M** (October 2026, API-only). Cache writes and other prices were unchanged — [SmartScope](https://smartscope.blog/en/blog/claude-sonnet-5-5-cache-read-price-cut-2026/); [SessionWatcher (Oct 7)](https://sessionwatcher.com/news/claude-sonnet-5-5-cache-read-price-cut-october-7); [LaoZhang](https://blog.laozhang.ai/en/posts/claude-sonnet-5-5-cache-read-price). Some older pages still show $0.20 — [mixed-news](https://mixed-news.com/en/?p=36372) reports Anthropic's own tool showed the old price for two days after the cut.
- Bedrock lists Sonnet 5.5 cache read at $0.10 (global endpoint) and $0.11 (geo endpoint), with writes at $2.50/$4.00 — [Classmethod](https://dev.classmethod.jp/en/articles/bedrock-sonnet-5-5-cache-read-price-cut/). This matters because OpenRouter can route Sonnet to Bedrock or Vertex.
- `openai/gpt-6.1-sol` exists on OpenRouter, with a dated variant `openai/gpt-6.1-sol-20260929` — [OpenRouter model page (snippet)](https://openrouter.ai/openai/gpt-6.1-sol); [dated slug](https://openrouter.ai/openai/gpt-6.1-sol-20260929). It is listed at $2.00/M input and $10.00/M output and served by 2 providers (OpenAI, Azure), with a 1,050,000-token context — [LLM Reference](https://www.llmreference.com/model/gpt-6.1-sol/openrouter); [ComputePrices (updated 2026-09-30)](https://computeprices.com/providers/openrouter/models/gpt-6-1-sol).
- GPT-6.1 Sol cached input is **$0.10/M** (95% below input, and half GPT-6 Sol's $0.20). Tables also list a **$2.50/M cache write** — [eesel](https://www.eesel.ai/blog/gpt-6-1-sol-pricing); [mixed-news](https://mixed-news.com/en/?p=34750); [aicatchup](https://aicatchup.com/news/gpt-6-1-sol-launch-pricing-availability).
- GPT-6.1 Sol long context (>272K input): $4.00 input and $0.20 cached, though sources are inconsistent on the long-context output price. This tier is irrelevant at 6K tokens — [eesel](https://www.eesel.ai/blog/gpt-6-1-sol-pricing).
- Batch tier of $1/$5 for both models — [ComputePrices](https://computeprices.com/providers/openrouter/models/claude-sonnet-5-5). This is not confirmed on OpenRouter's own pages, and batch does not fit a 60 s decision loop anyway.
- PricePerToken shows a cheapest GPT-6.1 Sol input of $1.00/M (Oct 22, 2026), but does not tie it to OpenRouter's or OpenAI's list price — [PricePerToken](https://pricepertoken.com/pricing-page/model/openai-gpt-6.1-sol).

### Inferences

- The plan's $2/$10 assumption is correct for both slugs as of Nov 2026. No slug correction is needed. Consider pinning the dated `openai/gpt-6.1-sol-20260929` slug so behavior and price don't drift silently.
- Older pages show the $0.20 Sonnet cache-read price. Use $0.10 and keep $0.20 as a sensitivity case.

### Gaps

- No full read of the OpenRouter model pages or `/api/v1/models` (domain blocked). The exact `input_cache_read` / `input_cache_write` values OpenRouter publishes for these two slugs are unverified.
- Whether OpenAI actually bills a $2.50 cache _write_ surcharge for GPT-6.1 Sol is reported only by third-party tables. Historically OpenAI caching had no write surcharge. Not verified from openai.com.
- Anthropic's and OpenAI's official pricing pages were not read directly.

## 2. OpenRouter's own fees (markup, credit purchase, BYOK, refunds)

### Takeaway

OpenRouter says it **does not mark up inference**. The fee is charged when you **buy credits**: **5.5% with a $0.80 minimum by card/non-crypto, and 5.0% flat with no minimum by crypto**. Refunds are possible only within 24 h, crypto payments cannot be refunded, and credits can expire after 365 days. The plan's "~6%" is slightly conservative, which is fine.

### Cited Findings

- "They never mark up provider pricing"; inference pricing is passed through, and the fee is charged on credit purchase — [OpenRouter support (snippet)](https://openrouter.ai/support); [OpenRouter contact (snippet)](https://openrouter.ai/contact).
- Fee schedule: **crypto 5.0% flat, no minimum; non-crypto 5.5% of the order, $0.80 minimum** — [OpenRouter blog: Simplifying our platform fee (snippet)](https://openrouter.ai/blog/simplifying-our-platform-fee).
- A claim that the self-serve **Business plan raised the credit fee to 8%** (Sept 2026, for in-region routing) appears only in a secondary source — [TrueFoundry](https://www.truefoundry.com/blog/openrouter-pricing). It is unverified.
- BYOK: sources conflict. One says the first 1M BYOK requests/month are free, then 5% — [TrueFoundry BYOK](https://www.truefoundry.com/blog/openrouter-byok-explained-cheaper-often-faster-and-changing). Another says there is no fee on the first $25K/month of list-price inference — [developersdigest](https://www.developersdigest.tech/llm-gateways/openrouter). OpenRouter has said the 5% BYOK fee will be replaced by a fixed monthly subscription — [OpenRouter blog (snippet)](https://openrouter.ai/blog/simplifying-our-platform-fee). The BYOK fee is paid from OpenRouter credits, so you still pay the purchase fee on those credits — [TrueFoundry BYOK](https://www.truefoundry.com/blog/openrouter-byok-explained-cheaper-often-faster-and-changing).
- Refunds: unused credits can be refunded within 24 h of purchase. Platform fees are not refunded, and crypto payments are non-refundable — [OpenRouter support (snippet)](https://openrouter.ai/support); terms text "within twenty-four (24) hours" as quoted in mirror copies of the terms.
- Expiry: OpenRouter "reserves the right to expire unused credits 365 days after purchase" (terms text as quoted in search results; the official terms page was not read directly) — [OpenRouter FAQ](https://openrouter.ai/docs/faq).

### Inferences

- Effective fee multiplier: card 1.055, crypto/USDC 1.05. The $0.80 card minimum stops mattering for top-ups of at least $14.55 (0.80 / 0.055). Top up in large chunks, and use USDC if treasury operations allow, since it saves 0.5 pp.
- Because refunds are 24 h only and credits can expire after 365 days, buy roughly 1–3 months of runway at a time, not a year.
- BYOK (your own Anthropic/OpenAI keys) removes the 5–5.5% purchase fee on inference but adds the BYOK fee. At low volume it is likely cheaper; terms are in flux.

### Gaps

- The current official BYOK fee/allowance and the Business-plan 8% figure are not verified on openrouter.ai/pricing.
- No official confirmation of card vs. crypto minimum purchase amounts (beyond the $0.80 fee floor).

## 3. Prompt caching through OpenRouter

### Takeaway

Anthropic caching is opt-in via `cache_control` (up to 4 breakpoints, default 5 min TTL, optional `"ttl":"1h"`): writes cost 1.25x (5 m) or 2x (1 h) input, reads $0.10/M. OpenAI caching is automatic. OpenRouter adds **sticky routing** (keyed per account+model+conversation, or by `session_id`) so repeated prefixes hit the same provider's cache; **setting `provider.order` disables sticky routing**. Cache usage shows in `usage.prompt_tokens_details.cached_tokens` and `cache_write_tokens`.

### Cited Findings

- Anthropic on OpenRouter has two modes: automatic (a top-level `cache_control`) and explicit breakpoints (`cache_control` on content blocks, max 4). Default TTL is 5 min; `"ttl": "1h"` extends it. **Automatic mode is honored only when routed to Anthropic directly, not Bedrock or Vertex** — [OpenRouter prompt caching docs (snippet)](https://openrouter.ai/docs/guides/best-practices/prompt-caching.md).
- Sticky routing: after a cached request, OpenRouter routes later requests for the same account/model/conversation to the same provider. It activates only when the provider's cache-read price is below its prompt price, and it falls back to the next-best provider if that one is unavailable — [OpenRouter prompt caching docs (snippet)](https://openrouter.ai/docs/prompt-caching); [OpenRouter blog: Prompt Caching + Sticky Routing (snippet)](https://openrouter.ai/blog/tutorials/prompt-caching-sticky-routing/).
- `session_id`: when set, it becomes the sticky key, and stickiness starts on any successful request, even before a cache hit. Without it, stickiness starts only after a cache hit is detected — [OpenRouter prompt caching docs (snippet)](https://openrouter.ai/docs/guides/best-practices/prompt-caching.md).
- **Sticky routing does not apply when `provider.order` is set manually** — same source.
- Usage fields: `usage.prompt_tokens_details.cached_tokens` (tokens read from cache) and `cache_write_tokens` (tokens written). `cached_tokens > 0` means a hit — same source.
- Minimum cacheable length: sources conflict. OpenRouter docs list 2048 for Sonnet 4.6, while an OpenRouter blog says 1024 for Sonnet 4.6 and 4096 for Opus 4.5+/Haiku 4.5 — [OpenRouter docs/blog (snippets)](https://openrouter.ai/docs/prompt-caching). One blog says 512 tokens for the 5.5 models and 1,024 for Sonnet 5 — [LaoZhang](https://blog.laozhang.ai/en/posts/claude-prompt-caching). Anthropic's docs confirm a per-model minimum exists, below which caching silently doesn't happen, but the table was not visible — [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
- Write/read multipliers for Sonnet 5.5: write 1.25x (5 m, $2.50), 2x (1 h, $4.00); read $0.10 = 0.05x of input after the October cut (previously 0.1x) — see section 1 sources.
- OpenAI GPT-6.1 Sol cached input is $0.10/M (0.05x) — [eesel](https://www.eesel.ai/blog/gpt-6-1-sol-pricing).

### Inferences

- A 5,000-token prefix is well above every reported minimum (512–4096), so the minimum is not a constraint.
- **Use the 5-minute TTL, never 1 h.** The snapshot changes every 60 s tick, so each prefix lives for about one minute and the 2x write would be wasted.
- Prompt layout must be [static system prompt + JSON schema] -> [tick snapshot] -> `cache_control` breakpoint -> [per-vault positions]. Two breakpoints help: one after the static system prompt (it survives across ticks, so it is mostly reads) and one after the snapshot.
- **Hit rate is bounded by decisions per tick.** At most 1 write per tick per provider cache, so hit rate ≈ (k−1)/k for k decisions sharing a tick's snapshot. 30 decisions/vault/day ÷ 1,440 ticks ≈ 0.021 decisions/vault/tick. That gives k ≈ 2 at 100 vaults (≈50%), k ≈ 10 at 500 vaults (≈90%), and k ≈ 21 at 1,000 vaults (≈95%). Batch decisions into fewer ticks (e.g. evaluate a cohort of vaults on the same tick) to raise k.
- **Concurrency race:** requests fired in parallel before the first write completes all miss and all pay the write. Send one "warm" request per tick, await it, then fan out the rest.
- Don't set `provider.order` (it kills sticky routing). Use `session_id = tick-id` (or a fixed id per model) so all vaults in a tick stick to one provider. Use explicit breakpoints rather than automatic mode so caching still works if routed to Bedrock or Vertex.
- Verify caching in code by logging `cached_tokens` and `cache_write_tokens` per call and alarming if the hit rate falls below the expected (k−1)/k.

### Gaps

- Exact minimum cacheable tokens for Sonnet 5.5 and GPT-6.1 Sol are unverified.
- OpenAI's minimum (historically 1,024 tokens, in 128-token increments) and whether OpenAI caching is still fully automatic for GPT-6.1 Sol were not confirmed for Nov 2026.
- Whether Anthropic/OpenAI caches are isolated per OpenRouter customer or shared across OpenRouter's org is not documented in what I could read.
- Whether OpenRouter's response `usage.cost` field reflects cache discounts was not confirmed (the `usage: {include: true}` flag was not found in snippets; it may be deprecated or now always on).

## 4. Structured outputs and provider routing options

### Takeaway

OpenRouter supports `response_format: {type: "json_schema", json_schema: {strict: true, ...}}`, but **support is per endpoint**. Set `provider.require_parameters: true` so you're never routed to an endpoint that ignores the schema. `provider.zdr: true` and `data_collection: "deny"` restrict routing to privacy-safe endpoints. Leave `allow_fallbacks` on and avoid a hard `order`, both for uptime and so sticky caching keeps working.

### Cited Findings

- Setup per the docs: check the model's supported parameters, set `require_parameters: true` in provider preferences, and include `response_format` with `type: json_schema`. The docs recommend `strict: true` — [OpenRouter structured outputs (snippet)](https://openrouter.ai/docs/guides/features/structured-outputs).
- Support is determined per endpoint, not per model, and can change. Some providers enforce the schema while others treat it as a hint. Strict mode may restrict JSON Schema features. An unsupported model or an invalid schema returns an error. There is a response-healing plugin for non-streaming calls — [OpenRouter structured outputs (snippet)](https://openrouter.ai/docs/structured-outputs).
- Provider routing defaults: `allow_fallbacks: true`, `data_collection: "allow"`. `zdr: true` restricts routing to Zero Data Retention endpoints. Unset routing load-balances by price and auto-excludes providers with a recent 30-second outage — [OpenRouter routing docs llms-full.txt (snippet)](https://openrouter.ai/docs/guides/routing/llms-full.txt).
- `order` + `allow_fallbacks: false` = try listed providers only — [Pydantic AI OpenRouter docs](https://ai.pydantic.dev/api/models/openrouter). A third-party post reports that this setup caused a production outage — [Pinggy](https://pinggy.io/amp/blog/openrouter_production_provider_routing_pitfalls/).

### Inferences

- Recommended request: `provider: {require_parameters: true, data_collection: "deny", zdr: true, allow_fallbacks: true}`, no `order`, plus `session_id`. Still validate JSON on our side (zod/ajv) and treat a parse failure as "no trade" for dry-run safety.
- Combining `require_parameters` + `zdr` may shrink the eligible endpoints (e.g. only Anthropic direct for Sonnet, only OpenAI or Azure for Sol). That is acceptable and also stabilizes price.

### Gaps

- Which specific Sonnet 5.5 / GPT-6.1 Sol endpoints support strict `json_schema` and are ZDR-flagged is unverified (needs `/api/v1/models/{id}/endpoints`, which is blocked here).

## 5. Spend limits, credits/key APIs, rate limits

### Takeaway

`GET /api/v1/key` returns the per-key `limit`, `limit_reset` and `limit_remaining` (null = unlimited). Newer docs add `budgets` / `effective_budget`, and the top-level `rate_limit` object is deprecated. Paid-model rate limits are mostly not a constraint. Errors: 402 means out of credits, and 403 or 429 means rate or budget limits.

### Cited Findings

- `GET https://openrouter.ai/api/v1/key` checks a key's remaining credits and rate limit. `limit_remaining` is the per-key remaining amount (null if unlimited). `limit`, `limit_reset` and `limit_remaining` describe the per-key cap, not the account balance — [OpenRouter limits docs (snippet)](https://openrouter.ai/docs/api/reference/limits).
- Newer docs add a `budgets` array and `effective_budget`. The top-level `rate_limit` object is deprecated — [OpenRouter limits docs (snippet)](https://openrouter.ai/docs/limits).
- Platform rate limits mainly cover free models and DDoS protection. Free models: 20 req/min, and 50 vs. 1000 per day depending on whether the account has credits. A 429 from OpenRouter carries X-RateLimit-* headers. 402 = insufficient credits; 403 = rate-limit or budget error; honor Retry-After — [OpenRouter limits docs (snippet)](https://openrouter.ai/docs/limits.md).

### Inferences

- Spend guards in code: (1) a dedicated OpenRouter key per environment with a hard key `limit` (and daily `limit_reset` if offered) as the backstop; (2) our own per-vault ledger summing `usage.cost` (or computing it from token counts × the cached `/models` prices) against 30 decisions/day and a $/day cap; (3) poll `/api/v1/key` (and `/api/v1/credits` for the account balance) every few minutes and halt AI decisions below a threshold; (4) treat 402 or 403 as "pause agent", never as a retry loop.

### Gaps

- The `/api/v1/credits` response shape (`total_credits`, `total_usage`) and the requirement for a provisioning or management key were not confirmed in snippets.
- Whether key `limit_reset` supports a daily reset is not confirmed.

## 6. Per-decision cost arithmetic

### Takeaway

**No caching: $0.01700 raw, $0.01794 with the 5.5% card fee** (both models). The plan's $0.018 is correct. With a 5,000-token cached prefix, Sonnet 5.5 drops to **$0.0142 / $0.0104 / $0.0086** (with fee) at 50/80/95% hit rates, and GPT-6.1 Sol is the same if the $2.50 write is billed, or slightly lower without it. At a 0% hit rate, caching _costs more_ ($0.0206 with fee), just under the $0.022 alarm. Caching breaks even at a ~21% hit rate.

### Cited Findings

- Inputs: $2/M input, $10/M output, $0.10/M cache read, $2.50/M 5-min cache write (sections 1–2 sources); card fee 5.5%, crypto 5.0% — [OpenRouter blog (snippet)](https://openrouter.ai/blog/simplifying-our-platform-fee).

### Inferences (arithmetic; all are computed, not sourced)

Fixed parts: per-vault input 1,000 × $2/M = $0.0020; output 500 × $10/M = $0.0050; together **$0.0070**.

**No caching (both models)**
- 6,000 × $2/M = $0.0120 input + $0.0050 output = **$0.01700**
- × 1.055 (card) = **$0.017935**; × 1.05 (crypto) = $0.017850; × 1.06 (plan) = $0.018020

**Sonnet 5.5, 5,000-token prefix, 5-min TTL** (miss = write: 5,000 × $2.50/M = $0.0125; hit = read: 5,000 × $0.10/M = $0.0005)
cost = 0.0070 + h·0.0005 + (1−h)·0.0125

| hit rate h | raw                                 | +5.5% card | vs no-cache |
| ---------- | ----------------------------------- | ---------- | ----------- |
| 0%         | $0.01950                            | $0.02057   | +15%        |
| 50%        | 0.0070+0.00025+0.00625 = $0.01350   | $0.01424   | −21%        |
| 80%        | 0.0070+0.00040+0.00250 = $0.00990   | $0.01044   | −42%        |
| 95%        | 0.0070+0.000475+0.000625 = $0.00810 | $0.00855   | −52%        |

Break-even vs. no cache: 0.0125 − 0.012h = 0.0100, so h ≈ 20.8%.
Sensitivity at the old $0.20 read price: 50% → $0.01375, 80% → $0.01030, 95% → $0.008575 (raw).

**GPT-6.1 Sol, same prefix**
- If the $2.50/M write is billed (per third-party tables): identical to the Sonnet table above.
- If OpenAI bills no write surcharge (classic behavior; miss = 5,000 × $2/M = $0.0100): cost = 0.0070 + h·0.0005 + (1−h)·0.0100

| hit rate h | raw      | +5.5% card |
| ---------- | -------- | ---------- |
| 0%         | $0.01700 | $0.01794   |
| 50%        | $0.01225 | $0.01292   |
| 80%        | $0.00940 | $0.00992   |
| 95%        | $0.00798 | $0.00841   |

**Per vault per day (30 decisions, card fee):** no cache $0.538; Sonnet at 80% hit $0.313; at 95% hit $0.257.

**Alarm implications**
- $0.022/decision sits 23% above the no-cache cost. With caching on and a 0% hit rate, the cost is $0.0206, so a total cache failure will _not_ trip the alarm. Add a separate alarm on hit rate (cached_tokens/prefix tokens) and consider lowering the cost alarm to roughly $0.015 once caching is live.
- Output is 29% of no-cache cost and about 60–85% of cached cost. If either model emits reasoning or "thinking" tokens billed as output, every 100 extra output tokens adds $0.0010. Cap `max_tokens` and disable or limit reasoning.

### Gaps

- Whether Sonnet 5.5 / GPT-6.1 Sol emit billed reasoning tokens by default via OpenRouter was not researched or verified.
- Real hit rate depends on vaults per tick and on provider stickiness (see section 3). The 50/80/95% scenarios are assumptions.

## 7. Cheaper "cost tier" alternatives

### Takeaway

**Claude Haiku 5.5 (`anthropic/claude-haiku-5.5`) and GPT-6 Luna (`openai/gpt-6-luna`) both list at $0.10 / $0.50 per 1M, with $0.01 cache reads.** That is 20x cheaper than the Sonnet/Sol tier: about **$0.00085 per decision uncached** ($0.0009 with fee). No "GPT-6.1 mini" was found; Luna is OpenAI's small-model line.

### Cited Findings

- Claude Haiku 5.5 on OpenRouter: $0.10/M input, $0.50/M output; model ID `anthropic/claude-haiku-5.5` — [LLM Reference](https://www.llmreference.com/model/claude-haiku-5-5/openrouter); [ComputePrices](https://computeprices.com/providers/openrouter/models/claude-haiku-5-5).
- Haiku 5.5 is tiered: up to 100K tokens it is $0.10 / $0.50 / $0.01 cache read; above 100K it is $0.50 / $2.50 / $0.05 — [mixed-news](https://mixed-news.com/en/?p=35958); [eesel (DE)](https://www.eesel.ai/de/blog/claude-haiku-5-5-preise).
- GPT-6 Luna: $0.10 input, $0.50 output, $0.01 cached input, $0.125 cache write. On OpenRouter it is `openai/gpt-6-luna` at $0.10/$0.50. Above 272K tokens: $0.20 / $0.75 / $0.02 cached — [eesel](https://www.eesel.ai/blog/gpt-6-luna-pricing); [LLM Reference](https://www.llmreference.com/model/gpt-6-luna/openrouter); [codersera](https://codersera.com/blog/gpt-6-luna-complete-guide-2026/).

### Inferences

- Per decision (6K in / 500 out): 6,000 × $0.10/M = $0.0006 + 500 × $0.50/M = $0.00025, total **$0.00085 raw** and $0.00090 with the card fee. With a 95% cached prefix: 1,000 × 0.10/M + 500 × 0.50/M + 0.95 × 5,000 × 0.01/M + 0.05 × 5,000 × 0.125/M (write, Luna) ≈ $0.0001 + $0.00025 + $0.0000475 + $0.00003125 ≈ $0.00043. At this tier output dominates and caching barely matters.
- 6K prompts are far below the 100K and 272K tier cliffs, but a guard on prompt length should hard-fail above 100K for Haiku.
- Option for the plan: a "Lite" tier on Haiku 5.5 / Luna at about $0.027/vault/day (30 decisions), or a two-stage design where the cheap model screens each tick and escalates to Sonnet/Sol only when it proposes a trade.

### Gaps

- Decision-quality trade-offs of Haiku 5.5 / Luna for this task are not researched.
- Whether Haiku 5.5 / Luna endpoints on OpenRouter support strict `json_schema` and ZDR is unverified.
- OpenRouter's own listed cache prices for these two slugs are unverified.
