import { MAINNET_LAUNCHPAD_DEPLOYMENT } from "@interest-protocol/blast-deployments-sdk";
import { LaunchpadClient } from "@interest-protocol/blast-launchpad-sdk/client";
import { decodeLaunchpadEvent } from "@interest-protocol/blast-launchpad-sdk/events";
import type { LaunchState } from "@interest-protocol/blast-launchpad-sdk/state";
import { LaunchpadTransactions } from "@interest-protocol/blast-launchpad-sdk/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { SUI_GRPC_URL, SUI_TYPE } from "./config.ts";

export const MAINNET_CHAIN_ID = "4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S";
const deployment = MAINNET_LAUNCHPAD_DEPLOYMENT;
const pkg = deployment.originalPackageId;

export const client = new SuiGrpcClient({ baseUrl: SUI_GRPC_URL, network: "mainnet" });
export const launchpad = new LaunchpadClient(client, deployment);
/** Pays SUI-quoted buys from the gas coin; other quotes come from the wallet's coins. */
export const launchpadTx = new LaunchpadTransactions(deployment, { useGasCoin: true });

export async function assertMainnet(): Promise<void> {
  const { chainIdentifier } = await client.core.getChainIdentifier();
  if (chainIdentifier !== MAINNET_CHAIN_ID) throw new Error("RPC is not Sui mainnet");
}

/** Newest launch IDs, read from `LaunchShared` events (launches anyone can trade). */
export async function recentLaunchIds(limit: number): Promise<string[]> {
  const eventType = `${pkg}::blast_events::Event<${pkg}::events::LaunchShared>`;
  const ids: string[] = [];
  let before: string | null = null;
  while (ids.length < limit) {
    const page = await client.core.listEvents({
      filter: { eventType },
      order: "descending",
      limit: 50,
      ...(before ? { before } : {}),
    });
    for (const event of page.events) {
      const decoded = decodeLaunchpadEvent(event, { originalPackageId: pkg });
      const id = (decoded.payload as { launch_id?: string }).launch_id;
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (!page.hasNextPage || !page.endCursor) break;
    before = page.endCursor;
  }
  return ids.slice(0, limit);
}

export async function getLaunches(ids: string[]): Promise<LaunchState[]> {
  const results = await Promise.allSettled(ids.map((id) => launchpad.getLaunch(id)));
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export async function balanceOf(owner: string, coinType = SUI_TYPE): Promise<bigint> {
  const { balance } = await client.core.getBalance({ owner, coinType: normalizeStructTag(coinType) });
  return BigInt(balance.balance);
}

export type ExecResult = { ok: boolean; digest?: string; error?: string; simulatedOnly: boolean };

/**
 * Builds, then simulates against live mainnet state. Only in live mode, and only
 * when the simulation succeeds, does it sign and submit.
 */
export async function simulateAndMaybeExecute(
  tx: Transaction,
  signer: Ed25519Keypair | undefined,
  sender: string,
  live: boolean,
): Promise<ExecResult> {
  tx.setSenderIfNotSet(sender);
  let bytes: Uint8Array;
  try {
    bytes = await tx.build({ client });
  } catch (error) {
    return { ok: false, error: `build: ${(error as Error).message}`, simulatedOnly: true };
  }
  const simulation = await client.core.simulateTransaction({
    transaction: bytes,
    checksEnabled: true,
    include: { effects: true },
  });
  if (simulation.$kind !== "Transaction") {
    return {
      ok: false,
      error: `simulation: ${simulation.FailedTransaction.status.error?.message ?? "failed"}`,
      simulatedOnly: true,
    };
  }
  if (!live || !signer) return { ok: true, simulatedOnly: true };

  const { signature } = await signer.signTransaction(bytes);
  const result = await client.core.executeTransaction({
    transaction: bytes,
    signatures: [signature],
    include: { effects: true },
  });
  const executed = result.Transaction ?? result.FailedTransaction;
  if (!executed.status.success) {
    return { ok: false, digest: executed.digest, error: executed.status.error?.message, simulatedOnly: false };
  }
  await client.core.waitForTransaction({ digest: executed.digest });
  return { ok: true, digest: executed.digest, simulatedOnly: false };
}
