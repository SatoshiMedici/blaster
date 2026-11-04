import { readFileSync } from "node:fs";
import { DEFAULT_FREE_DAYS, type FeeTerms, RISK_PRESETS, settingsToLimits, suiToMist } from "@blast-agents/shared";
import { Transaction } from "@mysten/sui/transactions";
import { describe, expect, it } from "vitest";
import {
  AgentVaultBcs,
  BCS_FIELD_ORDER,
  decodeVault,
  describeCreate,
  effectiveSpentToday,
  isFeeDue,
  MAINNET_BLAST_OBJECTS,
  readVaults,
  typeNameToCoinType,
  VaultTransactions,
} from "../src/index.ts";

const PKG = { packageId: `0x${"a".repeat(64)}`, originalPackageId: `0x${"a".repeat(64)}` };
const VAULT = { objectId: `0x${"b".repeat(64)}`, initialSharedVersion: "7" };
const LAUNCH = { objectId: `0x${"c".repeat(64)}`, initialSharedVersion: "9" };
const OWNER_CAP = `0x${"d".repeat(64)}`;
const TRADE_CAP = `0x${"e".repeat(64)}`;
const USER = `0x${"1".repeat(64)}`;
const OPERATOR = `0x${"2".repeat(64)}`;
const MEME = `0x${"3".repeat(64)}::meme::MEME`;
const TREASURY = `0x${"4".repeat(64)}`;
const limits = settingsToLimits(RISK_PRESETS.balanced.settings, suiToMist(100));
const fees: FeeTerms = {
  dailyFeeCapMist: suiToMist("0.2").toString(),
  treasury: TREASURY,
  freeDays: DEFAULT_FREE_DAYS,
};

const vt = new VaultTransactions(PKG);

type Data = ReturnType<Transaction["getData"]>;
const calls = (data: Data) =>
  data.commands.flatMap((c) => (c.MoveCall ? [`${c.MoveCall.module}::${c.MoveCall.function}`] : []));
const kinds = (data: Data) => data.commands.map((c) => c.$kind);
const sharedInputs = (data: Data) =>
  data.inputs.flatMap((i) => (i.Object?.SharedObject ? [i.Object.SharedObject] : []));

describe("VaultTransactions.create", () => {
  it("splits the deposit, creates the vault and sends the OwnerCap to the user", () => {
    const tx = new Transaction();
    vt.create(tx, { limits, fees, depositMist: suiToMist(100), operator: OPERATOR, owner: USER });
    const data = tx.getData();
    expect(kinds(data)).toEqual(["SplitCoins", "MoveCall", "MoveCall", "TransferObjects"]);
    expect(calls(data)).toEqual(["vault::new_limits", "vault::create"]);
    for (const c of data.commands) if (c.MoveCall) expect(c.MoveCall.package).toBe(PKG.packageId);
    // limits, daily_fee_cap, treasury, free_days, coin, operator, clock
    expect(data.commands[2]?.MoveCall?.arguments).toHaveLength(7);
  });

  it("rejects a zero deposit", () => {
    expect(() =>
      vt.create(new Transaction(), { limits, fees, depositMist: 0n, operator: OPERATOR, owner: USER }),
    ).toThrow();
  });
});

describe("agent calls", () => {
  it("buy passes the vault and launch mutably and Blast's singletons immutably", () => {
    const tx = new Transaction();
    vt.buy(tx, { vault: VAULT, tradeCap: TRADE_CAP, launch: LAUNCH, memeType: MEME, amountMist: 5n, minMemeOut: 1n });
    const data = tx.getData();
    expect(calls(data)).toEqual(["vault::buy"]);
    expect(data.commands[0]?.MoveCall?.typeArguments).toEqual([MEME]);
    const shared = sharedInputs(data);
    const byId = (id: string) => shared.find((s) => s.objectId === id);
    expect(byId(VAULT.objectId)?.mutable).toBe(true);
    expect(byId(LAUNCH.objectId)?.mutable).toBe(true);
    expect(byId(MAINNET_BLAST_OBJECTS.packageVersion.objectId)?.mutable).toBe(false);
    expect(byId(MAINNET_BLAST_OBJECTS.runtimeConfig.objectId)?.mutable).toBe(false);
    expect(data.commands[0]?.MoveCall?.arguments).toHaveLength(8); // ... amount, min_out, clock
  });

  it("sell takes no clock", () => {
    const tx = new Transaction();
    vt.sell(tx, { vault: VAULT, tradeCap: TRADE_CAP, launch: LAUNCH, memeType: MEME, memeAmount: 5n, minQuoteOut: 1n });
    expect(tx.getData().commands[0]?.MoveCall?.arguments).toHaveLength(7);
  });

  it("chargeFee passes the vault, the TradeCap, the amount and the clock", () => {
    const tx = new Transaction();
    vt.chargeFee(tx, { vault: VAULT, tradeCap: TRADE_CAP, amountMist: 1n });
    expect(calls(tx.getData())).toEqual(["vault::charge_fee"]);
    expect(tx.getData().commands[0]?.MoveCall?.arguments).toHaveLength(4);
    expect(() => vt.chargeFee(new Transaction(), { vault: VAULT, tradeCap: TRADE_CAP, amountMist: 0n })).toThrow();
  });

  it("chargeFees batches many vaults per PTB", () => {
    const charges = Array.from({ length: 501 }, () => ({ vault: VAULT, tradeCap: TRADE_CAP, amountMist: 1n }));
    const txs = vt.chargeFees(charges, () => new Transaction(), 250);
    expect(txs.map((t) => t.getData().commands.length)).toEqual([250, 250, 1]);
    expect(() => vt.chargeFees(charges, () => new Transaction(), 2_000)).toThrow();
  });

  it("pauseByAgent passes a non-owner reason", () => {
    const tx = new Transaction();
    vt.pauseByAgent(tx, { vault: VAULT, tradeCap: TRADE_CAP, reason: 1 });
    expect(calls(tx.getData())).toEqual(["vault::pause_by_agent"]);
  });

  it("refuses trades without slippage protection", () => {
    const base = { vault: VAULT, tradeCap: TRADE_CAP, launch: LAUNCH, memeType: MEME };
    expect(() => vt.buy(new Transaction(), { ...base, amountMist: 5n, minMemeOut: 0n })).toThrow();
    expect(() => vt.sell(new Transaction(), { ...base, memeAmount: 5n, minQuoteOut: 0n })).toThrow();
  });
});

describe("owner calls", () => {
  it("emptyVault revokes first, then withdraws every token and all SUI", () => {
    const tx = new Transaction();
    vt.emptyVault(tx, { vault: VAULT, ownerCap: OWNER_CAP, tokenTypes: [MEME], recipient: USER });
    expect(calls(tx.getData())).toEqual([
      "vault::revoke_agent",
      "vault::withdraw_all_token",
      "vault::withdraw_all_sui",
    ]);
  });

  it("setFeeTerms is an owner call", () => {
    const tx = new Transaction();
    vt.setFeeTerms(tx, { vault: VAULT, ownerCap: OWNER_CAP, dailyFeeCapMist: 1n, treasury: TREASURY });
    expect(calls(tx.getData())).toEqual(["vault::set_fee_terms"]);
  });

  it("withdrawSui with an amount uses withdraw_sui and transfers to the recipient", () => {
    const tx = new Transaction();
    vt.withdrawSui(tx, { vault: VAULT, ownerCap: OWNER_CAP, amount: 10n, recipient: USER });
    expect(kinds(tx.getData())).toEqual(["MoveCall", "TransferObjects"]);
    expect(calls(tx.getData())).toEqual(["vault::withdraw_sui"]);
  });

  it("refuses SUI through the token functions", () => {
    expect(() =>
      vt.withdrawToken(new Transaction(), {
        vault: VAULT,
        ownerCap: OWNER_CAP,
        coinType: "0x2::sui::SUI",
        amount: "all",
        recipient: USER,
      }),
    ).toThrow();
  });
});

describe("BCS layout", () => {
  /** Field names of a Move struct, in declaration order, read from the source. */
  const moveFields = (struct: string) => {
    const src = readFileSync(new URL("../../../move/blast_agent_vault/sources/vault.move", import.meta.url), "utf8");
    const body = new RegExp(`public struct ${struct} has [^{]+\\{([^}]*)\\}`).exec(src)?.[1];
    if (!body) throw new Error(`struct ${struct} not found`);
    return body
      .split("\n")
      .map((l) => l.replace(/\/\/.*/, "").trim())
      .filter(Boolean)
      .map((l) => l.split(":")[0]?.trim());
  };

  it("AgentVault matches the Move struct field order", () => {
    expect(BCS_FIELD_ORDER.AgentVault).toEqual(moveFields("AgentVault"));
  });

  it("Limits matches the Move struct field order", () => {
    expect(BCS_FIELD_ORDER.Limits).toEqual(moveFields("Limits"));
  });

  it("round-trips a vault", () => {
    const value = {
      id: VAULT.objectId,
      owner: USER,
      trade_cap_id: TRADE_CAP,
      paused: false,
      limits: {
        max_trade: 1n,
        max_per_launch: 2n,
        max_daily_spend: 3n,
        max_open_positions: 4n,
        min_out_required: true,
      },
      sui: 100n,
      tokens: { id: LAUNCH.objectId, size: 1n },
      day_index: 20_000n,
      spent_today: 5n,
      position_cost: { id: OWNER_CAP, size: 1n },
      open_positions: 1n,
      daily_fee_cap: 200_000_000n,
      treasury: TREASURY,
      last_fee_day: 20_006n,
    };
    const decoded = decodeVault(AgentVaultBcs.serialize(value).toBytes());
    expect(decoded.trade_cap_id).toBe(TRADE_CAP);
    expect(decoded.limits.max_open_positions).toBe("4");
    expect(decoded.sui).toBe("100");
    expect(decoded.treasury).toBe(TREASURY);
    expect(decoded.last_fee_day).toBe("20006");
  });
});

describe("readVaults", () => {
  it("batches multi-gets and returns per-vault errors instead of throwing", async () => {
    const content = AgentVaultBcs.serialize({
      id: VAULT.objectId,
      owner: USER,
      trade_cap_id: null,
      paused: true,
      limits: {
        max_trade: 1n,
        max_per_launch: 2n,
        max_daily_spend: 3n,
        max_open_positions: 4n,
        min_out_required: true,
      },
      sui: 7n,
      tokens: { id: LAUNCH.objectId, size: 0n },
      day_index: 1n,
      spent_today: 0n,
      position_cost: { id: OWNER_CAP, size: 0n },
      open_positions: 0n,
      daily_fee_cap: 5n,
      treasury: TREASURY,
      last_fee_day: 3n,
    }).toBytes();
    const calls: number[] = [];
    const client = {
      core: {
        getObjects: async ({ objectIds }: { objectIds: string[] }) => {
          calls.push(objectIds.length);
          return {
            objects: objectIds.map((id) =>
              id === "bad"
                ? new Error("not found")
                : {
                    objectId: id,
                    type: `${PKG.packageId}::vault::AgentVault`,
                    owner: { $kind: "Shared", Shared: { initialSharedVersion: "7" } },
                    content,
                  },
            ),
          };
        },
      },
    };
    const out = await readVaults(client as never, ["a", "b", "bad"], 2);
    expect(calls).toEqual([2, 1]);
    expect(out[0]).toMatchObject({
      suiMist: 7n,
      paused: true,
      tradeCapId: null,
      dailyFeeCapMist: 5n,
      initialSharedVersion: "7",
    });
    expect(out[2]).toBeInstanceOf(Error);
  });
});

describe("helpers", () => {
  it("normalizes TypeName strings", () => {
    expect(typeNameToCoinType(`${"3".repeat(64)}::meme::MEME`)).toBe(MEME);
  });

  it("treats spend from a previous day as zero", () => {
    const day = 20_000n;
    expect(effectiveSpentToday({ dayIndex: day, spentTodayMist: 9n }, Number(day) * 86_400_000 + 5)).toBe(9n);
    expect(effectiveSpentToday({ dayIndex: day, spentTodayMist: 9n }, Number(day + 1n) * 86_400_000)).toBe(0n);
  });

  it("a fee is due only after the last paid or free day", () => {
    const day = 20_006n;
    expect(isFeeDue({ lastFeeDay: day }, Number(day) * 86_400_000 + 86_399_999)).toBe(false);
    expect(isFeeDue({ lastFeeDay: day }, Number(day + 1n) * 86_400_000)).toBe(true);
  });

  it("describeCreate states custody, limits, fee and risk in plain words", () => {
    const lines = describeCreate({ limits, fees, depositMist: suiToMist(100), operator: OPERATOR }).join("\n");
    expect(lines).toContain("up to 0.200 SUI per day while the agent is running, free for the first 3 days");
    expect(lines).toContain("100.000 SUI");
    expect(lines).toContain("It cannot withdraw.");
    expect(lines).toContain("5.000 SUI per trade");
    expect(lines).toContain("You can lose all of the funds in your vault.");
  });
});
