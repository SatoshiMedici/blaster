/**
 * Trading venues. The vault owner chooses which ones the agent may buy on; the choice is stored
 * on-chain as a bitmask (`AgentVault.venues`) and enforced by the contract.
 *
 * Status matters: a venue is only offered to users once its vault adapter is published and its
 * on-chain ABI has been verified against mainnet.
 */
import { z } from "zod";

export const VENUE_IDS = ["blast", "suipump"] as const;
export const VenueId = z.enum(VENUE_IDS);
export type VenueId = z.infer<typeof VenueId>;

export type Venue = {
  id: VenueId;
  label: string;
  site: string;
  /** Bit in `AgentVault.venues`; must match the Move constants. */
  bit: number;
  /**
   * `live`: the vault can trade it. `adapter_pending`: market data is shown, but the vault's
   * trade adapter still needs ABI verification and audit before it is offered.
   */
  status: "live" | "adapter_pending";
  /** Fee per side, as a fraction, for the risk check and the UI. Read live values where possible. */
  tradeFee: number;
  notes: string;
};

export const VENUES: Record<VenueId, Venue> = {
  blast: {
    id: "blast",
    label: "Blast",
    site: "https://blast.fun",
    bit: 1,
    status: "live",
    tradeFee: 0.015,
    notes: "Blast launchpad (blast_fun). Fees are configurable per launch; the risk check reads them from each launch.",
  },
  suipump: {
    id: "suipump",
    label: "SuiPump",
    site: "https://suipump.org",
    bit: 2,
    status: "adapter_pending",
    tradeFee: 0.01,
    notes:
      "suipump.org bonding curves (bonding_curve::Curve<T>). Several package lineages (V16, V17, V18) with different types; no published source or audit found. The adapter needs mainnet ABI verification.",
  },
};

export const ALL_VENUES_MASK = Object.values(VENUES).reduce((m, v) => m | v.bit, 0);

/** Venue IDs → on-chain bitmask. */
export function venuesToMask(ids: readonly VenueId[]): number {
  const mask = ids.reduce((m, id) => m | VENUES[id].bit, 0);
  if (mask === 0) throw new Error("choose at least one venue");
  return mask;
}

/** On-chain bitmask → venue IDs. */
export function maskToVenues(mask: number): VenueId[] {
  return VENUE_IDS.filter((id) => (mask & VENUES[id].bit) !== 0);
}

/** Venues users can pick today. */
export const liveVenues = (): VenueId[] => VENUE_IDS.filter((id) => VENUES[id].status === "live");
