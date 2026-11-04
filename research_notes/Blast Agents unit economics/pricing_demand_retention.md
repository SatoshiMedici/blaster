# Pricing, Demand and Retention Benchmarks for Consumer AI / Automated Crypto Trading (stress-test of $0.99/day, $250 minimum)

Research date: 2026-11-04. Method: web search (about 16 queries/fetches). Two primary pages could not be fetched because their hosts are outside this session's allowed network (stakepoint.app, www.coingecko.com). Figures from those pages come from search-result snippets only and are marked as such. Most fee figures come from third-party comparison or affiliate pages, not the products' own fee docs. Treat them as indicative unless the note says "official docs".

Baseline used throughout: $0.99/day x 365 = **$361.35/yr** (about $29.70 per 30-day month). As a share of the vault per year: **144.5% on $250, 36.1% on $1,000, 7.2% on $5,000**. The brief's "~143%/yr" figure uses 12 x $29.70 = $356.40, which gives 142.6%. The gap is small, but pick one convention.

## 1. What comparable products charge (fee level and model)

### Takeaway

Retail memecoin bots almost all charge a per-trade fee of about 1% (0.5% to 1%), with no subscription. Rule-based subscription bots charge about $15 to $60/month for entry and mid tiers. AI agent products are split between subscriptions (Senpi, $25 to $50/month) and profit or yield shares (Giza 10%; Hyperliquid vault leaders 10%). DeFi vault managers use AUM plus performance fees, with high caps (dHEDGE up to 3% management and 50% performance). I found no Sui-specific bot fee that I could verify.

### Cited Findings

**Telegram / web memecoin bots (per-trade, % of notional, both buys and sells; gas and DEX fees are extra)**
- The sources broadly agree that bots charge about 0.5% to 1% per trade with no subscription; gas and DEX fees are paid on top — [DEXTools 2026 guide](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide); [MadeOnSol fee calculator](https://madeonsol.com/compare-bots); [TradeTheDay](https://tradetheday.com/trading-bots)
- Banana Gun: 0.5% on manual buys on Ethereum; 1% on sniping and on other chains — [DEXTools](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide); [CoinCodeCap](https://coincodecap.com/best-crypto-trading-telegram-bots-and-their-supported-chains)
- Trojan: 1% per trade, or 0.9% with a referral code — [DEXTools](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide); [Trojan referral review page](https://trojan-review.pages.dev/referral-code.html) (affiliate page)
- Photon: sources conflict (0.5% vs 1%) — [TradeTheDay](https://tradetheday.com/trading-bots); [MadeOnSol](https://madeonsol.com/compare-bots)
- Maestro: about 1% on buys and sells — [The Defiant](https://thedefiant.io/memecoin-trading-bot-maestro-is-raking-in-millions); [DEXTools](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide)
- BonkBot: 1% per successful swap — [DEXTools](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide)
- GMGN: 1% plus priority fees — [Solana bot comparison (GMGN)](https://solanatools-io.pages.dev/gmgn.html) (affiliate)
- Axiom: 0.95% base, falling to 0.85% (Gold) and 0.75% (Champion) at higher volume, per one source; another says 1% — [Openliquid guide](https://openliquid.io/telegram-trading-bot/); [MadeOnSol](https://madeonsol.com/compare-bots)
- A 2026 article's headline, "Every Solana Telegram trading bot charges about the same. The difference is where the fee goes," indicates the fee has converged on about 1% (search snippet only; the page could not be fetched) — [StakePoint](https://stakepoint.app/blog/solana-telegram-trading-bot-fees-2026)

**Sui-specific**
- SUI Sniper Bot (@SuiSniperBot) earns from trading fees, premium subscriptions, trending ads and volume-bot services; it runs a 5-tier referral program with up to 35% fee share; I found no verified per-trade %. The listing also shows a Solana wallet address, which is inconsistent — [Sui Sniper Bot listing](https://entryfun.pages.dev/bots/sui-sniper-bot); [CoinCodeCap review](https://coincodecap.com/sui-sniper-bot-telegram-trading-bot-for-sui-network-review)
- SUIBABot is described as custodial (funds held in a bot wallet) — [CoinCodeCap top Sui bots](https://coincodecap.com/top-3-telegram-trading-bots-for-sui-network)

**Subscription bots (CEX-connected; exchange trading fees are extra)**
- 3Commas: paid tiers about $37 to $59/month (other sources: $14.99 to $20 entry, $12 to $140 range); free tier exists — [Toolradar 3Commas pricing](https://toolradar.com/tools/3commas/pricing); [DEV 3Commas review 2026](https://dev.to/suhadolsky/3commas-review-2026-is-it-worth-it-1m15); [Koinly](https://koinly.io/de/blog/best-crypto-trading-bots/)
- Cryptohopper: Explorer about $24.16/month billed annually or $29/month; higher tiers about $69 and $129/month; free Pioneer tier — [Koinly](https://koinly.io/de/blog/best-crypto-trading-bots/); [CoinLedger](https://coinledger.io/blog/best-crypto-trading-bots)
- Coinrule: free Starter; Investor $29.99/month, Trader $59.99, Pro $449.99 (as of April 2026, per one source); another source gives $14.99/month annual for Investor — [HackerNoon 2026](https://hackernoon.com/top-10-best-ai-bot-trading-in-2026-features-and-pricing); [Plisio](https://plisio.net/education/best-crypto-trading-bots)
- Pionex: no bot subscription; revenue comes from exchange trading fees — [Koinly](https://koinly.io/de/blog/best-crypto-trading-bots/)

**AI agent products**
- Senpi (Hyperliquid AI agent, non-custodial): current homepage says "paid plans start at $50/month" with monthly AI credits and "0% trading fees", plus a no-card free trial. An older cached version said $25/month. One agent page mentions a Senpi fee on every transaction; free-trial users reportedly pay 0.03% — [Senpi homepage](https://senpi.ai/); [Senpi cached](https://senpi.ai/?address=0xa052b5c9e9d89f911009a3d72c1e6f162562b025); [Senpi agent page](https://trade.senpi.ai/trade-ai/io-oai); [What is Senpi](https://resources.senpi.ai/learn/what-is-senpi)
- Giza (ARMA yield agent): 10% performance fee on yield. A later review says ARMA/Pulse were wound down in March 2026 and funds returned, and that the successor agent has no verifiable on-chain fees — [DefiLlama Giza](https://defillama.com/protocol/giza); [KuCoin](https://www.kucoin.com/blog/what-is-giza-); [OwnYourMind review](https://ownyourmind.ai/projects/giza/)
- Hey Anon: token-gated access; per a 2025 DAO RFC, a 1% fee on deposit (deposit 100 ANON, pay 1 ANON) and a 1% fee on withdrawal, with tiered daily limits (base: 3 AI queries/day, 5 DeFi agent transactions/day). This is a proposal; current terms are unverified — [HeyAnon RFC #2](https://forum.heyanon.ai/t/rfc-2-heyanon-tokenomics-utility-overview/58/1)
- Almanak, Wayfinder, Cod3x, Spectral, Theoriq, Virtuals: no fee data found in searches — [DefiLlama AI agents category](https://defillama.com/protocols/ai-agents) (category listing only)

**Vaults with management / performance fees**
- Hyperliquid user vaults: the leader receives 10% of total profits; protocol vaults (HLP) have no fees or profit share; leaders must keep at least 5% ownership (official docs) — [Hyperliquid docs: Vaults](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults); [For vault leaders](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/for-vault-leaders)
- dHEDGE: performance fee set by the manager (max 50%); management fee max 3%; fee changes take effect 14 days after announcement (official docs) — [dHEDGE Vault Fees](https://docs.dhedge.org/dhedge-protocol/vault-fees); [Management fees](https://docs.dhedge.org/dhedge-protocol/vault-fees/management-fees)
- Enzyme: manager-configurable management fee (periodic, paid in shares) and performance fee (charged after the management fee); no defaults found — [Enzyme v3 fees docs](https://docs-v3.enzyme.finance/managers/setup/fees); [Enzyme performance fee spec](https://specs.enzyme.finance/fee-formulas/performance-fee)
- Yearn: an older governance proposal references a 10% performance and 2% management fee structure (dated; current rates unverified) — [Yearn gov forum](https://gov.yearn.fi/t/proposal-revising-delegated-vault-fees-part-1/12087)

### Inferences

- In the memecoin-bot category, which is Blast Agents' closest comparison, users are used to paying **nothing when idle and about 1% per trade**. A flat time-based fee is unusual there; the fee model looks more like a CEX subscription bot or Senpi.
- At $29.70/month, Blast Agents is priced in line with Cryptohopper Explorer and Coinrule Investor, and below Senpi's current $50. On price per month it is not out of line; the problem is the **$250 minimum** relative to that price.

### Gaps

- I could not verify official fee pages for Sui-specific bots, Almanak, Wayfinder, Cod3x, Spectral, Theoriq or Virtuals-style agents.
- Bot fee pages change often, and several sources are affiliate pages.

## 2. Effective annual cost on $250 / $1,000 / $5,000 vs $0.99/day

### Takeaway

A flat fee is regressive by account size. On $250 it costs more than any per-trade bot used at moderate frequency. It is about equal to subscription bots, and it is cheaper than ~1% per-trade bots once the account is ~$1k+ or trades actively. Profit shares cost nothing in losing periods; this matters because most memecoin traders lose money (section 3).

### Cited Findings (inputs)

- Per-trade bots charge about 1% on each buy and sell — [DEXTools](https://www.dextools.io/tutorials/telegram-trading-bots-2026-guide)
- Subscriptions: Cryptohopper $29/month, 3Commas $37/month, Coinrule $29.99/month, Senpi $50/month (or $25 in an older version) — sources in section 1
- Hyperliquid vault: 10% of profits — [Hyperliquid docs](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults)

### Inferences (my calculations; usage levels are ASSUMPTIONS)

Assumptions: per-trade bot at 1% per side. "Light" = 1 full round trip of account value per month (2% of the account per month in fees). "Active" = 5 round trips per month (10% per month), which is plausible for memecoin sniping. Gas, DEX/LP fees and slippage are excluded for every product, including Blast. The flat fee does not change with usage.

| Product / model                                   | $250 acct         | $1,000 acct      | $5,000 acct     |
| ------------------------------------------------- | ----------------- | ---------------- | --------------- |
| **Blast Agents $0.99/day (flat)**                 | $361 = **144.5%** | $361 = **36.1%** | $361 = **7.2%** |
| 1% per-trade bot, light (24%/yr)                  | $60 = 24%         | $240 = 24%       | $1,200 = 24%    |
| 1% per-trade bot, active (120%/yr)                | $300 = 120%       | $1,200 = 120%    | $6,000 = 120%   |
| 0.5% per-trade (Banana Gun manual), active        | $150 = 60%        | $600 = 60%       | $3,000 = 60%    |
| Cryptohopper $29/month                            | $348 = 139%       | 35%              | 7.0%            |
| 3Commas $37/month                                 | $444 = 178%       | 44%              | 8.9%            |
| Senpi $50/month                                   | $600 = 240%       | 60%              | 12%             |
| Hyperliquid vault 10% profit share, at +20% gross | $5 = 2%           | 2%               | 2%              |
| Same, at 0% or a loss                             | $0                | $0               | $0              |
| dHEDGE-style 2% mgmt + 20% perf, at +20% gross    | ~$15 = ~6%        | ~6%              | ~6%             |

- Break-even: a 1% per-trade bot costs the same as $361/yr when annual traded notional is $36,135. That is 144x a $250 account (about 6 round trips per month), 36x a $1k account (1.5 per month), and 7x a $5k account (0.3 per month).
- On $250, the agent must earn about **+144%/yr gross** (about +12% per month) just to cover the fee, before gas and slippage. Taking a profit share at the same headline cost would require profits that few memecoin traders achieve (section 3).
- The trial gives 3 days ($2.97 value). A $250 vault loses about 0.4% per day to the fee.

### Gaps

- No public data on actual turnover per user for Trojan, Photon or GMGN users, so the "active" assumption is not verified.

## 3. Outcomes for retail memecoin / bot traders and what they imply for retention

### Takeaway

In most months, about half to about 70% of pump.fun wallets lose money. Profits are extremely concentrated, and almost no one earns enough to cover a fee of more than 100%/yr on a small account. If the agent performs like the median participant, most users will see losses plus fee drag. That points to high voluntary churn after the trial or within the first month.

### Cited Findings

- From April 2024 to late 2025, most active pump.fun traders ended each month in the red; the profitable share hit a low of 30.1% in June 2025. Later data shows over 70% profitable in April 2026 (search snippet; I could not fetch CoinGecko to check the method) — [CoinGecko Research](https://www.coingecko.com/research/publications/pump-fun-traders-are-making-a-comeback)
- March 2026: a Dune dashboard covering about 1.4M wallets found 49% to 50.6% lost money; most of the rest made less than $500; 2 wallets realized more than $1M — [crypto.news](https://crypto.news/pump-fun-data-shows-49-of-march-traders-in-the-red-as-platform-locks-fees/); [Coinpedia](https://coinpedia.org/news/over-50-of-pump-fun-traders-lost-money-this-month-while-2-wallets-made-over-1m/)
- Over about six months to mid-2025: 51.06% of wallets (166,590) lost more than $500; only 5 wallets (0.0015%) earned $50k to $100k; about 96% made less than $500 or lost money — [HODL FM](https://news.hodlfm.io/earn/pump-fun-trader-losses-data-analysis/); [OurCryptoTalk](https://ourcryptotalk.com/news/pump-fun-96-percent-traders-losing-money)
- Pre-PUMP launch (2025): about 60% of traders had losses — [BeInCrypto](https://beincrypto.com/pump-fun-trading-data-majority-lose-money/)
- H1 2024: 62.5% lost money (secondary) — [BitKan](https://bitkan.com/learn/how-many-pump-fun-traders-made-money-what-do-the-numbers-really-say-56366)
- Caveats from the sources: counts are per wallet, not per person; many wallets are bots or single-use (about 30% made only one transaction); only realized PnL is counted — [BitKan](https://bitkan.com/learn/how-many-pump-fun-traders-made-money-what-do-the-numbers-really-say-56366)
- A developer's open-source bot that auto-bought newly graduated pump.fun tokens had about a 6.5% win rate (anecdotal) — [DEV Community](https://dev.to/solsniperdev/i-built-an-open-source-solana-trading-bot-on-telegram-heres-what-i-learned-4dfj)

### Inferences

- "Profitable" in these studies usually means making more than $0, and mostly less than $500. Very few wallets earn more than +144%/yr on capital. Fee drag on a $250 vault is likely to push most users who would otherwise be marginally profitable into a loss.
- A flat fee makes losses visible every day: the vault shrinks even when the agent does nothing. This likely makes churn worse than with per-trade fees, which users barely notice.
- Expect performance-driven, path-dependent churn: users who lose early leave, and users who hit an early winner stay. Retention will vary heavily by market regime (compare the 30% vs 70% profitable months).

### Gaps

- No PnL data specific to Sui memecoin traders (e.g., Blast.fun, Moonbags) was found.
- No published outcome data for AI-agent-managed memecoin accounts.

## 4. Retention / churn benchmarks

### Takeaway

Mobile finance apps retain only about 2% to 12% of users at D30, depending on the source. Hyperliquid, a "sticky" crypto venue, reportedly keeps about 30% at D30. Paid consumer subscriptions under $25 ARPA churn about 6% to 7% per month in mainstream SaaS. A loss-making speculative product should be modeled well above that.

### Cited Findings

- Finance apps (Adjust 2025 data, via a roundup): D1 about 12%, D7 about 6%, D30 about 2%. Another vendor gives fintech/banking D1 28% to 34%, D7 15% to 18%, D30 9% to 12%. These conflict because methods differ (classic vs rolling retention) — [Enable3 roundup](https://enable3.io/blog/app-retention-benchmarks-2025); [Spreadcast](https://spreadcast.app/resources/app-retention-benchmarks)
- Cross-industry medians: D1 about 25%, D7 about 8%, D30 about 4% — [UXCam](https://uxcam.com/blog/mobile-app-retention-benchmarks/)
- Hyperliquid: 30-day retention about 30% for all users, about 51% for whales (independent Substack analysis) — [Hyperliquid is sticky](https://myshterious.substack.com/p/hyperliquid-is-sticky)
- Trading-bot daily active users (a size proxy, not retention): Trojan about 20k DAU, BonkBot about 10k, Banana about 5k (2025) — [SolanaFloor](https://solanafloor.com/news/putting-the-user-first-in-every-way-trojan-credits-5b-lifetime-volume-ux-support); Axiom about 30k, Photon/BullX about 20k to 27k — [X post citing Dune](https://x.com/Adam_Tehc/status/1915761250807824592); DEX bots overall about 52k DAU — [CoinGecko Learn](https://www.coingecko.com/learn/top-telegram-trading-bots)
- ChartMogul: businesses with ARPA under $10 typically see 6% to 7% monthly churn — [ChartMogul Help](https://help.chartmogul.com/article/203-chart-customer-churn-rate); median monthly customer churn of 6.1% for ARPA under $25 (2022 data, secondary) — [Subjolt](https://www.subjolt.com/guides/churn-rate-benchmarks/)
- Recurly price bands: $10–25/month total churn 4.29% (2.99% voluntary, 1.30% involuntary); $25–50/month 3.84%. The page does not clearly say whether these are monthly or annual — [Recurly churn benchmarks](https://recurly.com/research/churn-rate-benchmarks/)
- B2C SaaS/software average monthly churn 5.8% (4.1% voluntary), 2025 panel of 100+ services — [Focus Digital](https://focus-digital.co/average-churn-rate-subscription-services/)

### Inferences (ASSUMPTIONS for modeling)

- Mainstream consumer SaaS churn (about 6%/month) is a **floor**, not an expected value. A product that loses most users money is closer to D30 app retention. A reasonable planning range is **15% to 40% monthly churn** for paying users after the trial, with a high trial-to-paid drop-off. This is not verified and should be calibrated with Blast's own cohorts.
- "Involuntary churn" takes a different form here: the fee is debited from the vault, so card failures do not happen. Instead, the vault drains, or the user withdraws. Withdrawal is one step, which lowers switching cost.
- Illustrative LTV (gross, before AI and gas costs and referral payouts) at $29.70/month: 6% churn gives about $495; 15% gives about $198; 25% gives about $119; 40% gives about $74.

### Gaps

- I found no published D1/D7/D30 or monthly churn for trading bots or AI agents; I would need to build a Dune cohort query by first-trade date — [method reference](https://academy.exmon.pro/on-chain-user-behavior-analysis-using-dune-sql-data); [Trojan Dune query](https://dune.com/queries/4226598)
- I could not verify that the Adjust finance figures come from Adjust's own report.

## 5. Customer acquisition costs and referral-fee structures

### Takeaway

Crypto CAC per funded user typically falls between $100 and $300 (wide range, vendor sources). KOL deals pay $30 to $200+ per depositor, or a 30% to 50% revenue share. Telegram bots usually pay 25% to 35% of fees to the first referral tier, with multi-level tails. At realistic churn, this CAC range is close to or above Blast Agents' gross LTV.

### Cited Findings

- Exchange CAC: sign-up $30 to $75; KYC-verified $75 to $150; first deposit $150 to $300. The same vendor also cites $100 to $200 per verified depositor; Web3 referral acquisition about $150; derivatives trader acquisition $14 to $31 — [HypeLab 2026 benchmarks](https://www.hypelab.com/blog/crypto-user-acquisition-cost-benchmarks-2026); [Surgence](https://surgence.io/blog/crypto-exchange-marketing)
- About $630 per net new funded account (one analysis); crypto/digital-asset platforms about $1,890 per customer (fintech-wide source). Both are outliers and methods are unclear — [KOLHQ](https://www.kolhq.com/blog/crypto-marketing-budget); [Blockchain App Factory](https://www.blockchainappfactory.com/crypto-marketing-budget-benchmarks)
- KOL deals for CEX acquisition: CPA $30 to $200+ per verified depositor, or 30% to 50% revenue share on referred fees; a mid-tier KOL (50k to 200k followers) drives about 100 to 500 wallet connections per campaign — [LuvKaizen KOL Rate Report 2026](https://www.luvkaizen.com/blogs/crypto-kol-rate-report-2026)
- Case study: CPA of $138 with a KOL whose followers were about 70% fake, vs $42 with vetted micro-KOLs — [ForkOff](https://forkoff.xyz/blog/influencer-marketing/how-to-vet-crypto-kol-2026)
- Trojan referral: 25%, rising to 35% once the referrer has traded more than $10k (third-party blog); Trojan Arena "Honors" levels show 32.5%/42.5%/47.5% total shares (official docs, for the Arena program) — [Medium referral list](https://medium.com/@0xkryptokeisarii/how-to-earn-passive-income-with-crypto-telegram-trading-bot-referral-programs-63cebc45502c); [Trojan docs, referral system](https://docs.trojan.com/trojan-arena/referral-system)
- BonkBot referral steps down from 30% to 10% across tiers; Trojan and MEVx have the deepest structures (5 levels) — [CoinCodeCap referral list](https://coincodecap.com/all-telegram-trading-bot-referral-programs-listed)
- SUI Sniper Bot: 5-tier referral with up to 35% fee share — [Sui Sniper Bot listing](https://entryfun.pages.dev/bots/sui-sniper-bot)

### Inferences

- With a 30% referral share, net ARPU falls from $29.70 to about $20.79 per month. At 25% monthly churn, the net LTV is about $83 before AI inference and gas, which is below most of the funded-user CAC range. Paid acquisition is likely unprofitable unless churn is below about 10% to 12%. Referral and revenue-share channels, which pay only out of revenue, are the safer default.
- The $250 minimum works like the "first deposit" funnel step, which is the most expensive CAC tier ($150 to $300).

### Gaps

- No Sui-specific CAC data; no public CAC data from AI agent products; no data on points or airdrop CAC.

## 6. Regulatory pricing considerations (EU MiCA / portfolio management)

### Takeaway

Under MiCA, discretionary portfolio management of crypto-assets is a licensed CASP service modeled on MiFID II. Its conflict-of-interest and fee-transparency duties apply whatever the fee model. Performance fees draw more conflict scrutiny, but I found no MiCA rule that bans them or treats flat fees more lightly. Whether a non-custodial AI agent counts as "portfolio management" at all is the bigger question, and I found no guidance on it.

### Cited Findings

- MiCA covers 10 regulated crypto-asset services, including portfolio management on crypto-assets; the CASP regime is modeled on MiFID II — [KPMG Cyprus MiCA (Aug 2025)](https://assets.kpmg.com/content/dam/kpmg/cy/pdf/2025/markets-in-crypto-assets-regulation-mica.pdf); [DLA Piper (Apr 2025)](https://www.dlapiper.com/en/insights/publications/2025/04/how-is-mica-impacting-fund-managers)
- Firms holding a MiFID II licence can add crypto services by notification; crypto-native firms need a full CASP authorisation to offer portfolio management or advice — [DLA Piper](https://www.dlapiper.com/en/insights/publications/2025/04/how-is-mica-impacting-fund-managers)
- MiCA's conflict regime is similar to MiFID II's but differs on some points; MiFID II Art. 23 requires firms to identify, prevent and manage conflicts, and to disclose them before acting where controls are insufficient — [Legal500](https://www.legal500.com/intelligence/european-union/technology/conflicts-of-interest-for-casps-under-mica); [ESMA single rulebook, MiFID II Art. 23](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-23-conflicts-interest)
- CASPs must disclose fees transparently and manage conflicts — [InnReg MiCA guide 2026](https://www.innreg.com/blog/mica-regulation-guide)
- Commentary (not regulator text): a vault curator paid on TVL growth and performance fees has a "documented conflict" with mandate-aligned execution — [P2P.org](https://p2p.org/economy/conflict-of-interest-defi-vault-regulation-institutional/); [P2P.org on MiCA and DeFi vaults](https://p2p.org/economy/mica-defi-vaults-institutional-allocators/)

### Inferences

- Performance fees reward risk-taking, which is a conflict a supervisor would expect to be managed and disclosed. A flat time-based fee avoids that incentive but creates another: the operator benefits from keeping users "running", including idle ones. Disclosing the fee as an annualized % of the vault would address MiCA's transparency expectation.
- AUM-based fees look the most like regulated portfolio management, which may strengthen the case that the service is in scope.
- This is not legal advice; get counsel on whether a non-custodial vault plus AI discretion is "portfolio management" under MiCA Art. 3(1)(16)(h).

### Gaps

- No ESMA or NCA guidance found on automated or AI agents that execute discretionary trades in self-custodied vaults. (I did not verify the MiCA article number above from primary text.)

## 7. Willingness to pay for AI trading agents and AUM-tiered pricing

### Takeaway

Surveys show users are open to _delegating a limited share of funds_ to AI, especially with loss caps. None measures what they will pay. Real price points for AI trading agents are $25 to $50/month (Senpi) or 10% of profits/yield. Crypto products scale fees mainly by volume tier (Axiom) or a % of AUM or profit; flat AUM-tiered subscriptions are rare.

### Cited Findings

- MEXC survey (Oct 2026, n=3,708): 84.8% used AI for crypto research or trading in the past 6 months; only 6.5% would authorize AI to trade most of their funds; 54% would allow AI no more than 20% of their balance; with limits on funds, positions, leverage and losses plus an auto-stop, willingness rose to 71.8% (exchange-sponsored) — [MEXC press release](https://blog.mexc.com/press-release/mexc-ai-trading-report-85-use-ai-for-crypto/); [FinanceFeeds](https://financefeeds.com/ai-trading-crypto-traders-mexc-survey/)
- CoinGecko survey (n=2,632): 87% would let AI agents manage at least 10% of their portfolio; about 14.5% would hand over everything — [Cointelegraph](https://cointelegraph.com/news/majority-crypto-users-let-ai-agents-manage-portfolio)
- 2026 survey (n=1,036): 63.6% would not let AI trade autonomously; 79.4% would let AI manage at most 25% — [Techiexpert](https://techiexpert.com/ai-trading-in-crypto/)
- Volume-tiered fees: Axiom 0.95%, then 0.85% (Gold) and 0.75% (Champion) — [Openliquid](https://openliquid.io/telegram-trading-bot/)
- AI agent price points: Senpi $50/month (earlier $25) with 0% trading fees on paid plans — [Senpi](https://senpi.ai/); Giza 10% of yield — [DefiLlama](https://defillama.com/protocol/giza)

### Inferences

- If users allocate 10% to 25% of their crypto to an agent, then a $250 vault implies a $1k to $2.5k crypto portfolio. For that user, $29.70/month is about 1.2% to 3% of their _whole_ portfolio per month. Users who could fund a $1k to $5k vault (fee drag 7% to 36%/yr) are the segment where the flat fee is competitive.
- Options worth modeling: (a) raise the minimum to about $1k, or tie the daily fee to vault size (e.g., capped at X% of NAV per year); (b) a hybrid of a low flat fee plus a profit share above a high-water mark (Hyperliquid's 10% is the anchor); (c) pause billing when the agent is idle. All three cut fee drag on small vaults. Whether they win more users is not proven.
- The MEXC finding that loss caps raise willingness supports offering a user-set max-drawdown auto-stop. This also fits CLAUDE.md's rule that the agent can never withdraw.

### Gaps

- I found no study that directly measures willingness to pay for AI trading agents, or that tests AUM-tiered against flat pricing in crypto.
