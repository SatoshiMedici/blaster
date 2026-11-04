import type { OnChainLimits } from "@blast-agents/shared";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { AgentVaultBcs, BalanceBcs, TypeNameBcs } from "./bcs.ts";
import { type VaultPackage, vaultType } from "./config.ts";

export type VaultState = {
  objectId: string;
  initialSharedVersion: string | null;
  owner: string;
  tradeCapId: string | null;
  paused: boolean;
  limits: OnChainLimits;
  suiMist: bigint;
  /** Normalized coin type -> balance. Only non-zero balances are stored. */
  tokens: Map<string, bigint>;
  /** Normalized coin type -> net SUI cost still attributed to the position. */
  positionCostMist: Map<string, bigint>;
  dayIndex: bigint;
  spentTodayMist: bigint;
  openPositions: number;
  /** Most the operator may charge per calendar day (SPEC 1b). */
  dailyFeeCapMist: bigint;
  treasury: string;
  /** Last day paid for or covered by the free period; a fee is due on any later day. */
  lastFeeDay: bigint;
};

/** TypeName strings have no `0x` prefix; normalize to the usual `0x…::m::T` form. */
export const typeNameToCoinType = (name: string) => normalizeStructTag(name.startsWith("0x") ? name : `0x${name}`);

/** Decodes the BCS content of an `AgentVault` object. Pure: no network. */
export function decodeVault(content: Uint8Array) {
  return AgentVaultBcs.parse(content);
}

async function readTypeNameMap(client: ClientWithCoreApi, parentId: string): Promise<Map<string, bigint>> {
  const out = new Map<string, bigint>();
  let cursor: string | null = null;
  do {
    const page = await client.core.listDynamicFields({ parentId, cursor, limit: 50 });
    const values = await Promise.all(
      page.dynamicFields.map((f) => client.core.getDynamicField({ parentId, name: f.name })),
    );
    for (const { dynamicField } of values) {
      const { name } = TypeNameBcs.parse(dynamicField.name.bcs);
      out.set(typeNameToCoinType(name), BigInt(BalanceBcs.parse(dynamicField.value.bcs)));
    }
    cursor = page.hasNextPage ? page.cursor : null;
  } while (cursor);
  return out;
}

type VaultObject = {
  objectId: string;
  type: string;
  owner: { $kind: string; Shared?: { initialSharedVersion: string | number } };
  content: Uint8Array;
};

/**
 * Only our package's `AgentVault` is accepted: a look-alike struct from another package would
 * otherwise decode fine and feed attacker-chosen state to the API or the worker.
 */
function assertVaultType(object: VaultObject, pkg: VaultPackage | undefined) {
  const ok = pkg
    ? normalizeStructTag(object.type) === normalizeStructTag(vaultType(pkg))
    : object.type.endsWith("::vault::AgentVault");
  if (!ok) throw new Error(`${object.objectId} is not a blast_agent_vault AgentVault (${object.type})`);
}

async function toVaultState(client: ClientWithCoreApi, object: VaultObject, pkg?: VaultPackage): Promise<VaultState> {
  assertVaultType(object, pkg);
  const v = decodeVault(object.content);
  // Dynamic fields are only read when the vault actually holds something.
  const [tokens, positionCostMist] = await Promise.all([
    v.tokens.size === "0" ? new Map<string, bigint>() : readTypeNameMap(client, v.tokens.id),
    v.position_cost.size === "0" ? new Map<string, bigint>() : readTypeNameMap(client, v.position_cost.id),
  ]);
  return {
    objectId: v.id,
    initialSharedVersion:
      object.owner.$kind === "Shared" && object.owner.Shared ? String(object.owner.Shared.initialSharedVersion) : null,
    owner: v.owner,
    tradeCapId: v.trade_cap_id ?? null,
    paused: v.paused,
    limits: {
      maxTrade: v.limits.max_trade,
      maxPerLaunch: v.limits.max_per_launch,
      maxDailySpend: v.limits.max_daily_spend,
      maxOpenPositions: Number(v.limits.max_open_positions),
      minOutRequired: true,
    },
    suiMist: BigInt(v.sui),
    tokens,
    positionCostMist,
    dayIndex: BigInt(v.day_index),
    spentTodayMist: BigInt(v.spent_today),
    openPositions: Number(v.open_positions),
    dailyFeeCapMist: BigInt(v.daily_fee_cap),
    treasury: v.treasury,
    lastFeeDay: BigInt(v.last_fee_day),
  };
}

/**
 * Reads a vault, its token balances and position costs from chain. Pass `pkg` wherever the ID
 * comes from a user (e.g. `POST /vaults/:id/confirm`) so only our package's vaults are accepted.
 */
export async function readVault(client: ClientWithCoreApi, vaultId: string, pkg?: VaultPackage): Promise<VaultState> {
  const { object } = await client.core.getObject({ objectId: vaultId, include: { content: true } });
  return toVaultState(client, object as unknown as VaultObject, pkg);
}

/**
 * Reads many vaults with batched multi-gets (`perRequest` objects per call) instead of one call
 * per vault: RPC is the fixed cost that grows with vault count (docs/ECONOMICS.md).
 * Missing or non-vault objects are returned as errors, not thrown.
 */
export async function readVaults(
  client: ClientWithCoreApi,
  vaultIds: string[],
  opts: { perRequest?: number; pkg?: VaultPackage } = {},
): Promise<Array<VaultState | Error>> {
  const perRequest = opts.perRequest ?? 50;
  const out: Array<VaultState | Error> = [];
  for (let i = 0; i < vaultIds.length; i += perRequest) {
    const { objects } = await client.core.getObjects({
      objectIds: vaultIds.slice(i, i + perRequest),
      include: { content: true },
    });
    const states = await Promise.all(
      objects.map((o) =>
        o instanceof Error ? o : toVaultState(client, o as unknown as VaultObject, opts.pkg).catch((e: Error) => e),
      ),
    );
    out.push(...states);
  }
  return out;
}

const dayOf = (nowMs: number) => BigInt(Math.floor(nowMs / 86_400_000));

/** Whether `charge_fee` would accept a charge today (ignoring pause, revoke and balance). */
export function isFeeDue(state: Pick<VaultState, "lastFeeDay">, nowMs = Date.now()) {
  return dayOf(nowMs) > state.lastFeeDay;
}

/** Today's spend as the contract will see it: zero once the day has rolled. */
export function effectiveSpentToday(state: Pick<VaultState, "dayIndex" | "spentTodayMist">, nowMs = Date.now()) {
  return dayOf(nowMs) === state.dayIndex ? state.spentTodayMist : 0n;
}
