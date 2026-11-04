# Which LLMs trading agents and trading benchmarks use, and their OpenRouter cost (as of 2026-11-04)

**Method and access limits (read first).**
- **openrouter.ai was blocked.** Both `curl https://openrouter.ai/api/v1/models` (proxy CONNECT 403, policy denial) and WebFetch (host not resolvable in this session) failed. So no slug, price, cache price, `structured_outputs` flag, latency or ZDR flag below comes from OpenRouter's live catalog.
- **Every other fetch was blocked too**: traderank.ai, forklog.com, rockflow.ai and finance.biggo.com could not be resolved. All findings below come from **WebSearch result summaries, not from full pages I read**, so treat each figure as **unverified** unless it says otherwise.
- To finish this work, allow `openrouter.ai` in the session's network settings and pull `/api/v1/models`. Its `pricing.prompt/completion/input_cache_read/input_cache_write` and `supported_parameters` fields answer most of the open price and support questions in one call.
- Sonnet 5.5 and GPT-6.1 Sol were researched in more depth earlier, in `research_notes/Blast Agents unit economics/llm_costs_openrouter.md`. That file is reused here.

## Trading benchmarks and arenas: which models led, and with what caveats?

### Takeaway

- **Alpha Arena is the only widely covered live LLM-trading contest.** It has had only two public seasons, both in late 2025.
  - **Season 1** (crypto perps on Hyperliquid): Qwen3 Max won and DeepSeek V3.1 came second. GPT-5 and Gemini 2.5 Pro lost heavily.
  - **Season 1.5** (US stocks): Grok 4.20, entered as "Mystery Model", won with about +12%.
  - **No 2026 season has public results.**
- Academic benchmarks (Agent Market Arena, StockBench, 2026 crypto backtest-to-live studies) find that **agent design and the test window matter more than the model**.
- The evidence supports offering the model families people actually race (Qwen, DeepSeek, Grok, Claude, GPT, Gemini). It does not support claiming that any model "wins" at trading.

### Cited Findings

**Alpha Arena Season 1 (Oct 18 – Nov 3, 2025; crypto; $10k of real money per model)**
- Season 1 entrants were Claude 4.5 Sonnet, DeepSeek V3.1 Chat, Gemini 2.5 Pro, GPT-5, Grok 4 and Qwen 3 Max — [TradeRank (search summary)](https://www.traderank.ai/blog/alpha-arena-alternatives-2026); [alphaarena.ai](https://www.alphaarena.ai/)
- Hyperliquid hosted the season, with real money — [Bitcoin.com](https://news.bitcoin.com/6-bots-with-real-money-hyperliquid-hosts-first-ever-ai-trading-showdown/)
- Qwen 3 Max finished first: +22.3% return, 30.2% win rate, $2,232 P&L, from only **43 trades**. DeepSeek Chat V3.1 was second at about +4.9% — [RootData](https://www.rootdata.com/news/412456); [iWeaver S1 results](https://www.iweaver.ai/blog/alpha-arena-ai-trading-season-1-results/)
- The headline was "all four major models incurred losses exceeding 30%" (the US models), and "more than half ended up in the red across the six models" — [RootData](https://www.rootdata.com/news/412456); [ForkLog](https://forklog.com/en/four-out-of-six-ai-models-suffer-losses-in-trading-tournament/)
- Mid-season coverage: "DeepSeek & Qwen3 MAX Dominate, As ChatGPT & Gemini Suffer 60%+" drawdowns — [iWeaver](https://www.iweaver.ai/blog/alpha-arena-ai-trader-showdown/)

**Alpha Arena Season 1.5 (about Nov 19 – Dec 3, 2025; US equities including TSLA, NVDA, MSFT, AMZN, GOOGL, PLTR and NDX)**
- The roster was eight models, including GPT-5.1, Claude Sonnet 4.5 and Qwen 3 Max, plus Kimi K2 as a new entrant. It ran several parallel competition "modes" — [GNcrypto](https://www.gncrypto.news/news/alpha-arena-season-1-5-ai-stock-trading-competition/); [ForkLog](https://forklog.com/en/new-season-of-ai-trading-tournament-kicks-off/)
- "Mystery Model", later revealed as **Grok 4.20**, won with about **+12.11%** aggregate over two weeks — [alphaarena.ai](https://www.alphaarena.ai/); [GNcrypto](https://www.gncrypto.news/news/mystery-model-alpha-arena-season-1-5-winner/); [Yahoo Finance](https://finance.yahoo.com/news/elon-musks-grok-4-20-123855766.html)
- The organizer's post gave the order as Grok 4.20 at +12% average, then GPT-5.1, then Gemini 3 — [ForkLog (search summary)](https://forklog.com/en/ai-model-grok-4-2-triumphs-in-trading-tournament/). Another summary instead lists DeepSeek-chat-v3.1 second and GPT-5.1 third, and reports **GPT-5.1 at −3.4% and Gemini 3.0 at −5.7%**. **The sources conflict**, and the conflict is probably about which mode is ranked — [AIbase](https://news.aibase.com/news/23442); [OneDayAdvisor](https://www.onedayadvisor.com/2025/12/nof1ai-alpha-arena-review-season-15.html)
- Grok variants took four of the top six spots. Qwen, the Season 1 champion, did poorly on equities. The final figure is reported as either $12,193 or about $11,060 — [Yahoo Finance](https://finance.yahoo.com/news/elon-musks-grok-4-20-123855766.html); [GNcrypto](https://www.gncrypto.news/news/mystery-model-alpha-arena-season-1-5-winner/)
- One post-season headline: "All Eight Major Models Post Losses in Overtrading Frenzy". I could not fetch it, so its scope (which season or mode) is unverified — [BigGo Finance](https://finance.biggo.com/news/5BSX_Z0BaoGGrU-ID27J)

**2026 seasons**
- On 2026-08-06, TradeRank found no Season 2 roster, results or leaderboard on the public site. The nof1.ai leaderboard is an archive whose equity series ends on 2025-12-12 — [TradeRank (search summary)](https://www.traderank.ai/blog/alpha-arena-alternatives-2026)
- Nof1 said Season 2 would add web search, longer thinking time and more data sources — [ForkLog](https://forklog.com/en/new-season-of-ai-trading-tournament-kicks-off/)
- One mention of a "Season 8 with 13 models" could not be verified — [TradeRank (search summary)](https://www.traderank.ai/blog/alpha-arena-alternatives-2026)

**Other arenas** (not fetched; titles and summaries only)
- RockAlpha, AI Trade Arena, Obside and Rallies.ai "AI Trading Arena" all exist as Alpha Arena alternatives. I got no leaderboards for them — [Rockflow](https://rockflow.ai/blog/best-ai-trading-arena); [OneDayAdvisor Jan 2026](https://www.onedayadvisor.com/2026/01/AI-stock-trading.html); [Flat Circle](https://blog.flatcircle.ai/p/ai-trading-arenas)

**Academic benchmarks**
- **Agent Market Arena** (arXiv 2510.11695; live crypto and stocks) tested GPT-4o, GPT-4.1, Claude-3.5-haiku, Claude-sonnet-4 and Gemini-2.0-flash. Agent frameworks behaved very differently from one another, while **"model backbones contributed less to outcome variation"** — [arXiv](https://arxiv.org/abs/2510.11695); [GitHub](https://github.com/The-FinAI/Agent_Market_Arena)
- A 2026 review finds StockBench outcomes to be "model-, window- and cost-specific". It also says brokerage and crypto platforms' capability claims come with no independent evidence of alpha — [arXiv 2609.04917](https://arxiv.org/html/2609.04917v1)
- "Can AI Make Money in Crypto?" (2026) evaluates 32 methods against BTC buy-and-hold. Its per-model ranking was not visible to me — [arXiv 2609.34510](https://arxiv.org/html/2609.34510v1)
- Other 2026 benchmarks: Quant-Arena ([arXiv 2610.30113](https://arxiv.org/html/2610.30113)), LATTICE for crypto-agent decision support ([arXiv 2604.26235](https://arxiv.org/pdf/2604.26235)) and AlphaForgeBench ([arXiv 2602.18481](https://arxiv.org/pdf/2602.18481)). I did not get their results.

### Inferences

- **The sample sizes are tiny**: one two-week run per season, $10k per model, and dozens of trades (Qwen won Season 1 on 43). Leadership flipped between seasons (Qwen, then Grok; Gemini and GPT lost both times). That pattern is consistent with variance and prompt/regime fit, not stable skill.
- Marketing can honestly say these models "competed in Alpha Arena". It cannot honestly say they "beat the market".
- Memecoin sniping on Sui is a different task from perps or equities. **No benchmark covers it.**
- What we can measure ourselves, and what matters for us, is **JSON validity, latency and cost**.

### Gaps

- No Alpha Arena season in 2026 has verified public results.
- Final per-model returns for Season 1.5 (Claude Sonnet 4.5, Kimi K2) were not found.
- Leaderboards for RockAlpha, AI Trade Arena and Obside were not reachable.
- I found no benchmark of LLMs on memecoin launches or DEX sniping.

## Products: which models power AI crypto trading agents and bots?

### Takeaway

- **Few products disclose their model.**
- What is documented:
  - **Senpi** lets users bring ChatGPT, Claude or Grok.
  - **ElizaOS** is model-agnostic. Its default character config puts the Anthropic and OpenRouter plugins first, and its OpenRouter plugin defaults to Gemini Flash models.
- Writers describe the generic stack as "GPT, Claude or Llama variants".
- OpenRouter's overall usage, and reportedly its finance tag, is led by **DeepSeek V4.1 Flash**, with GPT-5.6 Luna also ranking.

### Cited Findings

- **Senpi** (a Hyperliquid AI trading agent) says users can connect it to ChatGPT, Claude or Grok to read their portfolio and place trades they approve. Permissions are trade-only, and paid plans start at $50/month. It publishes an open-source skills and strategy library — [senpi.ai](https://senpi.ai/); [GitHub senpi-skills](https://github.com/Senpi-ai/senpi-skills); [Bitrue](https://www.bitrue.com/blog/what-is-senpi-ai-crypto)
- **ElizaOS** configures all models through plugins. Its default character lists Anthropic, OpenRouter, OpenAI, Google GenAI and Ollama, with Anthropic and OpenRouter first — [ElizaOS docs](https://docs.elizaos.ai/plugins/llm)
- The ElizaOS OpenRouter plugin defaults to small `google/gemini-2.0-flash-001` and large `google/gemini-2.5-flash-preview-05-20` — [ElizaOS OpenRouter plugin](https://docs.elizaos.ai/plugin-registry/llm/openrouter). An older npm readme says `openai/gpt-4.1-nano` — [npm](https://www.npmjs.com/package/@elizaos/plugin-openrouter). **These defaults are stale**: they are 2025 models.
- An open Eliza issue asks for typed providers for z.ai, Kimi, DeepSeek and xAI, a sign that the community is moving to Chinese open models and Grok — [GitHub issue #24097](https://github.com/elizaOS/eliza/issues/24097)
- **Giza** (ARMA, a stablecoin-yield agent), **Almanak** (an "18-agent AI swarm"), **Wayfinder** and **HeyAnon** do not disclose their model — [aifinance.ink](https://aifinance.ink/); [Crypto Daily, May 2026](https://cryptodaily.co.uk/2026/05/top-4-ai-trading-solutions-redefining-on-chain-execution-in-2026)
- The generic description is that crypto agents typically run "GPT-4, Claude, or Llama variants" — [CopyTradeInsider](https://www.copytradeinsider.com/blog/ai-crypto-agents-2026/). The same source says no public agent framework in 2026 has an audited record of consistent retail profit.
- **OpenRouter usage**: DeepSeek V4.1 Flash leads overall, with figures of 14.89% of tracked tokens (2026-10-19), 37.43T tokens/week (to Oct 14) and 45.5T tokens (Oct 24–30). The sources disagree on volume. Seven of the top ten models are open-weight — [tokenmaxxing](https://tokenmaxxing.com/openrouter-rankings); [presenc.ai](https://presenc.ai/research/openrouter-model-usage-rankings-2026); [teamday](https://www.teamday.ai/blog/top-ai-models-openrouter-2026)
- An OpenRouter collection page shows finance-category ranks: **#1 DeepSeek V4.1 Flash, #6 GPT-5.6 Luna**. Its labels look inconsistent, so this is low confidence — [OpenRouter collections (snippet)](https://openrouter.ai/collections/programming)
- OpenRouter's token-totals dataset API accepts a finance category filter — [OpenRouter docs](https://openrouter.ai/docs/api/api-reference/datasets/daily-token-totals-for-top-50-models)

### Inferences

- In practice, users of crypto agents know the families **Claude, ChatGPT and Grok** by name (Senpi's bring-your-own options, Alpha Arena publicity).
- Builders of cost-sensitive agents use **DeepSeek, and Gemini Flash** as the default.
- A curated set of Claude, GPT, Grok, DeepSeek and Gemini covers both the brand recognition and the cost-driven usage. Qwen is optional, because of its Alpha Arena Season 1 fame.

### Gaps

- **Not found** (no search hits):
  - Model defaults for TradingAgents (TauricResearch)
  - The Virtuals GAME framework's model
  - Coinbase AgentKit examples
  - Cod3x
  - Telegram AI bots
- A real OpenRouter finance-category ranking needs openrouter.ai access.

## Per-family flagship and cheap slugs, prices, strict JSON, ZDR and latency (Nov 2026)

### Takeaway

- **The only verified prices are the ones already in our config**:
  - Sonnet 5.5 and GPT-6.1 Sol are $2/$10, with a $0.10 cache read, per the earlier research notes.
  - Prices for every other family come from aggregator summaries and are often contradictory, so they are **unverified**.
- **For the slugs, `structured_outputs` support and ZDR availability of every non-config model, pull the OpenRouter models API before shipping.**
- OpenRouter charges the provider's list price plus a **5.5% credit-purchase fee** (8% on Business). Add that fee to our cost.

### Cited Findings

**Platform**
- OpenRouter passes provider pricing through. The fee is 5.5% on Standard and 8% on Business — [Layer3Labs](https://www.layer3labs.io/guides/openrouter-pricing); [maximem](https://www.maximem.ai/blog/openrouter-pricing-2026)
- **ZDR** can be enforced per request with `zdr: true`, which routes only to zero-retention endpoints. `data_collection: "deny"` excludes providers that may store data. Some providers retain data without training on it. ZDR does not cover plugins or server tools — [OpenRouter ZDR docs](https://openrouter.ai/docs/guides/privacy/zdr); [OpenRouter ZDR blog](https://openrouter.ai/blog/insights/zero-data-retention/)
- The providers page counts **58 zero-retention, 13 limited-retention and 26 prompt-retaining** providers — [OpenRouter providers](https://openrouter.ai/providers)
- **EU routing**: the base URL `eu.openrouter.ai` keeps traffic and data in Europe — [OpenRouter Sovereign AI](https://openrouter.ai/docs/guides/features/sovereign-ai)
- Provider routing can exclude providers that lack a requested parameter (`require_parameters`) — [OpenRouter provider selection](https://openrouter.ai/docs/guides/routing/provider-selection)

**Per-family prices (USD per 1M tokens)**

| Family              | Slug (in config, or unverified)                       | In / Out                                       | Cache read / write         | Confidence                                                                       | Source                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic premium   | `anthropic/claude-sonnet-5.5` (in config)             | 2 / 10                                         | 0.10 / 2.50 (5-minute TTL) | Verified                                                                         | Prior notes ([OpenRouter compare](https://openrouter.ai/compare/anthropic/claude-sonnet-5/anthropic/claude-sonnet-5.5), [SmartScope cache cut](https://smartscope.blog/en/blog/claude-sonnet-5-5-cache-read-price-cut-2026/)) |
| Anthropic top       | `anthropic/claude-opus-5.5`                           | 2 / 10 (seems low for Opus)                    | ?                          | Unverified                                                                       | [CostGoat (Nov 1, 2026)](https://costgoat.com/pricing/openrouter)                                                                                                                                                             |
| Anthropic budget    | `anthropic/claude-haiku-5.5` (in config)              | 0.10 / 0.50 in config                          | 0.01 / 0.125 in config     | Not independently verified this round                                            | Repo `packages/shared/src/economics.ts`                                                                                                                                                                                       |
| OpenAI premium      | `openai/gpt-6.1-sol` (also a dated slug, `-20260929`) | 2 / 10                                         | Config assumes 0.10        | Verified                                                                         | Prior notes ([LLM Reference](https://www.llmreference.com/model/gpt-6.1-sol/openrouter), [ComputePrices](https://computeprices.com/providers/openrouter/models/gpt-6-1-sol))                                                  |
| OpenAI budget       | `openai/gpt-6-luna` (in config)                       | 0.10 / 0.50 in config                          | ?                          | Not verified. GPT-5.6 Luna is quoted at **0.20 / 1.20** or 1 / 6, which conflict | [costbench](https://costbench.com/software/llm-api-providers/openrouter/); [CostGoat](https://costgoat.com/pricing/openrouter)                                                                                                |
| Google              | Gemini 3.5 Flash; Flash-Lite                          | 1.50 / 9.00; 0.30 / 2.50                       | ?                          | Unverified                                                                       | [morphllm](https://www.morphllm.com/llm-api-pricing)                                                                                                                                                                          |
| xAI                 | Grok 4.7 (Grok 4.6 also listed)                       | 2 / 6 (4 / 12 on long context), or 1.60 / 4.80 | ?                          | Unverified, conflicting                                                          | [intuitionlabs](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025); [aimagicx](https://www.aimagicx.com/blog/llm-api-pricing-comparison-2026)                                                                 |
| DeepSeek budget     | DeepSeek V4.1 Flash (dated build "1017")              | 0.045 / 0.50                                   | ?                          | Unverified                                                                       | [computeprices](https://computeprices.com/providers/openrouter); [costbench](https://costbench.com/software/llm-api-providers/openrouter/)                                                                                    |
| DeepSeek pro        | DeepSeek V4 Pro 0813                                  | 0.66 / 1.98 (DeepSeek's own endpoint)          | ?                          | Unverified                                                                       | [costbench](https://costbench.com/software/llm-api-providers/openrouter/)                                                                                                                                                     |
| Qwen                | Qwen3.8-Max (released 2026-08-03)                     | 2 / 6 (Qwen3.7 Max: 2.50 / 7.50)               | ?                          | Unverified                                                                       | [morphllm](https://www.morphllm.com/llm-api); [spheron](https://www.spheron.network/blog/llm-api-pricing-comparison-gpt-claude-gemini-deepseek-2026/)                                                                         |
| Moonshot            | Kimi K3                                               | 3 / 15                                         | Cached 0.30                | Unverified. Another listing gives 2.50 / 14; K3.1 Pro is 2 / 10                  | [claudeai.directory](https://www.claudeai.directory/llm-api-pricing); [binaryverseai](https://binaryverseai.com/llm-pricing-comparison/)                                                                                      |
| Z.ai                | GLM-5.2 / 5.3                                         | 1.40 / 4.40, or 0.90 / 2.86 via OpenRouter     | ?                          | Unverified                                                                       | [ayautomate](https://www.ayautomate.com/models/pricing); [progressiverobot](https://www.progressiverobot.com/2026/08/13/llm-api-pricing-comparison-2026/)                                                                     |
| Meta Llama, Mistral | —                                                     | —                                              | —                          | No current-generation data found                                                 | —                                                                                                                                                                                                                             |

- Also listed: GPT-OSS-20B at $0.018 / $0.090 — [computeprices](https://computeprices.com/providers/openrouter)

**Cost per decision**
- The calculation uses 1,000 uncached input tokens, 5,000 cache-read tokens and 500 output tokens. It excludes the 5.5% credit fee.
- Where the cache-read price is unknown, all 6,000 input tokens are priced as uncached.

| Model                            | Cost per decision       | Notes                                                                                                          |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sonnet 5.5 / GPT-6.1 Sol         | **$0.0075**             | Uncached: $0.017. A cache write costs about $0.0125 each time the 5,000-token prefix is refreshed (Anthropic). |
| Kimi K3 (0.30 cache)             | about $0.012            |                                                                                                                |
| Grok 4.7 at 2 / 6                | about $0.015 uncached   |                                                                                                                |
| Qwen3.8-Max                      | about $0.015 uncached   |                                                                                                                |
| Gemini 3.5 Flash                 | about $0.0135 uncached  | Its cache price would lower this a lot.                                                                        |
| GLM-5.2 at 0.90 / 2.86           | about $0.0068 uncached  |                                                                                                                |
| DeepSeek V4 Pro                  | about $0.0050 uncached  |                                                                                                                |
| DeepSeek V4.1 Flash              | about $0.00052 uncached |                                                                                                                |
| Haiku 5.5 / Luna (config prices) | about $0.0004           |                                                                                                                |

### Inferences

- With uncached prices, the Chinese flagships (Qwen Max, Kimi K3) cost about the same as Sonnet 5.5 or GPT-6.1 Sol with caching. **Anthropic's and OpenAI's discounted cache reads change the comparison**, so on our cache-heavy prompt the premium US models are cheaper than their sticker price suggests.
- If Gemini 3.5 Flash really costs $1.50 / $9, it is not a budget model. Flash-Lite would be the budget Google model.
- If Grok bills reasoning tokens by default, its effective output cost could be several times the quoted rate. Disable or cap reasoning and measure.

### Gaps

- **Missing for every model outside our config**: verified OpenRouter slugs, cache-read and cache-write prices, the `structured_outputs` flag, p50 latency or throughput, and ZDR endpoint availability. openrouter.ai was blocked, so I could not check any of them.
- No data was found on Meta Llama's or Mistral's current flagships on OpenRouter.
- Whether Haiku 5.5 and gpt-6-luna really cost $0.10 / $0.50 was not re-verified. The GPT-5.6 Luna price quoted elsewhere ($0.20 / $1.20) is higher.

## Practical cautions, and a recommended lineup

### Takeaway

- **Lineup**: two premium models, three standard, two budget.
  - **Premium**: Claude Sonnet 5.5, GPT-6.1 Sol.
  - **Standard**: Grok 4.x fast or current, Gemini 3.5 Flash, DeepSeek V4 Pro.
  - **Budget**: DeepSeek V4.1 Flash, plus one of Claude Haiku 5.5 or GPT-6 Luna.
  - **Optional**: Qwen3.8-Max, as an "Alpha Arena S1 winner" model.
- **Route every request with**:
  - `zdr: true`
  - `data_collection: "deny"`
  - `require_parameters: true` (`response_format` json_schema)
  - Preferably `eu.openrouter.ai`
- **Pin non-China-hosted providers for DeepSeek, Qwen and Kimi.**

### Cited Findings

- ZDR, the data-collection setting and EU routing are request-level controls, and some providers retain prompts — [OpenRouter ZDR](https://openrouter.ai/docs/guides/privacy/zdr); [OpenRouter providers](https://openrouter.ai/providers); [Sovereign AI](https://openrouter.ai/docs/guides/features/sovereign-ai)
- OpenRouter's top model by volume is DeepSeek V4.1 Flash, open-weight and therefore served by many hosts — [tokenmaxxing](https://tokenmaxxing.com/openrouter-rankings)
- DeepSeek's quoted price ($0.66 / $1.98) is for **DeepSeek's own endpoint**, which is China-hosted. Third-party hosts may charge different prices — [costbench](https://costbench.com/software/llm-api-providers/openrouter/)
- Alpha Arena shows which families have public credibility as traders: Qwen and DeepSeek in Season 1, Grok in Season 1.5 — see section 1.

### Inferences

- **Recommended lineup**, with the fee to charge per decision. The suggested charge is roughly 2–3x cost after the 5.5% OpenRouter fee, so that it covers retries and cache misses.

| Tier     | Model                          | Why                                                                                            | Cost per decision      | Suggested charge                  |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------- |
| Premium  | Claude Sonnet 5.5              | Known brand; competed in Alpha Arena; reliable strict JSON (Anthropic structured outputs)      | $0.0075 (cached)       | About $0.02                       |
| Premium  | GPT-6.1 Sol                    | Known brand; GPT entrants lost in both Alpha Arena seasons, which is worth disclosing honestly | $0.0075                | About $0.02                       |
| Standard | Grok 4.x                       | Alpha Arena S1.5 winner; Senpi bring-your-own option. Check the reasoning-token billing        | About $0.015 uncached  | Set once the verified price is in |
| Standard | Gemini 3.5 Flash               | ElizaOS defaults to Gemini Flash; large ecosystem                                              | About $0.0135 uncached | Set once the verified price is in |
| Standard | DeepSeek V4 Pro                | Alpha Arena S1 runner-up family                                                                | About $0.005           | Set once the verified price is in |
| Budget   | DeepSeek V4.1 Flash            | No. 1 on OpenRouter by tokens and reportedly No. 1 in finance                                  | About $0.0005          | Set once the verified price is in |
| Budget   | Claude Haiku 5.5 or GPT-6 Luna | Strict-JSON reliability on a US host                                                           | About $0.0004          | Set once the verified price is in |

- **Qwen3.8-Max** is a marketing play for the Alpha Arena Season 1 winner. Offer it only if a non-Alibaba ZDR provider supports it with json_schema.
- **Kimi K3** is expensive ($3 / $15) and has no trading evidence, so skip it.
- **GLM** has no trading evidence, so skip it.
- Llama and Mistral have no trading evidence and no current data, so skip them. Mistral could serve as an EU-sovereignty option later.

**Cautions**
1. **Strict JSON**: only list models whose OpenRouter endpoints advertise `structured_outputs`. Use `require_parameters: true` so that OpenRouter never falls back to a provider that only supports `json_object` or plain text. Keep our schema validation and a retry budget; open-weight hosts vary.
2. **Reasoning tokens**: reasoning-default models (Grok, DeepSeek reasoning variants, Kimi thinking, GPT "Sol"-class) can multiply output billing. Set `reasoning: {effort: "low"}` or exclude it, and record actual `usage.completion_tokens` per decision.
3. **China-hosted endpoints** (DeepSeek's own API, Alibaba, Moonshot, Z.ai): for an EU business these bring GDPR third-country transfer issues and possible data retention. Use them only through US or EU third-party hosts with ZDR. This is an inference; I found no source on the specific providers' terms.
4. **Benchmark claims**: don't market any model as a "proven trader". The Alpha Arena samples are too small, and the academic results say the agent design dominates.

### Gaps

- **Not verified for any candidate**: per-model ZDR endpoint availability, json_schema support and latency. openrouter.ai was blocked.
- I found no sources on the terms DeepSeek, Alibaba or Moonshot offer through OpenRouter (retention, hosting region).
- I found no data on structured-output failure rates by model.
