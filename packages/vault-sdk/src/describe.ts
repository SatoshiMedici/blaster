import { type FeeTerms, formatSui, type OnChainLimits } from "@blast-agents/shared";

const sui = (mist: string | bigint) => `${formatSui(BigInt(mist))} SUI`;

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * The plan line for the Choose and Start screens: model, activity, daily price, and the fee as a
 * yearly share of the vault, so small depositors see what it means for them.
 */
export function describePlan(args: {
  modelLabel: string;
  activityLabel: string;
  decisionsPerDay: number;
  priceUsdPerDay: number;
  /** From `feeDrag`: the fee as a yearly share of the vault. */
  annualShare: number;
}): string {
  const share = args.annualShare;
  const pct =
    Number.isFinite(share) && share <= 1 ? `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%` : "more than 100%";
  return `${args.modelLabel}, ${args.activityLabel} (up to ${args.decisionsPerDay} decisions a day): $${args.priceUsdPerDay.toFixed(2)} a day while running, about ${pct} of your vault per year.`;
}

/**
 * The fee line for the Start screen. The cap is a spending limit, not the price: the user is
 * charged their plan's price each day; the cap is the most the contract will ever allow.
 */
export function describeFee(fees: FeeTerms, priceUsdPerDay?: number): string {
  const free = fees.freeDays > 0 ? ` The first ${fees.freeDays} day${fees.freeDays === 1 ? " is" : "s are"} free.` : "";
  const price =
    priceUsdPerDay === undefined
      ? ""
      : `You pay your plan's price, $${priceUsdPerDay.toFixed(2)} a day in SUI, while the agent runs. `;
  return `${price}Spending limit: the contract never lets us take more than ${sui(fees.dailyFeeCapMist)} in a day, and only to ${short(fees.treasury)}.${free} A paused or closed vault pays nothing.`;
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
  /** The plan's daily price (from `quotePlan`), shown next to the spending limit. */
  priceUsdPerDay?: number;
  /** Venue names the agent may buy on, e.g. ["Blast"]. */
  venueLabels?: string[];
}): string[] {
  const { limits } = args;
  return [
    `Create your own agent vault and deposit ${sui(args.depositMist)} into it.`,
    "You receive the owner key (OwnerCap): only it can withdraw, change limits, pause or revoke.",
    `The agent's operator (${short(args.operator)}) receives a trade-only key (TradeCap). It can buy and sell Blast launches with the vault's funds. It cannot withdraw.`,
    `On-chain limits: at most ${sui(limits.maxTrade)} per trade, ${sui(limits.maxPerLaunch)} per launch, ${sui(limits.maxDailySpend)} per day, ${limits.maxOpenPositions} open positions. Every trade needs slippage protection.`,
    ...(args.venueLabels?.length
      ? [
          `The agent may buy only on ${args.venueLabels.join(" and ")}. You can change this later; it can always sell what it holds.`,
        ]
      : []),
    describeFee(args.fees, args.priceUsdPerDay),
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
    `Approve a new daily spending limit of ${sui(fees.dailyFeeCapMist)}, paid only to ${short(fees.treasury)}. You are still charged only your plan's price.`,
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
