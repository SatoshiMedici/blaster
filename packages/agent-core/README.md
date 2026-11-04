# `@blast-agents/agent-core`

The trading brain: market snapshot, the OpenRouter model adapter, rule-based triggers, launch screening, spend guards, the plain-code risk check, and the executor.

> **Current state:** the cost-control modules are new and tested. The trading loop (`main.ts`, `risk.ts`, `executor.ts`) is still the `blast-arena-agent` starter: it trades from **plain wallets**, not vaults, and still knows about opening rounds. SPEC §13 step 5 ports it to vaults and wires in the modules below. Until then, run it only in its default dry-run mode.

## Cost controls (SPEC §1b, [docs/ECONOMICS.md](../../docs/ECONOMICS.md))

These modules are side-effect free and exported from `@blast-agents/agent-core`:

| Module          | What it does                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openrouter.ts` | Cache-first prompt layout (`buildCachedMessages`: system → tick snapshot with a `cache_control` breakpoint → vault data), OpenRouter routing settings (`require_parameters`, `zdr`, `data_collection: "deny"`, no `provider.order`), the 600-token output cap, `warmUpThenFanOut`, usage-to-cost (`toDecisionUsage`), and failure classification (402 = out of credits) |
| `triggers.ts`   | `evaluateTriggers`: the model is called only on vault creation, a new launch, a 50%/80% curve crossing, a held position moving >10%, or a 4-hour check. Non-urgent triggers coalesce for 30 minutes.                                                                                                                                                                    |
| `screener.ts`   | `screenLaunches`: global plain-code filter (sell burn, fees, progress, reserve). The snapshot is bounded and stably ordered, so the cached prefix is identical for every vault. Held launches are always kept.                                                                                                                                                          |
| `budget.ts`     | `DecisionCap` (30/vault/day), `VaultSpendLedger` ($0.45/vault/day AI ceiling), `PlatformSpendGuard` (daily budget + kill switch), `onModelFailure`, `creditRunway` (7-day alert), `CostMonitor` (alarms derived from the 30% margin rule, cache-hit alarm, recommended cap)                                                                                             |

## Trading loop (starter)

| File                              | Role                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/snapshot.ts`                 | Reads recent SUI-quoted launches into one shared `Market` snapshot, serialized once per tick (`market.json`). Creator text is labelled `untrusted_*`.               |
| `src/traders.ts`                  | `Trader` interface, the system prompt, and `OpenRouterTrader` (OpenAI-compatible chat completions with a strict `json_schema` response). Bad output becomes a hold. |
| `src/risk.ts`                     | Clamps sizes to the limits, sets `min_out` from a fresh preview minus slippage, applies the drawdown halt                                                           |
| `src/executor.ts`, `src/chain.ts` | Build the tx, simulate it on mainnet, and sign only when `MODE=live` and the simulation passed                                                                      |
| `src/journal.ts`                  | Append-only JSONL log (moves to Postgres in step 4)                                                                                                                 |
| `src/main.ts`                     | The two-agent arena loop                                                                                                                                            |

## Run the arena (dry run)

```bash
cp .env.example .env
```

Set `OPENROUTER_API_KEY`, `CLAUDE_ADDRESS` and `CHATGPT_ADDRESS`, then:

```bash
pnpm --filter @blast-agents/agent-core arena:once
```

`MODE=dry` (the default) simulates every trade and signs nothing. Model slugs (`CLAUDE_MODEL`, `OPENAI_MODEL`) are any OpenRouter slug, so adding a model needs no code change.

## Tests

```bash
pnpm --filter @blast-agents/agent-core test
```
