# `@blast-agents/shared`

Types, zod schemas and pure helpers shared by the web app, the API and the workers. It has no Sui or network dependencies, so it's safe in the browser.

| Module        | Contents                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limits.ts`   | `OnChainLimits` (mirrors the Move `Limits`, MIST as strings), `RiskSettings`, `RISK_PRESETS` (Careful / Balanced / Degen, SPEC §3.1), `settingsToLimits(settings, depositMist)` |
| `decision.ts` | `VaultAction`, `Decision` and the strict `DECISION_JSON_SCHEMA` given to every model. Vaults only allow `buy` and `sell`; `join_opening_round` is rejected (SPEC §5.4.1).       |
| `models.ts`   | `ModelOption`, `DEFAULT_MODELS` (model IDs come from config, SPEC §6.1)                                                                                                         |
| `api.ts`      | Request schemas for the API in SPEC §7                                                                                                                                          |
| `units.ts`    | `suiToMist` (exact decimal parsing), `mistToSui`, `formatSui`, `SUI_TYPE`                                                                                                       |

```ts
import { RISK_PRESETS, settingsToLimits, suiToMist } from "@blast-agents/shared";

const limits = settingsToLimits(RISK_PRESETS.balanced.settings, suiToMist("100"));
// { maxTrade: "5000000000", maxPerLaunch: "15000000000", maxDailySpend: "30000000000", maxOpenPositions: 5, minOutRequired: true }
```

Run the tests with `pnpm --filter @blast-agents/shared test`.
