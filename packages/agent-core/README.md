# `@blast-agents/agent-core`

The trading brain: market snapshot, model adapters (`Trader` for Claude and ChatGPT), the plain-code risk check, and the executor.

> **Current state:** this is still the `blast-arena-agent` starter, moved in unchanged. It trades from **plain wallets**, not vaults, and it still knows about opening rounds. SPEC §13 step 5 ports it to vaults: read vault state, execute through `blast_agent_vault::buy/sell`, drop `join_opening_round`, add the queue and the KMS signer. Until then, use it only in its default dry-run mode.

| File                              | Role                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/snapshot.ts`                 | Reads recent SUI-quoted launches into one shared `Market` snapshot. Creator text is labelled `untrusted_*`.                                                      |
| `src/traders.ts`                  | `Trader` interface, the system prompt, and the Claude (`output_config.format`) and OpenAI (Responses `text.format`, strict) adapters. Bad output becomes a hold. |
| `src/risk.ts`                     | Clamps sizes to the limits, sets `min_out` from a fresh preview minus slippage, applies the drawdown halt                                                        |
| `src/executor.ts`, `src/chain.ts` | Build the tx, simulate it on mainnet, and sign only when `MODE=live` and the simulation passed                                                                   |
| `src/journal.ts`                  | Append-only JSONL log (moves to Postgres in step 4)                                                                                                              |
| `src/main.ts`                     | The two-agent arena loop                                                                                                                                         |

## Run the arena (dry run)

```bash
cp .env.example .env
```

Set `CLAUDE_ADDRESS` and `CHATGPT_ADDRESS`, plus the API keys, then:

```bash
pnpm --filter @blast-agents/agent-core arena:once
```

`MODE=dry` (the default) simulates every trade and signs nothing.
