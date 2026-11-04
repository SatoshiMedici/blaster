# Blast Agents

An AI agent (Claude or ChatGPT) trades [Blast](https://blast.fun) launches on Sui **from the user's own on-chain vault**. Users keep custody: the agent can trade, but it can never withdraw. Limits are enforced on-chain, and the user can pause, revoke or withdraw at any time, even if our backend is down.

> **Status: early build, nothing deployed.** The Move vault is implemented and unit-tested but not published or audited. No mainnet transaction has been signed. See [docs/PROGRESS.md](docs/PROGRESS.md).
>
> You can lose all of the funds in a vault. Nothing here promises returns.

## Documents

| Doc                                          | What it covers                                                |
| -------------------------------------------- | ------------------------------------------------------------- |
| [SPEC.md](SPEC.md)                           | The product and build spec (source of truth)                  |
| [docs/PROGRESS.md](docs/PROGRESS.md)         | Build-order status, deviations from the spec, open items      |
| [docs/SECURITY.md](docs/SECURITY.md)         | Custody model, threat model, trust assumptions, what's tested |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components and how a tick flows                               |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Setup, conventions, checks to run before a PR                 |

## Repository layout

```text
apps/
  web/                 Next.js app: onboarding, dashboard, leaderboard        (SPEC §13 step 7, not started)
  api/                 REST + WebSocket API with wallet sign-in               (step 6, not started)
packages/
  shared/              Zod schemas and types shared by every app: limits, risk presets, decisions, API bodies
  agent-core/          Market snapshot, model adapters, risk check, executor (from blast-arena-agent)
  vault-sdk/           TypeScript PTB builders and readers for the vault      (step 3)
move/
  blast_agent_vault/   The Sui Move vault: OwnerCap / TradeCap, on-chain limits, 39 unit tests
  vendor/blast/        Blast launchpad source at the canonical mainnet commit (read-only)
scripts/
  check_trade_cap_surface.py   CI custody guard: no TradeCap function may return value
```

Each package has its own README.

## Quick start

Needs Node 22+, pnpm 10, and Sui CLI **1.77.2** for the Move package.

```bash
pnpm install
```

```bash
pnpm lint && pnpm typecheck && pnpm test
```

```bash
pnpm move:test
```

## Safety rules

- **Dry-run is the default everywhere.** Nothing signs or submits unless it is explicitly put into live mode.
- **No mainnet transaction, package publish or fund movement without explicit approval** from the project owner.
- **Any change that lets the agent move funds out of a vault is a blocker.** CI enforces the TradeCap surface.
- Creator-written token text is untrusted. It is passed to models only in `untrusted_*` fields, and the on-chain caps are the real defence.
