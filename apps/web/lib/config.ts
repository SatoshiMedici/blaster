/**
 * Deployment configuration. Everything that makes the product "live" comes from env, so nothing
 * pretends to work before it does. See apps/web/README.md.
 */
import type { VaultPackage } from "@blast-agents/vault-sdk";

const pkg = process.env.NEXT_PUBLIC_VAULT_PACKAGE_ID;
const original = process.env.NEXT_PUBLIC_VAULT_ORIGINAL_PACKAGE_ID ?? pkg;

/** The published `blast_agent_vault` package, or null until it is published. */
export const VAULT_PACKAGE: VaultPackage | null =
  pkg && original ? { packageId: pkg, originalPackageId: original } : null;

/** Operator (receives the TradeCap) and treasury (receives fees). Required to start a vault. */
export const OPERATOR_ADDRESS = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? null;
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? null;

/** The agent service (API, step 6). Activity, triggers and stats come from it. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? null;

/** True only when a user can actually start a real vault. */
export const CAN_START = Boolean(VAULT_PACKAGE && OPERATOR_ADDRESS && TREASURY_ADDRESS);
