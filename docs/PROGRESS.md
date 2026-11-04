# Build progress

Tracks [SPEC §13](../SPEC.md#13-build-order-for-claude-code). Each step ends with tests passing and a short demo note.

| #   | Step                                                | Status                    | Notes                                                                                                                                              |
| --- | --------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Monorepo setup                                      | ✅ Done                   | pnpm workspaces, Biome, TypeScript strict, Vitest, GitHub Actions (TS job + Move job). `apps/web` and `apps/api` are placeholders until steps 6–7. |
| 2   | Move package                                        | 🟡 Mostly done            | SPEC §5 implemented, 39 unit tests, CI custody check. **Open:** the mainnet dev-inspect of `buy` / `sell` against a real launch. Not published.    |
| 3   | TypeScript vault bindings                           | ✅ Done                   | `packages/vault-sdk`: builders for every vault call, `emptyVault`, BCS reader, signing summaries; 14 offline tests.                                |
| 4   | Indexer and DB                                      | ⏳ Next                   |                                                                                                                                                    |
| 5   | Agent workers (vaults, queue, KMS, dry-run default) | ⏳                        | `agent-core` is still the wallet-based arena starter                                                                                               |
| 6   | API                                                 | ⏳                        |                                                                                                                                                    |
| 7   | Web app                                             | ⏳                        |                                                                                                                                                    |
| 8   | Stats engine                                        | ⏳                        |                                                                                                                                                    |
| 9   | Leaderboard and platform stats pages                | ⏳                        |                                                                                                                                                    |
| 10  | Hardening                                           | ⏳                        |                                                                                                                                                    |
| 11  | Arena launch (team vaults)                          | ⛔ Needs audit + approval |                                                                                                                                                    |
| 12  | User deposits                                       | ⛔ Needs legal sign-off   |                                                                                                                                                    |

## Demo notes

### Step 1–2

```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test
```

```bash
pnpm move:test
```

The output shows 39/39 Move tests passing and `custody check: OK (4 TradeCap functions, none return value or authority)`.

### Step 3

```bash
pnpm --filter @blast-agents/vault-sdk test
```

14 tests: PTB shape, shared-object mutability, call order, slippage guards, BCS layout checked against `vault.move`.

## Decisions taken while building

- **Blast version pinned to the SDK's canonical mainnet source (`52effbc`, launchpad `0x079a1b44…`).** blast-v2-contracts records two Oct 28 stacks; `@interest-protocol/blast-deployments-sdk` 0.1.4 points at this one. `launch::buy` and `launch::sell` have the signatures the SPEC lists.
- **Blast source is vendored** (`move/vendor/blast`), because its timelock dependency is in a private repo. A signature-only stub replaces it. See that README.
- **`buy` / `sell` are split into package-only `begin_*` / `finish_*` halves** with a hot-potato ticket, so every limit can be unit-tested. A dependent package can't build a real `Launch` in tests.
- **Spend is recorded net of Blast's graduation refund**, and per-launch cost drops pro rata on sells and withdrawals.
- **`sell` takes no `Clock`** and **`high_water_value_hint` is omitted**. Added `withdraw_all_*` and `destroy_trade_cap`. Details are in the Move README.

## Open items needing a human

- **Mainnet RPC is blocked in the build environment.** The network policy denies `fullnode.mainnet.sui.io` (proxy 403). Allow that host (or a broader access level) under the cloud environment's Network access settings ([docs](https://code.claude.com/docs/en/cloud-environments#network-access)) to run dev-inspects, the indexer and dry-run ticks from here.

- **Mainnet dev-inspect (step 2).** An unpublished package can't be dev-inspected directly. Options: (a) a local `sui-fork` of mainnet state, publishing the vault there and running `buy` / `sell` against a real launch; or (b) a publish under a throwaway key. Option (b) needs explicit approval because it is a mainnet transaction.
- SPEC §12 decisions: fee model, deposit min/max, final preset numbers, UpgradeCap holders and timelock, brand, team-funded arena first.
- The repository has no license yet (packages are `private`).
