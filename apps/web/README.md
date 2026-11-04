# `@blast-agents/web`

The Blast Agents web app (SPEC §3, §13 step 7). Next.js 16 (App Router, Turbopack), Tailwind CSS 4, `@mysten/dapp-kit-react`, `@mysten/enoki`, TanStack Query, the Blast SDK.

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

## No mock data

Every number on the site is real or computed by the same code that bills users. Nothing is simulated.

- **Read live from Sui mainnet in the browser:** the newest Blast launches (`lib/chain.ts`, via the Blast SDK), the connected wallet's SUI balance, and the user's vaults (found by their `OwnerCap`s, decoded by `vault-sdk`).
- **Live SUI price** from public price APIs (`lib/price.ts`: Binance, CoinGecko fallback).
- **Prices, limits, spending limits, fee-drag warnings and the signing text** come from `@blast-agents/shared` and `@blast-agents/vault-sdk`.
- **Real transactions:** Start builds the one-signature create-vault PTB, and the dashboard builds pause, resume, withdraw-everything and revoke PTBs. The wallet signs and executes them.
- **Until launch:** Start and the vault actions stay disabled until the contract and addresses are configured (`lib/config.ts`). The dashboard shows a launch-status checklist. The leaderboard shows "No eligible vaults yet" until the stats engine has real vaults to rank.

## Configuration

| Variable                                                         | Purpose                                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUI_GRPC_URL`                                       | Sui gRPC endpoint (default: Mysten mainnet full node)                                                |
| `NEXT_PUBLIC_VAULT_PACKAGE_ID`                                   | Published `blast_agent_vault`; enables real signing                                                  |
| `NEXT_PUBLIC_OPERATOR_ADDRESS`, `NEXT_PUBLIC_TREASURY_ADDRESS`   | Shown in the signing summary; the API will supply them                                               |
| `NEXT_PUBLIC_SUIPUMP_INDEX_URL`                                  | SuiPump's public token index for the landing page's SuiPump tab (default: the one suipump.org reads) |
| `NEXT_PUBLIC_SITE_URL`                                           | Canonical URL (metadata, OpenGraph); defaults to the Vercel production URL                           |
| `NEXT_PUBLIC_ENOKI_API_KEY`                                      | Enoki **public** API key. Enables social sign-in together with at least one client ID below          |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`                                   | Google OAuth client ID ("Sign in with Google")                                                       |
| `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`, `NEXT_PUBLIC_TWITCH_CLIENT_ID` | Optional extra providers Enoki supports                                                              |
| `NEXT_PUBLIC_ENABLE_BURNER_WALLET`                               | `1` adds a throwaway test wallet. Local testing only; never in production                            |

## Design system

Tokens live in `app/globals.css` (`@theme`): Blast's canvas `#0D1117`, punch `#FF4C98`, deep `#F12D82`, kicker `#EFA1C9`, border `#28333F`, muted `#8E9CAB`, plus surfaces, semantic gain / loss / warn colours and motion.

- **Type:** Inter for text; JetBrains Mono with tabular numerals for every number and label.
- **Components** (`components/ui.tsx`): `Button`, `ButtonLink`, `Badge`, `Segmented` (native radio inputs), `Stat`, `SectionHeading`, `Container`.
- **Accessibility:** visible focus rings, native form controls, `prefers-reduced-motion` respected, no horizontal scroll at 390 px.
- **Copy rules** (SPEC §11): no return promises; "You can lose all of the funds in your vault" appears on onboarding and in the footer; agent trades are not Blast endorsements.

## Wallet connection

- Any wallet implementing the Sui wallet standard appears automatically (Slush, Phantom, Backpack, Suiet, Nightly, OKX, …), including Slush's web wallet, which needs no extension.
- The connect dialog is rendered in a portal at `document.body`. Inside the header, `backdrop-filter` would make `position: fixed` relative to the header and clip it.
- The site identity wallets show comes from `lib/site.ts`: `application-name`, the icon (`app/icon.svg`) and the manifest. Security headers (`X-Frame-Options`, `frame-ancestors`, HSTS, …) are set in `next.config.ts`.
- **"Security alert" in Slush or other wallets** comes from the wallet's phishing and domain-reputation checks, not from this code. A brand-new `*.vercel.app` domain using a known brand name ("Blast") with a "Connect wallet" button matches the pattern phishing kits use. Fix: serve from Blast's own domain (e.g. `agents.blast.fun`) and ask the wallet teams (Mysten/Slush, Phantom/Blowfish, Blockaid) to review the domain.
- **Enabling Google sign-in:** create an app in the Enoki portal and copy its public key. Create a Google OAuth web client and add the site's origin as an authorized JavaScript origin and redirect URI. Register the client ID in Enoki for zkLogin, add the site's domain to the Enoki app's allowed origins, then set the env vars above and redeploy.
