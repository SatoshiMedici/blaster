# Architecture

The full picture is in [SPEC §4](../SPEC.md#4-architecture). This page covers how the code in this repository maps onto it.

```text
Web app (apps/web) ──wallet signs──► Sui mainnet ─┬─ blast_fun (Blast launchpad)
     │ REST/WS                                     └─ blast_agent_vault (move/blast_agent_vault)
API (apps/api) ──tick jobs──► agent workers (packages/agent-core) ──► OpenRouter (model catalog)
     │                               │ PTBs from packages/vault-sdk, simulated, then KMS-signed
Postgres ◄──────── indexer ◄──────── Sui events
```

## Packages and dependency direction

```text
apps/web ─┐
apps/api ─┼──► packages/vault-sdk ──► packages/shared
          └──► packages/agent-core ─┘
```

- `packages/shared` has no Sui or network dependencies: just zod schemas, types and pure functions. It's safe to import in the browser.
- `packages/vault-sdk` knows the Move ABI of `blast_agent_vault`. It builds unsigned PTBs and decodes vault state, and never signs.
- `packages/agent-core` owns the market snapshot, the model adapters (`Trader`), the risk check and execution. Signing goes through a `Signer` interface: KMS in production, a local file only in dev.

## One tick for one vault

1. **Snapshot:** built once per tick for all launches, and shared by every vault's job.
2. **Vault view:** SUI balance and token balances, read from the vault object.
3. **Decide:** the model returns the strict JSON `Decision` (`buy` / `sell` / hold). A timeout, an error or invalid output counts as hold.
4. **Risk check:** plain code. It mirrors the on-chain limits so rejections can be explained, applies the drawdown stop, and sets `min_out` from a fresh preview minus slippage.
5. **Execute:** build a `blast_agent_vault::buy/sell` PTB, simulate it, and sign only in live mode and only if the simulation passed.
6. **Log:** the decision, verdicts and txs go to Postgres and feed the activity feed and the stats.
