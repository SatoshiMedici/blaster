/**
 * Referrals: a referrer earns 30% of the revenue the users they bring generate (owner decision;
 * docs/ECONOMICS.md, reports/Blast Agents models fees referrals.md). Pure functions; the API and an
 * ops job persist and run them.
 *
 * Rules:
 * - **What counts:** fees actually collected by `charge_fee` from vaults whose owner was referred.
 *   Trial days and paused days collect nothing, so they pay nothing. Blast's protocol share of
 *   trade fees on the referred vaults' volume can be added with `includeProtocolTradeFees`, but it
 *   is off by default: sharing revenue that grows with the agent's trading is the riskiest
 *   inducement under MiCA Art. 81 and needs the legal opinion first.
 * - **Pricing already includes the payout** (`PRICING.referralShare`), so a referred vault stays
 *   profitable and no per-day cap is needed.
 * - **Binding:** one referrer per owner wallet, chosen when the first vault is created, permanent;
 *   no self-referral; the referrer must run a vault of their own.
 * - **Payout:** accrued in MIST per collected fee; paid weekly in SUI from the treasury, in batches,
 *   above a minimum, after a hold on a referrer's first payout. Every payout batch needs human
 *   approval: it moves treasury funds.
 */
import { PRICING } from "./pricing.ts";

export type ReferralPolicy = {
  /** Referrer's share of counted revenue, in basis points. */
  shareBps: number;
  /** Lifetime when null; otherwise only revenue within this many days of binding counts. */
  durationDays: number | null;
  /** Also share Blast's protocol cut of trade fees on referred volume (off until legal sign-off). */
  includeProtocolTradeFees: boolean;
  minPayoutMist: bigint;
  firstPayoutHoldDays: number;
  payoutEveryDays: number;
};

export const REFERRALS: Readonly<ReferralPolicy> = {
  shareBps: Math.round(PRICING.referralShare * 10_000),
  durationDays: null,
  includeProtocolTradeFees: false,
  minPayoutMist: 1_000_000_000n, // 1 SUI
  firstPayoutHoldDays: 30,
  payoutEveryDays: 7,
};

/** Referral codes: 6–16 lowercase letters, digits or dashes. */
export const REFERRAL_CODE = /^[a-z0-9-]{6,16}$/;

export type ReferralBinding = { owner: string; referrer: string; boundAtMs: number };

export type BindingCheck =
  | { ok: true; binding: ReferralBinding }
  | { ok: false; reason: "self_referral" | "already_bound" | "referrer_has_no_vault" | "same_funding_source" };

/**
 * Validates a new binding. `fundingSourceOf` is the address that funded each wallet (from the
 * indexer); a referee funded by the referrer is treated as self-referral.
 */
export function bindReferral(args: {
  owner: string;
  referrer: string;
  existing: ReferralBinding | undefined;
  referrerHasVault: boolean;
  fundingSourceOf?: (address: string) => string | undefined;
  nowMs: number;
}): BindingCheck {
  const norm = (a: string) => a.toLowerCase();
  if (args.existing) return { ok: false, reason: "already_bound" };
  if (norm(args.owner) === norm(args.referrer)) return { ok: false, reason: "self_referral" };
  const funder = args.fundingSourceOf?.(args.owner);
  if (funder && norm(funder) === norm(args.referrer)) return { ok: false, reason: "same_funding_source" };
  if (!args.referrerHasVault) return { ok: false, reason: "referrer_has_no_vault" };
  return { ok: true, binding: { owner: args.owner, referrer: args.referrer, boundAtMs: args.nowMs } };
}

/** One revenue event from a referred vault. */
export type RevenueEvent = {
  owner: string;
  vaultId: string;
  kind: "daily_fee" | "protocol_trade_fee";
  mist: bigint;
  atMs: number;
  /** Fee charge digest or trade digest, for audit. */
  digest: string;
};

export type Accrual = { referrer: string; owner: string; vaultId: string; mist: bigint; atMs: number; digest: string };

/** Accrues the referrer's share of each revenue event, rounding down. */
export function accrueReferrals(
  events: RevenueEvent[],
  bindingOf: (owner: string) => ReferralBinding | undefined,
  policy: ReferralPolicy = REFERRALS,
): Accrual[] {
  const out: Accrual[] = [];
  for (const e of events) {
    if (e.kind === "protocol_trade_fee" && !policy.includeProtocolTradeFees) continue;
    const b = bindingOf(e.owner);
    if (!b || e.atMs < b.boundAtMs) continue;
    if (policy.durationDays !== null && e.atMs > b.boundAtMs + policy.durationDays * 86_400_000) continue;
    const mist = (e.mist * BigInt(policy.shareBps)) / 10_000n;
    if (mist > 0n)
      out.push({ referrer: b.referrer, owner: e.owner, vaultId: e.vaultId, mist, atMs: e.atMs, digest: e.digest });
  }
  return out;
}

export type PayoutLine = { referrer: string; mist: bigint };

/**
 * Proposes the next payout batch: each referrer's unpaid balance, if it is at least the minimum
 * and their first accrual is older than the hold. Referrers flagged for review are skipped (their
 * balance stays accrued until cleared or clawed back). The batch is a proposal for human approval.
 */
export function proposePayouts(args: {
  accruals: Accrual[];
  paidMistByReferrer: ReadonlyMap<string, bigint>;
  flagged: ReadonlySet<string>;
  nowMs: number;
  policy?: ReferralPolicy;
}): { lines: PayoutLine[]; totalMist: bigint; requiresHumanApproval: true } {
  const policy = args.policy ?? REFERRALS;
  const earned = new Map<string, { mist: bigint; firstAtMs: number }>();
  for (const a of args.accruals) {
    const e = earned.get(a.referrer) ?? { mist: 0n, firstAtMs: a.atMs };
    earned.set(a.referrer, { mist: e.mist + a.mist, firstAtMs: Math.min(e.firstAtMs, a.atMs) });
  }
  const lines: PayoutLine[] = [];
  for (const [referrer, e] of earned) {
    if (args.flagged.has(referrer)) continue;
    const unpaid = e.mist - (args.paidMistByReferrer.get(referrer) ?? 0n);
    const neverPaid = (args.paidMistByReferrer.get(referrer) ?? 0n) === 0n;
    if (neverPaid && args.nowMs - e.firstAtMs < policy.firstPayoutHoldDays * 86_400_000) continue;
    if (unpaid >= policy.minPayoutMist) lines.push({ referrer, mist: unpaid });
  }
  lines.sort((a, b) => a.referrer.localeCompare(b.referrer));
  return { lines, totalMist: lines.reduce((s, l) => s + l.mist, 0n), requiresHumanApproval: true };
}

/** What a referee is shown before signing (disclosure). */
export function describeReferral(policy: ReferralPolicy = REFERRALS): string {
  return `You were referred. Your referrer receives ${policy.shareBps / 100}% of the daily fee you pay; your price is the same either way.`;
}
