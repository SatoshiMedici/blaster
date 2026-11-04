# Security and custody model

This document says what `blast_agent_vault` and the operator guarantee, what they don't, and what we trust. Keep it current: any change to `move/blast_agent_vault` or to the signing path must update it.

## Actors

| Actor                   | Holds                               | Can                                                                                           |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| User                    | `OwnerCap` (in their wallet)        | deposit, withdraw, set limits, pause, resume, revoke, re-authorize                            |
| Operator (our backend)  | `TradeCap` (key in a KMS)           | `buy` and `sell` on Blast curves within the limits; `charge_fee` once a day; `pause_by_agent` |
| Blast (`blast_fun`)     | its own admin roles                 | pause trading, upgrade the launchpad (version-gated)                                          |
| Vault UpgradeCap holder | `UpgradeCap` of `blast_agent_vault` | publish compatible upgrades (multisig + timelock, still to be decided)                        |

## Guarantees (enforced on-chain)

1. **The agent cannot withdraw.** No public function taking a `TradeCap` returns a `Coin`, `Balance` or capability. `buy` and `sell` only move value between `vault.sui` and `vault.tokens` through a Blast curve. This is checked by unit tests and by `scripts/check_trade_cap_surface.py` in CI.
2. **The owner can always withdraw.** Owner functions check only that the `OwnerCap` matches the vault. Pause, revoke, limits and Blast's state don't affect them. Withdrawals don't call Blast, so a Blast pause or upgrade doesn't block them.
3. **The daily fee is the only other outflow, and it is bounded (SPEC 1b).** `charge_fee` pays at most `daily_fee_cap` per calendar day, once, only to `vault.treasury`. Both values are approved by the owner at creation or through `set_fee_terms`. It pays nothing during the free period set at creation, while paused, or after revoke, never back-charges skipped days, and never sells tokens to pay. The CI guard allows exactly this transfer and no other outside owner functions.
4. **The agent can stop itself but never restart.** `pause_by_agent` (fee unpaid, drawdown stop) only sets `paused`; `resume` needs the OwnerCap.
5. **Revoke is instant.** After `revoke_agent` or `authorize_agent`, every call with the old TradeCap aborts.
6. **Hard caps:** per-trade, per-launch, per-day spend and the number of open positions. Every trade needs a non-zero `min_out`, and the output is checked against it again after the Blast call.

## What is _not_ guaranteed on-chain (residual risk)

| Risk                                                                                            | Bound today                                                                                                                        | Mitigation                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Operator key compromised: the attacker buys a coin they control, or front-runs the vault's buys | Loss is bounded by `max_daily_spend` per day, `max_per_launch` per coin and `max_trade` per tx. The attacker still can't withdraw. | KMS-held key; per-model keys; alerting on unusual trades; the user's instant revoke; a global pause runbook                |
| Operator charges the fee every day the vault runs                                               | Exactly `daily_fee_cap` per day at most, which the user approved                                                                   | Flat fee by design (no per-trade fee, so no push to overtrade); the fee is shown next to P&L, and P&L is shown net of fees |
| Bad `min_out`: the operator sets `min_out` far below fair value and is sandwiched               | `min_out > 0` only. The vault doesn't compute a fair price.                                                                        | The operator sets `min_out` from a fresh on-chain preview minus 3% slippage, and simulates before signing                  |
| Drawdown stop                                                                                   | Off-chain only (SPEC §5.4.4)                                                                                                       | The operator halts buying at the stop and shows it in the UI; the user can pause on-chain                                  |
| Bad model decisions                                                                             | The caps above                                                                                                                     | Off-chain risk check; hold-on-error; 90 s timeout = hold                                                                   |
| Prompt injection via token names                                                                | The caps above                                                                                                                     | `untrusted_*` fields, length caps; limits never come from model output                                                     |
| Malicious vault upgrade                                                                         | Depends on who holds the UpgradeCap                                                                                                | Multisig + timelock, published policy, audit before real users                                                             |
| Blast upgrade breaks trading                                                                    | Trading aborts; withdrawals keep working                                                                                           | Compatible upgrade of the vault package, relinked to the new Blast version                                                 |

## Operating-cost guards (SPEC 1b, docs/ECONOMICS.md)

Spend controls are safety controls too: a runaway loop burns credits, not user funds, but an empty OpenRouter balance stops every agent. Model failures of any kind are a hold. An OpenRouter 402 trips the platform kill switch (`onModelFailure`). Per-vault ($0.45/day) and platform daily budgets fail closed. Prompts carry only public market data and the vault's own positions, and providers may not train on them (`data_collection: "deny"`, `zdr`). Treasury SUI→USDC conversions are only _proposed_ by code (`treasuryCurrencyReport`). A human approves and executes them.

## Out of scope for v1, and why

- **Opening rounds and presales.** `join_opening_round` and presale `commit` credit the transaction sender. In a vault, that's our operator, so the user's tokens would be delivered to us. This is excluded until Blast lets the caller name the recipient (SPEC §5.4.1). The decision schema in `packages/shared` rejects `join_opening_round`.
- **Non-SUI quotes.** `buy` and `sell` take `Launch<Meme, SUI>` only.

## Before real users (SPEC §10)

- [ ] External audit of `blast_agent_vault`
- [ ] Mainnet dev-inspect of `buy` / `sell` against a real launch
- [ ] Operator key in a KMS, never in env files or app memory
- [ ] Simulation before every signature, and a hard gas cap per tx
- [ ] Per-provider rate limits and a daily LLM budget, with alerts
- [ ] Global kill switch and pause-all runbook
- [ ] UpgradeCap behind a multisig and timelock, with the policy published in the UI
- [ ] Bug bounty

## Reporting

Report vulnerabilities privately to the maintainers. Don't open a public issue.
