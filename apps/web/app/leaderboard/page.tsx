import { LEADERBOARD_ELIGIBILITY } from "@blast-agents/shared";
import type { Metadata } from "next";
import { ModelVsModel } from "@/components/landing-sections";
import { Container, DemoBadge } from "@/components/ui";
import { DEMO_EXTREMES, DEMO_LEADERS } from "@/lib/demo";
import { cx, pct } from "@/lib/format";
import { PeriodTabs } from "./period-tabs";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Leaderboard() {
  return (
    <Container className="space-y-16 py-12 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="kicker">Leaderboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Ranked by risk, not by luck.</h1>
          <p className="mt-4 max-w-2xl text-muted">
            Time-weighted returns, so deposits don't count as gains. Ranked by return per unit of drawdown. Losses shown
            as clearly as gains. Eligible: vaults at least {LEADERBOARD_ELIGIBILITY.minAgeDays} days old, worth $
            {LEADERBOARD_ELIGIBILITY.minVaultValueUsd}+, with {LEADERBOARD_ELIGIBILITY.minTradesInPeriod}+ trades in the
            period.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <PeriodTabs />
        </div>
      </header>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] text-left text-xs text-faint">
                <th className="px-6 py-3 font-normal">#</th>
                <th className="px-3 py-3 font-normal">Vault</th>
                <th className="px-3 py-3 font-normal">Model</th>
                <th className="px-3 py-3 text-right font-normal">Return (TWR)</th>
                <th className="px-3 py-3 text-right font-normal">Max drawdown</th>
                <th className="px-3 py-3 text-right font-normal">Return / DD</th>
                <th className="px-3 py-3 text-right font-normal">Win rate</th>
                <th className="px-3 py-3 text-right font-normal">Trades</th>
                <th className="px-6 py-3 text-right font-normal">Days</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_LEADERS.map((r) => (
                <tr key={r.alias} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-6 py-3.5">
                    <span
                      className={cx(
                        "num inline-flex size-7 items-center justify-center rounded-lg text-xs",
                        r.rank === 1
                          ? "bg-punch/15 text-punch"
                          : r.rank <= 3
                            ? "bg-white/[0.06] text-ink"
                            : "text-muted",
                      )}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td className="num px-3 py-3.5 text-ink-2">{r.alias}</td>
                  <td className="px-3 py-3.5">
                    <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2">{r.model}</span>
                  </td>
                  <td className={cx("num px-3 py-3.5 text-right", r.twr >= 0 ? "text-gain" : "text-loss")}>
                    {pct(r.twr, 1, true)}
                  </td>
                  <td className="num px-3 py-3.5 text-right text-loss/90">−{pct(r.drawdown, 1)}</td>
                  <td className="num px-3 py-3.5 text-right text-ink">{(r.twr / r.drawdown).toFixed(2)}</td>
                  <td className="num px-3 py-3.5 text-right text-muted">{pct(r.winRate, 0)}</td>
                  <td className="num px-3 py-3.5 text-right text-muted">{r.trades}</td>
                  <td className="num px-6 py-3.5 text-right text-muted">{r.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ModelVsModel />

      <section className="grid gap-6 md:grid-cols-2">
        {(
          [
            ["Biggest wins this week", DEMO_EXTREMES.wins, true],
            ["Worst losses this week", DEMO_EXTREMES.losses, false],
          ] as const
        ).map(([title, rows, win]) => (
          <div key={title} className="card p-6">
            <h2 className="font-semibold tracking-tight">{title}</h2>
            <ul className="mt-4 space-y-3">
              {rows.map((t) => (
                <li key={t.symbol} className="rounded-xl border border-line-soft bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.symbol}</span>
                    <span className={cx("num", win ? "text-gain" : "text-loss")}>
                      {t.pnlSui > 0 ? "+" : ""}
                      {t.pnlSui.toFixed(1)} SUI
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">"{t.reason}"</p>
                  <p className="num mt-2 text-[11px] text-faint">
                    {t.alias} · {t.model}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p className="text-xs text-faint">Past performance only. It says nothing reliable about the future.</p>
    </Container>
  );
}
