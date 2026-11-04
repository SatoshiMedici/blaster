# Blast Agents

Read SPEC.md first and build in the order of its section 13. Progress is tracked in `docs/PROGRESS.md`.

Rules:
- Never sign a mainnet transaction, publish a Move package, or move funds without explicit approval from the user.
- Dry-run (simulate only) is the default everywhere.
- The agent must never be able to withdraw from a user's vault. Treat any change that weakens this as a blocker.
  `scripts/check_trade_cap_surface.py` enforces it in CI: no public function taking a `TradeCap` may return a `Coin` or `Balance`.
- `packages/agent-core` started as `starter/blast-arena-agent`.
- Blast contract facts come from github.com/interest-protocol/blast-v2-contracts (start with llms.txt) and the SDK at github.com/interest-protocol/blast-v2-sdk. Source beats docs.
- Blast's Move source is vendored at the canonical mainnet commit in `move/vendor/blast` (see its README). Don't edit it except to re-vendor.

Commands:
- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
- `pnpm move:test` (needs `sui` 1.77.2 on PATH)
