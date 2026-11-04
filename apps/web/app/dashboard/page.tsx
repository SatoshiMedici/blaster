import { quotePlan, RISK_PRESETS, settingsToLimits, suiToMist } from "@blast-agents/shared";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Gauge,
  KeyRound,
  Power,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";
import type { Metadata } from "next";
import { Badge, Container, DemoBadge, LiveDot, Stat } from "@/components/ui";
import { ValueChart } from "@/components/value-chart";
import { DEMO_FEED, DEMO_NOW, DEMO_SUI_USD, DEMO_VAULT } from "@/lib/demo";
import { cx, pct, shortAddr, sui, timeAgo, usd } from "@/lib/format";
import { PauseToggle } from "./pause-toggle";

export const metadata: Metadata = { title: "Dashboard" };

const verdictTone = { executed: "gain", clamped: "warn", rejected: "loss", hold: "neutral" } as const;

export default function Dashboard() {
  const v = DEMO_VAULT;
  const plan = quotePlan(v.modelKey, { level: v.activity });
  const pnl = v.valueSui - v.depositedSui; // fees already left the vault: P&L is net of fees
  const pnlPct = pnl / v.depositedSui;
  const risk = RISK_PRESETS[v.preset].settings;
  const limits = settingsToLimits(risk, suiToMist(v.depositedSui));
  const toSui = (mist: string) => sui(Number(mist) / 1e9, 1);

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Your vault</h1>
            <DemoBadge />
          </div>
          <a
            href={`https://suiscan.xyz/mainnet/object/${v.objectId}`}
            className="num mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
            target="_blank"
            rel="noreferrer"
          >
            {shortAddr(v.objectId)} <ExternalLink className="size-3" />
          </a>
        </div>
        <PauseToggle />
      </div>

      <section className="card mt-6 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Vault value" value={sui(v.valueSui, 1)} sub={usd(v.valueSui * DEMO_SUI_USD)} />
        <Stat
          label="P&L, net of fees"
          value={`${pnl >= 0 ? "+" : ""}${sui(pnl, 1)}`}
          sub={pct(pnlPct, 2, true)}
          tone={pnl >= 0 ? "gain" : "loss"}
        />
        <Stat label="Fees paid" value={sui(v.feesPaidSui, 1)} sub={`over ${v.sinceDays} days`} />
        <div>
          <p className="text-xs text-muted">Status</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink">
            <LiveDot /> Running
          </p>
          <p className="mt-1 text-xs text-muted">{v.model}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Plan · {plan.activity.label}</p>
          <p className="num mt-1 text-2xl font-medium">
            {usd(plan.priceUsdPerDay)}
            <span className="text-sm text-muted">/day</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-punch"
              style={{ width: `${(v.decisionsToday / plan.activity.decisionsPerDay) * 100}%` }}
            />
          </div>
          <p className="num mt-1 text-xs text-muted">
            {v.decisionsToday} of {plan.activity.decisionsPerDay} decisions today
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold tracking-tight">Value vs deposits</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-punch" /> Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t border-dashed border-muted" /> Deposits
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-gain" /> Buy
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-kicker" /> Sell
                </span>
              </div>
            </div>
            <div className="mt-4">
              <ValueChart />
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="px-6 pt-6 font-semibold tracking-tight">Positions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05] text-left text-xs text-faint">
                    <th className="px-6 py-2 font-normal">Coin</th>
                    <th className="px-3 py-2 font-normal">Tokens</th>
                    <th className="px-3 py-2 text-right font-normal">Cost</th>
                    <th className="px-3 py-2 text-right font-normal">Value (sell now)</th>
                    <th className="px-3 py-2 text-right font-normal">P&L</th>
                    <th className="px-3 py-2 font-normal">To graduation</th>
                    <th className="px-6 py-2 text-right font-normal">Held</th>
                  </tr>
                </thead>
                <tbody>
                  {v.positions.map((p) => {
                    const pl = p.valueSui - p.costSui;
                    return (
                      <tr key={p.symbol} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-6 py-3 font-medium">{p.symbol}</td>
                        <td className="num px-3 py-3 text-muted">{p.tokens}</td>
                        <td className="num px-3 py-3 text-right text-muted">{p.costSui.toFixed(2)}</td>
                        <td className="num px-3 py-3 text-right">{p.valueSui.toFixed(2)}</td>
                        <td className={cx("num px-3 py-3 text-right", pl >= 0 ? "text-gain" : "text-loss")}>
                          {pl >= 0 ? "+" : ""}
                          {pct(pl / p.costSui, 1)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-kicker"
                                style={{ width: `${p.toGraduation * 100}%` }}
                              />
                            </div>
                            <span className="num text-xs text-muted">{pct(p.toGraduation, 0)}</span>
                          </div>
                        </td>
                        <td className="num px-6 py-3 text-right text-muted">{p.heldFor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Activity</h2>
              <span className="text-xs text-faint">Every decision, with its reasoning</span>
            </div>
            <ol className="relative mt-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
              {DEMO_FEED.map((d) => (
                <li key={d.id} className="relative pl-7">
                  <span
                    className={cx(
                      "absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-canvas",
                      d.actions.length ? "bg-punch" : "bg-line",
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                    <span className="num">{timeAgo(d.atMs, DEMO_NOW)}</span>
                    <span>·</span>
                    <span>{d.trigger}</span>
                    <span>·</span>
                    <span>{d.model}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2">{d.summary}</p>
                  {d.actions.length === 0 ? (
                    <Badge className="mt-2">hold</Badge>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {d.actions.map((a) => (
                        <div
                          key={a.symbol + a.side}
                          className="rounded-xl border border-line-soft bg-black/20 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                              className={cx(
                                "font-mono text-xs font-semibold",
                                a.side === "buy" ? "text-gain" : "text-kicker",
                              )}
                            >
                              {a.side.toUpperCase()}
                            </span>
                            <span className="font-medium">{a.symbol}</span>
                            <span className="num text-muted">{a.amountSui.toFixed(1)} SUI</span>
                            <Badge tone={verdictTone[a.verdict]} className="ml-auto">
                              {a.verdict}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-xs text-muted">{a.reason}</p>
                          {a.note ? <p className="mt-1 text-xs text-warn">Risk check: {a.note}</p> : null}
                          {a.digest ? (
                            <p className="num mt-1.5 inline-flex items-center gap-1 text-[11px] text-faint">
                              tx {a.digest} <ExternalLink className="size-3" />
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-white/[0.05] pt-4 text-xs text-faint">
              Agent trades are the model's own decisions, not endorsements by Blast of any coin.
            </p>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-6">
            <h2 className="font-semibold tracking-tight">Controls</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Control icon={<ArrowDownToLine className="size-4" />} label="Deposit" />
              <Control icon={<ArrowUpFromLine className="size-4" />} label="Withdraw" />
              <Control icon={<Repeat className="size-4" />} label="Change model" note="no signature" />
              <Control icon={<Gauge className="size-4" />} label="Change activity" note="no signature" />
              <Control icon={<SlidersHorizontal className="size-4" />} label="Edit limits" />
              <Control icon={<Power className="size-4" />} label="Close vault" />
            </div>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-loss/30 bg-loss/[0.06] px-4 py-3 text-sm font-medium text-loss transition hover:bg-loss/[0.12]"
            >
              <KeyRound className="size-4" /> Revoke agent
            </button>
            <p className="mt-2 text-center text-[11px] text-faint">
              Instant and on-chain. Works even if our service is down.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold tracking-tight">Limits</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Per trade", toSui(limits.maxTrade)],
                ["Per launch", toSui(limits.maxPerLaunch)],
                ["Spend per day", toSui(limits.maxDailySpend)],
                ["Open positions", `${v.positions.length} of ${limits.maxOpenPositions}`],
                ["Drawdown stop", `−${risk.drawdownStopBps / 100}%`],
                ["Daily spending limit", `${sui((plan.priceUsdPerDay / DEMO_SUI_USD) * 3, 2)}`],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num text-ink-2">{val}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </Container>
  );
}

function Control({ icon, label, note }: { icon: React.ReactNode; label: string; note?: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-start gap-2 rounded-xl border border-line-soft bg-white/[0.02] px-3.5 py-3 text-left text-sm text-ink-2 transition hover:border-punch/40 hover:bg-white/[0.05]"
    >
      <span className="text-kicker">{icon}</span>
      <span className="font-medium text-ink">{label}</span>
      {note ? <span className="font-mono text-[10px] text-faint">{note}</span> : null}
    </button>
  );
}
