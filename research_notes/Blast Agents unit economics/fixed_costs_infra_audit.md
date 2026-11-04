# Fixed operating costs for Blast Agents (infra, RPC, KMS, Enoki, audit, legal) as of Nov 2026

Method note: all vendor figures below come from WebSearch result snippets (vendor pages plus third-party 2026 pricing guides). WebFetch could not reach any outside host in this session: enoki.mystenlabs.com, docs.shinami.com, docs.blockvision.org and aws.amazon.com all failed DNS resolution. So no vendor pricing page was read in full. Treat every number as "reported in 2026 sources, not checked on the live page". To verify, those hosts need to be allowed in the session's network settings. Prices are in USD unless marked EUR.

Request-volume model. This is an assumption, used for every RPC row:
- Ticks per vault per month = 60 × 24 × 30 = **43,200**.
- Vault reads = N × (3–6) × 43,200:
  - 100 vaults: 13.0M–25.9M
  - 500 vaults: 64.8M–129.6M
  - 2,000 vaults: 259M–518M per month
- Shared market snapshot of ~25 launches per tick:
  - Unbatched (25 calls/min): ~1.08M per month
  - Batched (1–2 multi-get calls/min): ~0.05–0.1M per month
- Event polling at ~1 request/s: ~2.6M per month.
- Trade simulations at an assumed ~5 trades per vault per day: 100 vaults ≈ 15k, 2,000 vaults ≈ 300k per month. That is negligible next to polling.
- **Total ≈ 17–30M per month (100 vaults), 68–133M (500), 263–522M (2,000).**
- Average request rate ≈ 5–10 rps, 25–50 rps and 100–200 rps. Peaks are higher if all vaults tick in the same second.

## Sui RPC providers: pricing, limits, gRPC, and the plan needed at 100 / 500 / 2,000 vaults

### Takeaway

The RPC line scales with vault count, which makes it the line most likely to break the ~$1,000/month estimate:
- At 100 vaults (~17–30M requests/month) a $49–$199 plan is enough.
- At 500 vaults (~70–130M) you need about a $499 plan.
- At 2,000 vaults (~260–520M), naive per-vault polling costs about $1,100–$3,700/month on request-priced plans (Chainstack, QuickNode). It costs roughly $300–$1,000 on gRPC-per-call pricing (Ankr), or a dedicated or self-hosted node.

Two platform changes affect provider choice. Sui's JSON-RPC is decommissioned, so you must use gRPC or GraphQL. Shinami's Sui Node Service was scheduled to sunset on 1 June 2026.

### Cited Findings

- **Sui platform: JSON-RPC is gone.** The public `fullnode.<network>.sui.io` endpoints are rate-limited and meant for development and public-good use, not production. The Mainnet JSON-RPC shutoff has already taken effect. The guide lists full decommission of JSON-RPC from full nodes, including code removal, for mid-October 2026. Sui's advice is to "run your own Sui full node or contract with a provider for a dedicated gRPC or GraphQL endpoint" — [Sui JSON-RPC Migration Guide](https://docs.sui.io/develop/accessing-data/json-rpc-migration).
  - Earlier Sui docs gave other dates ("April 2026" end of migration; "migrate to gRPC or GraphQL by July 2026") — [Sui gRPC overview](https://docs.sui.io/concepts/grpc-overview); [Sui data serving](https://docs.sui.io/concepts/data-access/data-serving).
- **Public endpoints.** Provider pages describe public Sui gRPC/JSON-RPC endpoints as limited to about 5 rps and "strictly rate-limited… not for production traffic" — [OnFinality Sui endpoints](https://onfinality.io/en/networks/sui). I found no official numeric limit for Mysten's public node.
- **Shinami.**
  - The pricing page showed a free tier of 50,000 requests per day per network. Pay-as-you-go was $0.00001 per request above that, i.e. $10 per million — [Shinami Sui pricing](https://shinami.com/pricing/sui).
  - Shinami's billing FAQ said it is **sunsetting its Sui Node Service on 1 June 2026** — [Shinami Sui billing FAQ](https://docs.shinami.com/help-center/billing/sui-faq). I could not confirm its status after that date. Do not plan on Shinami for RPC.
- **BlockVision.**
  - Compute-unit table:
    - Free: $0, 10M CU/month
    - Lite: $29, 100M CU, 500 CU/s
    - Basic: $99, 600M CU
    - Pro: $199, 1.5B CU
  - gRPC is available on Lite and above, not on Free. Sui JSON-RPC and gRPC calls each cost 50 CU. Streaming (SubscribeCheckpoints) bills per byte, with a minimum of 50 CU per message — [BlockVision rate limits & CUs](https://docs.blockvision.org/reference/rate-limits-and-compute-units); [BlockVision gRPC for Sui](https://docs.blockvision.org/reference/grpc-for-sui).
  - At 50 CU per call, Lite works out to about 2M calls per month and about 10 calls/s — [OnFinality comparison](https://onfinality.io/en/compare/best-sui-rpc-providers).
  - **Conflict:** the same BlockVision page also shows a requests-per-month table (Free 200k; Lite 2M; Basic 12M; Pro 40M; 5–40 rps) — [BlockVision rate limits](https://docs.blockvision.org/reference/rate-limits-and-compute-units). The two tables imply Pro ≈ 30M or 40M calls per month.
- **Chainstack.**
  - Plans: Growth $49/month for 20M requests; Pro $199 for 80M; Business $499 for 200M.
  - Overage runs from $20 per extra million (Developer) down to $10 (Business).
  - On Sui, every request costs 1 RU, whether gRPC, GraphQL or JSON-RPC. That is about $2.45–$2.50 per million on plan — [Chainstack best Sui RPC providers 2026](https://chainstack.com/best-sui-rpc-providers-2026/); [Chainstack Sui](https://chainstack.com/build-better-with-sui/).
- **QuickNode.**
  - Plans: Build $49/month for 80M credits at 50 rps; Accelerate $249 for 450M at 125 rps; Scale $499 for 950M at 250 rps; Business $999. Annual billing is 15% cheaper.
  - The Scale tier reportedly rose from $299 to $499 in July 2026.
  - Credit cost per Sui call is disputed: 40 credits per Sui method in one source, "gRPC 10 credits/call + transfer" in another. There is no permanent free plan, only a 30-day trial with 10M credits — [Costbench QuickNode](https://costbench.com/software/blockchain-nodes/quicknode/); [QuickNode pricing](https://www.quicknode.com/pricing); [SwiftNodes on QN credits](https://swiftnodes.io/blog/quicknode-api-credits).
- **Ankr.** gRPC calls cost 10 credits, about **$1 per million calls**, plus $0.50/GB bandwidth in both directions. HTTP calls cost 200 credits, about $20 per million — [Dwellir best Sui RPC 2026](https://www.dwellir.com/blog/best-sui-rpc-providers); [Ankr Sui](https://ankr.com/web3-api/chains-list/sui).
- **Dwellir.** One source reports about $1.96 per million on the $49 Developer plan with flat 1:1 pricing. Another says $5 per million responses beyond the allowance. These conflict — [Dwellir blog](https://www.dwellir.com/blog/best-sui-rpc-providers); [OnFinality comparison](https://onfinality.io/en/compare/best-sui-rpc-providers).
- **Triton.** I found no Sui pricing. Solana figures are $10 per million calls plus $0.08/GB, with a $125 minimum deposit — [Triton Sui gRPC docs](https://docs.triton.one/chains/sui/grpc); [Chainstack 2026](https://chainstack.com/best-sui-rpc-providers-2026/).
- **Which providers offer gRPC.** Sui's provider list shows gRPC on mainnet for BlockVision (no GraphQL, no archival) and for QuickNode (gRPC, GraphQL, archival) — [Sui RPC providers](https://docs.sui.io/develop/accessing-data/rpc-providers).

### Inferences

**Plan fit with naive polling** (3–6 separate reads per vault per tick):

| Vaults | Requests/month | Cheapest fitting plan                                                                   | Expected    | High                                                         |
| ------ | -------------- | --------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| 100    | 17–30M         | Ankr ≈ $20–60 incl. bandwidth; Chainstack Pro $199; BlockVision Pro $199 (30–40M calls) | **~$200**   | QuickNode Scale $499                                         |
| 500    | 68–133M        | Ankr ≈ $70–250; Chainstack Business $499 (200M)                                         | **~$500**   | QuickNode Business $999+                                     |
| 2,000  | 263–522M       | Ankr ≈ $260–520 + bandwidth ≈ $400–1,000; dedicated or self-hosted node                 | **~$1,500** | Chainstack Business $499 + 63–322M × $10 = **$1,130–$3,720** |

- The Ankr bandwidth figure assumes ~1–2 KB per response. That is my assumption.
- Simulation (dev-inspect / dry-run via gRPC `SimulateTransaction`) is billed like any other call by Chainstack, BlockVision and Ankr. At one per trade it is cost-irrelevant. It matters only if every tick simulates.
- **The biggest lever is architecture, not the vendor.** Two changes cut 2,000-vault traffic by one to two orders of magnitude:
  - Batch vault reads with gRPC batch/multi-get (e.g. one call per 50–100 objects).
  - Replace polling with a single checkpoint subscription stream (BlockVision bills streams per byte, with a 50 CU minimum per message).

  With both, 2,000 vaults ≈ 5–20M calls/month, which is about $50–$200. **Recommendation: budget RPC as N-dependent (~$200 → ~$500 → ~$1,500 naive), and make batching or streaming a launch requirement.**
- Pricing on a request-weighted provider (QuickNode at 40 credits per call) makes the polling design expensive: 950M credits ≈ 24M Sui calls for $499.

### Gaps

- No official numeric rate limit for `fullnode.mainnet.sui.io`.
- Shinami's post-June-2026 status was not checked.
- Triton's Sui pricing was not found.
- QuickNode's Sui gRPC credit weight conflicts (10 vs 40 credits per call).
- BlockVision's two tables conflict.
- Self-hosted Sui full node hardware and hosting cost was not found in this session. My unsourced estimate is ~$400–$1,000/month for a bare-metal node, plus ops time. Verify against Sui's full-node hardware requirements: [Sui Full Node Configuration](https://docs.sui.io/operators/full-node/sui-full-node).

## Mysten Enoki: zkLogin and sponsored transactions

### Takeaway

- Enoki has a free Sandbox tier.
- Paid use reportedly "starts at $100" for up to 400k sponsored transactions, with $0.001 per transaction overage and **unlimited zkLogin MAU**.
- A "Starter" tier is marked "coming soon". It is described with 100k sponsored transactions and up to a $100 sponsorship budget, and its feature list includes "live mainnet apps", which suggests a paid tier is needed for mainnet.
- Budget **$0 (low), $100 (expected), $100–$400 (high)** per month. Sponsored-transaction gas is billed separately in SUI terms.

### Cited Findings

- Sandbox: free, for testing, 3 team seats, unlimited standard ID providers — [Enoki pricing](https://enoki.mystenlabs.com/pricing).
- Starter ("coming soon"): 100K sponsored transactions, sponsorship budget of up to $100 in SUI-equivalent, unlimited seats, live mainnet apps — [Enoki pricing](https://enoki.mystenlabs.com/pricing).
- Paid bundle "starting at $100": up to 400,000 sponsored transactions, $0.001 per transaction overage, unlimited zkLogin monthly active users. Above that there is a custom plan with a negotiated budget, transaction count and support — [Enoki pricing](https://enoki.mystenlabs.com/pricing); [Enoki home](https://enoki.mystenlabs.com).
- Enoki sets the gas budget for sponsored transactions. Per-transaction and per-user caps are set in the Developer Portal — [Enoki sponsored transactions docs](https://docs.enoki.mystenlabs.com/ts-sdk/sponsored-transactions).
- The FAQ mentions a "sponsored transaction provisioning fee" and whether credits expire. I could not read the answers — [Enoki FAQ](https://docs.enoki.mystenlabs.com/faq).

### Inferences

- Blast Agents' operator key signs trades itself, so Enoki sponsorship is optional. Users need zkLogin only for sign-in and the owner-side actions (deposit, cap changes). At 2,000 vaults, owner transactions are likely well below 100k per month, so the base tier would cover them.

### Gaps

- Whether mainnet zkLogin without sponsorship needs a paid tier.
- The size of the provisioning fee.
- Whether the "$100" bundle includes the sponsored gas or only the service. The pricing page was not readable here.

## Managed Postgres, Redis and hosting (Vercel, workers)

### Takeaway

At these scales, the app infrastructure excluding RPC is cheap:
- ~$80–$250/month at 100 vaults
- ~$150–$500 at 500 vaults
- ~$300–$1,200 at 2,000 vaults

The hidden trap is **BullMQ on per-command Redis pricing**. At 2,000 vaults ticking per minute, BullMQ generates on the order of 10⁸–10⁹ commands per month, so use a fixed-price or self-hosted Redis.

### Cited Findings

- **Vercel Pro:** $20/month platform fee with $20 of usage credit and 1 deploying seat. Extra deploying seats are $20 each; viewer seats are free. 1M function invocations/month are included, then from $0.60 per million. Active CPU is $0.128/hour beyond 5 hours included — [Vercel Pro plan docs](https://vercel.com/docs/plans/pro-plan); [Vercel pricing](https://vercel.com/pricing); [MakerKit Vercel cost 2026](https://makerkit.dev/blog/saas/vercel-cost).
- **Supabase Pro:** from $25/month, including $10 of compute credits (as of Oct 2026) — [MakerKit Supabase pricing](https://makerkit.dev/blog/saas/supabase-pricing).
- **Neon:** usage-based with no base fee. The Launch plan bills $0.106 per CU-hour plus $0.35 per GB-month of storage. One March 2026 source lists an older "Scale from $5 + usage" tier — [Draxlr Supabase vs Neon](https://www.draxlr.com/blogs/supabase-vs-neon/); [DesignRevision](https://designrevision.com/blog/supabase-vs-neon).
- **Railway Pro:** $20/month per seat with $20 of usage credit — [CodelessSync comparison](https://codelesssync.com/blog/supabase-vs-neon-vs-railway-postgresql-for-saas).
- **Fly.io:** pure per-second usage. One Oct 2026 example: $2.19 for a small machine plus $38 for Managed Postgres per month, plus $0.28/GB of database storage — [Prisma hosting comparison 2026](https://www.prisma.io/blog/app-hosting-platforms-with-managed-postgres-2026); [ExpressTech Render vs Railway vs Fly](https://expresstech.io/render-vs-railway-vs-fly-io-2026-pricing-showdown/).
- **Upstash Redis:**
  - Pay-as-you-go is $0.20 per 100K commands. Fixed plans with no per-command charge run from $10/month (250 MB) to $1,500. The Prod Pack add-on is $200/month per database — [Upstash billing](https://upstash.com/docs/redis/overall/billing); [Upstash Redis pricing](https://upstash.com/pricing/redis.md).
  - Upstash's own docs say **BullMQ polls Redis even when idle and recommend a Fixed plan**. A community user measured 445 requests in 5 minutes from one idle queue and worker. Idle EVALSHA writes were reportedly still billed — [Upstash BullMQ integration](https://upstash.com/docs/redis/integrations/bullmq); [Bull discussion #2422](https://github.com/OptimalBits/bull/discussions/2422).
- **Redis Cloud Essentials:** memory-priced. About $5/month for 250 MB and $18/month for 1 GB (per an Upstash-authored blog); an aggregator lists about $7 for 250 MB. Essentials is "designed for low-throughput scenarios" — [Upstash on Redis Cloud pricing 2026](https://upstash.com/blog/redis-cloud-pricing-in-2026-plans-costs-and-real-examples); [Redis Cloud Essentials plan details](https://docs.redis.io/docs/latest/operate/rc/subscriptions/view-essentials-subscription/essentials-plan-details).

### Inferences

**Line-item estimates per month** (Low / Expected / High). These are my estimates built from the prices above:

| Line                                          | 100 vaults    | 500 vaults     | 2,000 vaults    |
| --------------------------------------------- | ------------- | -------------- | --------------- |
| Web (Vercel Pro, 1–3 seats)                   | 20 / 40 / 100 | 20 / 40 / 150  | 40 / 100 / 300  |
| API + workers (Railway / Fly / ECS)           | 10 / 50 / 150 | 30 / 100 / 300 | 100 / 250 / 600 |
| Postgres 16 (Supabase / Neon / Fly MPG / RDS) | 25 / 50 / 120 | 50 / 100 / 250 | 100 / 250 / 600 |
| Redis for BullMQ (fixed or self-hosted)       | 10 / 20 / 60  | 10 / 50 / 200  | 20 / 100 / 400  |

- An always-on Neon 1 CU ≈ 730 h × $0.106 ≈ $77/month plus storage.
- **BullMQ on Upstash pay-as-you-go would be ruinous at scale.** 2,000 jobs/min ≈ 86M jobs/month. At about 5–10 commands per job that is ~430–860M commands, or **$860–$1,720/month** at $0.20 per 100k. Use a fixed plan, Redis Cloud, or a Redis/Valkey container next to the workers.
- Worker CPU is driven mainly by deserialising RPC responses and LLM I/O. At 2,000 vaults (33 vault-ticks/s), 2–4 vCPU should suffice. This is an assumption.

### Gaps

- AWS RDS, ElastiCache and Crunchy Bridge prices were not retrieved in this session.
- Render pricing was not retrieved.
- Worker CPU per tick has not been measured. Benchmark the agent-core tick to replace the assumption.

## KMS operator signing key (AWS KMS / GCP Cloud KMS)

### Takeaway

KMS is negligible:
- About $1 per key-month plus about $0.15 per 10k asymmetric signs.
- 200k signatures/month ≈ **$3**, so budget $1–$10/month.
- AWS KMS has supported **Ed25519 (`ECC_NIST_EDWARDS25519`) since Nov 2025**, and has long supported secp256k1 (`ECC_SECG_P256K1`).
- GCP's elliptic-curve signing appears to cost about $0.15 per 10k.

### Cited Findings

- AWS added Ed25519 (EdDSA) in November 2025 with the `ECC_NIST_EDWARDS25519` key spec, which is for signing and verification only. Supported algorithms are `ED25519_SHA_512` (MessageType RAW) and `ED25519_PH_SHA_512` (DIGEST) — [AWS What's New, Nov 2025](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-kms-edwards-curve-digital-signature-algorithm/); [AWS KMS key spec reference](https://docs.aws.amazon.com/us_en/kms/latest/developerguide/symm-asymm-choose-key-spec.html).
- AWS KMS charges $1 per month per customer-managed key, and $0.15 per 10,000 asymmetric requests except RSA 2048. These figures come from a 2022 AWS deck plus 2026 guides — [AWS re:Inforce 2022 DPP331](https://d1.awsstatic.com/events/aws-reinforce-2022/DPP331_Best-practices-for-cutting-AWS-KMS-costs-using-Amazon-S3-bucket-keys.pdf); [Cloudburn AWS KMS pricing](https://cloudburn.io/blog/aws-kms-pricing); [AWS KMS pricing](https://aws.amazon.com/kms/pricing/).
- **Conflict on the free tier:** AWS's pricing page mentions 20,000 free requests/month, but third-party calculators say asymmetric operations are excluded — [Cloudburn calculator](https://cloudburn.io/tools/aws-kms-pricing-calculator).
- GCP Cloud KMS lists cryptographic operations at $0.03 and $0.15 per 10k. The zh-CN page assigns ~$0.156 per 10k to elliptic-curve keys — [GCP KMS pricing](https://cloud.google.com/kms/pricing); [GCP KMS pricing zh-CN](https://cloud.google.com/kms/pricing?hl=zh-cn).

### Inferences

- **AWS cost at different volumes:** 10k sigs = 1 key + $0.15 ≈ $1.15; 200k sigs ≈ $1 + $3 = $4. Add a second key for staging or rotation and it is still under $10/month.
- **Ed25519 caveat:** Sui signs the Blake2b digest of the intent message. With AWS Ed25519, use `ED25519_SHA_512` with MessageType RAW (pure EdDSA over the 32-byte digest). The pre-hash variant (Ed25519ph) produces signatures Sui will not accept. Verify this with a testnet transaction. secp256k1 via `ECC_SECG_P256K1` + ECDSA_SHA_256 is the long-proven path, but Sui requires low-S normalisation.
- AWS KMS request quotas (rps) should be fine at 1–10 signs/s. Not verified.

### Gaps

- No primary source fetched confirming the exact 2026 AWS asymmetric price for ECC.
- GCP key-version monthly fee and GCP Ed25519/secp256k1 support were not confirmed in this session.

## Monitoring, alerting and notifications

### Takeaway

Monitoring costs $0–$150/month at 100 vaults and $50–$500 at 2,000 vaults. The cost comes from logs, traces and series volume, not seats. Telegram alerts are free. Transactional email is $0–$35/month at these volumes.

### Cited Findings

- **Grafana Cloud Pro:** $19/month platform fee plus usage. One source puts logs and traces at ~$0.50/GB and metrics at ~$6.50 per 1k series. Visualization users beyond the first three cost $8 each. One aggregator conflicts, saying "$19 per user" — [Motadata Grafana Cloud pricing](https://www.motadata.com/blog/grafana-cloud-pricing); [Stackscored](https://www.stackscored.com/pricing/observability/grafana-cloud/); [Costbench](https://costbench.com/software/observability/grafana-cloud/).
- **Sentry:** Team $26/month (50K errors), Business $80/month (100K errors), as verified in May 2026 — [Better Stack: Grafana Cloud vs Sentry](https://betterstack.com/community/comparisons/grafana-cloud-vs-sentry/); [Subrupt Sentry alternatives](https://subrupt.com/alternatives/sentry).
- **Better Stack:** the entry paid tier is reported as $24/month (Freelancer) or $34/month (Responder), depending on which plan is counted — [Better Stack comparison](https://betterstack.com/community/comparisons/grafana-cloud-vs-sentry/).

### Inferences

**Estimates per month** (Low / Expected / High):

| Line                                                                            | 100 vaults   | 500 vaults    | 2,000 vaults   |
| ------------------------------------------------------------------------------- | ------------ | ------------- | -------------- |
| Monitoring stack (Grafana Free/Pro + Sentry Team + Better Stack uptime/on-call) | 0 / 50 / 150 | 20 / 80 / 250 | 50 / 150 / 500 |
| Email (Resend/Postmark entry tiers)                                             | 0 / 20 / 35  | 0 / 20 / 50   | 20 / 35 / 100  |

- The 2,000-vault monitoring figure assumes one log line per tick: 86M lines ≈ 20–80 GB/month at ~$0.50/GB.
- The email figures are an assumption; see Gaps.
- Telegram Bot API costs $0. That is general knowledge, not fetched this session.

### Gaps

- Resend and Postmark 2026 prices were not retrieved.
- Datadog was not retrieved. It is typically much costlier per host plus logs, but that is not sourced here.

## Move audit pricing for a ~500-line Sui package, and bug bounty costs

### Takeaway

A ~500-line, single-module vault is about a 1–2 auditor-week job:
- Reported 2026 rates imply roughly **$10k–$40k** at mid/top-tier Move firms. The OtterSec project range is reported at $20k–$150k with 4–10 week lead times, and top firms run $20k–$25k per engagement-week.
- **$25k is a reasonable "expected" figure**, but plan on $5k–$15k extra for a fix review or a re-audit after changes. Low ≈ $8k (boutique or AI-assisted), high ≈ $50k (a top-tier firm with two auditors, or formal verification).
- An Immunefi bounty adds roughly a 10% platform fee on payouts. The reward pool is a contingent reserve (critical cap of ~$10k–$50k for a small protocol), not a monthly cost.

### Cited Findings

- **Per-line rates:**
  - Tier 1 firms: ~$15–$40 per line of Solidity; Tier 2: $5–$15 per line — [Zealynx audit pricing 2026](https://www.zealynx.io/research/audit-ops/audit-pricing-2026).
  - Another guide says $50–$300 per line, which conflicts with the above — [SmartContractAudit.com pricing 2026](https://www.smartcontractaudit.com/guides/smart-contract-audit-pricing-2026).
  - An AI-assisted vendor quotes Move at $4.50 per SLOC with a $2,250 minimum — [RedVolt 2026](https://www.redvolt.ai/blog/smart-contract-audit-cost-2026-complete-pricing-guide).
- **Weekly rates:** ~$25k per engagement-week for Trail of Bits / OpenZeppelin and ~$20k per week for Runtime Verification (secondary source); one boutique quotes $6,000 per auditor-week — [7BlockLabs 2026](https://www.7blocklabs.com/blog/smart-contract-audit-cost-range-2026-and-trail-of-bits-smart-contract-audit-cost-benchmarks); [Zealynx](https://www.zealynx.io/blogs/what-smart-contract-audits-actually-cost).
- **OtterSec:** a reported $20K–$150K per project with a 4–10 week wait. **Zellic:** grouped with top-tier researchers at $80K–$300K+ "for the same scope" — [Zealynx / Weiblocks 2026 guides](https://weiblocks.io/smart-contract-audit-cost-guide-2026/); [Procur3](https://procur3.io/blog/smart-contract-audit-cost-2026).
- **Move premium:** Move and other non-EVM chains carry a reported 20–60% (or 30–45%) premium over EVM — [Weiblocks](https://weiblocks.io/smart-contract-audit-cost-guide-2026/); [Pharos](https://pharosproduction.com/insights/engineering/smart-contract-audit-cost/).
- **Sui's audit partners:** Sui named OtterSec and Zellic as ecosystem audit partners — [Sui blog: security audits & Move Registry](https://blog.sui.io/security-audits-and-move-registry/). MoveBit is reported to have audited 9 of the top 10 Sui TVL projects — [thegrid.id MoveBit](https://thegrid.id/profiles/movebit).
- None of OtterSec, Zellic, MoveBit, Asymptotic, OpenZeppelin, Trail of Bits or Certora publishes rate cards. All sources above are vendor or marketing guides.
- **Immunefi:** an annual subscription "removes the 10% platform fee on payouts" for a flat yearly fee, so the default model is about 10% of each payout. Exact fees are quote-based — [Immunefi bug bounty program](https://immunefi.com/bug-bounty-program/); [m3dython Immunefi review 2026](https://m3dython.com/blog/immunefi-review-2026).
  - The median critical bounty is $20,000 — [Immunefi on X](https://x.com/immunefi/status/2062543462939963867). The median across all payouts is about $2,000 — [hoge.gg 2026](https://hoge.gg/bug-bounty-payouts-2026-sticker-price-receipt/).
  - Program caps range from about $50K up to $10M for bridges and L1s — [cipherssecurity 2026](https://cipherssecurity.com/best-bug-bounty-platforms-2026/).
  - Example small program (Exactly): 10% of affected funds, capped at $25k, with a $10k or $20k minimum. The page is internally inconsistent — [Exactly on Immunefi](https://immunefi.com/bug-bounty/exactly/information/).

### Inferences

**Audit cost for ~500 Move LOC:**
- Tier-1 per-line × Move premium: 500 × ($15–$40) × 1.2–1.6 ≈ **$9k–$32k**.
- Weekly model: 1–2 auditor-weeks at $6k–$25k ≈ **$6k–$50k**.
- **Expected: $20k–$30k, matching the $25k plan.** Low: $8k (MoveBit / boutique). High: $50k+ (OtterSec / Zellic top tier with two auditors, or adding Certora / Asymptotic-style formal verification of the "agent can never withdraw" invariant).
- **Amortized over 12 months: $700 / $2,100 / $4,200 per month** (low / expected / high).

The plan's $2,100/month treats the audit as fixed opex. Recommendations:
- Show it as a one-off capex, plus a ~$5k–$15k re-audit reserve for every package upgrade.
- If the package is upgradable, each change to `charge_fee` or the caps needs a re-review.

**Bug bounty:**
- With no payouts, the ongoing cost is ~$0/month on the default Immunefi model (10% on payouts).
- Reserve a critical reward of $10k–$25k in a treasury.
- A subscription would replace the 10% fee with a flat fee. The amount is unknown.

### Gaps

- No primary rate card from any named firm.
- Asymptotic and Certora Move formal-verification pricing was not found.
- HackenProof fees were not retrieved.
- Typical turnaround for a 500-LOC Sui audit, apart from OtterSec's reported 4–10 week queue, was not found.

## Often-forgotten fixed and semi-fixed costs: legal (MiCA / investment advice, Portugal/EU), geo-blocking/KYC, terms/privacy, insurance, on-call

### Takeaway

- The largest unbudgeted risk is regulatory. An agent that trades a user's vault under a mandate may fall under MiCA "portfolio management on crypto-assets", which is a CASP service. If so, Portuguese CASP authorisation costs ~€300k–€700k in year one. That would dwarf every other line.
- A one-off legal opinion confirming non-CASP status is essential. My estimate is €5k–€30k; I found no firm-specific source.
- Terms, privacy, insurance and KYC vendor pricing were not found in this session.

### Cited Findings

- **MiCA CASP authorisation costs:**
  - First year for a typical EU crypto business: ~€300k–€700k, then €150k–€250k per year to maintain. The legal advisory line for application preparation is €40k–€100k — [Itispay MiCA CASP cost 2026](https://itispay.com/blog/mica-casp-license-cost).
  - Portugal legal and compliance fees: €40k–€70k for a light setup, €80k–€150k standard, €150k–€300k+ complex — [Legarithm Portugal 2026](https://legarithm.io/crypto-license-portugal-2026/).
  - One provider lists an €18,900 service fee plus a €5,000 state fee — [Tangle Portugal CASP](https://tangle.ee/licenses/crypto/casp/portugal/).
  - Minimum capital is €50k, €125k or €150k depending on services. Portugal's transitional regime ended on 1 July 2026 — [Vantegris Portugal 2026](https://vantegris.com/blog/portugal-crypto-licence/); [CryptoLawIndex Portugal](https://cryptolawindex.com/jurisdiction/portugal/).
- **Regulator (sources conflict):** most say Banco de Portugal authorises CASPs and CMVM issues an opinion and supervises conduct; one names CMVM as the regulator. The enacting law is cited as Lei 69/2025, with conflicting publication dates (9 vs 22 Dec 2025) — [Global Law Experts](https://globallawexperts.com/mica-casp-portugal/); [Legarithm](https://legarithm.io/crypto-license-portugal-2026/).
- **Free opinions:** a licensing firm advertises free written legal opinions in 2–5 business days. This is likely lead generation — [Prifinance MiCA](https://prifinance.com/en/cryptocurrency-license/mica-crypto-license/).

### Inferences

**Budget lines** (Low / Expected / High). These are estimates, not sourced:
- **MiCA / investment-advice legal opinion (one-off):** €5k / €15k / €30k. Amortized over 12 months: ~$450 / $1,350 / $2,700 per month.
- **Terms of service + privacy policy (GDPR) (one-off):** $1k / $3k / $8k.
- **Geo-blocking:** $0–$50/month. IP blocking via Vercel/Cloudflare middleware is effectively free.
- **KYC vendor:** only if the opinion requires it. Per-check pricing was not researched.
- **Crypto or tech E&O insurance:** often unavailable or expensive for early DeFi. Not researched.
- **On-call:** Better Stack on-call is covered in monitoring. Founder time is not a cash cost.

Why the legal opinion matters: the non-custodial design (the agent cannot withdraw; see CLAUDE.md and SPEC 1b) is the main argument against CASP classification. But MiCA lists "providing portfolio management" as a CASP service, so whether the mandate-trading agent counts as portfolio management is a legal question. This is my inference and needs counsel.

### Gaps

- No law-firm quote for a non-CASP opinion in Portugal.
- No insurance quotes.
- No KYC vendor pricing.
- No terms/privacy drafting fees.

---

### Summary table: monthly fixed costs (USD, Low / Expected / High), naive polling design

| Line                             | 100 vaults             | 500 vaults             | 2,000 vaults             |
| -------------------------------- | ---------------------- | ---------------------- | ------------------------ |
| Sui RPC (gRPC provider)          | 50 / 200 / 500         | 200 / 500 / 1,500      | 600 / 1,500 / 4,000      |
| Web (Vercel Pro)                 | 20 / 40 / 100          | 20 / 40 / 150          | 40 / 100 / 300           |
| API + workers                    | 10 / 50 / 150          | 30 / 100 / 300         | 100 / 250 / 600          |
| Postgres 16                      | 25 / 50 / 120          | 50 / 100 / 250         | 100 / 250 / 600          |
| Redis (fixed plan)               | 10 / 20 / 60           | 10 / 50 / 200          | 20 / 100 / 400           |
| KMS                              | 1 / 3 / 10             | 2 / 5 / 10             | 5 / 10 / 20              |
| Enoki                            | 0 / 100 / 100          | 0 / 100 / 200          | 0 / 100 / 400            |
| Monitoring / alerts              | 0 / 50 / 150           | 20 / 80 / 250          | 50 / 150 / 500           |
| Email (Telegram free)            | 0 / 20 / 35            | 0 / 20 / 50            | 20 / 35 / 100            |
| **Infra subtotal**               | **~116 / 533 / 1,225** | **~332 / 995 / 2,910** | **~935 / 2,495 / 6,920** |
| Audit $25k ÷ 12 (range $8k–$50k) | 700 / 2,100 / 4,200    | same                   | same                     |
| Legal opinion ÷ 12 (estimate)    | 450 / 1,350 / 2,700    | same                   | same                     |

- The **$1,000/month infra estimate holds up to ~500 vaults.** At 2,000 vaults the naive design runs ~$2,500 expected. Batched reads plus checkpoint streaming bring RPC down to ~$50–$200, and infra back to ~$1,000–$1,200.
- **The $25k audit figure is a sound mid-point.** Treat it as one-off capex, with a re-audit reserve.
- **Missing line:** a legal opinion (~$1,350/month amortized, expected). With it, total fixed costs are **~$4,000–$4,500/month at 100–500 vaults** (expected), versus $3,100 in the plan.
- LLM API costs are excluded here; they are variable and covered by other notes.
