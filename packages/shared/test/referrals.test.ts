import { describe, expect, it } from "vitest";
import { accrueReferrals, bindReferral, proposePayouts, REFERRALS, type RevenueEvent } from "../src/index.ts";

const A = `0x${"a".repeat(64)}`;
const B = `0x${"b".repeat(64)}`;
const C = `0x${"c".repeat(64)}`;
const DAY = 86_400_000;

describe("bindReferral", () => {
  const base = { owner: A, referrer: B, existing: undefined, referrerHasVault: true, nowMs: 0 };
  it("binds once, permanently", () => {
    const r = bindReferral(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(bindReferral({ ...base, existing: r.binding })).toEqual({ ok: false, reason: "already_bound" });
  });
  it("refuses self-referral, funding-source self-referral and referrers without a vault", () => {
    expect(bindReferral({ ...base, referrer: A.toUpperCase().replace("0X", "0x") })).toMatchObject({
      reason: "self_referral",
    });
    expect(bindReferral({ ...base, fundingSourceOf: () => B })).toMatchObject({ reason: "same_funding_source" });
    expect(bindReferral({ ...base, referrerHasVault: false })).toMatchObject({ reason: "referrer_has_no_vault" });
  });
});

describe("accrueReferrals", () => {
  const binding = { owner: A, referrer: B, boundAtMs: 10 };
  const ev = (over: Partial<RevenueEvent>): RevenueEvent => ({
    owner: A,
    vaultId: "v",
    kind: "daily_fee",
    mist: 1_000_000_000n,
    atMs: 100,
    digest: "d",
    ...over,
  });

  it("pays 30% of each collected fee, rounding down", () => {
    const out = accrueReferrals([ev({}), ev({ mist: 7n })], (o) => (o === A ? binding : undefined));
    expect(out.map((a) => a.mist)).toEqual([300_000_000n, 2n]);
    expect(REFERRALS.shareBps).toBe(3_000);
  });

  it("ignores unreferred owners, revenue before binding, and trade-fee share unless enabled", () => {
    const bindingOf = (o: string) => (o === A ? binding : undefined);
    expect(accrueReferrals([ev({ owner: C }), ev({ atMs: 5 }), ev({ kind: "protocol_trade_fee" })], bindingOf)).toEqual(
      [],
    );
    const withTrade = accrueReferrals([ev({ kind: "protocol_trade_fee" })], bindingOf, {
      ...REFERRALS,
      includeProtocolTradeFees: true,
    });
    expect(withTrade).toHaveLength(1);
  });

  it("respects a limited duration when set", () => {
    const policy = { ...REFERRALS, durationDays: 365 };
    expect(accrueReferrals([ev({ atMs: 10 + 366 * DAY })], () => binding, policy)).toEqual([]);
  });
});

describe("proposePayouts", () => {
  const acc = (referrer: string, mist: bigint, atMs: number) => ({
    referrer,
    owner: A,
    vaultId: "v",
    mist,
    atMs,
    digest: "d",
  });

  it("pays unpaid balances above the minimum after the first-payout hold, as a proposal", () => {
    const accruals = [acc(B, 600_000_000n, 0), acc(B, 600_000_000n, DAY), acc(C, 2_000_000_000n, 29 * DAY)];
    const r = proposePayouts({ accruals, paidMistByReferrer: new Map(), flagged: new Set(), nowMs: 31 * DAY });
    expect(r.lines).toEqual([{ referrer: B, mist: 1_200_000_000n }]);
    expect(r.requiresHumanApproval).toBe(true);
  });

  it("skips flagged referrers and balances under the minimum", () => {
    const accruals = [acc(B, 2_000_000_000n, 0)];
    expect(
      proposePayouts({ accruals, paidMistByReferrer: new Map(), flagged: new Set([B]), nowMs: 40 * DAY }).lines,
    ).toEqual([]);
    expect(
      proposePayouts({
        accruals,
        paidMistByReferrer: new Map([[B, 1_500_000_000n]]),
        flagged: new Set(),
        nowMs: 40 * DAY,
      }).lines,
    ).toEqual([]);
  });
});
