# Build progress

Tracks [SPEC §13](../SPEC.md#13-build-order-for-claude-code). Each step ends with tests passing and a short demo note.

| #   | Step                                                | Status                    | Notes                                                                                                                                                                                     |
| --- | --------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Monorepo setup                                      | ✅ Done                   | pnpm workspaces, Biome, TypeScript strict, Vitest, GitHub Actions (TS job + Move job). `apps/web` and `apps/api` are placeholders until steps 6–7.                                        |
| 2   | Move package                                        | 🟡 Mostly done            | SPEC §1b + §5 implemented (incl. daily fee, agent self-pause), 60 unit tests, CI custody check. **Open:** the mainnet dev-inspect of `buy` / `sell` against a real launch. Not published. |
| 3   | TypeScript vault bindings                           | ✅ Done                   | `packages/vault-sdk`: builders for every vault call (incl. `chargeFee`, `setFeeTerms`), `emptyVault`, BCS reader, signing summaries; 17 offline tests.                                    |
| 4   | Indexer and DB                                      | ⏳ Next                   |                                                                                                                                                                                           |
| 5   | Agent workers (vaults, queue, KMS, dry-run default) | ⏳                        | `agent-core` is still the wallet-based arena starter                                                                                                                                      |
| 6   | API                                                 | ⏳                        |                                                                                                                                                                                           |
| 7   | Web app                                             | ⏳                        |                                                                                                                                                                                           |
| 8   | Stats engine                                        | ⏳                        |                                                                                                                                                                                           |
| 9   | Leaderboard and platform stats pages                | ⏳                        |                                                                                                                                                                                           |
| 10  | Hardening                                           | ⏳                        |                                                                                                                                                                                           |
| 11  | Arena launch (team vaults)                          | ⛔ Needs audit + approval |                                                                                                                                                                                           |
| 12  | User deposits                                       | ⛔ Needs legal sign-off   |                                                                                                                                                                                           |

## Demo notes

### Step 1–2

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test
```

```bash
pnpm move:test
```

The output shows 60/60 Move tests passing and `custody check: OK (… only charge_fee pays out, to vault.treasury)`.

### Step 3

```bash
pnpm --filter @blast-agents/vault-sdk test
```

20 tests: PTB shape, shared-object mutability, call order, slippage guards, fee batching, batched reads, BCS layout checked against `vault.move`.

## SPEC §1b (locked UX and billing), how it is covered

| Requirement                                                                                                              | Where                                                                                        | Status                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| One signature Start PTB: create, deposit, limits, authorize agent, fee cap                                               | `vault::create`, `VaultTransactions.create`                                                  | ✅                                                                 |
| `daily_fee_cap`, fixed `treasury`, `last_fee_day`; `charge_fee`; `set_fee_terms`                                         | `move/blast_agent_vault`                                                                     | ✅ 16 tests, CI guard                                              |
| 3-day trial, once per wallet, only at the $250 minimum                                                                   | `create(…, free_days)`; `trialDaysFor`, `minDepositMist`, `DEFAULT_FREE_DAYS = 3`            | ✅ on-chain free days; once-per-wallet is an API/DB check (step 6) |
| $0.99/day in SUI, prepaid; on-chain cap ≈ 2× the day's fee                                                               | `quoteFeeTerms`, `decideDailyFee`, `aggregatePrice`, `checkDailyPriceMove`, `feeCapHeadroom` | ✅ pure functions + tests; fee job in step 5                       |
| Cost controls: triggers, 30/day cap, cached prefix, platform budget, kill switch, low-credit alert                       | `agent-core`: `triggers.ts`, `screener.ts`, `budget.ts`, `openrouter.ts`                     | ✅ modules + tests; wired into the worker in step 5                |
| Pricing rule: worst-case day ≥ 30% margin; alarms derived from it                                                        | `economics.ts` (`costAlarmThresholdUsd`, `maxDecisionsForMargin`), `CostMonitor`             | ✅                                                                 |
| Models via OpenRouter (one key, USDC credits)                                                                            | `OpenRouterTrader`, `DEFAULT_MODELS` slugs                                                   | ✅                                                                 |
| Fee never sells tokens; low balance pauses the agent and notifies                                                        | on-chain abort + `pause_by_agent(1)`; notice in step 6                                       | 🟡 on-chain done, notifier pending                                 |
| Operator charges once a day; a paused or closed vault pays nothing                                                       | `chargeFee` builder; on-chain pause/revoke checks                                            | 🟡 scheduler in step 5                                             |
| "Up to X SUI per day while running" on the Start screen; plain-language signing                                          | `describeFee`, `describeCreate`, `describeSetFeeTerms`                                       | ✅ text; UI in step 7                                              |
| Fees paid next to P&L; P&L net of fees                                                                                   | stats engine (step 8), dashboard (step 7); `FeeCharged` event for the indexer                | ⏳                                                                 |
| Connect via dapp-kit **or** Google / X through zkLogin (Enoki)                                                           | web app                                                                                      | ⏳ step 7                                                          |
| 3 screens: Connect, Choose (model cards, 3-position risk slider defaulting to Balanced, deposit with min and max), Start | web app; `DEFAULT_PRESET = "balanced"`                                                       | ⏳ step 7                                                          |
| One-tap model switch, no signature                                                                                       | API `PATCH /vaults/:id`                                                                      | ⏳ step 6                                                          |
| "Withdraw everything as SUI" with a no-backend "withdraw as-is" fallback                                                 | `emptyVault` (fallback) ✅; operator sell-then-withdraw ⏳ step 5–6                          | 🟡                                                                 |
| Opt-in email or Telegram notifications                                                                                   | new: API + worker                                                                            | ⏳ step 6+                                                         |

### Pricing and cost controls (SPEC_2 update)

```bash
pnpm test
```

70 TypeScript tests. `economics.test.ts` reproduces SPEC §1b's cost table, margins and break-even, and shows why the $0.022 alarm is too loose. The trigger, budget, screener and OpenRouter tests cover the cost controls.

## Decisions taken while building

- **Blast version pinned to the SDK's canonical mainnet source (`52effbc`, launchpad `0x079a1b44…`).** blast-v2-contracts records two Oct 28 stacks; `@interest-protocol/blast-deployments-sdk` 0.1.4 points at this one. `launch::buy` and `launch::sell` have the signatures the SPEC lists.
- **Blast source is vendored** (`move/vendor/blast`), because its timelock dependency is in a private repo. A signature-only stub replaces it. See that README.
- **`buy` / `sell` are split into package-only `begin_*` / `finish_*` halves** with a hot-potato ticket, so every limit can be unit-tested. A dependent package can't build a real `Launch` in tests.
- **Spend is recorded net of Blast's graduation refund**, and per-launch cost drops pro rata on sells and withdrawals.
- **The agent can pause itself (`pause_by_agent`) but never resume.** SPEC 1b says the agent "pauses itself" when it can't pay the fee. The original design needed the OwnerCap to pause. Letting the TradeCap set `paused` only narrows its power.
- **Economics thresholds are derived, not hard-coded.** The SPEC's $0.022 alarm is replaced by `costAlarmThresholdUsd` (about $0.0204 today) plus a cache-hit alarm. Output is capped at 600 tokens. `provider.order` is not used (it breaks caching). Details are in [ECONOMICS.md](ECONOMICS.md).
- **Free days are enforced on-chain** with a `free_days` argument to `create` that sets the initial `last_fee_day`, so no extra field is needed. The fee itself is a separate path from trading: it doesn't count toward `spent_today`.
- **`sell` takes no `Clock`** and **`high_water_value_hint` is omitted**. Added `withdraw_all_*` and `destroy_trade_cap`. Details are in the Move README.

## Open items needing a human

- **Mainnet RPC is blocked in the build environment.** The network policy denies `fullnode.mainnet.sui.io` (proxy 403). Allow that host (or a broader access level) under the cloud environment's Network access settings ([docs](https://code.claude.com/docs/en/cloud-environments#network-access)) to run dev-inspects, the indexer and dry-run ticks from here.

- **Mainnet dev-inspect (step 2).** An unpublished package can't be dev-inspected directly. Options: (a) a local `sui-fork` of mainnet state, publishing the vault there and running `buy` / `sell` against a real launch; or (b) a publish under a throwaway key. Option (b) needs explicit approval because it is a mainnet transaction.
- The treasury address. Business decisions raised by the economics research (small-vault pricing, 3× cap, referral structure, SPEC §6.1 provider pinning): see [ECONOMICS.md](ECONOMICS.md#decisions-for-mário-and-jose).
- SPEC §12 decisions: deposit min/max, final preset numbers, UpgradeCap holders and timelock, brand, team-funded arena first.
- The repository has no license yet (packages are `private`).
