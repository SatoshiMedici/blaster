# Blast Agents

AI agents trade [Blast](https://blast.fun) launches on Sui **from each user's own on-chain vault**. The user picks a model (a curated set across three price tiers, all through OpenRouter), how active the agent is, and their risk limits. They pay a daily price derived from that plan.

Users keep custody: the agent can trade, but it can never withdraw. The only other outflow is the plan's daily fee, bounded by a spending limit the user signs and paid only to the approved treasury. Limits are enforced on-chain, and the user can pause, revoke or withdraw at any time, even if our backend is down.

> **Status: early build, nothing deployed.** The Move vault is implemented and unit-tested but not published or audited. No mainnet transaction has been signed. See [docs/PROGRESS.md](docs/PROGRESS.md).
>
> You can lose all of the funds in a vault. Nothing here promises returns.

## Documents

| Doc                                          | What it covers                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SPEC.md](SPEC.md)                           | The product and build spec (source of truth)                                                                                                                                                       |
| [docs/PROGRESS.md](docs/PROGRESS.md)         | Build-order status, decisions taken, open items                                                                                                                                                    |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, dependency direction, how a tick flows                                                                                                                                                 |
| [docs/SECURITY.md](docs/SECURITY.md)         | Custody model, threat model, trust assumptions, what's tested                                                                                                                                      |
| [docs/ECONOMICS.md](docs/ECONOMICS.md)       | Pricing, the fee cap, referrals, models, and where each rule lives in code                                                                                                                         |
| [reports/](reports/)                         | Sourced research: [unit economics](reports/Blast%20Agents%20unit%20economics.md); [models, fees and referrals](reports/Blast%20Agents%20models%20fees%20referrals.md). Notes in `research_notes/`. |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Setup, conventions, checks to run before a PR                                                                                                                                                      |

## Repository layout

```text
apps/
  web/                 Next.js app: landing, Start flow, dashboard, leaderboard (step 7, UI built)
  api/                 REST + WebSocket API with wallet sign-in             (step 6, not started)
packages/
  shared/              Pure, browser-safe: pricing, model catalog, activity levels, referrals,
                       risk presets, decision schema, API schemas
  agent-core/          Trading brain: OpenRouter client, triggers, launch screening, spend guards,
                       snapshot, risk check, executor
  vault-sdk/           PTB builders, BCS decoders and readers for the vault; signing summaries
move/
  blast_agent_vault/   The Sui Move vault: OwnerCap / TradeCap, on-chain limits, daily fee (60 tests)
  vendor/blast/        Blast launchpad source at the canonical mainnet commit (read-only)
scripts/
  check_trade_cap_surface.py   CI custody guard: no TradeCap function can move value out except the fee
docs/  reports/  research_notes/
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
- **No mainnet transaction, package publish or fund movement without explicit approval** from the project owner. That includes treasury conversions and referral payouts: code only proposes them.
- **Any change that lets the agent move funds out of a vault is a blocker.** CI enforces the TradeCap surface.
- Creator-written token text is untrusted. It is passed to models only in `untrusted_*` fields, and the on-chain caps are the real defence.
