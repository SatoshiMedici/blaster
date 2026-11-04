import type { OnChainLimits } from "@blast-agents/shared";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { AgentVaultBcs, BalanceBcs, TypeNameBcs } from "./bcs.ts";

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

/** Reads a vault, its token balances and position costs from chain. */
export async function readVault(client: ClientWithCoreApi, vaultId: string): Promise<VaultState> {
  const { object } = await client.core.getObject({ objectId: vaultId, include: { content: true } });
  if (!object.type.endsWith("::vault::AgentVault")) throw new Error(`${vaultId} is not an AgentVault (${object.type})`);
  const v = decodeVault(object.content);
  const [tokens, positionCostMist] = await Promise.all([
    v.tokens.size === "0" ? new Map<string, bigint>() : readTypeNameMap(client, v.tokens.id),
    v.position_cost.size === "0" ? new Map<string, bigint>() : readTypeNameMap(client, v.position_cost.id),
  ]);
  const owner = object.owner;
  return {
    objectId: v.id,
    initialSharedVersion: owner.$kind === "Shared" ? String(owner.Shared.initialSharedVersion) : null,
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

const dayOf = (nowMs: number) => BigInt(Math.floor(nowMs / 86_400_000));

/** Whether `charge_fee` would accept a charge today (ignoring pause, revoke and balance). */
export function isFeeDue(state: Pick<VaultState, "lastFeeDay">, nowMs = Date.now()) {
  return dayOf(nowMs) > state.lastFeeDay;
}

/** Today's spend as the contract will see it: zero once the day has rolled. */
export function effectiveSpentToday(state: Pick<VaultState, "dayIndex" | "spentTodayMist">, nowMs = Date.now()) {
  return dayOf(nowMs) === state.dayIndex ? state.spentTodayMist : 0n;
}
