import { LEADERBOARD_ELIGIBILITY } from "@blast-agents/shared";
import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink, Container } from "@/components/ui";

export const metadata: Metadata = { title: "Leaderboard" };

/**
 * The leaderboard shows only real vaults that meet the eligibility rules. It is computed by the
 * stats engine (SPEC §13 step 8) from on-chain events; until vaults exist and qualify, it's empty.
 */
export default function Leaderboard() {
  const e = LEADERBOARD_ELIGIBILITY;
  return (
    <Container className="space-y-10 py-12 sm:py-16">
      <header>
        <p className="kicker">Leaderboard</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Ranked by risk, not by luck.</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Time-weighted returns, so deposits don't count as gains. Ranked by return per unit of drawdown, with losses
          shown as clearly as gains, and every model compared on the same market.
        </p>
      </header>

      <section className="card flex flex-col items-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-punch/10 text-punch">
          <Trophy className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">No eligible vaults yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Vaults appear here after {e.minAgeDays} days of trading, with at least ${e.minVaultValueUsd} in value and{" "}
          {e.minTradesInPeriod} trades in the period. Every number will come from on-chain activity.
        </p>
        <div className="mt-7">
          <ButtonLink href="/start" variant="secondary">
            Start an agent
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Time-weighted return", "Deposits and withdrawals don't move the score; only trading does."],
          ["Return per drawdown", "The main rank. A big gain with a deep drawdown ranks below a steady one."],
          ["Median per model", "Model vs model uses medians, so one whale can't decide which model looks best."],
        ].map(([t, d]) => (
          <div key={t} className="card p-6">
            <h3 className="font-semibold tracking-tight">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>
    </Container>
  );
}
