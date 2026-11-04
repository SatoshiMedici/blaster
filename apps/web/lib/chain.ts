/**
 * Real data, read directly from Sui mainnet in the visitor's browser. No mock data anywhere.
 *
 * - Launches: Blast's `LaunchShared` events and `Launch` objects (via the Blast SDK).
 * - Wallet: the connected address's SUI balance.
 * - Vaults: `OwnerCap`s the address holds, then each vault's on-chain state (via vault-sdk).
 */

import { ownerCapType, readVaults, type VaultState } from "@blast-agents/vault-sdk";
import { MAINNET_LAUNCHPAD_DEPLOYMENT } from "@interest-protocol/blast-deployments-sdk";
import { decodeLaunchpadEvent } from "@interest-protocol/blast-launchpad-sdk/events";
// `state` and `events` only: `market-data` / `client` load a WASM module that breaks prerendering.
import { getLaunch, type LaunchState } from "@interest-protocol/blast-launchpad-sdk/state";
import { bcs } from "@mysten/sui/bcs";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { normalizeStructTag } from "@mysten/sui/utils";
import { VAULT_PACKAGE } from "./config";

const GRPC_URL = process.env.NEXT_PUBLIC_SUI_GRPC_URL ?? "https://fullnode.mainnet.sui.io:443";
export const sui = new SuiGrpcClient({ network: "mainnet", baseUrl: GRPC_URL });

const deployment = MAINNET_LAUNCHPAD_DEPLOYMENT;
const SUI_TYPE = normalizeStructTag("0x2::sui::SUI");

export type LaunchRow = {
  id: string;
  symbol: string;
  name: string;
  lifecycle: LaunchState["lifecycle"];
  progressPct: number;
  realReserveSui: number;
  graduationSui: number;
  sellBurnPct: number;
  publicSinceMs: number | null;
};

const metaCache = new Map<string, { symbol: string; name: string }>();
async function coinMeta(coinType: string) {
  const hit = metaCache.get(coinType);
  if (hit) return hit;
  const { coinMetadata } = await sui.core.getCoinMetadata({ coinType });
  // Creator-written text: truncated and rendered as plain text only.
  const v = { symbol: (coinMetadata?.symbol ?? "?").slice(0, 16), name: (coinMetadata?.name ?? "").slice(0, 40) };
  metaCache.set(coinType, v);
  return v;
}

/** Share of the graduation target already in the curve, as the Blast SDK computes it (capped at 100%). */
function progressPct(l: LaunchState): number {
  if (l.lifecycle === "MigrationReady" || l.lifecycle === "Migrated") return 100;
  if (l.graduationTarget <= 0n) return 0;
  return Math.min(100, Number((l.realQuoteReserve * 10_000n) / l.graduationTarget) / 100);
}

/** The newest SUI-quoted Blast launches, newest first. */
export async function recentLaunches(limit = 8): Promise<LaunchRow[]> {
  const pkg = deployment.originalPackageId;
  const page = await sui.core.listEvents({
    filter: { eventType: `${pkg}::blast_events::Event<${pkg}::events::LaunchShared>` },
    order: "descending",
    limit: Math.min(50, limit * 2),
  });
  const ids: string[] = [];
  for (const event of page.events) {
    const decoded = decodeLaunchpadEvent(event, { originalPackageId: pkg });
    const id = (decoded.payload as { launch_id?: string }).launch_id;
    if (id && !ids.includes(id)) ids.push(id);
  }
  const states = (
    await Promise.allSettled(ids.slice(0, limit).map((id) => getLaunch(sui, id, deployment.originalPackageId)))
  )
    .flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
    .filter((l) => normalizeStructTag(l.quoteType) === SUI_TYPE);
  return Promise.all(
    states.map(async (l) => {
      const meta = await coinMeta(l.memeType).catch(() => ({ symbol: "?", name: "" }));
      return {
        id: l.objectId,
        symbol: meta.symbol,
        name: meta.name,
        lifecycle: l.lifecycle,
        progressPct: progressPct(l),
        realReserveSui: Number(l.realQuoteReserve) / 1e9,
        graduationSui: Number(l.graduationTarget) / 1e9,
        sellBurnPct: Number(l.sellBurnBps) / 100,
        publicSinceMs: l.publicStartMs === null ? null : Number(l.publicStartMs),
      };
    }),
  );
}

/** SUI balance of an address, in SUI. */
export async function suiBalance(owner: string): Promise<number> {
  const { balance } = await sui.core.getBalance({ owner, coinType: SUI_TYPE });
  return Number(balance.balance) / 1e9;
}

const OwnerCapBcs = bcs.struct("OwnerCap", { id: bcs.Address, vault_id: bcs.Address });

/** Every vault the address owns (by its OwnerCaps), with on-chain state. Empty until the package is published. */
export async function ownedVaults(owner: string): Promise<VaultState[]> {
  if (!VAULT_PACKAGE) return [];
  const { objects } = await sui.core.listOwnedObjects({
    owner,
    type: ownerCapType(VAULT_PACKAGE),
    include: { content: true },
  });
  const vaultIds = objects.map((o) => OwnerCapBcs.parse(o.content as Uint8Array).vault_id);
  const states = await readVaults(sui, vaultIds, { pkg: VAULT_PACKAGE });
  return states.filter((s): s is VaultState => !(s instanceof Error));
}

/** The OwnerCap object ID for a vault, needed to sign owner actions. */
export async function ownerCapFor(owner: string, vaultId: string): Promise<string | null> {
  if (!VAULT_PACKAGE) return null;
  const { objects } = await sui.core.listOwnedObjects({
    owner,
    type: ownerCapType(VAULT_PACKAGE),
    include: { content: true },
  });
  const hit = objects.find((o) => OwnerCapBcs.parse(o.content as Uint8Array).vault_id === vaultId);
  return hit?.objectId ?? null;
}

type ExecResult = {
  Transaction?: { digest: string; status: { success: boolean; error?: { message?: string } | null } };
  FailedTransaction?: { digest: string; status: { success: boolean; error?: { message?: string } | null } };
};

/** The digest of an executed transaction; throws with the chain's reason if it failed on-chain. */
export function executedDigest(result: ExecResult): string {
  const tx = result.Transaction ?? result.FailedTransaction;
  if (!tx) throw new Error("The wallet returned no transaction result.");
  if (!tx.status.success) throw new Error(tx.status.error?.message ?? `Transaction ${tx.digest} failed on-chain.`);
  return tx.digest;
}
