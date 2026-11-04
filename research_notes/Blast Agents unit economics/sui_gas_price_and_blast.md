# Sui gas, SUI price, oracles, and Blast fees/activity (as of 2026-11-04)

Research environment note: docs.sui.io, www.sui.io, api.coingecko.com, api.llama.fi and fullnode RPC were all unreachable from this session (DNS blocked). Gas facts therefore come from (1) the Sui protocol-config source at MystenLabs/sui `main` (commit dated 2026-11-03, MAX_PROTOCOL_VERSION 141), cloned via public git, and (2) real mainnet transaction gas recorded in Blast's deployment JSONs (Sept–Oct 2026). Local file paths are cited as sources where that is the origin.

Local source abbreviations:
- PC = `crates/sui-protocol-config/src/lib.rs` in https://github.com/MystenLabs/sui (main, 2026-11-03)
- E2E = `blast-v2-contracts/deployments/sui/mainnet/2026-10-20-blast-presale-versioned-e2e.json` (https://github.com/interest-protocol/blast-v2-contracts)
- OTC = same dir, `2026-09-24-otc-and-vesting.json`; PRE = `2026-10-09-blast-presale.json`; CANON = `2026-10-28-canonical-launch-stack.json`
- LP = `/home/user/blaster/move/vendor/blast/launchpad/sources/*` (vendored canonical Blast Move source)
- DOC = `blast-v2-contracts/docs/llms/launchpad.md`

## (a) Sui gas costs for this workload

### Takeaway

Real mainnet transactions from Oct 2026 show a trivial Move call costs about 0.0001 SUI net (~$0.0001), and swap-like PTBs touching several shared objects cost 0.001–0.008 SUI net (~$0.001–$0.007 at $0.87/SUI). The business plan's $0.03–$0.08 per vault per day covers about 10–30 agent trades plus one `charge_fee` per day, with room to spare. One PTB can batch hundreds of `charge_fee` calls (1,024 commands, 2,048 input objects, 128 KiB tx size). Shared-object congestion matters for the hot `Launch` object, not for the vaults.

### Cited Findings

**Gas model parameters (protocol config)**
- Minimum computation is `base_tx_cost_fixed` = 1,000 gas units (set at protocol v18). `gas_rounding_step` = 1,000. `max_gas_computation_bucket` = 5,000,000 units — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)
- `storage_gas_price` = 76 (units per byte, from v3). `obj_data_cost_refundable` = 100 — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)
- **Storage rebate rate on mainnet went from 9,900 bps (99%) to 9,999 bps (99.99%) at protocol v138.** The non-refundable storage fee fell from 1% to 0.01%. The source comment says "Testnet already runs version 138, so it gets this change in version 139" — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs). Mainnet txs agree: Sept 2026 txs show nonRefundableStorageFee ≈1% of rebate (9,880 of 988,000), and Oct 9 2026 txs show ≈0.01% (163 on a 1,633,837 rebate) — [OTC, PRE](https://github.com/interest-protocol/blast-v2-contracts/tree/main/deployments/sui/mainnet)
- `max_programmable_tx_commands` = 1,024. `max_input_objects` = 2,048. `max_tx_size_bytes` = 128 KiB. `max_gas_payment_objects` = 256. `max_move_object_size` = 250 KiB — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)
- `max_tx_gas` = 50,000,000,000,000 MIST and `max_gas_price` = 50,000,000,000 MIST since v72. Source comment: "Invariant: max_gas_price * base_tx_cost_fixed <= max_tx_gas". Earlier values were 50,000,000,000 MIST (50 SUI) and 100,000 — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)
- Congestion control is per object, in `ExecutionTimeEstimate` mode (v94 params): target_utilization 50%, `allowed_txn_cost_overage_burst_limit_us` 500,000 (500 ms), max_estimate_us 1.5 s. `max_deferral_rounds_for_congestion_control` = 10. SIP-45 priority-gas amplification is `max(0, gas_price/RGP − K)` — [PC](https://github.com/MystenLabs/sui/blob/main/crates/sui-protocol-config/src/lib.rs)
- Reference gas price (RGP) is set each epoch at the 2/3 stake-weighted point of validator quotes. Genesis RGP was 1,000 MIST. Validator quotes must be below 100,000 MIST — [Sui tokenomics paper](https://docs.sui.io/paper/tokenomics.pdf); [Sui docs: Gas Fees](https://docs.sui.io/concepts/tokenomics/gas-in-sui); [MystenLabs/sui-docs PR #743](https://github.com/MystenLabs/sui-docs/pull/743)

**Observed mainnet costs (Blast's own txs, Sept–Oct 2026; netGasMist = computation + storage − rebate)**
- Minimum-size txs: computationCost = 100,000 MIST in every simple tx (ACL grants, wraps, vesting claims). Package publishes had 575,000–716,000 MIST computation — [OTC, PRE](https://github.com/interest-protocol/blast-v2-contracts/tree/main/deployments/sui/mainnet)
- Simple shared-object Move calls, net: `set-fees` 113,315; `cetus-settle` 105,466; `cetus-collect-empty` 110,963; `cetus-lp-fees` 125,517; `partner-presale-rates` 128,632 MIST — [E2E](https://github.com/interest-protocol/blast-v2-contracts/blob/main/deployments/sui/mainnet/2026-10-20-blast-presale-versioned-e2e.json)
- Swap-like PTBs touching pool + config shared objects, net: `cetus-swap-buy` 2,509,378; `cetus-swap-sell` −1,661,465 (net rebate); `bluefin-swap-buy` −1,240,567; `bluefin-swap-sell` −1,263,364; `aftermath-swap-buy` 6,544,380; `aftermath-swap-sell` 7,950,244 MIST — [E2E](https://github.com/interest-protocol/blast-v2-contracts/blob/main/deployments/sui/mainnet/2026-10-20-blast-presale-versioned-e2e.json)
- Bonding-style commit txs on Blast presale, net: commit-first 1,353,105–4,119,213; commit-fill 1,353,114–4,119,213 MIST. Launch/pool creation: 5.9–24.9M. Migrations: 19–43M MIST — [E2E](https://github.com/interest-protocol/blast-v2-contracts/blob/main/deployments/sui/mainnet/2026-10-20-blast-presale-versioned-e2e.json)
- Mutating one small existing object shows storageCost 988,000 MIST, almost all of it rebated when the object is rewritten or deleted (e.g. vesting `close`: storage 988,000, rebate 34,918,884) — [OTC](https://github.com/interest-protocol/blast-v2-contracts/blob/main/deployments/sui/mainnet/2026-09-24-otc-and-vesting.json)

### Inferences

- **RGP level (inferred, not verified):** 100,000 MIST computation for the 1,000-unit minimum tx implies a gas price of about 100 MIST/unit in Sept–Oct 2026. That is far below the 1,000 MIST genesis value and the ~750 MIST of 2023–24. Confirm with `suix_getReferenceGasPrice` once RPC is reachable.
- USD conversions below use SUI = $0.87 (see b). 1 SUI = 10^9 MIST.

| Workload                                                                     | Net MIST (observed/estimated)                                                                        | SUI          | USD @ $0.87    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------ | -------------- |
| Trivial Move call on a shared object (no new objects)                        | ~105k–130k (observed)                                                                                | 0.0001       | ~$0.0001       |
| `charge_fee`: vault mutate + split Coin<SUI> + transfer new coin to treasury | ~1.1–1.5M (estimate: 100k computation + ~1M storage for one new Coin object, vault rewrite ~rebated) | ~0.0012      | ~$0.001        |
| Agent buy/sell PTB, vault + Launch + configs (2–4 shared objects)            | ~1.5–8M (analogues: Blast commit 1.35–4.1M, Cetus 2.5M, Aftermath 6.5–8M)                            | 0.0015–0.008 | $0.0013–$0.007 |
| First buy of a new meme type (new dynamic field/balance in vault)            | + ~1–3M storage, 99.99% refundable on delete                                                         |              | +$0.001–0.003  |

- Per-vault daily gas: 1 `charge_fee` (~$0.001) + N trades × ~$0.003–0.007 gives about $0.03 at N≈5–10 and $0.08 at N≈12–25. The plan's $0.03–$0.08 is consistent with 10–30 trades/day. A 30-decision/day cap with every decision trading gives a ceiling of about $0.10–$0.21/vault/day. If RGP rose back to ~750 MIST, computation would rise 7.5×, but storage would not (storage is priced separately), so the swap total would rise roughly 2–4×.
- **Batching `charge_fee`:** a single sender holding many owned TradeCaps can put many calls in one PTB. Each vault needs about 2 inputs (shared vault + owned cap, plus shared Clock/config once), 1 MoveCall, and possibly 1 TransferObjects. Limits: 1,024 commands means about 500–1,000 vaults; 2,048 inputs means about 1,000; 128 KiB size means roughly 500–600 vaults at ~80 bytes per object ref. A practical batch is about 200–400 vaults per tx. Gas budget is not binding (50,000 SUI max).
- **Congestion:** under per-object execution-time congestion control, a tx is deferred (up to 10 rounds, then cancelled) if any shared object it touches is over budget. Vault objects are touched only by the operator, so a large batch is unlikely to be throttled. A huge batch has a large execution estimate, though, which could exceed the 500 ms burst allowance on a shared object it uses (e.g. a global config/Clock-like object). Keeping batches to a few hundred is prudent. The real hot spot is each new `Launch` object in its first minutes: agent trades compete with snipers and may be deferred or cancelled. SIP-45 priority gas (pay above RGP) is the lever, at proportionally higher cost.

### Gaps

- No direct RGP reading (RPC and Sui explorer sites blocked). The ~100 MIST figure is inferred.
- No observed mainnet gas for an actual `blast_fun::launch::buy/sell` through a vault wrapper. These need simulation (`sui client ptb --dry-run` or `dryRunTransactionBlock`) once our package exists.
- No documented hard cap on shared objects per tx beyond `max_input_objects`. Could not read docs.sui.io for current congestion guidance.

## (b) SUI/USD price level and volatility vs a 2× fee cap

### Takeaway

SUI was about $0.87 on 3 Nov 2026, down about 33% from a late-Sept 2026 high near $1.30. Its 2026 low was about $0.64 (18 Aug 2026), and it is about 84% below its $5.35 ATH (Jan 2025). A 2× SUI-denominated cap is breached by any 50% fall in SUI after the cap is approved. SUI has done that several times within a year, so a vault lasting several months has a material chance (inferred 10–40%) of needing re-approval.

### Cited Findings

- SUI ≈ $0.8658 on Nov 3 2026 (24h range $0.8586–$0.8942, −2.7%), in a descending channel since a late-September peak near $1.30, about 33% below that high (CoinGecko data cited in article) — [CoinGabbar](https://coingabbar.com/en/sui-price-prediction-privacy-news-spark-sui-bounce)
- Coinlore: $0.8686, −3.85% 24h, short-term support ~$0.727 — [Coinlore](https://www.coinlore.com/coin/sui); Yahoo Finance $0.8672, −3.75% — [Yahoo](https://finance.yahoo.com/quote/SUI20947-USD/)
- ATH $5.35 on 6 Jan 2025; ATL ~$0.3648 (Oct 2023) — [CoinGecko](https://www.coingecko.com/en/coins/sui); [Coinpedia](https://coinpedia.org/price-prediction/sui-price-prediction/) gives ATH $5.36
- 2026 low $0.639 on 18 Aug 2026 — [CryptoTicker](https://cryptoticker.io/en/prediction/sui-price-prediction/); multi-month swing low $0.66 in H1 2026 — [Criptolog](https://www.criptolog.com/coin/sui/sui-navigates-critical-waters-as-token-tests-multi-year-lows-in-2026/); $0.7966 on 7 Sep 2026 — [CryptoClassic](https://www.cryptoclassic.org/sui/price-history/)
- Volatility: "ATR(14): 7.35% of price" and "intraday swings frequently exceeding 5%" (secondary, unspecified date) — via search over [Changelly](https://changelly.com/blog/sui-sui-price-prediction/) / [Phemex](https://phemex.com/blogs/sui-price-forecast-2026-june-2)
- Late-2025 reference: SUI near $1.55 in late Nov 2025 (stale; context only) — [CoinGape](https://coingape.com/markets/3-reasons-why-sui-price-will-continue-to-rip-in-november/amp)

### Inferences

- Observed swings: Aug 18 low $0.639 → late-Sep ~$1.30 (+103% in ~6 weeks) → Nov 3 $0.87 (−33% in ~5 weeks). Jan 2025 → Aug 2026: −88%. Over roughly 20 months, SUI fell more than 50% from many starting points.
- At $0.87, a $0.99 fee is ≈1.14 SUI/day, so a 2× cap ≈ 2.28 SUI/day. The cap binds (fee needs more SUI than the cap allows) once SUI < $0.435, i.e. a 50% fall from the approval price. Re-pricing upward is not a problem: if SUI rises, the fee in SUI shrinks.
- Rough barrier-hit probabilities (assumption: annualized vol ~80%; ATR 7.35% suggests 60–100%): touching −50% within 90 days ≈ 8%, within 180 days ≈ 20%, within 1 year ≈ 35–40% (lognormal reflection approximation, zero drift). A 3× cap (−67% barrier) gives roughly 1%, 5% and 15%. These are model estimates, not data.
- Design implication: either (i) tie the cap to the price at approval and prompt re-approval when the needed fee exceeds 80–90% of the cap, or (ii) set the cap at 3×. Both keep the per-day exposure bounded: at $0.87, 2× is ≈$1.98/day of SUI value, so the worst-case daily overcharge is about $0.99.

### Gaps

- Could not compute exact 30-day/1-year realized volatility or max daily/weekly drawdown from a daily series (CoinGecko API blocked). Recommend pulling the CoinGecko `market_chart?days=365` series and computing stdev of log returns × √365.
- The 2026 YTD high is not verified.

## (c) Price-oracle options for converting $0.99 to SUI

### Takeaway

Pyth (pull oracle) and Switchboard are both live on Sui, and a PTB can update and read a price atomically. Pyth SUI/USD feed: `0x50c67b3f…a266`, fee paid in SUI and read from on-chain state. Because the on-chain cap already bounds the damage, an operator-signed off-chain price is acceptable if sanity-bounded. A Pyth read in the same PTB is the stronger option.

### Cited Findings

- Pyth and Switchboard on Sui are pull oracles: "a transaction fetches a fresh signed update offchain, applies it onchain, and reads it, in that order, atomically" — [Sui docs: consuming price feeds](https://docs.sui.io/onchain-finance/oracles/consuming-price-feeds); [Oracles for DeFi on Sui](https://docs.sui.io/onchain-finance/oracles/)
- SUI/USD Pyth feed ID `0x50c67b3fd225db8912a424dd4baed60ffdde625ed2feaaf283724f9608fea266` (Move uses it without `0x`) — [Sui docs](https://docs.sui.io/onchain-finance/oracles/consuming-price-feeds)
- The Pyth update fee is read from on-chain Pyth state (base update fee). It can be paid from the gas coin or a supplied SUI coin. Pyth advises calling the update from client code (TS/Rust) in the PTB, not from a contract. Update data comes from Hermes — [Pyth docs Sui](https://docs.pyth.network/price-feeds/use-real-time-data/sui); [Mysten suins pyth.ts](https://unpkg.com/@mysten/suins@1.0.2/src/pyth/pyth.ts); [pyth-sui-sdk](https://docs.rs/pyth-sui-sdk/0.24.0/src/pyth_sui_sdk/update.rs.html)
- Pyth launched low-latency pull oracles on Sui — [Pyth blog](https://pyth.network/blog/pyth-low-latency-pull-oracles-launches-on-sui)
- Blast's own boosts deployment uses a price policy with `maxPriceAgeMs: 30000`, `maxPriceAheadMs: 0`, i.e. a 30 s staleness bound. Blast's Aftermath venue work references Pyth `PriceInfoObject` and Pyth Lazer feed objects — [`2026-09-22-nvda-alpha-boosts.json`](https://github.com/interest-protocol/blast-v2-contracts/tree/main/deployments/sui/mainnet); `docs/research/aftermath-venue-bytecode-2026-09-20.md`

### Inferences

- Cost of a Pyth update in the `charge_fee` PTB: one Wormhole VAA verification plus a `PriceInfoObject` update. It is computation-heavier than a plain call (likely a few hundred thousand to ~2M MIST net, plus the base update fee). That is still ≪ $0.01, and if batched it is paid once per PTB, not per vault. (Estimate. The actual base fee is not retrieved; I believe it is very small, on the order of 1 MIST, but this is unverified.)
- Off-chain best practice, if not using Pyth on-chain: take the median of ≥3 sources (e.g. Binance SUIUSDT, Coinbase, Pyth Hermes, CoinGecko). Reject if spread > 1–2% or the quote is older than 60 s. Clamp the day-over-day change (e.g. ±25%) and halt fee charging on breach. Log the price used per charge. The on-chain cap (2× SUI) is the hard backstop against operator error. Supra/Switchboard are alternatives, but adding a second on-chain oracle mostly adds integration surface.

### Gaps

- No live Pyth base update fee value, no Supra details, and no oracle uptime stats for Sui (docs.pyth.network content not fetched in full).

## (d) Blast launchpad fee structure, activity, and trigger estimate

### Takeaway

Blast trade fees are charged in the Quote (SUI) and snapshotted per launch, with a hard max of 1,000 bps (10%) for each of Quote and Meme. Documented publication defaults are 150 bps Quote / 0 bps Meme, with Blast taking 5,000 bps (50%) of each fee. So Blast earns about 0.75% of agent volume and creators earn 0.75%. The deployment JSON readback shows all-zero values at publish (28 Oct 2026). No public data on Blast v2 launches/day was found. Triggers/day = launches/day × vaults, so a per-launch trigger would hit a 30/day cap at any launch rate above ~30/day.

### Cited Findings

**Fee parameters (source is authoritative)**
- `LaunchConfig` holds `quote_fee_bps`, `meme_fee_bps`, `protocol_allocation (meme_bps, quote_bps)`, `creation_fee` (MIST of SUI). Source init values are all 0. Allowed meme decimals {6, 9} — [LP launch_config.move L18–23, L236–246](https://github.com/interest-protocol/blast-v2-contracts) (vendored `/home/user/blaster/move/vendor/blast/launchpad/sources/launch_config.move`)
- Trade fees are bounded by `max_launch_fee_bps` = 1,000 for each asset. Protocol allocation bounds: meme ≤ 9,998, quote ≤ 9,999 bps — [LP launch_config.move L49, L100–102; lib/constants.move](https://github.com/interest-protocol/blast-v2-contracts)
- `RuntimeConfig.protocol_fee_share_bps` (Blast's share of every trade fee) is read live on each trade. Init value 0. The treasury defaults to the publisher — [LP runtime_config.move L16, L94–101](https://github.com/interest-protocol/blast-v2-contracts)
- Fee split: `protocol = ceil(fee × p / 10,000)`, creator gets the rest. Fees are snapshotted at launch start and never change — [LP fees.move L39–57](https://github.com/interest-protocol/blast-v2-contracts); [DOC §Trade fees](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md)
- Creator sell-burn (`SELL_BURN_BPS`): 0 to 5,000 bps (50%) of post-fee Meme on each sale, held in `pending_burn` until migration — [LP lib/constants.move `max_sell_burn_bps`](https://github.com/interest-protocol/blast-v2-contracts); [DOC](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md)
- Graduation target is set per launch by the creator (`set_graduation_target`, any u64). The only check is that the pool's Quote share of the target is > 0. The docs' worked example uses V = T = 8,000 SUI — [LP launch.move L142–150, L250](https://github.com/interest-protocol/blast-v2-contracts); [DOC worked example](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md)
- Opening round: 60–300 s (`min/max_opening_round_ms`) — [LP lib/constants.move](https://github.com/interest-protocol/blast-v2-contracts)
- Partner cut of Blast's fees: ≤ 8,000 bps — [DOC §Partner payouts](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md)
- Documented defaults: "the curve charges 150 BPS of Quote and 0 BPS of Meme, and Blast receives 5,000 BPS of each collected trade fee (50/50 with the creator). The migration allocation defaults to 250 BPS of original Meme supply and 150 BPS of the final real Quote reserve. The creation fee defaults to zero. Administrators can change these settings; read the current objects" — [DOC L587](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md), citing [map.blast.fun/#fees](https://map.blast.fun/#fees)
- Fee changes are timelocked (`schedule_trade_fees`, `schedule_creation_fee`, `schedule_protocol_fee_share`, each with a notice period) — [DOC](https://github.com/interest-protocol/blast-v2-contracts/blob/main/docs/llms/launchpad.md)
- Canonical mainnet deployment (28 Oct 2026): RuntimeConfig `0x93887f80…5092` readback `protocol_fee_share_bps = 0`. LaunchConfig `0xf562d83d…4cca` readback `quote_fee_bps = 0, meme_fee_bps = 0, protocol_allocation = 0/0, creation_fee = 0, quotes.size = 0`. These are init-time readbacks; later configuration txs are not recorded in that file. Launchpad publish cost 263,025,200 MIST; full stack 1,086,515,145 MIST (~1.09 SUI) — [CANON](https://github.com/interest-protocol/blast-v2-contracts/blob/main/deployments/sui/mainnet/2026-10-28-canonical-launch-stack.json)

**Activity**
- blast.fun calls itself "the meme coin launchpad on Sui" with an arcade leaderboard. No public launch counts were found — [blast.fun](https://www.blast.fun/); [leaderboard](https://www.blast.fun/arcade/leaderboard)
- Sui peer launchpads: Turbos.fun (fair launch, graduates to Turbos DEX, ~0.1 SUI launch cost, 6,000 SUI cap), MovePump (2,000 SUI cap, 150 SUI deployment fee), SuiPump (40% creator fees) — [Suipiens](https://suipiens.com/blog/exploring-meme-launchpads-on-sui-blockchain/); [Stouy](https://stouy.com/turbos-fun-sui-meme-coin-launchpad-tutorial/); [SuiPump](https://suipump.org/). Data is 1–1.5 years old.
- Cross-chain benchmarks: Pump.fun peaked at 70,576 tokens created in a day (Jan 2025); SunPump on Tron launched over 7,500 in one day (21 Aug 2024) — [Decrypt](https://decrypt.co/331108/business-memes-inside-solana-meme-coin-pump-fun); [iTiger/SunPump](https://www.itiger.com/hans/news/2520905421); [DL News](https://www.dlnews.com/articles/defi/token-creator-made-over-5m-launching-hundreds-of-memecoins/)
- Sui DEX volume context: $14.265B in July 2025 (press-release figure, stale) — via search result [Cointelegraph PR](https://cointelegraph.com/press-releases/summon-fun-to-launch-as-main-coin-launchpad-on-sui-blockchain-expanding-to-solana)

### Inferences

- **Live fee values are unverified.** If admins applied the documented defaults after publish, agent trades pay 1.5% of Quote per trade: 0.75% to Blast (less any partner cut, ≤80% of Blast's share) and 0.75% to the launch creator. Read LaunchConfig/RuntimeConfig on-chain before modelling. Each launch snapshots its own fee at creation.
- **Blast revenue from agent volume:** Blast revenue ≈ 0.0075 × agent Quote volume. Example: 1,000 vaults × $250 × 1× daily turnover gives $250k/day volume, about $1,875/day to Blast and $1,875/day to creators. A round trip (buy + sell) costs the vault ~3% in fees plus the sell-burn (0–50% of the Meme sold, creator-chosen) and slippage. This strongly penalizes frequent trading: the sell-burn alone can make a sale on a high-burn launch uneconomic, and the agent must read `sell_burn_bps` per launch.
- **Trigger volume:** if every new launch triggers one AI decision per vault, triggers/day = L × V. With V = 1,000 vaults: L = 20 → 20k decisions/day; L = 100 → 100k; L = 1,000 → 1M. A 30-decisions/day cap per vault binds once L > 30. Sui launchpads plausibly see tens to a few hundred launches/day (assumption, no data found), well below Solana's peak of 70k/day. So the cap will usually bind, and "new launch" should be a pre-filtered candidate (creator reputation, opening-round pot size, sell-burn ≤ X, graduation target), not a per-launch LLM call. Better still, score each launch once globally and fan out to vaults in deterministic code, so LLM cost scales with L, not L × V.

### Gaps

- No Blast v2 (launched ~28 Oct 2026) launches/day, volume, or trader counts were found. DefiLlama API, Dune, and the explorers were blocked or unindexed. Count `blast_fun::events::LaunchCreated` and `Bought`/`Sold` events via a Sui indexer/GraphQL once network access allows.
- No current Sui-launchpad daily launch counts. Peer data is stale.
- Applied (post-publish) fee configuration is not in the deployment JSON. Docs say 150/0/5,000 bps; source/readback say 0.
