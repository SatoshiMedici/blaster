import type { FeeTerms, OnChainLimits } from "@blast-agents/shared";
import { SUI_TYPE } from "@blast-agents/shared";
import type { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { type BlastObjects, MAINNET_BLAST_OBJECTS, type SharedObject, type VaultPackage } from "./config.ts";

/** An owned object (cap or coin) by ID, or an argument produced earlier in the same PTB. */
export type ObjectInput = string | TransactionObjectArgument;
export type Amount = bigint | "all";

const isSui = (coinType: string) => normalizeStructTag(coinType) === normalizeStructTag(SUI_TYPE);

/**
 * PTB builders for `blast_agent_vault::vault`. Every method appends commands to the given
 * transaction and returns what the Move call returns. Nothing here signs or submits.
 *
 * Owner methods need the `OwnerCap`, so the user's wallet signs them. Agent methods need the
 * `TradeCap`, so the operator signs them, after simulating.
 */
export class VaultTransactions {
  readonly #pkg: VaultPackage;
  readonly #blast: BlastObjects;

  constructor(pkg: VaultPackage, blast: BlastObjects = MAINNET_BLAST_OBJECTS) {
    this.#pkg = pkg;
    this.#blast = blast;
  }

  #target(fn: string) {
    return `${this.#pkg.packageId}::vault::${fn}` as const;
  }

  #shared(tx: Transaction, obj: SharedObject, mutable: boolean) {
    return tx.sharedObjectRef({ objectId: obj.objectId, initialSharedVersion: obj.initialSharedVersion, mutable });
  }

  #obj(tx: Transaction, input: ObjectInput) {
    return typeof input === "string" ? tx.object(input) : input;
  }

  /** `vault::new_limits`. */
  limits(tx: Transaction, limits: OnChainLimits) {
    return tx.moveCall({
      target: this.#target("new_limits"),
      arguments: [
        tx.pure.u64(limits.maxTrade),
        tx.pure.u64(limits.maxPerLaunch),
        tx.pure.u64(limits.maxDailySpend),
        tx.pure.u64(limits.maxOpenPositions),
        tx.pure.bool(limits.minOutRequired),
      ],
    });
  }

  // === Owner (user signs) ===

  /**
   * The one-signature "Start" PTB (SPEC 1b): creates the vault, deposits from the gas coin, writes
   * the limits and the fee terms, sends the TradeCap to `operator` and the OwnerCap to `owner`.
   */
  create(
    tx: Transaction,
    args: {
      limits: OnChainLimits;
      fees: FeeTerms;
      /** Where the agent may buy: bitmask from `venuesToMask` (1 = Blast, 2 = SuiPump). */
      venuesMask: number;
      depositMist: bigint;
      operator: string;
      owner: string;
    },
  ) {
    if (args.depositMist <= 0n) throw new Error("deposit must be positive");
    const [deposit] = tx.splitCoins(tx.gas, [tx.pure.u64(args.depositMist)]);
    const ownerCap = tx.moveCall({
      target: this.#target("create"),
      arguments: [
        this.limits(tx, args.limits),
        tx.pure.u64(args.fees.dailyFeeCapMist),
        tx.pure.address(args.fees.treasury),
        tx.pure.u64(args.fees.freeDays),
        tx.pure.u8(args.venuesMask),
        deposit as TransactionObjectArgument,
        tx.pure.address(args.operator),
        tx.object.clock(),
      ],
    });
    tx.transferObjects([ownerCap], tx.pure.address(args.owner));
    return ownerCap;
  }

  /** Deposits SUI split from the gas coin. */
  depositSui(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput; amountMist: bigint }) {
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(args.amountMist)]);
    return tx.moveCall({
      target: this.#target("deposit_sui"),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap), coin as TransactionObjectArgument],
    });
  }

  /** Deposits a token coin the user already holds. */
  depositToken(
    tx: Transaction,
    args: { vault: SharedObject; ownerCap: ObjectInput; coinType: string; coin: ObjectInput },
  ) {
    if (isSui(args.coinType)) throw new Error("use depositSui for SUI");
    return tx.moveCall({
      target: this.#target("deposit_token"),
      typeArguments: [args.coinType],
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap), this.#obj(tx, args.coin)],
    });
  }

  /** Withdraws SUI to `recipient` (normally the signer). Works while paused or revoked. */
  withdrawSui(
    tx: Transaction,
    args: { vault: SharedObject; ownerCap: ObjectInput; amount: Amount; recipient: string },
  ) {
    const vault = this.#shared(tx, args.vault, true);
    const cap = this.#obj(tx, args.ownerCap);
    const coin =
      args.amount === "all"
        ? tx.moveCall({ target: this.#target("withdraw_all_sui"), arguments: [vault, cap] })
        : tx.moveCall({ target: this.#target("withdraw_sui"), arguments: [vault, cap, tx.pure.u64(args.amount)] });
    tx.transferObjects([coin], tx.pure.address(args.recipient));
    return coin;
  }

  /** Withdraws a token to `recipient`. Works while paused or revoked. */
  withdrawToken(
    tx: Transaction,
    args: { vault: SharedObject; ownerCap: ObjectInput; coinType: string; amount: Amount; recipient: string },
  ) {
    if (isSui(args.coinType)) throw new Error("use withdrawSui for SUI");
    const vault = this.#shared(tx, args.vault, true);
    const cap = this.#obj(tx, args.ownerCap);
    const coin =
      args.amount === "all"
        ? tx.moveCall({
            target: this.#target("withdraw_all_token"),
            typeArguments: [args.coinType],
            arguments: [vault, cap],
          })
        : tx.moveCall({
            target: this.#target("withdraw_token"),
            typeArguments: [args.coinType],
            arguments: [vault, cap, tx.pure.u64(args.amount)],
          });
    tx.transferObjects([coin], tx.pure.address(args.recipient));
    return coin;
  }

  setLimits(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput; limits: OnChainLimits }) {
    return tx.moveCall({
      target: this.#target("set_limits"),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap), this.limits(tx, args.limits)],
    });
  }

  /** Chooses where the agent may buy (bitmask from `venuesToMask`). Owner only. */
  setVenues(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput; venuesMask: number }) {
    if (args.venuesMask <= 0 || args.venuesMask > 3) throw new Error("invalid venue set");
    return tx.moveCall({
      target: this.#target("set_venues"),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap), tx.pure.u8(args.venuesMask)],
    });
  }

  /** Changes the fee terms. The user re-approves any fee change by signing this (SPEC 1b). */
  setFeeTerms(
    tx: Transaction,
    args: { vault: SharedObject; ownerCap: ObjectInput; dailyFeeCapMist: bigint | string; treasury: string },
  ) {
    return tx.moveCall({
      target: this.#target("set_fee_terms"),
      arguments: [
        this.#shared(tx, args.vault, true),
        this.#obj(tx, args.ownerCap),
        tx.pure.u64(args.dailyFeeCapMist),
        tx.pure.address(args.treasury),
      ],
    });
  }

  pause(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput }) {
    return this.#ownerOnly(tx, "pause", args);
  }

  resume(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput }) {
    return this.#ownerOnly(tx, "resume", args);
  }

  /** Instant kill switch: works with our backend down. */
  revokeAgent(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput }) {
    return this.#ownerOnly(tx, "revoke_agent", args);
  }

  /** Mints a new TradeCap for `operator`; any previous one stops working. */
  authorizeAgent(tx: Transaction, args: { vault: SharedObject; ownerCap: ObjectInput; operator: string }) {
    return tx.moveCall({
      target: this.#target("authorize_agent"),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap), tx.pure.address(args.operator)],
    });
  }

  /**
   * Revokes the agent and withdraws everything, as it is, to `recipient` (SPEC 3.3). It needs
   * no backend: the token types come from reading the vault (see `readVault`).
   */
  emptyVault(
    tx: Transaction,
    args: { vault: SharedObject; ownerCap: ObjectInput; tokenTypes: string[]; recipient: string },
  ) {
    const base = { vault: args.vault, ownerCap: args.ownerCap };
    this.revokeAgent(tx, base);
    for (const coinType of args.tokenTypes) {
      this.withdrawToken(tx, { ...base, coinType, amount: "all", recipient: args.recipient });
    }
    this.withdrawSui(tx, { ...base, amount: "all", recipient: args.recipient });
  }

  #ownerOnly(tx: Transaction, fn: string, args: { vault: SharedObject; ownerCap: ObjectInput }) {
    return tx.moveCall({
      target: this.#target(fn),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.ownerCap)],
    });
  }

  // === Agent (operator signs) ===

  /** `vault::buy<Meme>`: spends `amountMist` from the vault on the launch's curve. */
  buy(
    tx: Transaction,
    args: {
      vault: SharedObject;
      tradeCap: ObjectInput;
      launch: SharedObject;
      memeType: string;
      amountMist: bigint;
      minMemeOut: bigint;
    },
  ) {
    if (args.amountMist <= 0n) throw new Error("amount must be positive");
    if (args.minMemeOut <= 0n) throw new Error("minMemeOut must be positive");
    return tx.moveCall({
      target: this.#target("buy"),
      typeArguments: [args.memeType],
      arguments: [
        this.#shared(tx, args.vault, true),
        this.#obj(tx, args.tradeCap),
        this.#shared(tx, args.launch, true),
        this.#shared(tx, this.#blast.packageVersion, false),
        this.#shared(tx, this.#blast.runtimeConfig, false),
        tx.pure.u64(args.amountMist),
        tx.pure.u64(args.minMemeOut),
        tx.object.clock(),
      ],
    });
  }

  /** `vault::charge_fee`: the once-a-day fee, paid by the contract to the vault's own treasury. */
  chargeFee(tx: Transaction, args: { vault: SharedObject; tradeCap: ObjectInput; amountMist: bigint }) {
    if (args.amountMist <= 0n) throw new Error("fee must be positive");
    return tx.moveCall({
      target: this.#target("charge_fee"),
      arguments: [
        this.#shared(tx, args.vault, true),
        this.#obj(tx, args.tradeCap),
        tx.pure.u64(args.amountMist),
        tx.object.clock(),
      ],
    });
  }

  /**
   * Charges many vaults' daily fees in as few PTBs as possible: one sender holds every TradeCap.
   * Sui allows 1,024 commands per PTB; `perTx` (default 250) leaves room and limits the blast
   * radius of one failing vault (dry-run each batch first; drop failing vaults and rebuild).
   */
  chargeFees(
    charges: Array<{ vault: SharedObject; tradeCap: ObjectInput; amountMist: bigint }>,
    newTx: () => Transaction,
    perTx = 250,
  ) {
    if (perTx < 1 || perTx > 1_000) throw new Error("perTx must be 1..1000");
    const txs: Transaction[] = [];
    for (let i = 0; i < charges.length; i += perTx) {
      const tx = newTx();
      for (const c of charges.slice(i, i + perTx)) this.chargeFee(tx, c);
      txs.push(tx);
    }
    return txs;
  }

  /**
   * `vault::pause_by_agent`: the agent stops itself (can't pay the fee, drawdown stop). Only the
   * owner can resume. `reason`: 1 = fee unpaid, 2 = drawdown stop, 3 = other halt.
   */
  pauseByAgent(tx: Transaction, args: { vault: SharedObject; tradeCap: ObjectInput; reason: 1 | 2 | 3 }) {
    return tx.moveCall({
      target: this.#target("pause_by_agent"),
      arguments: [this.#shared(tx, args.vault, true), this.#obj(tx, args.tradeCap), tx.pure.u8(args.reason)],
    });
  }

  /** `vault::sell<Meme>`: sells `memeAmount` from the vault into the launch's curve. */
  sell(
    tx: Transaction,
    args: {
      vault: SharedObject;
      tradeCap: ObjectInput;
      launch: SharedObject;
      memeType: string;
      memeAmount: bigint;
      minQuoteOut: bigint;
    },
  ) {
    if (args.memeAmount <= 0n) throw new Error("amount must be positive");
    if (args.minQuoteOut <= 0n) throw new Error("minQuoteOut must be positive");
    return tx.moveCall({
      target: this.#target("sell"),
      typeArguments: [args.memeType],
      arguments: [
        this.#shared(tx, args.vault, true),
        this.#obj(tx, args.tradeCap),
        this.#shared(tx, args.launch, true),
        this.#shared(tx, this.#blast.packageVersion, false),
        this.#shared(tx, this.#blast.runtimeConfig, false),
        tx.pure.u64(args.memeAmount),
        tx.pure.u64(args.minQuoteOut),
      ],
    });
  }
}
