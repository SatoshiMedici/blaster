import { bcs } from "@mysten/sui/bcs";

/** BCS layouts mirroring `blast_agent_vault::vault`. Field order must match the Move structs. */
const limitsFields = {
  max_trade: bcs.u64(),
  max_per_launch: bcs.u64(),
  max_daily_spend: bcs.u64(),
  max_open_positions: bcs.u64(),
  min_out_required: bcs.bool(),
};
export const LimitsBcs = bcs.struct("Limits", limitsFields);

const UID = bcs.Address;
const BagBcs = bcs.struct("Bag", { id: UID, size: bcs.u64() });
const TableBcs = bcs.struct("Table", { id: UID, size: bcs.u64() });

const agentVaultFields = {
  id: UID,
  owner: bcs.Address,
  trade_cap_id: bcs.option(bcs.Address),
  paused: bcs.bool(),
  limits: LimitsBcs,
  sui: bcs.u64(), // Balance<SUI>
  tokens: BagBcs,
  day_index: bcs.u64(),
  spent_today: bcs.u64(),
  position_cost: TableBcs,
  open_positions: bcs.u64(),
  daily_fee_cap: bcs.u64(),
  treasury: bcs.Address,
  last_fee_day: bcs.u64(),
};
export const AgentVaultBcs = bcs.struct("AgentVault", agentVaultFields);

/** Field names in declaration order; a test checks them against the Move source. */
export const BCS_FIELD_ORDER = {
  AgentVault: Object.keys(agentVaultFields),
  Limits: Object.keys(limitsFields),
};

/** `std::type_name::TypeName`: an ASCII type string with no `0x` prefix. */
export const TypeNameBcs = bcs.struct("TypeName", { name: bcs.string() });

export const BalanceBcs = bcs.u64();
