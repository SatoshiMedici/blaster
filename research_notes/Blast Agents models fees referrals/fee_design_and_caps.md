# Fee design with no minimum deposit, and on-chain fee caps (Blast Agents), as of Nov 2026

Research method note: web search worked; direct page fetches were blocked by the session's network allowlist (hyperliquid.gitbook.io, www.betterment.com and docs.base.org all failed DNS). Many figures below therefore come from search-result summaries of the cited pages, and some cited pages are secondary (review sites, vendor blogs). Figures marked **(unverified)** were not confirmed against a primary page. Local code facts were read from `move/blast_agent_vault` in this repo.

## 1. Fee structures used by automated trading / asset products, and what they do to small accounts

### Takeaway

The market uses five models: flat subscription, per-trade %, AUM %, performance fee over a high-water mark, and hybrid (a flat fee below a balance threshold, % of AUM above it, or a base plan plus usage credits). A flat fee is the worst fit for a no-minimum product: it is a huge % of a small balance (Acorns' $3/mo is 36%/yr on $100). AUM % and performance fees scale with the balance, but they do not cover a fixed per-vault compute cost at tiny balances. That is why products that serve small balances either set a balance threshold or scale the service down.

### Cited Findings

**Flat subscription (bot platforms, micro-investing)**
- Cryptohopper 2026 tiers: Pioneer free, Explorer $29/mo, Adventurer $69/mo, Hero $129/mo. An older post gives $19/$49/$99, which conflicts — [PickMyTrade 2026 guide](https://blog.pickmytrade.io/cryptohopper-vs-3commas-vs-diy-bots-honest-2026-guide/); older figures from [DEV Community](https://dev.to/suhadolsky/cryptohopper-vs-3commas-which-bot-wins-1p2) **(secondary; check the vendor page)**
- 3Commas: Starter $15/mo, Pro $40/mo, Expert $160/mo per GetApp; Toolradar lists Pro at $37/mo — [GetApp](https://www.getapp.com/all-software/a/3commas), [Toolradar](https://toolradar.com/tools/3commas/pricing) **(secondary)**
- Acorns is $3/$6/$12 per month (raised from $3/$5/$9 on 1 Jul 2024). On $100 the $3 tier is 36%/yr, on $1,000 it is 3.6%, on $10,000 it is 0.36%. Reviewers name small-balance fee drag as the main complaint, and Redditors advise not starting below about $1,000 — [NerdWallet Acorns review](https://www.nerdwallet.com/investing/reviews/acorns), [Gerald (critical, partly outdated)](https://joingerald.com/learn/saving--investing/acorns-fees-explained-2026)
- For comparison, Blast's current plan of $0.99/day is about $361/yr. That is 144%/yr on $250 and about 1,800%/yr on $20 (arithmetic).

**Per-trade % (Telegram / sniper bots, the closest comparables for memecoin trading)**
- Trojan charges about 1% per trade (0.9% with a referral; about 0.72% effective with cashback for heavy traders). Maestro charges about 1% plus an optional ~$200/mo Premium. Banana Gun charges 0.5% on ETH manual buys and 1% on other chains — [DEXTools comparison](https://www.dextools.io/tutorials/maestro-vs-trojan-vs-banana-gun), [Breakingac 2026](https://breakingac.com/news/2026/apr/30/multi-chain-telegram-trading-bots-head-to-head-trojan-vs-banana-gun-vs-maestro/) **(affiliate/review sites; figures vary)**
- Inference (arithmetic): a 1% per-trade fee charged on both entry and exit costs about 2% per round trip. An agent turning a vault over 1×/day pays roughly 700%/yr of the balance. Per-trade fees scale with the balance, but they reward the operator for overtrading. That incentive is especially bad when the AI agent itself chooses how many trades to make.

**AUM / management fee (robo-advisors)**
- Wealthfront charges 0.25%/yr at all balances with a $500 minimum. Betterment charges 0.25%/yr once the balance is ≥ $24,000 or recurring deposits are ≥ $200/mo, and otherwise $5/mo, with no minimum to open. One source says $4/mo and a $20k threshold instead (older or conflicting) — [NerdWallet Betterment vs Wealthfront 2026](https://www.nerdwallet.com/investing/learn/betterment-vs-wealthfront), [InvestorMint](https://investormint.com/software-tools/betterment-vs-wealthfront-vs-vanguard-digital-advisor-2026) **(betterment.com fetch blocked; threshold not verified on the primary page)**
- Betterment's hybrid is the canonical pattern of "flat minimum fee below a threshold, % of AUM above it". It still means about 1.2%/yr on $5,000 and 12%/yr on $500 — [NerdWallet](https://www.nerdwallet.com/investing/learn/betterment-vs-wealthfront)

**Performance fee with a high-water mark**
- All Hyperliquid user vaults pay a fixed 10% profit share to the leader, charged only on profits above the depositor's high-water mark. The leader must keep at least 5% of vault equity. Protocol vaults (HLP) charge no fee — [Hyperliquid docs: for vault leaders](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/for-vault-leaders) (fetch blocked; contents via search summary), [eth_defi constant HYPERLIQUID_VAULT_PERFORMANCE_FEE](https://web3-ethereum-defi.readthedocs.io/api/hyperliquid/_autosummary_hyperliquid/eth_defi.hyperliquid.constants.HYPERLIQUID_VAULT_PERFORMANCE_FEE.html), [HyperDash explainer](https://hyperdash.com/learn/the-vault-system-on-hyperliquid-what-it-is-and-how-it-works)
- A third-party blog says "10–30%" is common for vault performance fees. That contradicts the protocol-fixed 10% on Hyperliquid and probably describes other platforms — [OneKey](https://onekey.so/blog/ecosystem/best-hyperliquid-vault-framework/)

**Usage-based / hybrid (AI products)**
- Orb's 2026 report: 95% of AI-agent companies use hybrid pricing (92.4% in 2025), and 91.3% have a usage-based component — [Orb 2026 state of AI agent pricing](https://www.withorb.com/blog/2026-state-of-ai-agent-pricing-models-trends-and-whats-working) **(vendor research)**
- Typical packaging is a base plan with included credits or quota plus overage, or prepaid credits allocated per agent. One analysis advises that the overage unit price should not exceed the unit price implied by the plan ("penalty pricing") — [Nevermined](https://nevermined.ai/blog/stripe-vs-orb-vs-metronome), [DEV Community](https://dev.to/_df5259e5cebd3a923371e/ai-agent-pricing-models-compared-subscription-vs-usage-based-vs-hybrid-which-saves-you-more-in-22dl) **(secondary)**
- Metronome became part of Stripe (Jan 2026). Sources disagree on whether Adyen agreed to acquire Orb (June 2026) or completed it (1 Jul 2026) — [Nevermined](https://nevermined.ai/blog/metronome-review), [Plushcap](https://www.plushcap.com/companies/orb/blog/summaries/2026/04) **(unverified)**

**Gross-margin targets for AI products**
- ICONIQ's 2026 State of AI (survey of ~300 executives): average AI product gross margin was ~45% in 2025, projected ~52–53% in 2026 and ~59% in 2027 (41% in 2024). Inference is ~23% of revenue (or of spend, depending on the source) at scaling-stage companies — via [SaaStr](https://www.saastr.com/have-ai-gross-margins-really-turned-the-corner/), [Monetizely](https://getmonetizely.com/blogs/the-economics-of-ai-first-b2b-saas-in-2026) **(primary ICONIQ report not retrieved; 52 vs 53% conflicts)**
- Bessemer State of AI 2025: "Supernovas" run about 25% early gross margin, "Shooting Stars" about 60%. Classic SaaS is about 80–90% (some citations say 65–70%) — via [CloudZero](https://www.cloudzero.com/blog/ai-gross-margin), [Rework](https://resources.rework.com/libraries/ai-startup-growth/ai-vs-saas-gross-margins) **(secondary)**

**Regulatory sensitivity**
- UK: the default workplace-pension charge cap is 0.75%/yr of funds under management (or an equivalent combination charge), in force since April 2015 and kept after the 2017 review. It excludes transaction costs and applies only to default funds — [gov.uk charge-cap guidance](https://www.gov.uk/government/publications/the-charge-cap-guidance-for-trustees-and-managers-of-occupational-schemes/the-charge-cap-guidance-for-trustees-and-managers-of-occupational-schemes), [FCA](https://fca.org.uk/news/press-releases/fca-publishes-final-rules-charges-workplace-pension-schemes). This is the best-known statutory "reasonable cost" anchor. It applies to pensions, not to speculative trading products.
- EU MiFID II: Art. 24(4) MiFID II and Art. 50(10) of the Delegated Regulation require an illustration of the cumulative effect of costs on return, ex-ante and ex-post — [ESMA Q&A](https://www.esma.europa.eu/publications-data/questions-answers/2136). ESMA's 2022 Common Supervisory Action found illustrations inconsistent between firms and said it would work towards a standardised EU cost format — [Mondo Visione summary of ESMA July 2023](https://mondovisione.com/news/esma-highlights-areas-for-improvement-in-firms-disclosure-of-cost-and-charges-u-202376/)
- EU MiCA Art. 81: crypto portfolio managers must assess suitability, must not start portfolio management where it is unsuitable, must review suitability at least every 2 years, and may not keep third-party inducements. Art. 81(14) requires periodic statements (commentary says at least quarterly). ESMA's March 2025 guidelines include sections on the "costs and complexity of equivalent products" — [ESMA ISR Art. 81](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-81-providing-advice-crypto-assets), [ESMA guidelines PDF](https://www.esma.europa.eu/sites/default/files/2025-03/ESMA35-1872330276-2031_Guidelines_on_suitability_and_periodic_statement_MiCA_RO.pdf)

### Inferences

- An AI agent that trades a user's vault on its own judgement looks functionally like discretionary portfolio management under MiCA Art. 81, even though it is non-custodial. If the service reaches EU users, expect suitability and cost-disclosure duties. A fee shown as a clear annualised % of the vault ("reduction in yield" style) is the defensible presentation. Legal review is needed; this is not legal advice.
- Overtrading: per-trade fees and per-decision pass-through both reward the operator for more activity. A fee that depends on vault value and not on activity (AUM-style, with a ceiling) avoids this. A performance fee over a high-water mark aligns best with users, but it earns nothing in drawdowns and is volatile.
- Nobody publishes a regulatory "maximum reasonable" cost for speculative crypto trading products. The anchors are 0.25%/yr (robo), 0.75%/yr (UK pension default cap), 1–3%/yr (crypto index/vault products — see Gaps), and 10% (Hyperliquid) to 20% (hedge fund) of profits.

### Gaps

- Crypto index/vault management fees (e.g., 1–3%/yr) were not verified in this pass (no source retrieved).
- The primary Betterment, Hyperliquid and Coinbase/Base pages were blocked. Hedge-fund "2 and 20" was not separately sourced.
- No regulator guidance found that sets a numeric cap for crypto or automated-trading fees.

## 2. How products avoid "killing" small accounts

### Takeaway

There are four patterns: (a) charge a % of balance, not a flat fee; (b) set a balance threshold where a flat floor applies only above it, or a free tier below it; (c) scale the service, not the price (cheaper model, fewer decisions) so cost tracks what the fee covers; (d) bill only while the service is active, and stop when it is idle or paused. Betterment and Acorns show the cost of skipping (a)–(c): 12–36%/yr drag on small balances, plus visible user backlash.

### Cited Findings

- Betterment's flat $5/mo below $24k is about 12%/yr on $500. Wealthfront avoids the issue by requiring $500 and charging 0.25% at every balance — [NerdWallet](https://www.nerdwallet.com/investing/learn/betterment-vs-wealthfront)
- Acorns' flat tiers are the textbook complaint (36%/yr on $100) — [NerdWallet](https://www.nerdwallet.com/investing/reviews/acorns)
- Usage-based and credit models let cost scale with consumption. Hybrid plans dominate AI-agent pricing in 2026 — [Orb](https://www.withorb.com/blog/2026-state-of-ai-agent-pricing-models-trends-and-whats-working)
- One worked AI-pricing example: inference at $0.10 against a $0.50 price gives 80% gross margin, but inference at $0.45 against the same price gives 10%. Margins swing with cost per task, so per-task cost must be bounded — [SoftwareSeni](https://www.softwareseni.com/how-to-design-ai-product-pricing-that-survives-variable-inference-costs/) **(secondary)**
- The UK 0.75% cap shows how regulators frame costs: a % of funds under management per year — [gov.uk](https://www.gov.uk/government/publications/the-charge-cap-guidance-for-trustees-and-managers-of-occupational-schemes/the-charge-cap-guidance-for-trustees-and-managers-of-occupational-schemes)

### Inferences

- With no minimum deposit, Blast must accept that very small vaults get a degraded service and pay a tiny fee. The alternative is a floor fee that destroys them, which is the Acorns problem. Below some balance the agent should run "idle/watch-only" and charge nothing. That keeps the no-minimum promise without losing money, and it creates an implicit operating balance, not a deposit minimum.
- "Bill only on days the agent ran" already matches the current daily-charge design (one `charge_fee` per calendar day).

### Gaps

- No source found for products that explicitly scale AI decision budgets to account size. This is a design inference, not an observed industry norm.

## 3. On-chain fee caps / spending-allowance patterns

### Takeaway

Modern practice has moved from unlimited ERC-20 allowances to bounded, periodic, expiring, revocable permissions: Coinbase/Base Spend Permissions (allowance + period + start/end), ERC-7715 periodic permissions (MetaMask), Safe Allowance Module (amount per reset period), and zkSync SSO limit types (lifetime vs periodic). Blast's vault already uses this pattern, denominated in the native token. The key gap is a cap relative to vault balance.

### Cited Findings

- Unlimited approvals are latent risk. If the spender contract is exploited or upgraded maliciously, every approving wallet is exposed. Dedaub estimated over $6.5B at risk through unlimited approvals on top-20 Ethereum tokens (as of July 2024, dated). Advice is to approve exact amounts and revoke stale allowances — [Matcha/Permit2](https://blog.matcha.xyz/article/permit2), [Elliptic](https://www.elliptic.co/corpus/gen-2878/chapter-20-legion/defi-token-approval-risk-monitoring-permit2-and-unlimited-erc-20-allowances-for-wallet-drainer-exposure.html)
- Permit2 adds per-app, signature-based allowances with expirations, but the expiry can still be set to "unlimited", so dapps must choose reasonable expiries — [Eco](https://eco.com/support/en/articles/12005545-what-is-permit2-a-2026-guide-to-token-approvals)
- Coinbase/Base Spend Permission struct: `allowance` (uint160, max per period), `period` (uint48 seconds, the reset window), plus start/end. `getCurrentPeriod`/`getPermissionStatus` return the remaining allowance, and the next period starts one second after the current one ends. Example: `periodInDays: 30` for subscriptions — [CDP spend-permissions contract reference](https://docs.cdp.coinbase.com/coinbase-wallet/reference/onchain-contracts/spend-permissions.md), [CDP guide](https://docs.cdp.coinbase.com/wallets/using-wallets/spend-permissions), [Base docs](https://docs.base.org/base-account/improve-ux/spend-permissions.md) (fetch blocked; via search)
- ERC-7715 (wallet-granted permissions) leaves the permission types open. MetaMask implements `native-token-periodic` (`periodAmount` + `periodDuration`, e.g., 86400 s, resets each period), `native-token-stream` (linear) and ERC-20 equivalents, with MetaMask ≥13.5.0 and a smart account — [MetaMask Smart Accounts Kit: native token permissions](https://docs.metamask.io/smart-accounts-kit/development/guides/advanced-permissions/use-permissions/native-token/), [ERC-7715 thread](https://ethereum-magicians.org/t/erc-7715-grant-permissions-from-wallets/20100)
- Safe Allowance Module: delegate + token + amount per period + reset period (minutes) + start delay. A one-time allowance does not reset — [Candide docs](https://docs.candide.dev/wallet/plugins/allowance/)
- zkSync SSO session limits come in three types: unlimited, lifetime, and allowance (reset every `period` seconds using block.timestamp) — [zkSync SSO sessions](https://docs.zksync.io/zksync-network/unique-features/zksync-sso/sessions). Squads (Solana) spending limits run from one-time to yearly, and unused amounts do not carry over — [Squads API](https://developers.squads.so/squads-api/api-reference/v1/endpoint/spending-limits/post.md)
- Superfluid streaming: flow rate is in wei/second. Starting a stream locks a buffer of about 4 hours of flow. When the balance hits zero, a sentinel liquidates and the sender forfeits the buffer. Streams do not end themselves — [Superfluid CFA docs](https://superfluid.gitbook.io/superfluid/protocol-overview/in-depth-overview/super-agreements/constant-flow-agreement-cfa), [glossary](https://docs.superfluid.org/docs/concepts/glossary). This is not available on Sui.
- Sui: no official Sui "allowance" or subscription primitive was found. Generic subscription guides describe the EVM time-based allowance pattern (`chargeSubscription` checks `nextPaymentDue`, then transfers) plus grace periods on insufficient balance — [ChainScore guide](https://www.chainscorelabs.com/guides/developer-experience-dx-blockchain-tools-and-analytics/dapp-architecture-patterns/how-to-design-a-subscription-model-with-crypto-payments) **(secondary)**. On Sui the idiomatic equivalent is a shared object holding the funds and enforcing the rule, with a capability object (here `TradeCap`) authorising the pull. That is what Blast already has.
- Pyth on Sui: `pyth::get_price_no_older_than(price_info_object, clock, max_age)` enforces staleness and aborts if the price is too old. Use conservative confidence bounds (price − conf when valuing collateral; price + conf for debt). Commonly suggested: reject when conf/price > 2% (an example, not an official default), and cross-check against a second source — [Sui docs: oracle safety](https://docs.sui.io/onchain-finance/oracles/oracle-safety), [Pyth best practices](https://docs.pyth.network/price-feeds/best-practices)
- Local repo: `charge_fee(vault, &TradeCap, amount, clock, ctx)` asserts `amount <= vault.daily_fee_cap` and `today > vault.last_fee_day` (once per UTC calendar day) and pays only `vault.treasury`. `set_fee_terms` requires `&OwnerCap`. `free_days` at creation pushes back the first fee day — `/home/user/blaster/move/blast_agent_vault/sources/vault.move` (read via the build copy, around lines 198–235, 313–317, 405–413)

### Inferences

- **Denomination:** keep the on-chain cap in MIST, not USD.
  - A USD cap via Pyth adds an oracle dependency, staleness/confidence handling, and a new attack surface (a manipulated price lets the operator pull more SUI) on the one outflow path. That conflicts with the project rule that this path stays minimal.
  - Do the USD→SUI conversion off-chain at billing time. Make the on-chain cap a hard ceiling with headroom, e.g., 2× the expected daily fee at the creation-day price. That absorbs about a 50% SUI drop before the fee would be clipped.
  - When SUI falls further, the operator charges less, which is in the user's favour. A re-approval only matters if the fee then can't cover cost.
- **Relative cap:** add a balance-relative cap enforced on-chain: `amount <= min(daily_fee_cap, balance * max_fee_bps_per_day / 10_000)`.
  - The vault knows its own SUI balance on-chain, so this needs no oracle.
  - It automatically protects small and drawn-down vaults. It is the on-chain analogue of an AUM fee ceiling.
  - Because the cap uses the vault's SUI balance (not the mark-to-market value of memecoin positions), it is conservative while the agent holds tokens. Decide whether that is acceptable, or charge only from the SUI balance and accept skipped days.
- **Period:** keep per-day (it matches ERC-7715 / Spend Permissions practice). Unused allowance should not carry over (Squads behaviour), which the current `last_fee_day` logic already guarantees.
- **Lifetime cap / expiry:** consider an optional `fee_terms_expiry_day`. After it, `charge_fee` aborts until the owner re-approves. This follows the Permit2/Spend-Permissions "end" field. Practice sets an expiry; it is not something that must be on-chain.
- **Re-approval UX:** increases must need `OwnerCap` (already true). Decreases can stay owner-only too. The UI should show the cap both in SUI and as "≈ X%/yr of your current balance".

### Gaps

- No primary Sui docs page found on subscription/allowance patterns. The Sui-specific recommendation is an inference from Move's object/capability model and the local code.
- Not verified: whether Sui has shipped any native "address balance / allowance" feature by Nov 2026.

## 4. Recommended fee design (synthesis; inference unless cited)

### Takeaway

Replace the flat $0.99/day with an AUM-style daily fee that has a balance ceiling and an absolute ceiling. Scale the agent's decision budget to what the fee pays for after a 30% referral share and a target margin. When the fee can't cover even a minimal day, the agent idles and charges nothing. Enforce `min(absolute SUI cap, bps of vault balance)` on-chain.

### Cited Findings (inputs)

- AI-product gross margins average ~45–53% (ICONIQ). Healthy targets are ~60% ("Shooting Stars", Bessemer) — [SaaStr](https://www.saastr.com/have-ai-gross-margins-really-turned-the-corner/), [CloudZero](https://www.cloudzero.com/blog/ai-gross-margin)
- The anchors to beat on user cost: robo 0.25%/yr, UK default cap 0.75%/yr, flat-fee horror 12–36%/yr on small balances, Telegram bots ~1% per trade — sources above.
- Blast cost inputs (from the brief, not independently verified): $0.009–0.02 per frontier-model decision, ~$0.001 per cheap-model decision, ~$0.001 gas per tx.

### Inferences — concrete formula

Let V = vault value in USD, r = annual fee rate, F_max = absolute daily ceiling, ρ = referral share (0.30), g = target gross margin on net revenue (0.60).

1. **Daily fee (USD), charged only on days the agent ran:**
   `fee_day = min( F_max , r × V / 365 )`, with r = 10%/yr (2.74 bps/day) and F_max = $0.99/day.
   - V = $20 → $0.0055/day; $250 → $0.068/day; $1,000 → $0.27/day; ≥ ~$3,600 → $0.99/day (cap; below 10%/yr from there on).
   - A 10%/yr ceiling is high next to robo or pension anchors but low next to 1%-per-trade bots. That suits a speculative memecoin agent; the owner should choose r explicitly. A 5% or 20% alternative shifts the break-even balance shown below.
2. **Compute budget scaled to the fee (pre-referral by default; see note):**
   `budget_day = fee_day × (1 − ρ) × (1 − g) = fee_day × 0.28`, so price ≈ 3.6× cost.
   - Decisions allowed: `N = floor( (budget_day − gas_est) / c_model )`. Pick the model tier by budget, using the cheap model (~$0.001) until the budget supports ≥ ~10 frontier decisions.
   - Note: for non-referred users ρ = 0, so their margin is higher. Either keep one budget formula (simpler, extra margin) or give non-referred users 1/0.7 more decisions.
3. **Idle rule (the "no minimum deposit" safety valve):** if `N < N_min` (e.g., 10 cheap decisions + 3 txs ≈ $0.013 cost → needs fee ≈ $0.046/day), the agent stays in watch-only mode and charges $0.
   - At r = 10% the implied operating balance is about $170. At r = 20% it is about $85.
   - Show this in the UI as "your agent becomes active above ~$X". It is not a deposit minimum.
4. **Optional phase 2:** a performance fee of 10% over a per-vault high-water mark (the Hyperliquid norm), on top of a lower management rate (e.g., r = 3–5%/yr). This needs high-water-mark accounting, a fee path and an audit change in the vault, so it is not recommended for v1 under the "minimal outflow" rule.
5. **Disclosure:** always show the fee as "≈ X%/yr of your vault" plus the expected decisions/day. This follows MiFID's reduction-in-yield illustration and MiCA Art. 81 periodic statements.

### Inferences — on-chain cap

- Keep `daily_fee_cap` (MIST, owner-approved, set at about 2× the expected fee at creation price, never above F_max at a floor SUI price).
- Add `max_fee_bps_per_day` (owner-approved; e.g., 3 bps ≈ 11%/yr ceiling, slightly above r for rounding and SUI-price noise). Enforce:
  `amount <= min(daily_fee_cap, coin_balance(vault) * max_fee_bps_per_day / 10_000)`.
- Keep once per calendar day, treasury-only and `OwnerCap` to change terms. Optionally add a terms expiry.
- This is a change to the `charge_fee` path and needs owner sign-off and an update to `scripts/check_trade_cap_surface.py`. It only tightens the outflow; it never widens it.
- No Pyth on-chain in v1; do the USD conversion off-chain. If a USD cap is wanted later, use `get_price_no_older_than` with a short max_age and the conservative confidence bound, and reject when conf/price exceeds a threshold.

### Gaps

- These are break-even estimates from the brief's cost inputs, not measured Blast telemetry.
- Need to validate whether users accept a ~10%/yr fee in this segment (no survey data found).
- Not answered: the legal classification of the agent under MiCA (needs counsel).
