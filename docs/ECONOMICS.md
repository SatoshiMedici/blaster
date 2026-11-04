# Unit economics

How Blast Agents charges, what each plan costs us, and where every rule is enforced in code. Pricing is defined in [SPEC §1b](../SPEC.md#1b-locked-ux-and-billing-decisions-seamless-by-design) (revision 3).

The research behind it, with sources:

- [reports/Blast Agents unit economics.md](../reports/Blast%20Agents%20unit%20economics.md): costs, caching, gas, fixed costs, churn.
- [reports/Blast Agents models fees referrals.md](../reports/Blast%20Agents%20models%20fees%20referrals.md): model choice, fee design, fee caps, referrals.

## How a user is charged

1. **The user picks a plan:** a model from the catalog and an activity level. The activity level sets the agent's decisions per day and how fast it reacts. There is no platform cap; the plan is the budget.
2. **The price follows from cost.**

   ```text
   daily price = (decisions/day × cost per decision + gas/day) ÷ (1 − 30% referral − 30% margin)
   ```

   It is rounded up to the cent, with a $0.02/day minimum. Cost per decision is the model's OpenRouter price at a conservative 50% cache-hit rate, plus the 5% credit fee and about $0.0025 of trade gas. So every plan keeps **≥ 30% margin on referred users** and **≥ 60% on direct users**.
3. **The plan is prepaid daily in SUI** at that day's SUI/USD price. A paused or closed vault pays nothing. The contract never lets more than the **fee cap** leave in one day (see below).
4. **There is no minimum deposit.** The Choose screen shows the fee as a yearly share of the vault, flags it above 10% and 30% a year, and preselects the most active plan under 10%.

## Plan prices (Nov 2026 catalog prices)

| Model (tier)                             | Watchful (6/day) | Steady (24/day) | Active (72/day) | Intense (288/day) |
| ---------------------------------------- | ---------------- | --------------- | --------------- | ----------------- |
| Claude Sonnet 5.5, GPT-6.1 Sol (premium) | $0.26            | $1.01           | $3.01           | $12.02            |
| Grok 4.7 (standard)*                     | $0.28            | $1.10           | $3.29           | $13.15            |
| Gemini 3.5 Flash (standard)*             | $0.26            | $1.01           | $3.01           | $12.02            |
| DeepSeek V4 Pro (standard)*              | $0.13            | $0.47           | $1.40           | $5.55             |
| Claude Haiku 5.5 (budget)*               | $0.06            | $0.20           | $0.59           | $2.33             |
| DeepSeek V4.1 Flash (budget)*            | $0.06            | $0.19           | $0.56           | $2.20             |

\* Catalog prices from secondary sources. With no cache discount confirmed, they are priced as if nothing caches. These models are offered only once `reconcileCatalog` confirms the live prices. `quotePlan(model, activity)` gives every combination, including custom budgets. For budget models, trade gas (about $0.0025 per decision) is most of the cost.

**What the fee means for a vault**, using `feeDrag` and `recommendPlan` (preselected plan at ≤ 10% a year):

| Vault   | Claude Sonnet 5.5                         | Claude Haiku 5.5                          |
| ------- | ----------------------------------------- | ----------------------------------------- |
| $100    | none (1 decision/day already exceeds 10%) | custom, 1 decision/day at $0.02 (7.3%/yr) |
| $1,000  | Watchful (9.5%/yr)                        | Steady (7.3%/yr)                          |
| $4,000  | Steady (9.2%/yr)                          | Active (5.4%/yr)                          |
| $50,000 | Intense (8.8%/yr)                         | Intense (1.7%/yr)                         |

Small vaults aren't refused. They are shown the share and pointed to a cheaper model or a lighter plan.

## The fee cap, in plain words

The **fee cap** (`daily_fee_cap` on the vault) is a **daily spending limit the user signs**, like a card limit. It isn't the price.

- The contract lets the operator take at most that much SUI in one calendar day, once, and only to the treasury the user approved. Revoke or pause, and nothing can be taken.
- It is set at **3× the plan's daily price** in SUI at approval:
  - A SUI price fall of up to 67% doesn't stop collection. A 2× cap binds for about 20% of vaults within six months; 3× for about 5%.
  - The user can raise their activity without signing again.
- We still charge only the plan's USD price each day (`decideDailyFee`).
- A plan change that would need more than the cap asks for a new signature (`planChangeNeedsSignature`). Users are asked to re-approve once the plan reaches 80% of the cap (`feeCapHeadroom`).

This follows the industry's bounded-allowance pattern (Coinbase/Base Spend Permissions, ERC-7715 periodic limits, the Safe allowance module):

- a bounded amount;
- a period that resets with no carry-over;
- one fixed payee;
- owner-only changes and instant revoke;
- an event per charge;
- native-token denomination with no on-chain oracle in the outflow path.

Three optional tightenings are proposed but not implemented, because each changes `charge_fee` and needs sign-off and an audit re-review:

- a cumulative allowance per day instead of one charge;
- an owner-set cap as a share of the vault balance;
- an expiry on the fee terms.

## Referrals

Referrers earn **30% of the fees collected** from the users they bring, for life, on a single level (`packages/shared/src/referrals.ts`).

- **What counts:** daily fees actually collected by `charge_fee`. Trial and paused days pay nothing.
- **Blast's trade-fee cut is not shared** on referred volume until the MiCA opinion clears it (`includeProtocolTradeFees`, default off). That revenue grows with the agent's trading, which makes it the riskiest inducement.
- **Built into the price:** every plan already includes the 30%, so referred users stay profitable without a per-day cap. Self-referral only gives a 30% discount on a price that is still above cost; it is blocked anyway.
- **Binding:** one referrer per owner wallet, set at the first vault and permanent. Same-wallet and funding-source self-referral are refused. The referrer must run a vault.
- **Payout:** weekly in SUI from the treasury, batched, minimum 1 SUI, 30-day hold on a referrer's first payout. Flagged referrers are held. Every batch is a proposal that needs human approval.

## Models

The catalog (`packages/shared/src/models.ts`) is curated, not exhaustive: models that other trading agents and the public trading arenas actually use, in three tiers.

| Tier     | Models                                      | Evidence                                                                                              |
| -------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Premium  | Claude Sonnet 5.5, GPT-6.1 Sol              | Ran in Alpha Arena; offered by Senpi; Anthropic is ElizaOS's first-listed provider                    |
| Standard | Grok 4.7, Gemini 3.5 Flash, DeepSeek V4 Pro | Grok won Alpha Arena S1.5; DeepSeek placed second in S1; Gemini Flash is ElizaOS's OpenRouter default |
| Budget   | DeepSeek V4.1 Flash, Claude Haiku 5.5       | The most-used model on OpenRouter; Sonnet's strict-JSON sibling at about 1/20 of the cost             |

- Only the two premium models have primary-source prices. The others are offered only after `reconcileCatalog` confirms them against OpenRouter's live `GET /api/v1/models`: slug present, structured outputs supported, live price not above ours.
- Contest results are short and noisy, and agent design matters more than the model, so no model is marketed as a better trader.

## Where each rule lives in code

| Rule                                                                                | Code                                                                                        | Tests                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Activity levels and custom budgets                                                  | `resolveActivity`, `ACTIVITY_LEVELS` in `shared/src/activity.ts`                            | `pricing.test.ts`                        |
| Plan price from cost; ≥30% margin after referral                                    | `quotePlan`, `decisionCostUsd` in `shared/src/pricing.ts`                                   | `pricing.test.ts` (every model × level)  |
| Fee drag shown, plan recommended, no minimum                                        | `feeDrag`, `recommendPlan`                                                                  | `pricing.test.ts`                        |
| Fee cap = 3× plan price; signature on larger plans; re-approval at 80%              | `quoteFeeTerms`, `planChangeNeedsSignature`, `feeCapHeadroom`                               | `pricing.test.ts`                        |
| Prepaid daily charge; capped after a SUI crash; pause, never sell, when short       | `decideDailyFee` → `chargeFee` / `pauseByAgent`; on-chain `charge_fee`, `pause_by_agent`    | shared + Move                            |
| SUI price from ≥2 fresh, agreeing sources; refuse >25% daily jumps                  | `aggregatePrice`, `checkDailyPriceMove`                                                     | `pricing.test.ts`                        |
| Trial: 3 days once per wallet, ≤ 24 decisions/day                                   | `trialDaysFor`, `trialDecisionsPerDay` → `create(…, free_days)`                             | `pricing.test.ts`                        |
| Model catalog; live price check                                                     | `MODEL_CATALOG`, `reconcileCatalog` in `shared/src/models.ts`                               | `models.test.ts`                         |
| Referral binding, accrual, payout proposals                                         | `bindReferral`, `accrueReferrals`, `proposePayouts` in `shared/src/referrals.ts`            | `referrals.test.ts`                      |
| Triggers on the plan's timing; coalescing                                           | `evaluateTriggers`, `triggerConfigFor` in `agent-core/src/triggers.ts`                      | `triggers.test.ts`                       |
| Global launch screening; bounded, stable snapshot                                   | `screenLaunches`                                                                            | `screener.test.ts`                       |
| Per-vault plan budget and cost ceiling (125% of plan cost)                          | `DecisionBudget`, `VaultSpendLedger` in `agent-core/src/budget.ts`                          | `budget.test.ts`                         |
| Incident budget, kill switch, stop on OpenRouter 402, low-credit alert              | `PlatformSpendGuard`, `onModelFailure`, `creditRunway`                                      | `budget.test.ts`                         |
| Re-pricing alarms: cost above pricing, referred margin < 20%, cache failure         | `CostMonitor`                                                                               | `budget.test.ts`                         |
| Cache-first prompt, 600-token output cap, privacy routing, no provider pin, warm-up | `buildCachedMessages`, `OPENROUTER_REQUEST_EXTRAS`, `MAX_OUTPUT_TOKENS`, `warmUpThenFanOut` | `openrouter.test.ts`, `screener.test.ts` |
| Batched fee charges (250 per PTB) and vault reads (50 per call)                     | `chargeFees`, `readVaults` in `vault-sdk`                                                   | `transactions.test.ts`                   |
| Treasury SUI vs USD costs: _propose_ conversions, never execute                     | `treasuryCurrencyReport`                                                                    | `pricing.test.ts`                        |
| Cost-model primitives: cost per decision, caching, break-even, LTV                  | `shared/src/economics.ts`                                                                   | `economics.test.ts`                      |

The worker in SPEC §13 step 5 wires these together. Every threshold comes from these modules and is never hard-coded elsewhere.

## Fixed costs and break-even

- **Expected fixed costs:** about $4,000–4,500/month at 100–500 vaults:
  - infrastructure, about $500–1,000;
  - the audit, amortized ($25k over 12 months);
  - a MiCA legal opinion, amortized.
- **Break-even depends on the plan mix.**
  - A direct Steady premium vault contributes about $18/month; a referred one about $9/month.
  - At those rates, $4,400/month needs roughly 250 direct or 500 referred Steady-premium vaults.
  - Budget-tier vaults contribute little in dollars but never lose money.
- **RPC is the cost that grows with vault count.** Batched multi-gets and one checkpoint stream keep it flat. Use fixed-price Redis for BullMQ.

## Decisions still open

| Decision                         | Options                                                                                     | Research view                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Trial                            | 3 free days capped at 24 decisions/day (current), or a small off-chain credit (about $0.25) | The credit is harder to farm with free zkLogin wallets. Today's cap bounds a farmed trial at about $1.20 |
| Referral duration                | Lifetime (current) or 12 months                                                             | Both are affordable because the price includes the payout                                                |
| Blast trade-fee cut in referrals | Off (current) or on after legal                                                             | Needs the MiCA opinion                                                                                   |
| Optional fee-cap tightenings     | Cumulative allowance, share-of-balance cap, terms expiry                                    | Each changes `charge_fee`: needs sign-off and an audit re-review                                         |
| Gas                              | Estimated inside the price (current), or passed through at cost and settled the next day    | Pass-through is fairer for very active plans but needs next-day true-ups                                 |

## Measure in the arena, then replace the estimates

- Live OpenRouter prices for the standard and budget models (`reconcileCatalog`).
- Real cache hit rate and cost per decision per model (`toDecisionUsage`, `CostMonitor`).
- Gas per vault buy and sell, and the live Blast fee settings (needs mainnet RPC).
- Plan mix, trial-to-paid conversion, churn and referral share by cohort.
