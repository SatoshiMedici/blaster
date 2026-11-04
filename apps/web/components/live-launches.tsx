"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { type LaunchRow, recentLaunches } from "@/lib/chain";
import { cx } from "@/lib/format";
import { Badge, LiveDot } from "./ui";

const ago = (ms: number) => {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  return m < 60 ? `${m}m` : m < 1_440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1_440)}d`;
};

const lifecycleTone: Record<LaunchRow["lifecycle"], "gain" | "info" | "punch" | "neutral"> = {
  Live: "gain",
  OpeningRound: "info",
  MigrationReady: "punch",
  Migrated: "neutral",
};

/**
 * The newest Blast launches, read live from Sui mainnet in the browser: exactly what an agent
 * screens every minute. Nothing here is simulated.
 */
export function LiveLaunches() {
  const q = useQuery({ queryKey: ["launches"], queryFn: () => recentLaunches(7), refetchInterval: 30_000, retry: 1 });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold">Live on Blast</p>
          <p className="font-mono text-[11px] text-faint">newest launches · Sui mainnet</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] text-gain">
          {q.isError ? null : <LiveDot />} {q.isFetching ? "updating" : q.isError ? "" : "live"}
        </span>
      </div>

      <div className="min-h-[320px]">
        {q.isPending ? (
          <ul className="divide-y divide-white/[0.04]">
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <span className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                <span className="h-1.5 flex-1 animate-pulse rounded bg-white/[0.04]" />
                <span className="h-3 w-12 animate-pulse rounded bg-white/[0.06]" />
              </li>
            ))}
          </ul>
        ) : q.isError ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-muted">Couldn't reach Sui right now.</p>
            <button
              type="button"
              onClick={() => q.refetch()}
              className="inline-flex items-center gap-1.5 text-sm text-kicker hover:text-punch"
            >
              <RefreshCw className="size-3.5" /> Try again
            </button>
          </div>
        ) : q.data.length === 0 ? (
          <p className="flex h-[320px] items-center justify-center text-sm text-muted">No launches yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {q.data.map((l) => (
              <li key={l.id}>
                <a
                  href={`https://suiscan.xyz/mainnet/object/${l.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-white/[0.02]"
                >
                  <div className="w-28 min-w-0">
                    <p className="truncate font-medium text-ink">${l.symbol}</p>
                    <p className="truncate text-[11px] text-faint">{l.name}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cx("h-full rounded-full", l.progressPct >= 80 ? "bg-punch" : "bg-kicker/80")}
                        style={{ width: `${Math.min(100, l.progressPct)}%` }}
                      />
                    </div>
                    <p className="num mt-1 text-[11px] text-muted">
                      {l.progressPct.toFixed(1)}% ·{" "}
                      {l.realReserveSui.toLocaleString("en-US", { maximumFractionDigits: 0 })} /{" "}
                      {l.graduationSui.toLocaleString("en-US", { maximumFractionDigits: 0 })} SUI
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <Badge tone={lifecycleTone[l.lifecycle]}>
                      {l.lifecycle === "OpeningRound" ? "opening" : l.lifecycle.toLowerCase()}
                    </Badge>
                    <p className="num mt-1 text-[11px] text-faint">{l.publicSinceMs ? ago(l.publicSinceMs) : "—"}</p>
                  </div>
                  <ExternalLink className="size-3.5 text-faint opacity-0 transition group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-white/[0.05] px-5 py-3 font-mono text-[11px] text-faint">
        Names are written by token creators. Listing here is not an endorsement.
      </div>
    </div>
  );
}
