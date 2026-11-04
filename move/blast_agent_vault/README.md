# `blast_agent_vault`

A per-user Sui Move vault that lets an AI agent trade [Blast](https://blast.fun) launches for its owner. **The agent can trade, but it can never withdraw.** The one other way SUI ever leaves the vault is the capped daily fee, paid only to the treasury the owner approved (SPEC §1b).

Implements [SPEC §1b and §5](../../SPEC.md#5-move-package-blast_agent_vault). Not published. It needs an external audit before real users (SPEC §10).

## Objects

| Object | Abilities | Held by | Can do |
| --- | --- | --- | --- |
| `AgentVault` | `key` (shared) | — | Holds `Balance<SUI>`, a `Bag` of `Balance<Meme>`, the limits, the spend accounting and the fee terms (`daily_fee_cap`, `treasury`, `last_fee_day`) |
| `OwnerCap` | `key, store` | the user's wallet | deposit, withdraw, set limits, set fee terms, pause, resume, revoke, re-authorize |
| `TradeCap` | `key, store` | the operator key (KMS) | `buy`, `sell`, and `charge_fee` once a day; nothing else |
| `Limits` | `copy, drop, store` | inside the vault | `max_trade`, `max_per_launch`, `max_daily_spend` (MIST), `max_open_positions`, `min_out_required` |

## Guarantees

| Guarantee | How it is enforced | Test |
| --- | --- | --- |
| The agent cannot move funds out | No public function that takes a `TradeCap` returns a `Coin`, `Balance` or capability. `buy` and `sell` only move value between `vault.sui` and `vault.tokens` through a Blast curve. | `round_trip_keeps_all_value_in_the_vault`, plus [`check_trade_cap_surface.py`](../../scripts/check_trade_cap_surface.py) in CI |
| The fee is the only other outflow, and it is bounded | `charge_fee` pays at most `daily_fee_cap`, at most once per calendar day, only to `vault.treasury`, never during the free period, while paused or after revoke. It never sells tokens to pay. The CI guard allows this one transfer, in its reviewed form, and no other transfer anywhere outside owner functions. | the 16 fee tests in `tests/vault_tests.move` |
| The owner can always withdraw | Owner functions check only `cap.vault_id`. They ignore `paused`, the agent state and the limits. | `owner_withdraws_while_paused_and_after_revoke`, `owner_withdraws_after_every_agent_limit_is_exhausted` |
| Withdrawals go to the OwnerCap holder | `withdraw_*` return the `Coin` to the caller, who must hold the `OwnerCap` | `withdrawn_coin_goes_to_the_owner_cap_holder`, `owner_cap_of_another_vault_cannot_withdraw` |
| Revoke is instant and on-chain | `revoke_agent` sets `trade_cap_id = none`; every agent call checks `trade_cap_id == some(cap.id)` | `revoked_trade_cap_cannot_buy`, `revoked_trade_cap_cannot_sell`, `replaced_trade_cap_stops_working` |
| A foreign cap does nothing | Every call checks `cap.vault_id == vault.id` | `trade_cap_of_another_vault_aborts` |
| Hard caps hold | Checked in `begin_buy` before any SUI leaves the vault | one passing test at each boundary and one aborting test one MIST above it |
| Slippage protection is mandatory | `min_out > 0` is required, and the received amount is re-checked after the Blast call | `buy_with_zero_min_out_aborts`, `buy_returning_less_than_min_out_aborts`, and the sell equivalents |

## How a trade runs

`buy` and `sell` are split into two package-only halves joined by a hot potato (`BuyTicket` / `SellTicket`, which has no abilities):

```text
buy<Meme>(vault, trade_cap, launch, package_version, runtime_config, amount, min_meme_out, clock)
  ├─ begin_buy   checks the agent, pause, the limits and the balance; takes `amount` SUI out
  ├─ blast_fun::launch::buy(…)      → (Coin<Meme>, refund Coin<SUI>)
  └─ finish_buy  re-checks min_out; puts Meme and the refund back; records the *net* spend
```

The split lets the unit tests run every limit and every accounting path against the real checks, with a simulated curve. A dependent package cannot build a real `Launch` in unit tests, because Blast's `#[test_only]` constructors aren't visible to it. Calling the real curve is covered by a mainnet dev-inspect (SPEC §13 step 2; see [docs/PROGRESS.md](../../docs/PROGRESS.md)).

## Daily fee (SPEC §1b)

- `create(limits, daily_fee_cap, treasury, free_days, coin, operator, clock)` is the one-signature Start call. The user approves the fee cap, the treasury and the free period in the same signature that creates the vault.
- `last_fee_day` is the last calendar day already paid for or covered by the free period. `create` sets it to `today + free_days − 1`, so with `free_days = 7` the creation day and the six days after it are free.
- `charge_fee(vault, trade_cap, amount, clock)` needs `today > last_fee_day`, `0 < amount ≤ daily_fee_cap`, an authorized and unpaused agent, and enough SUI. It then sets `last_fee_day = today` and pays `vault.treasury`. Skipped days are never back-charged.
- `set_fee_terms(vault, owner_cap, daily_fee_cap, treasury)` is the owner re-approving new terms. Setting the cap to `0` turns the fee off.
- If the vault holds too little SUI, the charge aborts. The operator then stops the agent and tells the user to top up or withdraw (off-chain).

## Limits accounting

- **Per trade:** `amount ≤ max_trade`.
- **Per day:** `spent_today + amount ≤ max_daily_spend`. The day is `clock_ms / 86_400_000`, and the counter resets on the first buy of a new day. Spend is recorded net of Blast's graduation refund.
- **Per launch:** `position_cost[Meme] + amount ≤ max_per_launch`. Sells and owner token withdrawals reduce the cost pro rata. A fully closed position resets it to zero.
- **Open positions:** opening a new Meme type needs `open_positions < max_open_positions`. Topping up a position you already hold is always allowed. Owner token deposits count as positions but are never blocked.
- **Sells** are not limited by the spend caps. They are blocked only by pause, revoke and the `min_out` rules.
- **Drawdown stop** is off-chain: the operator pauses its own trading (SPEC §5.4.4).

## API

Owner (`&OwnerCap`): `create`, `deposit_sui`, `deposit_token<T>`, `withdraw_sui`, `withdraw_all_sui`, `withdraw_token<T>`, `withdraw_all_token<T>`, `set_limits`, `set_fee_terms`, `pause`, `resume`, `revoke_agent`, `authorize_agent`.

Agent (`&TradeCap`): `buy<Meme>`, `sell<Meme>`, `charge_fee`. Anyone holding a TradeCap can also call `destroy_trade_cap`.

Constructor: `new_limits(max_trade, max_per_launch, max_daily_spend, max_open_positions, min_out_required)`. It aborts with `EInvalidLimits` unless `min_out_required` is `true`.

Read-only getters: `sui_value`, `token_value<T>`, `position_cost<T>`, `open_positions`, `spent_today`, `day_index`, `limits`, `is_paused`, `trade_cap_id`, `owner`, `daily_fee_cap`, `treasury`, `last_fee_day`, plus the `Limits` field getters.

### Events

`VaultCreated` (includes the fee terms and `first_fee_day`), `Deposited`, `Withdrawn`, `LimitsChanged`, `Paused`, `Resumed`, `AgentAuthorized`, `AgentRevoked`, `FeeTermsChanged`, `FeeCharged { vault_id, amount, day, treasury }`, `AgentTraded { vault_id, meme_type, side (0 buy, 1 sell), sui_amount (net), meme_amount, min_out }`.

### Abort codes

| Code | Name | Meaning |
| --- | --- | --- |
| 0 | `EWrongVault` | Capability belongs to another vault |
| 1 | `EAgentNotAuthorized` | TradeCap was revoked or replaced |
| 2 | `EPaused` | Owner paused agent trading |
| 3 | `EZeroAmount` | Trade amount is zero |
| 4 | `EZeroMinOut` | `min_out` is zero |
| 5 | `EExceedsMaxTrade` | Buy above `max_trade` |
| 6 | `EExceedsMaxPerLaunch` | Buy would pass `max_per_launch` |
| 7 | `EExceedsDailySpend` | Buy would pass `max_daily_spend` |
| 8 | `ETooManyOpenPositions` | New position beyond `max_open_positions` |
| 9 | `EInsufficientSui` | Not enough SUI in the vault |
| 10 | `EInsufficientTokens` | Not enough of that token in the vault |
| 11 | `EInvalidLimits` | `min_out_required` is false |
| 12 | `EOutputBelowMin` | Trade returned less than `min_out` |
| 13 | `ESuiIsNotAToken` | `deposit_token<SUI>`: use `deposit_sui` |
| 14 | `EFeeNotDue` | Today's fee was already charged, or today is in the free period |
| 15 | `EExceedsDailyFeeCap` | Fee above `daily_fee_cap` |

## Differences from the SPEC

- `sell` takes no `Clock`: Blast's `launch::sell` doesn't need one and the vault doesn't use one.
- `high_water_value_hint` is left out. The drawdown stop is off-chain, and an unused on-chain field would be misleading.
- `withdraw_all_sui` and `withdraw_all_token<T>` were added, so a user can empty the vault from a block explorer or CLI without our backend, even without knowing the exact balances.
- `destroy_trade_cap` was added, so the operator can clean up caps that were replaced.
- `create` takes a `free_days` argument, so the 7 free days of SPEC §1b are enforced on-chain through the initial `last_fee_day`. It needs no extra field.
- `charge_fee` takes `ctx` (for the coin it creates).

## Build and test

Needs `sui` **1.77.2**, the same toolchain as Blast's canonical deployment.

```bash
sui move build --build-env mainnet --lint --warnings-are-errors
```

```bash
sui move test --build-env mainnet --lint --warnings-are-errors
```

```bash
python3 ../../scripts/check_trade_cap_surface.py sources/vault.move
```

Or run `pnpm move:test` from the repo root.

## Dependency on Blast

`blast_fun` is vendored at the canonical mainnet source commit under [`../vendor/blast`](../vendor/blast/README.md). Its upstream `Published.toml` files make a `--build-env mainnet` build link against the deployed launchpad (`0x079a1b44…a573`).

## Upgrades (SPEC §5.4.2)

`blast_fun` is version-gated. After a Blast upgrade, `launch::buy` and `launch::sell` linked to the old version abort. Owner functions don't call Blast, so **withdrawals keep working through any Blast upgrade**. Restoring trading needs a compatible upgrade of this package, relinked to the new Blast version. The UpgradeCap must sit behind a multisig and a timelock, and the policy must be published in the UI. Who holds it and how long the timelock is are open decisions (SPEC §12).
