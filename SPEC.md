# Blast Agents: build spec

> Hand this file to Claude Code as the project brief. Put it at the repo root as `SPEC.md`, and add a `CLAUDE.md` that says: "Read SPEC.md first. Build in the order of section 13. Never sign a mainnet transaction or move funds without explicit approval."
>
> Starting code: `blast-arena-agent/` (TypeScript, already typechecked against the Blast SDK). It holds the market snapshot, model adapters, risk check and executor. Reuse it as `packages/agent-core`.

Last updated: 4 Nov 2026 · Owner: Mário (COO, Blast)

---

## 1. What we're building

A web app on top of **Blast** (launchpad and social trading on Sui) where a user:

1. connects a Sui wallet,
2. picks an AI model to trade for them (Claude or ChatGPT; more later),
3. sets their risk limits,
4. deposits SUI into **their own on-chain agent vault** and authorizes the agent to trade from it,
5. watches the agent trade Blast launches, with every decision and its reasoning shown,
6. can pause, change model, withdraw or revoke at any time.

A public **leaderboard** compares users and models.

### Core principle

**The agent can trade, but it can never withdraw.** Users keep custody. The agent's key holds only a trade-only capability on the user's vault. Limits are enforced on-chain, not just in our backend. Withdrawals only ever go to the vault owner.

### Non-goals for v1

- No pooled funds (each user has their own vault; we never mix money).
- No opening rounds or presales inside vaults (see 5.4).
- No leveraged products (Boosts aren't release-ready).
- No mobile app (responsive web only).
- No return promises anywhere in the UI or copy.

---

## 1b. Locked UX and billing decisions (seamless by design)

These decisions override anything less specific elsewhere in this spec.

### Setup is 3 screens and 1 signature

1. **Connect.** Wallet connect via dapp-kit. Also offer **"Sign in with Google / X"** through Sui zkLogin (Mysten's Enoki), so people without a crypto wallet get a Sui address in one click. Both paths produce the same thing: a Sui address that owns the vault.
2. **Choose.** One screen with:
   - the model: two big cards, Claude or ChatGPT, with live stats;
   - the risk level: a 3-position slider (Careful, **Balanced** as default, Degen);
   - the deposit amount, with a minimum and a "max" button.
3. **Start.** One button, **one wallet signature**. A single PTB:
   - creates the vault,
   - deposits,
   - writes the limits,
   - authorizes the agent (TradeCap to the operator),
   - sets the daily fee cap (below).

The dashboard opens with "Your agent is reading the market…", and the first decision appears within about a minute.

There is no API key, no second token, no top-up screen and no separate gas balance.

### Billing: a flat daily fee, taken automatically from the vault

- **Price:** a flat **daily fee while the agent is running**, in SUI. It covers the AI model cost, gas for agent trades, and margin. A paused or closed vault pays nothing.
- **First 7 days free:** Blast covers them, to remove friction at signup.
- **On-chain mechanics:**
  - The vault stores `daily_fee_cap` (MIST), which the user approves at creation and sees on the Start screen ("up to X SUI per day while running").
  - A `charge_fee(vault, trade_cap, amount, clock)` function sends at most `daily_fee_cap` per calendar day to a **fixed treasury address set at creation**.
  - It can't be charged twice in a day, can't exceed the cap, and can't go anywhere else.
  - The operator charges once a day.
  - This is the **only** way any SUI ever leaves the vault other than to the owner. It's tested like the withdraw rule.
- **Why flat daily, not per decision or per trade:**
  - The price is predictable ("X SUI a day").
  - It doesn't push the bot to overtrade (unlike a per-trade fee).
  - It isn't profit-sharing, which is the most legally sensitive model.
  - Our cost per vault is kept under the fee by the skip-when-unchanged rule and prompt caching of the shared market snapshot.
- **Dashboard:** the fees paid so far sit next to P&L, and P&L is shown **net of fees**.
- **Edge cases:**
  - If the vault holds too little SUI for the fee, the agent sells nothing to pay it. It pauses itself and the user gets a "top up or withdraw" notice.
  - Fee changes only apply to new vaults, or to existing ones after the user re-approves.

### Seamless details

- **Gas:** the operator pays gas for agent trades (covered by the daily fee). Users only ever sign: Start, Deposit, Withdraw, Pause/Resume, Change limits, Revoke.
- **Notifications:** opt-in email or Telegram for trades, the daily summary, drawdown-halt and low-balance.
- **Withdraw:** one button, "Withdraw everything as SUI". The operator sells positions in the background, then the user signs one transaction. A fallback "withdraw as-is" always works with no backend.
- **Model switch:** one tap, no signature (it's an off-chain setting). It takes effect on the next tick.
- **Plain-language signing:** before every signature, show one sentence saying exactly what the transaction does.

---

## 2. Glossary

| Term | Meaning |
| --- | --- |
| Launch | A Blast bonding-curve coin (`blast_fun::launch::Launch<Meme, Quote>`), traded against SUI until it graduates to a DEX |
| Agent vault | A Move object owned by the user that holds the SUI and tokens the agent trades with |
| OwnerCap | Capability held by the user's wallet: deposit, withdraw, set limits, pause, revoke |
| TradeCap | Capability held by the agent's operator key: buy and sell within limits, nothing else |
| Operator | Our backend service that runs the agents and holds TradeCaps in a KMS |
| Tick | One decision cycle for one vault |

---

## 3. User flows

### 3.1 Onboarding

1. **Landing.** A clear explainer ("An AI trades Blast launches from your own vault. You can withdraw anytime. You can lose money."), the live leaderboard, and a Connect button.
2. **Connect wallet** with `@mysten/dapp-kit-react`. Supported: any wallet on the Sui wallet standard (Slush, Phantom, Backpack, Suiet, Nightly, OKX…). Then sign a login message (no gas) to create the session.
3. **Accept terms.** A risk disclosure checkbox. Geo-block restricted countries (see 11).
4. **Pick a model.** Cards for each model show:
   - name, provider and model ID
   - a one-line style description ("more cautious" or "more active" comes from the data, not marketing)
   - live stats from section 9: median user ROI, win rate, max drawdown, number of vaults
   - cost to the user, if any
5. **Pick a risk preset.** Each preset can be edited before confirming:

   | Preset | Per trade | Per launch | Daily spend | Max open positions | Drawdown stop |
   | --- | --- | --- | --- | --- | --- |
   | Careful | 2% of deposit | 5% | 10% | 3 | 15% |
   | Balanced | 5% | 15% | 30% | 5 | 30% |
   | Degen | 10% | 25% | 60% | 8 | 50% |

   The amounts are converted to SUI at confirmation and written on-chain.
6. **Create the vault and deposit.** One PTB, signed by the user, that:
   - creates the vault with the limits,
   - deposits SUI,
   - mints an OwnerCap to the user,
   - mints a TradeCap to our operator address.

   Show the user exactly what they're signing in plain words.
7. **Live.** Redirect to the dashboard. The first tick runs within one minute.

### 3.2 Dashboard (per user)

- **Header:** vault value (SUI and USD), P&L since start (SUI and %), status (Running / Paused / Halted by drawdown), model, and a Pause/Resume toggle.
- **Positions table:** coin, tokens, cost basis, current value (executable curve sell), unrealized P&L, % to graduation, held for.
- **Activity feed:** every tick's decision. Each entry shows:
  - the model's one-line summary
  - each action with its reason
  - what the risk check did (executed, clamped, rejected and why)
  - the tx digest linked to a Sui explorer

  Holds are shown too.
- **Chart:** vault value over time vs deposits (a line chart), with buys and sells marked.
- **Controls:**
  - Deposit more, and Withdraw (part or all), both signed by the user.
  - Change model. It takes effect on the next tick; the history keeps the model tag per trade.
  - Edit limits (on-chain tx).
  - Close vault: sell everything, withdraw all, then revoke the TradeCap.
  - Revoke agent: an instant kill that works even if our backend is down.

### 3.3 Withdraw and revoke rules

- The user can withdraw SUI and any token at any time, even while the agent runs. A withdrawal never goes anywhere but the OwnerCap holder.
- Revoke is on-chain: the vault records the TradeCap ID as revoked, and every later agent call aborts.
- "Withdraw all as SUI" is a backend-assisted flow: the operator sells positions into the curve first, then the user signs the withdrawal. If the backend is down, the user can still withdraw the tokens as they are.

---

## 4. Architecture

```
┌────────────┐  wallet sigs   ┌──────────────────┐
│  Web app   │ ─────────────► │  Sui mainnet      │
│ (Next.js)  │                │  ├ blast_fun (Blast)
└─────┬──────┘                │  └ blast_agent_vault (ours)
      │ REST/WS               └────────▲─────────┘
┌─────▼──────┐   tick jobs   ┌─────────┴────────┐
│  API       │ ────────────► │ Agent workers     │──► Anthropic / OpenAI
│ (Node)     │◄──── events ──│ (agent-core)      │
└─────┬──────┘               └─────────┬────────┘
      │                                │ sign via KMS (TradeCap holder key)
┌─────▼──────┐               ┌─────────▼────────┐
│ Postgres   │◄── indexer ───│ Sui event indexer │
└────────────┘               └──────────────────┘
```

| Component | Tech | Notes |
| --- | --- | --- |
| Web app | Next.js 16 (App Router), TypeScript, Tailwind, `@mysten/dapp-kit-react`, TanStack Query, Recharts | Blast design tokens: canvas `#0D1117`, punch `#FF4C98`, deep `#F12D82`, kicker `#EFA1C9`, border `#28333F`, muted `#8E9CAB`, font Inter |
| API | Node 22, Fastify or Next route handlers, zod validation | Session auth from a signed wallet message (no passwords) |
| Agent workers | `packages/agent-core` from `blast-arena-agent`, BullMQ + Redis for the tick queue | One job per vault per tick; concurrency-limited per model provider |
| Signing | Operator key in a KMS (AWS KMS or GCP KMS, Ed25519/secp256k1 supported by Sui; `@mysten/kms` exists) | The key never lives in app memory or env files in production |
| Indexer | Polls Sui events (`listEvents`) for Blast launch events and our vault events → Postgres | Rebuildable from chain |
| DB | Postgres 16 | Schema in section 8 |
| Contracts | Sui Move package `blast_agent_vault` | Section 5 |

SDKs:
- `@interest-protocol/blast-launchpad-sdk` (0.1.2+): launch state, previews, tx builders, event decoding
- `@interest-protocol/blast-deployments-sdk` (0.1.4+): `MAINNET_LAUNCHPAD_DEPLOYMENT`
- `@mysten/sui` v2: `SuiGrpcClient`, `Transaction`
- `@anthropic-ai/sdk`, `openai`

Reference sources:
- [blast-v2-contracts](https://github.com/interest-protocol/blast-v2-contracts) (`docs/llms/launchpad.md` covers the curve; `llms.txt` is the map)
- [blast-v2-sdk](https://github.com/interest-protocol/blast-v2-sdk)

---

## 5. Move package: `blast_agent_vault`

### 5.1 Objects

```move
public struct AgentVault has key {
    id: UID,
    owner: address,                    // informational; authority is the OwnerCap
    trade_cap_id: Option<ID>,          // None = revoked / no agent
    paused: bool,
    limits: Limits,
    sui: Balance<SUI>,
    // token balances keyed by coin type: Bag<TypeName, Balance<T>>
    tokens: Bag,
    // accounting for limits
    day_index: u64,                    // clock_ms / 86_400_000
    spent_today: u64,
    position_cost: Table<TypeName, u64>, // SUI spent per Meme type (for the per-launch cap)
    open_positions: u64,
    high_water_value_hint: u64,        // optional; drawdown is enforced off-chain + by pause
}

public struct Limits has store, copy, drop {
    max_trade: u64,         // MIST
    max_per_launch: u64,    // MIST
    max_daily_spend: u64,   // MIST
    max_open_positions: u64,
    min_out_required: bool, // always true in v1; kept explicit
}

public struct OwnerCap has key, store { id: UID, vault_id: ID }
public struct TradeCap has key, store { id: UID, vault_id: ID }
```

`AgentVault` is a shared object, so both the user and the operator can reach it.

### 5.2 Owner functions (OwnerCap)

- `create(limits, coin: Coin<SUI>, operator: address, clock, ctx): OwnerCap`: shares the vault and sends the TradeCap to `operator`.
- `deposit_sui(vault, cap, coin)` and `deposit_token<T>(vault, cap, coin)`.
- `withdraw_sui(vault, cap, amount, ctx): Coin<SUI>` and `withdraw_token<T>(vault, cap, amount, ctx): Coin<T>`. These **always work**, even when paused or revoked.
- `set_limits(vault, cap, limits)`.
- `pause(vault, cap)` / `resume(vault, cap)`.
- `revoke_agent(vault, cap)`: sets `trade_cap_id = none`.
- `authorize_agent(vault, cap, operator: address, ctx)`: mints a new TradeCap (for a model or operator change, or after a revoke).
- `set_fee_terms(vault, cap, daily_fee_cap, treasury)`: changes the fee terms; owner only (section 1b).

Fee function (TradeCap, section 1b):
- `charge_fee(vault, cap, amount, clock)`: pays at most `daily_fee_cap` once per calendar day to the vault's fixed `treasury`. It aborts if called twice in a day, if the amount is over the cap, or if the vault is paused. The vault gains the fields `daily_fee_cap: u64`, `treasury: address` and `last_fee_day: u64`.

### 5.3 Agent functions (TradeCap)

Each checks: `cap.vault_id == vault.id`, `vault.trade_cap_id == some(cap.id)`, `!vault.paused`, the limits, and `min_out > 0`.

```move
public fun buy<Meme, Quote = SUI>(
    vault: &mut AgentVault, cap: &TradeCap,
    launch: &mut blast_fun::launch::Launch<Meme, SUI>,
    package_version: &blast_fun::blast_fun::PackageVersion,
    runtime_config: &blast_fun::runtime_config::RuntimeConfig,
    amount: u64, min_meme_out: u64, clock: &Clock, ctx: &mut TxContext,
)
// takes `amount` SUI from vault.sui, calls blast_fun::launch::buy,
// stores the Coin<Meme> in vault.tokens and the refund back in vault.sui,
// updates spent_today, position_cost, open_positions; emits AgentTraded.

public fun sell<Meme>(
    vault: &mut AgentVault, cap: &TradeCap,
    launch: &mut blast_fun::launch::Launch<Meme, SUI>,
    package_version: &PackageVersion, runtime_config: &RuntimeConfig,
    amount: u64, min_quote_out: u64, clock: &Clock, ctx: &mut TxContext,
)
// takes `amount` Meme from vault.tokens, calls blast_fun::launch::sell,
// puts the SUI into vault.sui; emits AgentTraded.
```

Blast's real signatures, as of 4 Nov 2026:
- `launch::buy(self, package_version, runtime_config, quote_in: Coin<Quote>, min_meme_out: u64, ctx): (Coin<Meme>, Coin<Quote>)`
- `launch::sell(self, package_version, runtime_config, meme_in: Coin<Meme>, min_quote_out: u64, ctx): Coin<Quote>`

### 5.4 Known constraints (read before building)

1. **Opening rounds and presales are excluded from vaults in v1.** `join_opening_round` and presale `commit` record the bidder as the **transaction sender**, and delivery pays that address. In a vault, the sender is our operator key, so the user's tokens would be delivered to us. That breaks custody. Possible v2 fixes:
   - a Blast-side change that lets the caller name the recipient, or
   - the user co-signing bids.
2. **Blast package upgrades.** `blast_fun` is version-gated: after a Blast upgrade, calls linked to the old version abort. `blast_agent_vault` must be upgradeable so it can relink to the new Blast version. Put its UpgradeCap behind a multisig and a timelock, and publish the upgrade policy in the UI.
3. **Only SUI-quoted launches** in v1.
4. **Drawdown stop:** the operator pauses its own trading when the drawdown limit is hit, and shows it in the UI. On-chain, the hard caps are per-trade, per-launch and daily.
5. **Gas:** the operator pays gas for agent trades. Users pay gas for their own deposits, withdrawals and limit changes.
6. **Events** for indexing: `VaultCreated`, `Deposited`, `Withdrawn`, `LimitsChanged`, `Paused`, `Resumed`, `AgentAuthorized`, `AgentRevoked`, `AgentTraded { vault_id, meme_type, side, sui_amount, meme_amount, min_out }`.
7. **Tests** (`sui move test`), covering:
   - every limit boundary
   - revoked or foreign TradeCap aborts
   - withdraw works while paused and after revoke
   - an owner can never be blocked from withdrawing

   Plus a mainnet dev-inspect against a real launch before publishing. **An external audit is required before real users.**

---

## 6. Agent service

Reuse `blast-arena-agent`. Changes:

| Area | Change |
| --- | --- |
| Market snapshot | Build once per tick globally (all launches), then share it with every vault's job. No per-user reads of the market |
| Wallet view | Read from the vault object (SUI balance and token Bag), not from an address balance |
| Decision | Same strict JSON schema: `buy`, `sell` or hold. Remove `join_opening_round` for vaults (5.4) |
| Risk check | Mirror the on-chain limits off-chain (so rejections are explained), plus the drawdown stop and a slippage of 3% by default |
| Execution | Build a PTB calling `blast_agent_vault::buy/sell`, simulate, then sign via KMS and submit. Never sign if the simulation fails |
| Cadence | Tick every 60 s per vault, staggered. Skip the LLM call when nothing changed for that vault (no new launches, no price move > 5% on held positions) to save cost |
| Timeouts | 90 s per model call; a timeout counts as a hold |
| Logging | Every decision, verdict and tx goes to Postgres (`decisions`, `trades`) |

### 6.1 Models

| Option in UI | Model ID | Provider | Notes |
| --- | --- | --- | --- |
| Claude | `claude-sonnet-5-5` | Anthropic | Structured output via `output_config.format` (JSON schema) |
| ChatGPT | `gpt-6.1-sol` | OpenAI | Responses API, `text.format` JSON schema, `strict: true` |

- Same system prompt, same snapshot and same limits for both. The prompt is in `agent-core/src/traders.ts`.
- Model IDs come from config, so they can be swapped without a deploy. Confirm the IDs are enabled on our accounts before launch.
- Later: Grok (`grok-4.7` via the OpenAI-compatible endpoint `https://api.x.ai/v1`) behind the same `Trader` interface.

### 6.2 Prompt-injection rule

Token names, symbols and descriptions are written by creators. Pass them only in fields named `untrusted_*`, cap their length, and never let them change limits. The on-chain caps are the real defence.

---

## 7. API (REST + WebSocket)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/challenge` → `/auth/verify` | Wallet sign-in (signed personal message), returns a session |
| GET | `/models` | Available models plus their stats (section 9) |
| POST | `/vaults/prepare` | Body: model and limits. Returns unsigned PTB bytes to create the vault and deposit; the user signs in the wallet |
| POST | `/vaults/:id/confirm` | Body: tx digest. The backend verifies the on-chain vault and starts ticking |
| GET | `/vaults/:id` | Status, value, positions, limits |
| PATCH | `/vaults/:id` | Change model (off-chain); limit changes return a PTB for the user to sign |
| POST | `/vaults/:id/pause` / `/resume` | Returns a PTB to sign. The backend also stops ticking immediately |
| POST | `/vaults/:id/withdraw-all` | Operator sells positions, then returns the withdrawal PTB |
| GET | `/vaults/:id/decisions?cursor=` | Activity feed |
| GET | `/leaderboard?period=7d|30d|all&sort=` | Section 9 |
| GET | `/stats/platform` | Section 9 |
| WS | `/ws/vaults/:id` | Live decisions, trades, value |

Every endpoint that mutates a vault checks the session wallet is the vault owner.

---

## 8. Data model (Postgres)

```sql
users(id, address unique, created_at, country, terms_accepted_at)
vaults(id, object_id unique, owner_address, model_id, status,  -- running|paused|halted|closed
       limits jsonb, created_at, closed_at, start_value_mist, high_water_mist)
model_changes(id, vault_id, from_model, to_model, at)
decisions(id, vault_id, model_id, tick_at, summary, actions jsonb, latency_ms,
          input_tokens, output_tokens, cost_usd, error)
verdicts(id, decision_id, action jsonb, outcome,  -- executed|clamped|rejected
         reason)
trades(id, vault_id, model_id, launch_id, meme_type, side, sui_amount_mist, meme_amount,
       min_out, digest, status, at)
positions(vault_id, meme_type, launch_id, tokens, cost_basis_mist, opened_at, closed_at,
          realized_pnl_mist)
cashflows(id, vault_id, kind,  -- deposit|withdraw
          sui_amount_mist, token_type, token_amount, digest, at)
vault_snapshots(vault_id, at, value_mist, sui_mist, positions_value_mist)  -- every 5 min
launches(launch_id, meme_type, symbol, lifecycle, graduated_at, ...)        -- from the indexer
```

---

## 9. Leaderboard and stats

### 9.1 Rules that keep it honest

- **Use time-weighted return (TWR)**, so deposits and withdrawals don't count as profit or loss. Compute it from `vault_snapshots` and `cashflows`.
- **Eligibility for ranking:** vault age ≥ 7 days, deposit ≥ a minimum (e.g. 20 SUI), and at least 5 trades in the period. This stops tiny or lucky vaults topping the board.
- **Periods:** 7d, 30d, all-time. Default 30d.
- Show **losses as clearly as gains.** No "earn" language.
- Users choose to appear by address, a short alias or hidden. Default is a short alias (`0x12…ab`).

### 9.2 Per-user stats (dashboard and leaderboard row)

| Stat | Definition |
| --- | --- |
| Vault value | SUI + tokens at executable curve-sell value (SUI and USD) |
| Net deposits | Deposits − withdrawals |
| P&L | Value − net deposits (SUI and %) |
| Return (TWR) | Time-weighted return for the period |
| Max drawdown | Largest peak-to-trough fall in value, % |
| Return / drawdown | TWR ÷ max drawdown. The main risk-adjusted rank |
| Win rate | Closed positions with realized P&L > 0 ÷ closed positions |
| Avg win / avg loss | Mean realized P&L of winners vs losers (SUI) |
| Profit factor | Gross realized profit ÷ gross realized loss |
| Trades | Count of executed buys and sells |
| Volume | SUI traded through Blast |
| Avg hold time | Mean time from open to close |
| Best / worst trade | Largest realized gain and loss, with the coin |
| Graduation hits | Positions bought before a launch graduated ÷ positions opened |
| Fees paid | Blast trade fees + creator sell burn + gas share (SUI) |
| Hold ratio | Ticks with no action ÷ all ticks (how selective the agent is) |
| Model | Current model, with model changes marked on the chart |
| Days active | Since vault creation |

### 9.3 Leaderboard views

1. **Top vaults** by return/drawdown (default), with sorting by TWR, P&L, win rate and volume. Columns:
   - rank
   - alias
   - model badge
   - TWR
   - max drawdown
   - return/drawdown
   - win rate
   - trades
   - days active
2. **Model vs model.** This is the headline "Claude vs ChatGPT" panel. Per model:
   - **median** user TWR (not mean, so whales don't skew it)
   - % of vaults in profit
   - median max drawdown
   - median win rate
   - number of vaults and total value
   - trades per day per vault
   - hold ratio
   - average decision latency
   - LLM cost per decision

   Add a line chart of median TWR per model over time. Compare only vaults on the same risk preset, or show presets as separate tabs.
3. **Biggest wins / worst losses** this week. Single trades, aliased, with the coin and the model's reason.

### 9.4 Platform stats (public page)

| Stat | Definition |
| --- | --- |
| Total value in vaults | Sum of vault values (SUI and USD) |
| Active vaults / users | Status running in the last 24 h |
| New vaults | Per day and per week |
| Model split | % of vaults and % of value per model |
| Volume on Blast | SUI traded by agents: 24 h, 7 d, all-time |
| Trades | Count: 24 h, 7 d, all-time |
| Launches traded | Distinct launches agents have touched |
| Aggregate P&L | Net realized + unrealized across all vaults (shown even when negative) |
| % vaults in profit | Platform-wide and per model |
| Fees generated for Blast | Blast's share of trade fees from agent volume |
| Avg decision latency | Per model |
| Hold ratio | Per model |
| Risk-check outcomes | % of proposed actions executed / clamped / rejected, top rejection reasons |
| Uptime | % of scheduled ticks that ran |

---

## 10. Security checklist

- [ ] The operator key is in a KMS. One operator key per model is fine; it only ever holds TradeCaps.
- [ ] TradeCap functions can't move funds out of the vault (unit tests prove it).
- [ ] The owner can always withdraw, even when paused, revoked or the backend is down.
- [ ] Every trade is simulated before signing; there's a hard cap on gas per tx.
- [ ] Per-provider rate limits and a daily LLM budget, with alerts.
- [ ] A global kill switch: stop all ticks (backend) and a pause-all runbook.
- [ ] Untrusted creator text is isolated in prompts (6.2).
- [ ] An external audit of `blast_agent_vault` before real users.
- [ ] Bug bounty at launch.

---

## 11. Compliance and copy (needs legal sign-off before public launch)

- **Is it regulated?** An AI trading a user's funds on their behalf may be regulated even with non-custodial vaults: portfolio management or investment advice under EU MiCA, and securities rules elsewhere. Get legal advice for Portugal and the main user markets. Geo-block where required.
- **Wording:**
  - Never "earn", "profit", "returns" or "passive income" as promises.
  - Always show "You can lose all of the funds in your vault."
  - Model performance is past performance only.
- **No endorsements.** Agent buys aren't Blast endorsing a coin. Say so on the activity feed.
- **Separate brand option.** Consider a name distinct from Blast so agent trades aren't read as platform picks.

---

## 12. Open decisions (for Mário and Jose)

- [x] User fee model: **flat daily fee from the vault, first 7 days free** (section 1b). Still open: the exact SUI amount, set once real AI cost per vault per day is measured in the arena phase.
- [ ] Minimum and maximum deposit per vault.
- [ ] Final risk preset numbers.
- [ ] Whether to keep opening rounds and presales out of v1, or ask for a Blast change that lets a caller name the recipient (5.4).
- [ ] Who holds the vault's UpgradeCap (multisig members) and the timelock length.
- [ ] Brand: inside Blast, or separate.
- [ ] Whether to launch first with team-funded vaults only (an "arena" with no user deposits) while legal review runs. **Recommended.**

---

## 13. Build order for Claude Code

Each step ends with tests passing and a short demo note. Never sign mainnet transactions without approval.

1. **Monorepo setup.** pnpm workspaces: `apps/web`, `apps/api`, `packages/agent-core` (from `blast-arena-agent`), `packages/shared` (types and zod schemas), `move/blast_agent_vault`. Add lint, typecheck and CI.
2. **Move package.** Implement section 5 with full unit tests. Dev-inspect `buy`/`sell` against a real mainnet launch using the Blast SDK's deployment IDs. Don't publish.
3. **TypeScript bindings** for the vault: PTB builders for create, deposit, withdraw, set limits, pause, revoke, buy and sell.
4. **Indexer and DB.** Postgres schema (section 8), a Blast launch indexer and a vault event indexer.
5. **Agent workers.** Port agent-core to read vault state and execute through vault calls. Queue, ticks, KMS signer (local file signer for dev only), and dry-run mode as the default.
6. **API** (section 7) with wallet-signature auth.
7. **Web app:**
   - landing page
   - connect wallet
   - model picker
   - risk presets
   - create vault and deposit
   - dashboard
   - activity feed
   - controls
8. **Stats engine.** Snapshots every 5 min, TWR, drawdown, the per-user stats (9.2), the model-vs-model view (9.3) and platform stats (9.4).
9. **Leaderboard and platform stats pages.**
10. **Hardening:**
    - the security checklist
    - load test with 500 simulated vaults in dry-run
    - an alerts runbook
11. **Arena launch (team-funded vaults only).** Publish the vault package after the audit, then run team vaults publicly for 2+ weeks.
12. **User deposits:** only after legal sign-off.

### Acceptance criteria (v1)

- A new user can connect, pick a model, set limits, create a vault and see their first agent decision within 2 minutes.
- An agent cannot exceed any on-chain limit (tested), and cannot move funds out of the vault (tested).
- The user can withdraw everything while the backend is offline (tested by stopping the API and workers).
- Every executed trade has a decision, a reason, a verdict and a digest visible in the feed.
- The leaderboard uses TWR, eligibility rules and median-per-model, and shows drawdowns.
- Dry-run mode runs the full loop with no signatures.
