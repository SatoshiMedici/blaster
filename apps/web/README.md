# `@blast-agents/web`

The Blast Agents web app (SPEC §3, §13 step 7). Next.js 16 (App Router, Turbopack), Tailwind CSS 4, `@mysten/dapp-kit-react`, TanStack Query, Recharts.

```bash
pnpm --filter @blast-agents/web dev
```

```bash
pnpm --filter @blast-agents/web build
```

## Pages

| Route          | What it is                                                                                                                                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Landing: hero with a live agent log, how it works, custody (can / cannot), the model catalog by tier, a live pricing calculator, model vs model, FAQ, risk disclosure                                                                                                                                                              |
| `/start`       | The 3-screen onboarding of SPEC §1b. **Connect** (any Sui wallet); **Choose** (model, activity level or custom budget, risk preset, deposit with no minimum, live price, fee-drag warning with one-tap suggestions, on-chain limits); **Start** (the exact plain-words list of what the one signature does, from `describeCreate`) |
| `/dashboard`   | Vault value, P&L net of fees, fees paid, plan and today's decision budget, value vs deposits chart with trades marked, positions, the reasoning feed with risk-check verdicts, owner controls, limits                                                                                                                              |
| `/leaderboard` | TWR, ranked by return per drawdown, eligibility rules, model vs model, biggest wins and worst losses                                                                                                                                                                                                                               |

## What is real and what is preview

- **Real:** every price, limit, spending limit, fee-drag band, recommendation and signing text. They come from `@blast-agents/shared` and `@blast-agents/vault-sdk`, the same code the API and workers use, so the UI can't drift from billing. Wallet connection is real (dApp Kit, Sui wallet standard).
- **Preview:** the dashboard, feed and leaderboard use `lib/demo.ts` and carry a **Demo data** badge until the API (step 6) and stats engine (step 8) exist. Start doesn't sign while `NEXT_PUBLIC_VAULT_PACKAGE_ID` is unset; it shows a preview banner. Google / X sign-in (zkLogin via Enoki) is shown as coming soon until an Enoki key is configured.

## Configuration

| Variable                                                       | Purpose                                                |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUI_GRPC_URL`                                     | Sui gRPC endpoint (default: Mysten mainnet full node)  |
| `NEXT_PUBLIC_VAULT_PACKAGE_ID`                                 | Published `blast_agent_vault`; enables real signing    |
| `NEXT_PUBLIC_OPERATOR_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS` | Shown in the signing summary; the API will supply them |

## Design system

Tokens live in `app/globals.css` (`@theme`): Blast's canvas `#0D1117`, punch `#FF4C98`, deep `#F12D82`, kicker `#EFA1C9`, border `#28333F`, muted `#8E9CAB`, plus surfaces, semantic gain / loss / warn colours and motion.

- **Type:** Inter for text; JetBrains Mono with tabular numerals for every number and label.
- **Components** (`components/ui.tsx`): `Button`, `ButtonLink`, `Badge`, `Segmented` (native radio inputs), `Stat`, `SectionHeading`, `Container`.
- **Accessibility:** visible focus rings, native form controls, `prefers-reduced-motion` respected, no horizontal scroll at 390 px.
- **Copy rules** (SPEC §11): no return promises; "You can lose all of the funds in your vault" appears on onboarding and in the footer; agent trades are not Blast endorsements.
