# Vendored Blast Move source

Read-only copy of the Blast launchpad and its dependencies at the **canonical mainnet source** commit:

| | |
| --- | --- |
| Repository | [interest-protocol/blast-v2-contracts](https://github.com/interest-protocol/blast-v2-contracts) |
| Commit | `52effbcee5f12b727484ba0bb14f96aa5e2b4786` (`CANONICAL_MAINNET_SOURCE` in `@interest-protocol/blast-deployments-sdk` 0.1.4) |
| Deployment record | `deployments/sui/mainnet/2026-10-28-canonical-mvr-launch-stack.json` |
| License | BUSL-1.1 (`LICENSE-BUSL`) |

| Directory | Package | Mainnet `published-at` |
| --- | --- | --- |
| `admin/` | `blast_admin` | `0x4a27d816998b2ff015cf897a249c069c34859a09e789e56ad3a38992cf00d7ac` |
| `partners/` | `blast_partners` | `0x163a96aa9b88afe77e51febc195a9e0fa8534a6122bc09c6bd46d176c91a99f9` |
| `launchpad/` | `blast_fun` | `0x079a1b44c551613cbc63cc0406f8ff8d717407378dd6f17d43d9e1b3fd63a573` |
| `timelock_interface/` | `blast_fun_timelock` (stub) | `0x1749b76a3ae065dedfe847578b07826fa83d1e18ff485d9e4f9647f3698e104d` |

## Why vendored

At that commit, `blast_admin` and `blast_partners` depend on `blast_fun_timelock` from the private repository `interest-protocol/blast-util-contracts`. CI and contributors can't fetch it, so the copy here swaps it for `timelock_interface/`. That's a signature-only stub whose bodies `abort`, following Blast's own `interfaces/` convention. It is never published or executed. On-chain, linkage resolves to the real timelock package.

## What changed from upstream

One line in `admin/Move.toml` and in `partners/Move.toml`: the `blast_fun_timelock` git dependency now points to `../timelock_interface`. Sources and the upstream `Published.toml` files are byte-for-byte upstream. The `Published.toml` files record the mainnet addresses above, so a `--build-env mainnet` build of `blast_agent_vault` links against the deployed bytecode. `timelock_interface/Published.toml` does the same for the timelock. Upstream tests, scripts and PTB tests were removed.

## Re-vendoring

When Blast publishes a new canonical version:

```bash
git -C <blast-v2-contracts> archive <commit> sui/admin sui/partners sui/launchpad | tar -x -C move/vendor/blast --strip-components=1
```

Then repeat the timelock edit in `admin/Move.toml` and `partners/Move.toml`, update this file, and check the `launch::buy` and `launch::sell` signatures. Finally, run `pnpm move:test` and a mainnet dev-inspect.
