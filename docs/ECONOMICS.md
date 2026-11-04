# Unit economics

What the business earns and spends per vault, which numbers are checked in code, and what is still a decision. The research behind it, with sources, is in [reports/Blast Agents unit economics.md](../reports/Blast%20Agents%20unit%20economics.md) (notes in `research_notes/`). Pricing is locked in [SPEC §1b](../SPEC.md#1b-locked-ux-and-billing-decisions-seamless-by-design).

## The model in one table

All figures are per paid vault, Nov 2026 prices: `anthropic/claude-sonnet-5.5` and `openai/gpt-6.1-sol` at $2 / $10 per 1M tokens, 5% OpenRouter fee on USDC top-ups, SUI ≈ $0.87.

| Day                                 | Decisions | Caching | AI    | Gas   | Cost  | Fee   | Margin                      |
| ----------------------------------- | --------- | ------- | ----- | ----- | ----- | ----- | --------------------------- |
| SPEC typical                        | 20        | off     | $0.36 | $0.05 | $0.41 | $0.99 | 59%                         |
| SPEC busy (cap)                     | 30        | off     | $0.54 | $0.08 | $0.62 | $0.99 | 37%                         |
| Cap, every decision trades          | 30        | off     | $0.54 | $0.21 | $0.75 | $0.99 | **25%**, below the 30% rule |
| Cap, 80% cache hits                 | 30        | on      | $0.31 | $0.21 | $0.52 | $0.99 | 47%                         |
| Cap, 2,000-token outputs (old code) | 30        | off     | $1.01 | $0.08 | $1.09 | $0.99 | **−10%**                    |

Monthly contribution at a typical day is about $17. Fixed costs, including a MiCA legal opinion the SPEC leaves out, run about $4,000–4,500/month, so **break-even is about 250 paid vaults, not 185**. A 30% revenue-share referral programme roughly doubles that.

## What the research changed

1. **The cap becomes the normal day.** Every new launch triggers every vault, so above about 30 launches a day each vault hits the 30-decision cap. Fixed by global screening and coalescing (below).
2. **The $0.022 cost alarm fires too late.** The level that keeps 30% at the cap is about $0.0204. A total cache failure ($0.0205) wouldn't trip $0.022 at all. Thresholds are now derived from the rule, and a separate alarm watches the cache hit rate.
3. **Output tokens must be capped.** The starter allowed 2,000 output tokens, which makes a capped day lose money. The cap is now 600.
4. **Don't pin `provider.order` on OpenRouter.** It turns off sticky routing, which is what produces cache hits. This contradicts SPEC §6.1's "pin the provider".
5. **A 2× fee cap binds after a 50% SUI fall.** A model estimate puts that at about 20% of vaults within 180 days. Re-approval is now requested at 80% of the cap.
6. **Fee drag on the $250 minimum is 144.5% a year** (36% on $1,000, 7.2% on $5,000). For the user to break even, the agent must make about 12% a month on $250. Churn, not cost, decides the business: LTV is about $45–120, while paid CAC is $100–300.

## Where each rule lives in code

| Rule                                                                                            | Code                                                                                                        | Tests                                            |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| $0.99/day in SUI, rounded down; 2× on-chain cap                                                 | `quoteFeeTerms`, `usdToMist` in `packages/shared/src/pricing.ts`                                            | `economics.test.ts`                              |
| Prepaid daily charge, capped after a SUI crash, pause (never sell) when short                   | `decideDailyFee` → `VaultTransactions.chargeFee` / `pauseByAgent`; on-chain `charge_fee` + `pause_by_agent` | shared + Move                                    |
| Price only from ≥2 fresh agreeing sources; reject >25% daily jumps                              | `aggregatePrice`, `checkDailyPriceMove`                                                                     | shared                                           |
| Re-approval before the cap binds                                                                | `feeCapHeadroom` (alerts at 80%)                                                                            | shared                                           |
| 3-day trial once per wallet, only at the $250 minimum                                           | `trialDaysFor`, `minDepositMist` → `create(…, free_days)`                                                   | shared + Move                                    |
| Rule-based triggers (new launch, 50/80% crossing, >10% position move, 4 h)                      | `evaluateTriggers` in `packages/agent-core/src/triggers.ts`                                                 | `triggers.test.ts`                               |
| Coalesce non-urgent triggers (30 min gap); urgent ones skip it                                  | `TriggerConfig.minGapMs`, `URGENT_TRIGGERS`                                                                 | `triggers.test.ts`                               |
| Screen launches once, globally, in plain code; bounded snapshot                                 | `screenLaunches` in `screener.ts`                                                                           | `screener.test.ts`                               |
| 30 decisions per vault per day                                                                  | `DecisionCap` in `budget.ts`                                                                                | `budget.test.ts`                                 |
| Per-vault AI ceiling of $0.45/day (backstop)                                                    | `VaultSpendLedger`                                                                                          | `screener.test.ts`                               |
| Daily platform AI budget, kill switch, stop on OpenRouter 402                                   | `PlatformSpendGuard`, `onModelFailure`                                                                      | `budget.test.ts`                                 |
| Low-credit alert at 7 days of runway                                                            | `creditRunway`                                                                                              | `budget.test.ts`                                 |
| Cost alarm derived from the 30% rule; auto-lower the cap; cache-hit alarm                       | `CostMonitor` → `costAlarmThresholdUsd`, `maxDecisionsForMargin`, `cacheHitAlarmFloor`                      | `budget.test.ts`                                 |
| Cache-first prompt, explicit breakpoint, 600-token cap, no provider pin, no training on prompts | `buildCachedMessages`, `OPENROUTER_REQUEST_EXTRAS`, `MAX_OUTPUT_TOKENS`                                     | `openrouter.test.ts`                             |
| One warm-up call per tick, then fan out                                                         | `warmUpThenFanOut`                                                                                          | `screener.test.ts`                               |
| Cost per decision from OpenRouter usage (or estimated from the price table)                     | `toDecisionUsage`                                                                                           | `openrouter.test.ts`                             |
| Batch fee charges (250 vaults per PTB) and vault reads (50 per multi-get)                       | `chargeFees`, `readVaults` in `packages/vault-sdk`                                                          | `transactions.test.ts`                           |
| Treasury SUI vs USD costs: _propose_ conversions, never execute them                            | `treasuryCurrencyReport`                                                                                    | shared                                           |
| The whole model (cost per decision, margins, break-even, LTV, fee drag)                         | `packages/shared/src/economics.ts`                                                                          | `economics.test.ts` reproduces SPEC §1b's tables |

The worker in SPEC §13 step 5 wires these together. Thresholds come from `economics.ts` and must not be hard-coded.

## Decisions for Mário and Jose

These change the business, not just the code, so they weren't implemented unilaterally.

| Decision                     | Options                                                                                                                                                                                                                     | Research view                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Small-vault pricing          | (a) keep $0.99 and $250; (b) raise the minimum to about $1,000 (36%/yr drag); (c) add a "Lite" tier on `claude-haiku-5.5` / `gpt-6-luna` at about $0.33/day for vaults under $1,000 (about 68% margin, 48%/yr drag on $250) | (c) or (b). Lite slugs are in config but disabled until the arena measures their decision quality    |
| On-chain fee cap             | 2× (SPEC) or 3× for new vaults                                                                                                                                                                                              | 3× cuts the 180-day chance of the cap binding from about 20% to about 5%; `PRICING.feeCapMultiplier` |
| Referral payouts             | 25–35% of revenue (market norm) or a share of contribution / capped at 15–20%                                                                                                                                               | Contribution share; 30% of revenue leaves a capped vault about $2/month                              |
| SPEC §6.1 "pin the provider" | keep, or drop for caching                                                                                                                                                                                                   | Drop `provider.order`; narrow providers with `require_parameters` / `zdr` instead                    |
| MiCA legal opinion           | before user deposits                                                                                                                                                                                                        | Highest-impact spend; a CASP licence is €300–700k in year one                                        |

## Measure in the arena, then replace the estimates

- Live Blast fees (`LaunchConfig`, `RuntimeConfig`) and launches per day. The deployment readback showed zeros, and there is no public launch count.
- Reference gas price and gas per vault buy/sell (needs mainnet RPC; see docs/PROGRESS.md).
- Real cache hit rate per model and cost per decision, from `toDecisionUsage`.
- Trial-to-paid conversion and monthly churn by cohort. The 15–40% range is an assumption.
