import { formatSui, type OnChainLimits } from "@blast-agents/shared";

const sui = (mist: string | bigint) => `${formatSui(BigInt(mist))} SUI`;

/**
 * Plain-words summary of the onboarding PTB, shown before the user signs (SPEC 3.1 step 6).
 * It must describe exactly what `VaultTransactions.create` builds.
 */
export function describeCreate(args: { limits: OnChainLimits; depositMist: bigint; operator: string }): string[] {
  const { limits } = args;
  return [
    `Create your own agent vault and deposit ${sui(args.depositMist)} into it.`,
    "You receive the owner key (OwnerCap): only it can withdraw, change limits, pause or revoke.",
    `The agent's operator (${args.operator.slice(0, 6)}…${args.operator.slice(-4)}) receives a trade-only key (TradeCap). It can buy and sell Blast launches with the vault's funds. It cannot withdraw.`,
    `On-chain limits: at most ${sui(limits.maxTrade)} per trade, ${sui(limits.maxPerLaunch)} per launch, ${sui(limits.maxDailySpend)} per day, ${limits.maxOpenPositions} open positions. Every trade needs slippage protection.`,
    "You can withdraw at any time, even while the agent is paused or our service is down.",
    "You can lose all of the funds in your vault.",
  ];
}

export function describeSetLimits(limits: OnChainLimits): string[] {
  return [
    `Change the agent's on-chain limits to: ${sui(limits.maxTrade)} per trade, ${sui(limits.maxPerLaunch)} per launch, ${sui(limits.maxDailySpend)} per day, ${limits.maxOpenPositions} open positions.`,
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
