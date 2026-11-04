import type { LaunchState } from "@interest-protocol/blast-launchpad-sdk/state";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { type ExecResult, launchpad, launchpadTx, simulateAndMaybeExecute } from "./chain.ts";
import type { Order } from "./risk.ts";
import type { Market } from "./snapshot.ts";

const ref = (l: LaunchState) => ({
  objectId: l.objectId,
  initialSharedVersion: l.initialSharedVersion,
  mutable: true as const,
});
const types = (l: LaunchState) => ({ memeType: l.memeType, quoteType: l.quoteType });

export async function executeOrder(
  order: Order,
  market: Market,
  wallet: { address: string; signer?: Ed25519Keypair },
  live: boolean,
): Promise<ExecResult> {
  const launch = market.states.get(order.launchId);
  if (!launch) return { ok: false, error: "launch vanished", simulatedOnly: true };
  const tx =
    order.kind === "buy"
      ? launchpadTx.buy({
          ...types(launch),
          launch: ref(launch),
          quoteAmount: order.quoteMist,
          minMemeOut: order.minMemeOut,
          recipient: wallet.address,
        })
      : order.kind === "join"
        ? launchpadTx.joinOpeningRound({ ...types(launch), launch: ref(launch), quoteAmount: order.quoteMist })
        : launchpadTx.sell({
            ...types(launch),
            launch: ref(launch),
            memeAmount: order.memeAmount,
            minQuoteOut: order.minQuoteOut,
            recipient: wallet.address,
          });
  return simulateAndMaybeExecute(tx, wallet.signer, wallet.address, live);
}

/**
 * Opening rounds need two permissionless follow-ups: settle once the round
 * ends, then deliver each bidder's tokens. The agent does both for its own bids.
 */
export async function collectOpeningRounds(
  bidLaunchIds: Set<string>,
  wallet: { address: string; signer?: Ed25519Keypair },
  live: boolean,
  now = Date.now(),
): Promise<string[]> {
  const log: string[] = [];
  for (const id of bidLaunchIds) {
    const launch = await launchpad.getLaunch(id).catch(() => undefined);
    if (!launch) continue;
    const bid = await launchpad.getOpeningRoundBid(id, wallet.address).catch(() => 0n);
    if (bid === 0n) {
      bidLaunchIds.delete(id);
      continue;
    }
    const roundEnd = launch.publicStartMs === null ? null : Number(launch.publicStartMs + launch.openingRoundMs);
    if (launch.lifecycle === "OpeningRound") {
      if (roundEnd === null || now < roundEnd) continue;
      const r = await simulateAndMaybeExecute(
        launchpadTx.settleOpeningRound({ ...types(launch), launch: ref(launch) }),
        wallet.signer,
        wallet.address,
        live,
      );
      log.push(`settle ${id}: ${r.ok ? (r.digest ?? "simulated") : r.error}`);
      if (!r.ok || r.simulatedOnly) continue;
    }
    const r = await simulateAndMaybeExecute(
      launchpadTx.deliverOpeningRound({ ...types(launch), launch: ref(launch), bidders: [wallet.address] }),
      wallet.signer,
      wallet.address,
      live,
    );
    log.push(`deliver ${id}: ${r.ok ? (r.digest ?? "simulated") : r.error}`);
    if (r.ok && !r.simulatedOnly) bidLaunchIds.delete(id);
  }
  return log;
}
