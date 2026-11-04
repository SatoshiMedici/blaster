# Referral revenue-share programs for Blast Agents (30% of revenue to referrers), as of Nov 2026

Method note: research done 2026-11-04 with web search. Direct page fetches failed for these hosts, which are outside the session's allowed network domains: hyperliquid.gitbook.io, docs.trojan.com, cryptobriefing.com, www.track360.io. They have to be allowed in network settings to verify the primary pages. Many figures below therefore come from search-result excerpts of official docs or from third-party/affiliate sites. Each finding says which. Affiliate "referral code" sites have a commercial bias and often disagree with each other.

Internal context (from repo, not web): fee $0.99/day in SUI; typical-day cost $0.41 (margin $0.58, 59%); capped day with every decision trading costs $0.75 (margin $0.24, 25%) — `docs/ECONOMICS.md`. `charge_fee` can pay only `vault.treasury` once per day, capped (SPEC §1b, `docs/SECURITY.md`). So any referral payout has to come out of the treasury after the fee is collected. It can never be paid from the vault.

## 1. How leading bots and exchanges structure revenue-share referrals

### Takeaway

The market norm is a share of **fees actually paid** by the referee, never of volume. Telegram/Solana bots pay 25–30% at tier 1 plus small multi-level tiers (3–3.5%, 2–2.5%…), and some decay over time. Perp DEXs pay less (Hyperliquid 10%, GMX 5–15%) or scale with referred volume (dYdX 30→50%). CEX affiliates go up to about 50%, and the affiliate can split it into a kickback for referees and a share for sub-affiliates. Referee discounts are 4–10% of fees (pump.fun: about 11%).

### Cited Findings

**Solana/EVM trading bots**
- Trojan: five levels of commission on referred trading fees: L1 25%, L2 3.5%, L3 2.5%, L4 2%, L5 1% (critical review site). — [BehindMLM](https://behindmlm.com/mlm-reviews/trojan-review-telegram-bot-crypto-securities-commodities-fraud). Conflicting older description: 30% month 1, 20% month 2, 10% forever. — [Medium, Apr 2024 list](https://medium.com/@0xkryptokeisarii/all-telegram-trading-bot-referral-systems-listed-april-2024-cd043095e2b4). Another says "10% + 5-level depth". — [CoinCodeCap](https://coincodecap.com/all-telegram-trading-bot-referral-programs-listed). UNVERIFIED: the official page (docs.trojan.com/trojan-arena/referral-system) was blocked. BehindMLM calls Trojan's multi-level scheme an MLM / securities red flag.
- BONKbot: Telegram referral links pay 30% of a referred user's fees in month 1, 20% in month 2, 10% for life. Telemetry referrals pay a flat 30% across three levels (review site, not official). — [Lyra Terminal](https://lyra-terminal.com/trading-bots/bonkbot)
- Axiom: L1 30%, L2 3%, L3 2%, described as "30% of net fee" on direct referrals. Referees get a 10% trading-fee discount (third-party guides citing Axiom docs). — [Medium guide](https://medium.com/@geggonen/axiom-trade-complete-guide-938e97c0a3a6); [uwuu.ai review](https://uwuu.ai/blog/axiom-trade-review); [Axiompedia](https://axiompedia.com/compare)
- GMGN: 10%–30% referral commission, no tier breakdown found. GMGN and Photon described as a flat 1% fee with no referee discount. — [Axiompedia compare](https://axiompedia.com/compare); [madeonsol compare](https://madeonsol.com/compare-bots)
- Photon: one guide says Photon publishes no referral discount or commission schedule and calls "0.9% with referral" claims unsupported. — [photonguides.com](https://photonguides.com/referral). A comparison site lists 0.9% anyway. — [madeonsol](https://madeonsol.com/compare-bots) (CONFLICT)
- Banana Gun, Maestro: no current referral percentages found. Banana Gun fee cited as 0.5% per trade. — [madeonsol](https://madeonsol.com/compare-bots). GAP.

**pump.fun (Oct 2026)**
- A new fee structure took effect 2026-10-17 and a referral program was announced 2026-10-16. Reported as pump.fun giving up an income stream for growth. — [Crypto Briefing](https://cryptobriefing.com/pumpfun-zero-fee-solana-app-referral/) (page blocked; from search excerpt)
- App fee 0.45% for wallets with no referral code, 0.40% for wallets that applied a code. Part of the fee goes to the referrer on each trade, at a share "set by pump.fun and may change". — [Publish0x write-up citing pump.fun fees page](https://www.publish0x.com/nft-italia/pumpfun-s-new-50-dollars-referral-program-what-the-fine-prin-xwroerd)
- Separate "Referral Rewards": up to $50 per referral, credited in instalments after review, from a capped, undisclosed budget. Started 2026-10-07. — [Airdrop Alert](https://airdropalert.com/airdrops/pump-fun-referral-rewards/)
- An August 2026 viral per-referral cash claim was fake. — [OurCryptoTalk](https://ourcryptotalk.com/news/pump-fun-rewards-program-claim-fake)

**Hyperliquid**
- Creating a code needs $10,000 of own volume. The referrer gets 10% of referred users' fees, less the referee discount. Rewards apply to a referee's first $1B of volume. The referee discount is 4% for their first $25M of volume. — [Hyperliquid docs, Referrals](https://hyperliquid.gitbook.io/hyperliquid-docs/referrals) (search excerpt; fetch blocked)
- Builder codes: a separate channel where front-ends charge their own fee. The cap is 0.1% on perps and 1% on spot. The user must approve a max fee with `ApproveBuilderFee`, signed by the main wallet and not an API/agent wallet, and can revoke at any time. The builder needs ≥100 USDC perps account value. Builder fees apply to both sides of perps but not to the buy side of spot. — [Hyperliquid docs, Builder codes](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes); [Dwellir](https://www.dwellir.com/docs/hyperliquid/approveBuilderFee); [Privy](https://docs.privy.io/recipes/hyperliquid/builder-codes.md)

**Perp DEXs**
- dYdX: affiliates start at a 30% revenue share **of taker fees** (up from 15% after the v9.4 upgrade), rising to 50% with referred volume over a trailing 30 days. The top rate needs >$10M per 30 days. Percentages are set by dYdX Chain governance. — [dYdX blog: affiliate tiers](https://www.dydx.xyz/blog/affiliate-tiers); [dYdX help FAQ](https://help.dydx.trade/en/articles/240149-affiliate-program-faq). Time-boxed 2026 "Affiliate Booster" pools: 100k USDC, 2026-01-19 to 02-16, paid by share of qualified new-referral volume. — [KuCoin flash](https://www.kucoin.com/news/flash/dydx-launches-2026-first-affiliate-booster-program-with-100-000-usdc-pool); [dYdX blog](https://www.dydx.xyz/blog/surge-season-12-and-affiliate-booster-program-are-live). Referee discount figures ($550, "60%") come only from affiliate sites (UNVERIFIED).
- GMX: Tier 1 gives a 5% trader discount and a 5% affiliate reward, open to anyone. Tier 2 gives a 10% discount and needs ≥15 weekly active users and ≥$5M weekly volume. Tier 3 gives a 10% discount and a 15% affiliate reward and needs ≥30 users and ≥$25M. Tier 3 is paid in ETH/AVAX plus 5% esGMX. — [GMX docs mirror](https://gmx-docs.pages.dev/docs/referrals); [GMX governance](https://gov.gmx.io/t/referral-code-system-redesign-guilds-and-parameter-changes/4830). Tier criteria are re-checked weekly, so a referrer has to keep earning their tier.
- Jupiter (integrator model, not a consumer revshare): integrators set their own fee on swaps through the on-chain, open-source Referral Program. Jupiter keeps 20% of the integrator fee. The fee account can be any SPL token account. — [Jupiter dev docs, fees](https://dev.jup.ag/docs/swap/v2/fees.md); [Referral Program](https://developers.jup.ag/docs/tool-kits/referral-program); [source](https://github.com/TeamRaccoons/referral). The consumer referral gives bonus points only, with no fee discount (third-party). — [cryptoreferralcodes](https://intercom.help/cryptoreferralcodes/en/articles/15835956)

**CEX affiliates**
- Binance: "Referral Pro" up to 50% sustained commission. Sub-accounts are excluded from commission evaluation. Binance may change the program at its sole discretion. — [Binance announcement](https://www.binance.com/en/support/announcement/detail/cd17b963330c47e189e374cf8d845102). Third-party listings say up to 50% on spot and 30% on futures, lifetime. Affiliates may not solicit existing users to re-register as referees (older third-party). — [Creator-Hero](https://www.creator-hero.com/blog/binance-affiliate-program-in-depth-review-pros-and-cons); [Affilimate](https://affilimate.io/programs/binance-affiliate-program/)
- OKX: up to 50% of invitees' trading fees, **lifetime**, settled **hourly in USDT**. The affiliate splits the 50% between self, sub-affiliates and invitees (the kickback). OKX may modify the program at any time. — [OKX affiliate rules (mirror)](https://okx-api.aperture.finance/help/okx-affiliate-program-rules); [2022 OKX deck, old](https://www.scribd.com/document/759764379/OKX-Affiliate-Program)
- Bybit: "up to 50%" across spot, futures and options, lifetime, about 10% sub-affiliate override (third-party only, UNVERIFIED). — [Coinspeaker](https://coinspeaker.com/guides/best-crypto-affiliate-programs); [UpPromote](https://uppromote.com/affiliate-directory/bybit/)

**Sui ecosystem**
- DipCoin (Sui perps): single level, direct invites only, 25% of actual fees paid (Apr 2026). — [CommunityOne](https://communityone.io/pt/servers/1352162121760112660/dipcoin-official/news/dipcoin-25-percent-referral-program-2026-04-16/)
- Bluefin: invite codes give both sides a 10% rebate bonus (third-party guide). — [search result](https://alearesearch.substack.com/p/bluefin-what-you-need-to-know)

### Inferences

- "30% of revenue" sits at the top of the bot norm (25–30% L1). The bots offering 30% either decay it (BONKbot 30→20→10) or add only small deeper tiers. A flat 30% for life is generous next to Hyperliquid (10%) and GMX (5–15%). It is about equal to dYdX's base rate and below the CEX ceilings, but CEX margins on fees are close to 100%, unlike ours.
- Every program pays on **fees collected** (net of any referee discount). None pays on volume. "30% of revenue on the volume their referrals bring" should be implemented as 30% of fee revenue that was actually collected.
- Payment frequency ranges from hourly (OKX) through per-trade (pump.fun, Cetus partner balances) to weekly (GMX). No source surfaced a minimum payout threshold (GAP).

### Gaps

- Official, current percentages for Trojan, Photon, GMGN, Maestro and Banana Gun (docs blocked or unpublished).
- Minimum payout amounts and claim mechanics for the bots.
- Official Bybit terms.

## 2. Attribution mechanics

### Takeaway

Attribution is almost always **one referrer per account, bound once, permanent**, via a code or link. DEXs record it on-chain. Hyperliquid binds a referee to a code, GMX stores the code in a referral-storage contract, Jupiter uses referral accounts, and Cetus uses partner objects with on-chain claimable balances. Sui has no shared referral standard.

### Cited Findings

- Hyperliquid: codes are created after $10k of own volume. A referee enters a code, and the benefits then apply until the referee's $25M (discount) and $1B (rewards) volume limits. — [Hyperliquid docs](https://hyperliquid.gitbook.io/hyperliquid-docs/referrals) (excerpt)
- Hyperliquid builder fees need an explicit, revocable, capped user signature from the main wallet. This is a clean consent pattern. — [Hyperliquid builder codes](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes)
- Jupiter: on-chain referral program with per-mint token accounts, project account `45ruCyfdRkWpRNGEqWzjCiXRHkZs8WXCLQ67Pnpye7Hp`. — [Jupiter referral program](https://developers.jup.ag/docs/tool-kits/referral-program)
- Cetus (Sui): the referral fee is computed from the protocol fee × the referral rate and accrues in the partner object's on-chain balance across swaps. The SDK can claim all of a partner's referral fees. — [Cetus Partner Swap](https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk-v2/sdk-modules/cetusprotocol-sui-clmm-sdk/partner-swap); [Cetus DLMM partner](https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-dlmm-contract/features-available/swap-partner)
- Binance excludes sub-accounts and forbids re-registering existing users as referees. — [Binance announcement](https://www.binance.com/en/support/announcement/detail/cd17b963330c47e189e374cf8d845102); [Creator-Hero](https://www.creator-hero.com/blog/binance-affiliate-program-in-depth-review-pros-and-cons)
- No general on-chain referral standard was found for Sui. Aftermath terms were not found. — [search summary of Sui results](https://rocknblock.io/blog/onchain-referral-program-development-for-web3-projects)

### Inferences

- For Blast Agents the natural binding event is **vault creation**. The owner signs `create`, so the referrer can be an owner-signed field (or an event) at creation. That matches the owner-consent pattern in Hyperliquid's `ApproveBuilderFee`. Binding at wallet connect is weaker (cookie-like, easy to spoof). Binding at first paid fee day loses trial users.
- Cookie windows matter only for web links. Store the `?ref=` code client-side for about 30 days and attach it at `create`. No source gave Blast-specific or bot cookie windows (GAP).
- Bind per owner wallet, not per vault, so that opening a second vault cannot switch the referrer. Make the binding immutable.

### Gaps

- Cookie-window lengths used by the bots.
- Whether any Sui protocol stores the referrer in a user-owned object instead of a partner object.

## 3. Anti-abuse

### Takeaway

The main threats are self-referral (the referrer's own sybil wallets), wash volume, and sybil farms that milk sign-up bonuses or trials. Standard controls: link signals (devices, funding source, behaviour), on-chain wallet clustering, payout caps, holds and clawback rights, excluding self-matched or wash fees, and weighting rewards by unique counterparties.

### Cited Findings

- Self-referral is caught by fusing signals: referred accounts that share devices, funding sources or behavioural fingerprints with the affiliate. Treat it as high-confidence fraud when an account fails device and velocity checks and also clusters with sybil wallets on-chain. — [Track360 2026 playbook](https://www.track360.io/blog/crypto-affiliate-fraud-detection-operator-playbook-2026) (excerpt; fetch blocked)
- Wash-trading detection combines on-chain fund-flow analysis (circular volume), statistical anomaly detection, graph analytics and rule-based typologies. Product design helps: weight rewards by unique counterparties and limit self-referential trading. Substantiated cases lead to clawbacks, wallet-cluster blocks and sometimes SARs. — [Elliptic](https://www.elliptic.co/corpus/gen-2983/fraudulent-trading/wash-trading-detection-on-centralized-exchanges-and-nft-marketplaces.html); academic method: [Victor & Weintraud, arXiv 2102.07001](https://arxiv.org/pdf/2102.07001)
- Vendor controls: payout caps and wallet-cluster detection. — [Fuul sybil resistance](https://fuul.xyz/features/sybil-resistance)
- Exchanges reserve the right to revoke, adjust or withhold rewards for abuse. — [CoinEx on Gate.io](https://www.coinex.com/en/academy/wiki/5542-gateio-referral-program-explained); [CoinEx on Binance](https://www.coinex.com/en/academy/wiki/5349-binance-referral-program-explained)
- Kalshi's rebate program excludes fees from self-matching, wash or pre-arranged trades (allegations context). — [crypto.news](https://crypto.news/kalshi-faces-wash-trading-claims-over-crypto-volume/)
- Eligibility gates: Hyperliquid needs $10k of own volume to create a code. GMX tiers need weekly active referees and volume. pump.fun pays bonuses in instalments after review. — sources in section 1.

### Inferences (Blast-specific)

- **Volume gaming is structurally limited here.** Referees don't trade by hand: the operator's agent trades within on-chain limits. A referrer cannot churn a referee's volume. The remaining vector is **self-referral**: a referrer opens their own vaults under a second wallet. Paying 30% back to oneself is then just a 30% discount on our revenue, never net-negative, as long as the payout is computed on fees **collected** and is ≤ our margin.
- **Where it can go net-negative:** (a) the daily fee on a capped, trade-heavy day leaves only a $0.24 margin, and 30% of $0.99 is $0.297, so the referral payout makes that day **−$0.06**. (b) Trial days collect $0. Paying anything on trial vaults, or a per-signup bonus, invites sybil farms of $250 trial vaults.
- **Blast trade-fee share:** with the documented 150 bps quote fee, half to Blast (75 bps of volume), 30% of Blast's share is 22.5 bps of volume. The referee pays 150 bps regardless, so self-referral cannot make volume profitable. Counting the trade-fee share does, however, create a **conflict of interest**: the referrer and the platform both gain when the agent trades more. That is a suitability/conflicts issue under MiCA (section 4). One option is to exclude trade-fee revenue from the referral base, or at least never feed referral economics into agent decision-making.
- Recommended checks: one referrer per owner wallet; no self-referral (same address, or the referee funded from the referrer's address within N hops, checked via Sui transaction history); referrer must have a paid vault or a minimum stake; pay only on paid fee days; 30-day hold before first payout; clawback of unpaid accruals on fraud; per-referrer monthly cap above which KYC is required.

### Gaps

- No published KYC threshold numbers for crypto affiliates were found (the US 1099 threshold, for example, was not researched).
- No published figures on referral fraud rates in trading bots.

## 4. Accounting, tax and regulatory

### Takeaway

Paying referrers is affiliate marketing (a marketing expense) for the platform and ordinary income for the referrer in most jurisdictions. No source specific to Blast's case was found (GAP). The bigger EU issue is the **inducement ban for portfolio management**: under MiCA Art 81 and MiFID II Art 24(8), a portfolio manager must not accept or retain third-party benefits. If Blast Agents is "portfolio management of crypto-assets", the in-house Blast trade-fee share and any referral arrangements need the MiCA legal opinion already budgeted in `docs/ECONOMICS.md`.

### Cited Findings

- MiCA Art 81: CASPs providing portfolio management of crypto-assets may not accept fees, commissions or monetary/non-monetary benefits from issuers, offerors or any other third party. This is categorical, stricter than the advice regime, which bans them only for independent advice. Suitability must be assessed before portfolio management. Periodic statements are required. — [ESMA Interactive Single Rulebook, MiCA Art 81](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-81-providing-advice-crypto-assets); [Springlex MiCA Art 81](https://www.springlex.eu/en/packages/mica/mica-regulation/article-81/)
- MiCA Art 80 (order routing) bans receiving remuneration or discounts for routing orders to a particular venue. — [ESMA Q&A](https://www.esma.europa.eu/node/207166) (truncated excerpt)
- ESMA guidelines on MiCA suitability and periodic statements for portfolio management: 26 March 2025. — [Chambers](https://chambers.com/articles/2025-mica-suitability-periodic-statement-playbook-how-crypto-asset-managers-can-transform-esma-s)
- MiFID II Art 24(8): portfolio managers must not accept and retain third-party fees or benefits. **Payments the firm makes to third parties** in connection with portfolio management fall under Art 24(9) (quality enhancement, disclosure), not 24(8). The UK FCA bans even initial acceptance. — [ESMA Q&A 1861](https://www.esma.europa.eu/publications-data/questions-answers/1861); [FCA impact assessment](https://www.fca.org.uk/publication/impact-assessments/mifid-ii-inducements.pdf)

### Inferences

- An outgoing referral payment from us to a referrer is closer to the Art 24(9) "payments to third parties" case: disclose it to the referee and make sure it does not harm the client's interests. That favours disclosing "your referrer earns 30% of the service fee" in the UI. Disclosure is cheap and also good consumer practice.
- The trade-fee share earned on the agent's volume is the riskier piece under Art 81 / conflicts-of-interest rules. Referral payouts tied to it amplify the risk. This is not legal advice. It needs the MiCA opinion.
- Tax: treat payouts as marketing expense, recorded in SUI at the payout-date USD price (the treasury already tracks SUI vs USD in `treasuryCurrencyReport`). Unsourced (GAP).

### Gaps

- Specific tax treatment of crypto-paid affiliate commissions (EU/US). Not researched within the budget.
- Whether consumer-protection law (for example the EU Unfair Commercial Practices Directive, influencer disclosure) requires referrers to disclose that they are paid. Likely yes, but unsourced.

## 5. Economics and recommendation

### Takeaway

Rivals pay 25–30% of fees because their fee margin is close to 100% (a bot fee on swaps costs them almost nothing to serve). Our margin on the daily fee is 25–59%, so a flat 30% of gross revenue would take half to all of the contribution. Recommendation: 30% of **collected** service-fee revenue, capped so that the payout never exceeds about half of that day's contribution, for 12 months. Accrue it off-chain per paid fee day, and pay it from the treasury in weekly batched PTBs with a minimum payout.

### Cited Findings

- Market bases: "net fee" (Axiom), "fees less referee discount" (Hyperliquid), "taker fees" (dYdX), "actual fees paid" (DipCoin). — sources in section 1
- Duration and caps: Hyperliquid stops rewards at the referee's first $1B of volume. BONKbot decays 30→20→10%. OKX and Binance pay "lifetime". dYdX booster pools are capped. — sources in section 1
- Internal: 30% of revenue roughly doubles break-even from about 250 to about 500 paid vaults, and leaves a capped vault about $2/month. — `docs/ECONOMICS.md` (repo)

### Inferences — recommended design

**What counts.** The base is the daily service fee actually collected by `charge_fee`: no trial days, no paused days, no skipped days. The Blast trade-fee share should be either excluded at launch (conflict-of-interest risk, section 4) or included only after the MiCA opinion, at 30% of Blast's net 75 bps share and never of gross volume.

**Rate.** 30% of collected fee, with a payout cap per vault-day of min(30% × fee, 50% × (fee − that day's measured AI+gas cost)). At a typical day that is min($0.297, $0.29) ≈ $0.29. At a capped trade-heavy day it is min($0.297, $0.12) = $0.12, so the platform keeps a positive margin. A simpler alternative: 30% of collected fee, with a hard cap of $0.20 per vault-day.

**Duration.** 12 months per referred vault owner from their first paid day. This is below the CEX "lifetime" norm, but bot programs decay too (BONKbot), and it bounds the liability.

**Tiers.** Single level at launch, no multi-level. Multi-level tiers draw MLM/securities scrutiny (BehindMLM on Trojan) and add sybil surface. Optionally, a referee kickback such as 10% off the first 30 days (Axiom 10%, GMX 5–10%, pump.fun about 11%) paid out of the referrer's 30% (OKX-style split), not on top of it.

**Attribution.** A code or link is stored client-side for about 30 days. The referrer is bound at vault `create`, signed by the owner, emitted as an event, and kept off-chain in the DB keyed by owner address. It is immutable, one per owner wallet, and blocks self-referral. The referrer must have their own paid vault (compare Hyperliquid's $10k-volume gate). The vault Move module must not change: referral never touches vault funds, and the `check_trade_cap_surface.py` invariant stays intact.

**Accrual.** Each day after `chargeFees` succeeds, record `accrual(referrer, vault, day, fee_mist, payout_mist)` from the on-chain `charge_fee` event (verifiable, idempotent per vault-day).

**Payout.** Weekly. Minimum about 1 SUI equivalent (otherwise roll over). 30-day hold on a referrer's first payout. Paid in SUI from the treasury in batched PTBs (reuse the 250-per-PTB batching), under human approval per CLAUDE.md (dry-run by default; mainnet signing only with approval). Later option: a separate `referral_rewards` Move module where the treasury deposits a weekly `Balance<SUI>` into per-referrer claimable entries (Cetus partner-balance pattern). This moves gas to referrers and gives an audit trail, but it is a new package that needs review and must stay separate from the vault.

**Anti-abuse.** Funding-source check (the referee's first funding is not from the referrer within 2 hops); shared-device/IP signals off-chain; nothing paid on trials and no signup bonuses; clawback of unpaid accruals on fraud; per-referrer monthly cap (for example $1,000) above which KYC/tax info is required; terms that reserve the right to adjust (as Binance and OKX do).

**Disclosure.** Show the referee "your referrer earns X% of your service fee" (MiFID Art 24(9)-style transparency; consumer protection).

### Gaps

- Real margins of bots (their infra cost per trade) were not found. The claim that they run near 100% margin is an inference.
- No source on whether bots compute the share on gross or net-of-cost revenue beyond "net fee" (Axiom, meaning net of the referee discount).
