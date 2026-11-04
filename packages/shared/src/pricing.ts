/**
 * Pricing policy (SPEC 1b "Pricing and unit economics"). Pure functions; no I/O.
 *
 * Money rules: USD amounts are handled as integer micro-dollars and SUI as MIST, so nothing
 * here depends on floating-point rounding. A fee is always rounded *down* (never overcharge).
 */

export const PRICING = {
  /** Flat fee per day while the agent is running. */
  feeUsdPerDay: 0.99,
  /** Minimum deposit, in USD, converted to SUI at the quote shown on the Choose screen. */
  minDepositUsd: 250,
  /** Free days, once per wallet, only for deposits at or above the minimum. */
  trialDays: 3,
  /** On-chain `daily_fee_cap` = this × today's fee in SUI, so SUI price falls don't block collection. */
  feeCapMultiplier: 2,
} as const;

const MIST_PER_SUI = 1_000_000_000n;

const toMicros = (usd: number): bigint => {
  if (!Number.isFinite(usd) || usd < 0) throw new Error(`invalid USD amount: ${usd}`);
  return BigInt(Math.round(usd * 1e6));
};

/** USD → MIST at `suiUsd` dollars per SUI, rounded down. */
export function usdToMist(usd: number, suiUsd: number): bigint {
  const price = toMicros(suiUsd);
  if (price === 0n) throw new Error("SUI price must be positive");
  return (toMicros(usd) * MIST_PER_SUI) / price;
}

/** MIST → USD at `suiUsd`, for display and accounting. */
export function mistToUsd(mist: bigint, suiUsd: number): number {
  return (Number(mist) / 1e9) * suiUsd;
}

/** One price observation from one source (e.g. Pyth, CoinGecko, Binance). */
export type PriceQuote = { source: string; suiUsd: number; observedAtMs: number };

export type PriceCheck = { maxAgeMs: number; maxDeviationBps: number; minSources: number };

/** Defaults: fresh within 5 minutes, at least 2 sources, within 2% of each other. */
export const DEFAULT_PRICE_CHECK: PriceCheck = { maxAgeMs: 5 * 60_000, maxDeviationBps: 200, minSources: 2 };

/**
 * Median of fresh quotes, refusing to price anything when sources are stale or disagree. A fee is
 * only ever charged from a price that passed this check; otherwise the day's charge is skipped.
 */
export function aggregatePrice(quotes: PriceQuote[], nowMs: number, check = DEFAULT_PRICE_CHECK): number {
  const fresh = quotes
    .filter((q) => nowMs - q.observedAtMs <= check.maxAgeMs && Number.isFinite(q.suiUsd) && q.suiUsd > 0)
    .map((q) => q.suiUsd)
    .sort((a, b) => a - b);
  if (fresh.length < check.minSources)
    throw new Error(`need ${check.minSources} fresh SUI prices, have ${fresh.length}`);
  const lo = fresh[0] as number;
  const hi = fresh[fresh.length - 1] as number;
  if (((hi - lo) / lo) * 10_000 > check.maxDeviationBps) throw new Error(`SUI price sources disagree: ${lo}..${hi}`);
  const mid = Math.floor(fresh.length / 2);
  return fresh.length % 2 ? (fresh[mid] as number) : ((fresh[mid - 1] as number) + (fresh[mid] as number)) / 2;
}

/** The fee terms the Start screen shows and the vault stores. */
export function quoteFeeTerms(suiUsd: number, policy = PRICING) {
  const dailyFeeMist = usdToMist(policy.feeUsdPerDay, suiUsd);
  return { dailyFeeMist, dailyFeeCapMist: dailyFeeMist * BigInt(policy.feeCapMultiplier) };
}

export type FeeDecision =
  /** Charge this much; `capped` when SUI fell so far that the cap, not $0.99, applies. */
  | { kind: "charge"; mist: bigint; capped: boolean }
  /** The vault can't pay: pause the agent and notify "top up or withdraw". Never sell to pay. */
  | { kind: "pause_insufficient_sui"; neededMist: bigint }
  | { kind: "skip"; reason: "not_due" | "paused" | "fee_off" };

/**
 * What the operator does at the start of a vault's day (prepaid, SPEC 1b collection rules).
 * The contract enforces the cap and once-a-day; this decides the amount and the pause.
 */
export function decideDailyFee(args: {
  suiUsd: number;
  dailyFeeCapMist: bigint;
  vaultSuiMist: bigint;
  feeDue: boolean;
  paused: boolean;
  policy?: typeof PRICING;
}): FeeDecision {
  if (args.paused) return { kind: "skip", reason: "paused" };
  if (!args.feeDue) return { kind: "skip", reason: "not_due" };
  if (args.dailyFeeCapMist === 0n) return { kind: "skip", reason: "fee_off" };
  const usdFee = usdToMist((args.policy ?? PRICING).feeUsdPerDay, args.suiUsd);
  const capped = usdFee > args.dailyFeeCapMist;
  const mist = capped ? args.dailyFeeCapMist : usdFee;
  if (mist > args.vaultSuiMist) return { kind: "pause_insufficient_sui", neededMist: mist };
  return { kind: "charge", mist, capped };
}

/**
 * Fee-cap headroom (docs/ECONOMICS.md recommendation 6). With a 2× cap, a 50% SUI fall makes the
 * cap bind (a model estimate puts that at ~20% of vaults within 180 days). Ask the user to
 * re-approve fee terms once today's fee needs more than `alertAt` of the cap, before it binds.
 */
export function feeCapHeadroom(args: {
  suiUsd: number;
  dailyFeeCapMist: bigint;
  alertAt?: number;
  policy?: typeof PRICING;
}) {
  const needMist = usdToMist((args.policy ?? PRICING).feeUsdPerDay, args.suiUsd);
  const usedShare =
    args.dailyFeeCapMist > 0n ? Number(needMist) / Number(args.dailyFeeCapMist) : Number.POSITIVE_INFINITY;
  return { needMist, usedShare, askReapproval: usedShare > (args.alertAt ?? 0.8), capBinds: usedShare > 1 };
}

/**
 * Refuses to charge on a price that jumped more than `maxMoveBps` since the last accepted price
 * (default ±25%). A bad feed then skips one day's fee instead of overcharging every vault.
 */
export function checkDailyPriceMove(suiUsd: number, previousSuiUsd: number | null, maxMoveBps = 2_500): boolean {
  if (previousSuiUsd === null || previousSuiUsd <= 0) return true;
  return (Math.abs(suiUsd - previousSuiUsd) / previousSuiUsd) * 10_000 <= maxMoveBps;
}

/**
 * Treasury currency check (docs/ECONOMICS.md recommendation 8). Revenue arrives in SUI, costs are
 * in USD. This only *proposes* a SUI→USDC conversion; moving treasury funds needs human approval.
 */
export function treasuryCurrencyReport(args: {
  treasurySuiMist: bigint;
  suiUsd: number;
  monthlyUsdCosts: number;
  /** Months of USD costs to keep in SUI before proposing a conversion. */
  keepMonthsInSui?: number;
}) {
  const heldUsd = mistToUsd(args.treasurySuiMist, args.suiUsd);
  const keepUsd = args.monthlyUsdCosts * (args.keepMonthsInSui ?? 1);
  const excessUsd = Math.max(0, heldUsd - keepUsd);
  return {
    heldUsd,
    monthsOfCostsCovered: args.monthlyUsdCosts > 0 ? heldUsd / args.monthlyUsdCosts : Number.POSITIVE_INFINITY,
    proposeConvertMist: excessUsd > 0 ? usdToMist(excessUsd, args.suiUsd) : 0n,
    requiresHumanApproval: true as const,
  };
}

/** Minimum deposit in MIST at `suiUsd`, rounded up so a deposit of exactly this passes. */
export function minDepositMist(suiUsd: number, policy = PRICING): bigint {
  const price = toMicros(suiUsd);
  const usd = toMicros(policy.minDepositUsd);
  return (usd * MIST_PER_SUI + price - 1n) / price;
}

/** Free days to write on-chain at creation: the trial is once per wallet and needs the minimum deposit. */
export function trialDaysFor(
  args: { walletHasUsedTrial: boolean; depositMist: bigint; suiUsd: number },
  policy = PRICING,
) {
  if (args.walletHasUsedTrial) return 0;
  return args.depositMist >= minDepositMist(args.suiUsd, policy) ? policy.trialDays : 0;
}
