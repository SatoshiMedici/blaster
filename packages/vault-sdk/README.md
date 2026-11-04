# `@blast-agents/vault-sdk`

TypeScript bindings for [`blast_agent_vault`](../../move/blast_agent_vault/README.md) (SPEC §13 step 3): PTB builders, BCS decoders, a vault reader, and plain-words summaries of what a user is about to sign (`describeCreate`, `describeFee`, `describeSetLimits`, `describeSetFeeTerms`, `describeEmptyVault`). **Nothing here signs or submits.**

## Builders

```ts
import { Transaction } from "@mysten/sui/transactions";
import { DEFAULT_FREE_DAYS, RISK_PRESETS, settingsToLimits, suiToMist } from "@blast-agents/shared";
import { VaultTransactions, describeCreate } from "@blast-agents/vault-sdk";

const vt = new VaultTransactions({ packageId, originalPackageId }); // Blast objects default to mainnet

// Start (one user signature, SPEC 1b): vault, deposit, limits, fee terms, TradeCap to the operator.
const deposit = suiToMist("100");
const limits = settingsToLimits(RISK_PRESETS.balanced.settings, deposit);
const fees = { dailyFeeCapMist, treasury, freeDays: DEFAULT_FREE_DAYS }; // from server config
const tx = new Transaction();
vt.create(tx, { limits, fees, depositMist: deposit, operator, owner: userAddress });
describeCreate({ limits, fees, depositMist: deposit, operator }); // show these lines before signing
```

| Method                           | Signer   | Move call                                                                                                                |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `create`                         | user     | `new_limits` + `create` with the fee terms; deposit split from gas; OwnerCap sent to `owner`                             |
| `depositSui` / `depositToken`    | user     | `deposit_sui` / `deposit_token<T>`                                                                                       |
| `withdrawSui` / `withdrawToken`  | user     | `withdraw_sui` / `withdraw_token<T>`, or the `withdraw_all_*` variant for `amount: "all"`; sends the coin to `recipient` |
| `setLimits`                      | user     | `set_limits`                                                                                                             |
| `setFeeTerms`                    | user     | `set_fee_terms` (the user re-approving a fee change)                                                                     |
| `pause` / `resume`               | user     | `pause` / `resume`                                                                                                       |
| `revokeAgent` / `authorizeAgent` | user     | `revoke_agent` / `authorize_agent`                                                                                       |
| `emptyVault`                     | user     | revoke, then withdraw every token and all SUI as they are. Needs no backend (SPEC §3.3).                                 |
| `buy`                            | operator | `buy<Meme>` with the launch and Blast's `PackageVersion` / `RuntimeConfig`                                               |
| `sell`                           | operator | `sell<Meme>`                                                                                                             |
| `chargeFee`                      | operator | `charge_fee`, at most once per calendar day                                                                              |

Every method appends to the `Transaction` you pass and returns the call's result, so several can be composed into one PTB. `buy`, `sell` and `chargeFee` refuse zero amounts (and `buy` / `sell` a zero `min_out`) before building anything.

## Reading state

```ts
import { readVault, effectiveSpentToday, isFeeDue } from "@blast-agents/vault-sdk";

const vault = await readVault(client, vaultId); // SUI, tokens, position costs, limits, fee terms, agent state
const spentToday = effectiveSpentToday(vault); // 0 once the on-chain day has rolled
const due = isFeeDue(vault); // true when charge_fee would accept a charge today
```

`decodeVault(bytes)` is the pure BCS decoder. A test checks the BCS layouts against the field order in `vault.move`, so the two can't drift apart silently.

## Config

`VaultPackage` has no default: the vault isn't published. `MAINNET_BLAST_OBJECTS` comes from `@interest-protocol/blast-deployments-sdk`.

## Tests

```bash
pnpm --filter @blast-agents/vault-sdk test
```

These are offline: command shape, shared-object mutability, call order, input validation, BCS layout and round-trip, fee-due logic, signing text. Simulation against mainnet is covered by the step 2 dev-inspect, which is still open.
