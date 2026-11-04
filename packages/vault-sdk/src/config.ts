import { MAINNET_LAUNCHPAD_DEPLOYMENT } from "@interest-protocol/blast-deployments-sdk";

/** A shared object as a PTB input. */
export type SharedObject = { objectId: string; initialSharedVersion: string | number };

/** Where `blast_agent_vault` is published. Not published yet, so there is no default. */
export type VaultPackage = {
  /** Latest package ID: used for Move calls. */
  packageId: string;
  /** First-published package ID: used for type names and event filters. */
  originalPackageId: string;
};

/** The Blast singletons every trade passes to `launch::buy/sell`. */
export type BlastObjects = {
  packageVersion: SharedObject;
  runtimeConfig: SharedObject;
};

/** Blast's canonical mainnet singletons, from `@interest-protocol/blast-deployments-sdk`. */
export const MAINNET_BLAST_OBJECTS: BlastObjects = {
  packageVersion: MAINNET_LAUNCHPAD_DEPLOYMENT.packageVersion,
  runtimeConfig: MAINNET_LAUNCHPAD_DEPLOYMENT.runtimeConfig,
};

export const vaultType = (pkg: VaultPackage) => `${pkg.originalPackageId}::vault::AgentVault`;
export const ownerCapType = (pkg: VaultPackage) => `${pkg.originalPackageId}::vault::OwnerCap`;
export const tradeCapType = (pkg: VaultPackage) => `${pkg.originalPackageId}::vault::TradeCap`;
export const vaultEventType = (pkg: VaultPackage, name: VaultEventName) => `${pkg.originalPackageId}::vault::${name}`;

export const VAULT_EVENT_NAMES = [
  "VaultCreated",
  "Deposited",
  "Withdrawn",
  "LimitsChanged",
  "Paused",
  "Resumed",
  "AgentAuthorized",
  "AgentRevoked",
  "AgentTraded",
] as const;
export type VaultEventName = (typeof VAULT_EVENT_NAMES)[number];
