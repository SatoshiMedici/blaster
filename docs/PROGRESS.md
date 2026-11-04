# Build progress

Tracks [SPEC §13](../SPEC.md#13-build-order-for-claude-code). Each step ends with tests passing and a short demo note.

## Status

| #   | Step                                                | Status                      | Notes                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Monorepo setup                                      | ✅ Done                     | pnpm workspaces, Biome, strict TypeScript, Vitest, GitHub Actions (lint, typecheck, tests, web build; Move build, tests and custody check). `apps/api` is a placeholder until step 6.                                                                                                                          |
| 2   | Move package                                        | 🟡 Mostly done              | SPEC §1b and §5: custody, on-chain limits, daily fee, agent self-pause, owner-chosen venues; 65 unit tests; CI custody check. **Open:** mainnet dev-inspect of `buy` / `sell` against a real launch. Not published.                                                                                            |
| 3   | TypeScript vault bindings                           | ✅ Done                     | `packages/vault-sdk`: builders for every vault call (venues included), batched fee charges and reads, BCS reader with package check, signing summaries; 22 tests.                                                                                                                                              |
| —   | Pricing, models, referrals (SPEC §1b rev. 3)        | ✅ Done                     | `packages/shared` (plan pricing, model catalog, referrals) and `packages/agent-core` (triggers, screening, budgets, OpenRouter client); see [ECONOMICS.md](ECONOMICS.md).                                                                                                                                      |
| 4   | Indexer and DB                                      | ⏳ Next                     |                                                                                                                                                                                                                                                                                                                |
| 5   | Agent workers (vaults, queue, KMS, dry-run default) | ⏳                          | The cost-control modules are ready; the trading loop is still the wallet-based arena starter.                                                                                                                                                                                                                  |
| 6   | API                                                 | ⏳                          |                                                                                                                                                                                                                                                                                                                |
| 7   | Web app                                             | 🟡 Built, no mock data      | `apps/web`: landing with live Blast launches, Start flow that builds the real create-vault transaction, dashboard reading the user's vaults from chain with real owner actions, leaderboard (empty until real vaults qualify). Goes live when the contract is published and the operator and treasury are set. |
| 8   | Stats engine                                        | ⏳                          |                                                                                                                                                                                                                                                                                                                |
| 9   | Leaderboard and platform stats pages                | ⏳                          |                                                                                                                                                                                                                                                                                                                |
| 10  | Hardening                                           | ⏳                          |                                                                                                                                                                                                                                                                                                                |
| 11  | Arena launch (team vaults)                          | ⛔ Needs audit and approval |                                                                                                                                                                                                                                                                                                                |
| 12  | User deposits                                       | ⛔ Needs legal sign-off     |                                                                                                                                                                                                                                                                                                                |

## Demo

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test
```

That runs 88 TypeScript tests: shared 42, vault-sdk 21, agent-core 25.

```bash
pnpm move:test
```

That runs 60 Move tests, then `custody check: OK (… only charge_fee pays out, to vault.treasury)`.

## SPEC §1b coverage

| Requirement                                                                                                    | Where                                                                                  | Status                                                                                                |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| One-signature Start PTB: create, deposit, limits, authorize agent, fee terms                                   | `vault::create`, `VaultTransactions.create`, `describeCreate`                          | ✅                                                                                                    |
| Plan = model × activity, chosen by the user; no platform cap on decisions                                      | `activity.ts`, `quotePlan`, `DecisionBudget`, `triggerConfigFor`                       | ✅                                                                                                    |
| Price from cost: ≥ 30% margin after the 30% referral on every plan                                             | `quotePlan` (tested for every model × level)                                           | ✅                                                                                                    |
| No minimum deposit; fee drag shown and a plan recommended                                                      | `feeDrag`, `recommendPlan`; `/start` Choose screen                                     | ✅                                                                                                    |
| Prepaid daily fee in SUI; capped after a SUI crash; pause, never sell, when short                              | `decideDailyFee`, `chargeFee`, `pauseByAgent`; on-chain `charge_fee`, `pause_by_agent` | ✅ logic; fee job in step 5                                                                           |
| Fee cap = the user's daily spending limit (3× plan price); re-approval                                         | `quoteFeeTerms`, `planChangeNeedsSignature`, `feeCapHeadroom`, `set_fee_terms`         | ✅                                                                                                    |
| 3-day trial once per wallet, ≤ 24 decisions/day                                                                | `trialDaysFor`, `trialDecisionsPerDay`, `create(…, free_days)`                         | ✅ logic; once-per-wallet record in step 6                                                            |
| Curated models via OpenRouter, priced per model, live price check                                              | `MODEL_CATALOG`, `reconcileCatalog`, `OpenRouterTrader`                                | ✅ 7 models; 5 await live price confirmation                                                          |
| Referrals: 30% of collected fees                                                                               | `bindReferral`, `accrueReferrals`, `proposePayouts`                                    | ✅ logic; storage in step 4, payout job in step 6                                                     |
| Cost controls: triggers, screening, cached prefix, plan budgets, kill switch, low-credit and re-pricing alarms | `agent-core`: `triggers.ts`, `screener.ts`, `budget.ts`, `openrouter.ts`               | ✅ modules; wired in step 5                                                                           |
| Fees paid next to P&L; P&L net of fees                                                                         | `FeeCharged` event; stats (step 8), dashboard (step 7)                                 | ⏳                                                                                                    |
| Notifications (email, Telegram): trades, daily summary, halt, low balance                                      | API and worker                                                                         | ⏳ step 6                                                                                             |
| Connect via dapp-kit or Google through zkLogin (Enoki)                                                         | `apps/web` wallet dialog, `enokiWalletsInitializer`                                    | 🟡 Sui wallets ✅; Google ready, needs Enoki + Google OAuth keys; X is not supported by Enoki/zkLogin |
| "Withdraw everything as SUI", with a no-backend fallback                                                       | `emptyVault` (fallback) ✅; operator sell-then-withdraw                                | ⏳ steps 5–6                                                                                          |

## Decisions taken while building

- **Blast is pinned to the SDK's canonical mainnet source** (`52effbc`, launchpad `0x079a1b44…`). blast-v2-contracts records two Oct 28 stacks; `@interest-protocol/blast-deployments-sdk` 0.1.4 points at this one. `launch::buy` and `launch::sell` have the signatures the SPEC lists.
- **Blast source is vendored** (`move/vendor/blast`). Its timelock dependency lives in a private repo, so a signature-only stub replaces it. See that README.
- **`buy` / `sell` are split into package-only `begin_*` / `finish_*` halves** joined by a hot-potato ticket, so every limit can be unit-tested. A dependent package can't build a real `Launch` in tests.
- **Spend is recorded net of Blast's graduation refund.** Per-launch cost drops pro rata on sells and withdrawals.
- **The agent can pause itself (`pause_by_agent`) but never resume.** SPEC 1b has the agent pause itself when it can't pay; letting the TradeCap set `paused` only narrows its power.
- **Free days are enforced on-chain** through `create(…, free_days)` and the initial `last_fee_day`. No extra field is needed.
- **Pricing is plan-based and derived from cost** (SPEC rev. 3, owner decision). The fixed $0.99/day, $250 minimum and 30-decision cap are gone. Thresholds come from `pricing.ts` and `economics.ts`, never hard-coded.
- **The fee cap is 3× the plan price.** Research: a 2× cap binds for about 20% of vaults within six months; 3× for about 5%.
- **Referral revenue excludes Blast's trade-fee cut** until the MiCA opinion clears it (a switch exists).
- **No `provider.order` on OpenRouter**: it breaks the sticky routing that caching relies on. Output is capped at 600 tokens.
- **Venues are an on-chain owner choice** (owner request: agents trade on Blast and SuiPump, the user picks). `vault.venues` is a bitmask checked in `begin_buy`; sells are not gated. The screener drops launches from venues the owner didn't allow. Only the Blast adapter exists; SuiPump is shown as "coming soon" in the Start flow, and the landing page lists live SuiPump launches from SuiPump's public index.
- **`sell` takes no `Clock`; `high_water_value_hint` is omitted.** Added `withdraw_all_*` and `destroy_trade_cap`. Details are in the Move README.

## Open items needing a human

- **Mainnet RPC and OpenRouter are blocked in the build environment** (proxy 403 for `fullnode.mainnet.sui.io`; `openrouter.ai` unreachable). Allow them under the cloud environment's Network access settings ([docs](https://code.claude.com/docs/en/cloud-environments#network-access)). That unblocks the dev-inspect, live model prices (`reconcileCatalog`), the indexer and dry-run ticks.
- **Mainnet dev-inspect (step 2).** An unpublished package can't be dev-inspected directly. Options: a local `sui-fork` of mainnet state (no signing), or a publish under a throwaway key, which is a mainnet transaction and needs explicit approval.
- **Pricing decisions still open:** trial as free days or a small credit, referral duration, sharing Blast's trade-fee cut, optional fee-cap tightenings. See [ECONOMICS.md](ECONOMICS.md#decisions-still-open).
- **Other open decisions:** the treasury address; the SPEC §12 items (maximum deposit, final preset numbers, UpgradeCap holders and timelock, brand, team-funded arena first).
- **SuiPump trade adapter.** suipump.org publishes no source or audit. Its ABI (V18 `bonding_curve::buy` / `sell`) is known only from third-party integrations and must be verified on mainnet first, which needs RPC access. Each SuiPump package lineage needs its own adapter, so pick one (V18, used by all launches since November). Then write the adapter, test it, and include it in the audit. A private review (2026-11-04) of the only public SuiPump source, an earlier version, found critical issues for buyers. Details are withheld until SuiPump has been notified. SuiPump stays disabled until the live contracts are checked against that review and the adapter adds the screening it calls for.
- **No license yet.** Packages are `private`.
