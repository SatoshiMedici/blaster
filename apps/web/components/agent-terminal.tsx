"use client";

import { useEffect, useState } from "react";
import { DEMO_FEED, DEMO_NOW } from "@/lib/demo";
import { cx, timeAgo } from "@/lib/format";
import { Badge, LiveDot } from "./ui";

const verdictTone = { executed: "gain", clamped: "warn", rejected: "loss", hold: "neutral" } as const;

/**
 * The hero's signature element: a live-looking agent log. It types each decision's summary, then
 * reveals the actions and what the risk check did — the product in one glance.
 */
export function AgentTerminal() {
  // Opens on a complete decision (also what server rendering and reduced-motion users see), then
  // types the next ones.
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(Number.POSITIVE_INFINITY);
  const entry = DEMO_FEED[index % DEMO_FEED.length] ?? DEMO_FEED[0];
  const done = entry ? typed >= entry.summary.length : true;

  useEffect(() => {
    if (!entry) return;
    if (typed < entry.summary.length) {
      const t = setTimeout(() => setTyped((n) => n + 2), 18);
      return () => clearTimeout(t);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => {
      setIndex((i) => i + 1);
      setTyped(reduced ? Number.POSITIVE_INFINITY : 0);
    }, 4200);
    return () => clearTimeout(t);
  }, [entry, typed]);

  if (!entry) return null;
  return (
    <div className="card overflow-hidden" aria-label="Example of an agent decision" role="img">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="size-2.5 rounded-full bg-[#28c840]/80" />
          <span className="ml-3 font-mono text-xs text-muted">agent · {entry.model}</span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] text-gain">
          <LiveDot /> running
        </span>
      </div>

      <div className="min-h-[300px] space-y-4 p-5 font-mono text-[13px] leading-relaxed">
        <div className="flex items-center gap-2 text-faint">
          <span>›</span>
          <span>trigger: {entry.trigger}</span>
          <span className="ml-auto">{timeAgo(entry.atMs, DEMO_NOW)}</span>
        </div>
        <p className="text-ink-2">
          {entry.summary.slice(0, typed)}
          {!done ? <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-punch" /> : null}
        </p>

        <div className={cx("space-y-2 transition-opacity duration-500", done ? "opacity-100" : "opacity-0")}>
          {entry.actions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-black/20 px-3 py-2.5 text-muted">
              <Badge>hold</Badge> no trade · no fees spent
            </div>
          ) : (
            entry.actions.map((a) => (
              <div key={`${a.symbol}-${a.side}`} className="rounded-lg border border-line-soft bg-black/20 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={a.side === "buy" ? "text-gain" : "text-kicker"}>{a.side.toUpperCase()}</span>
                  <span className="text-ink">{a.symbol}</span>
                  <span className="text-muted">{a.amountSui.toFixed(1)} SUI</span>
                  <Badge tone={verdictTone[a.verdict]} className="ml-auto">
                    {a.verdict}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-faint">{a.note ?? a.reason}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3 font-mono text-[11px] text-faint">
        <span>limits enforced on-chain</span>
        <span>withdraw: owner only</span>
      </div>
    </div>
  );
}
