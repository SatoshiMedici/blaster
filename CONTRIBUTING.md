# Contributing

## Setup

- Node 22 (`.nvmrc`) and pnpm 10 (`corepack enable`)
- Sui CLI **1.77.2**, the same toolchain as Blast's canonical deployment:

  ```bash
  curl -sSfL https://github.com/MystenLabs/sui/releases/download/mainnet-v1.77.2/sui-mainnet-v1.77.2-ubuntu-x86_64.tgz | tar -xz sui
  ```

- `pnpm install`

## Checks (CI runs all of them)

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm move:test
```

`pnpm format` applies Biome's formatting and import order.

## Conventions

- **TypeScript:** strict mode, `noUncheckedIndexedAccess`, ESM with `.ts` import extensions. Packages export source directly (`"exports": "./src/index.ts"`), so there's no build step inside the monorepo.
- **Money is `bigint` MIST.** Never use floating-point SUI in accounting. Convert with `suiToMist` / `mistToSui` from `@blast-agents/shared`. Over JSON, u64 values travel as decimal strings.
- **One source for prices and thresholds.** Plan prices, the fee cap, referral share, model prices and cost alarms come from `@blast-agents/shared` (`pricing.ts`, `models.ts`, `referrals.ts`, `economics.ts`). Never hard-code them elsewhere. Changing one is a pricing change: update `docs/ECONOMICS.md` and SPEC §1b.
- **Validate at the edges.** Every API body, env var and model output is parsed with zod before use.
- **Dry-run by default.** Any code path that signs must take an explicit `live` flag and must have simulated first.
- **Move:** `sui move build/test --build-env mainnet --lint --warnings-are-errors` must be clean. Every new abort path needs a test. Every limit needs a passing test at its boundary and an aborting test just above it.
- **Custody:** don't add a public function that takes a `TradeCap` and returns value. `scripts/check_trade_cap_surface.py` fails CI if you do. Any change to custody needs an update to [docs/SECURITY.md](docs/SECURITY.md).
- **Docs:** each package keeps a README that says what it does and how to use it. Update [docs/PROGRESS.md](docs/PROGRESS.md) when a SPEC §13 step changes state.

## Commits and PRs

- Make small, focused commits with an imperative subject line (`vault: reset daily spend on day roll`).
- Fill in the PR template, including how you tested and any custody impact.
- Never commit secrets, `.env` files or private keys.
