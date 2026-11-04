# `@blast-agents/shared`

Types, zod schemas and pure helpers shared by the web app, the API and the workers. It has no Sui or network dependencies, so it's safe in the browser.

| Module         | Contents                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limits.ts`    | `OnChainLimits` (mirrors the Move `Limits`, MIST as strings), `RiskSettings`, `RISK_PRESETS` (Careful / Balanced / Degen, SPEC §3.1), `settingsToLimits(settings, depositMist)`, `DEFAULT_PRESET` (the slider starts on Balanced)                                |
| `decision.ts`  | `VaultAction`, `Decision` and the strict `DECISION_JSON_SCHEMA` given to every model. Vaults only allow `buy` and `sell`; `join_opening_round` is rejected (SPEC §5.4.1).                                                                                        |
| `fees.ts`      | `FeeTerms` (daily fee cap, treasury, free days) and `DEFAULT_FREE_DAYS = 3` (SPEC §1b)                                                                                                                                                                           |
| `models.ts`    | `ModelOption`, `DEFAULT_MODELS` (OpenRouter slugs; Lite tier disabled), `LEADERBOARD_ELIGIBILITY` (SPEC 9.1: 7 days, $250, 5 trades)                                                                                                                             |
| `pricing.ts`   | `PRICING` ($0.99/day, $250 minimum, 3-day trial, 2× cap), `usdToMist`, `quoteFeeTerms`, `decideDailyFee`, `aggregatePrice`, `checkDailyPriceMove`, `feeCapHeadroom`, `trialDaysFor`, `minDepositMist`, `treasuryCurrencyReport`                                  |
| `economics.ts` | Unit-economics model: `MODEL_PRICES`, `costPerDecisionUsd`, cache hit ceiling and break-even, `dayEconomics`, `maxDecisionsForMargin`, `costAlarmThresholdUsd`, `breakEvenVaults`, `lifetimeValueUsd`, `maxChurnForCac`, `annualFeeDrag` (see docs/ECONOMICS.md) |
| `api.ts`       | Request schemas for the API in SPEC §7                                                                                                                                                                                                                           |
| `units.ts`     | `suiToMist` (exact decimal parsing), `mistToSui`, `formatSui`, `SUI_TYPE`                                                                                                                                                                                        |

```ts
import { RISK_PRESETS, settingsToLimits, suiToMist } from "@blast-agents/shared";

const limits = settingsToLimits(RISK_PRESETS.balanced.settings, suiToMist("100"));
// { maxTrade: "5000000000", maxPerLaunch: "15000000000", maxDailySpend: "30000000000", maxOpenPositions: 5, minOutRequired: true }
```

Run the tests with `pnpm --filter @blast-agents/shared test`.
