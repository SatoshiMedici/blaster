import { type FeeTerms, formatSui, type OnChainLimits } from "@blast-agents/shared";

const sui = (mist: string | bigint) => `${formatSui(BigInt(mist))} SUI`;

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** The fee line for the Start screen: "up to X SUI per day while running", plus the free period. */
export function describeFee(fees: FeeTerms): string {
  const free = fees.freeDays > 0 ? `, free for the first ${fees.freeDays} day${fees.freeDays === 1 ? "" : "s"}` : "";
  return `Daily fee: up to ${sui(fees.dailyFeeCapMist)} per day while the agent is running${free}. It is paid only to ${short(fees.treasury)}. A paused or closed vault pays nothing.`;
}

/**
 * Plain-words summary of the one-signature Start PTB, shown before the user signs (SPEC 1b).
 * It must describe exactly what `VaultTransactions.create` builds.
 */
export function describeCreate(args: {
  limits: OnChainLimits;
  fees: FeeTerms;
  depositMist: bigint;
  operator: string;
}): string[] {
  const { limits } = args;
  return [
    `Create your own agent vault and deposit ${sui(args.depositMist)} into it.`,
    "You receive the owner key (OwnerCap): only it can withdraw, change limits, pause or revoke.",
    `The agent's operator (${short(args.operator)}) receives a trade-only key (TradeCap). It can buy and sell Blast launches with the vault's funds. It cannot withdraw.`,
    `On-chain limits: at most ${sui(limits.maxTrade)} per trade, ${sui(limits.maxPerLaunch)} per launch, ${sui(limits.maxDailySpend)} per day, ${limits.maxOpenPositions} open positions. Every trade needs slippage protection.`,
    describeFee(args.fees),
    "You can withdraw at any time, even while the agent is paused or our service is down.",
    "You can lose all of the funds in your vault.",
  ];
}

export function describeSetLimits(limits: OnChainLimits): string[] {
  return [
    `Change the agent's on-chain limits to: ${sui(limits.maxTrade)} per trade, ${sui(limits.maxPerLaunch)} per launch, ${sui(limits.maxDailySpend)} per day, ${limits.maxOpenPositions} open positions.`,
  ];
}

export function describeSetFeeTerms(fees: Omit<FeeTerms, "freeDays">): string[] {
  return [
    `Approve new fee terms: up to ${sui(fees.dailyFeeCapMist)} per day while the agent is running, paid only to ${short(fees.treasury)}.`,
  ];
}

export function describeEmptyVault(tokenCount: number): string[] {
  return [
    "Revoke the agent's trade key. It stops working immediately.",
    tokenCount > 0
      ? `Withdraw all SUI and all ${tokenCount} token${tokenCount === 1 ? "" : "s"} to your wallet, as they are.`
      : "Withdraw all SUI to your wallet.",
  ];
}
