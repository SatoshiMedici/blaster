"use client";

import { ACTIVITY_LEVELS, feeDrag, MODEL_CATALOG, quoteFeeTerms, quotePlan } from "@blast-agents/shared";
import { useMemo, useState } from "react";
import { DEMO_SUI_USD } from "@/lib/demo";
import { cx, pct, usd } from "@/lib/format";
import { Badge, ButtonLink, Segmented } from "./ui";

type Level = keyof typeof ACTIVITY_LEVELS;

const LEVELS = Object.values(ACTIVITY_LEVELS);
const VAULT_STOPS = [50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000];

/**
 * Live plan pricing. Every number comes from `@blast-agents/shared` (`quotePlan`, `feeDrag`,
 * `quoteFeeTerms`), the same functions the API uses, so this calculator cannot drift from billing.
 */
export function PricingCalculator() {
  const [modelKey, setModelKey] = useState("claude");
  const [level, setLevel] = useState<Level>("steady");
  const [stop, setStop] = useState(6); // $5,000: a representative vault, not an alarming default

  const vaultUsd = VAULT_STOPS[stop] ?? 1_000;
  const quote = useMemo(() => quotePlan(modelKey, { level }), [modelKey, level]);
  const drag = feeDrag(quote.priceUsdPerDay, vaultUsd);
  const terms = quoteFeeTerms(quote.priceUsdPerDay, DEMO_SUI_USD);
  const capSui = Number(terms.dailyFeeCapMist) / 1e9;

  const band = {
    comfortable: { tone: "gain", text: "Comfortable for this vault" },
    high: { tone: "warn", text: "High for this vault" },
    extreme: { tone: "loss", text: "Too costly for this vault" },
  } as const;

  return (
    <div className="card grid gap-0 overflow-hidden lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-7 p-6 sm:p-8">
        <div>
          <p className="mb-3 text-sm font-medium text-ink-2">Model</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODEL_CATALOG.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={m.key === modelKey}
                onClick={() => setModelKey(m.key)}
                className={cx(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  m.key === modelKey
                    ? "border-punch/50 bg-punch/[0.07]"
                    : "border-line-soft bg-white/[0.02] hover:border-line",
                )}
              >
                <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{m.tier}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-ink-2">How active</p>
          <Segmented
            label="Activity level"
            value={level}
            onChange={setLevel}
            options={LEVELS.map((l) => ({ value: l.id as Level, label: l.label, hint: `${l.decisionsPerDay}/day` }))}
          />
          <p className="mt-2 text-xs text-muted">{ACTIVITY_LEVELS[level].description}</p>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <label htmlFor="vault-size" className="text-sm font-medium text-ink-2">
              Vault size
            </label>
            <span className="num text-sm text-ink">{usd(vaultUsd, 0)}</span>
          </div>
          <input
            id="vault-size"
            type="range"
            min={0}
            max={VAULT_STOPS.length - 1}
            value={stop}
            onChange={(e) => setStop(Number(e.target.value))}
            className="w-full accent-punch"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-faint">
            <span>$50</span>
            <span>no minimum</span>
            <span>$50k</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 border-t border-white/[0.05] bg-gradient-to-b from-punch/[0.06] to-transparent p-6 sm:p-8 lg:border-t-0 lg:border-l">
        <div>
          <p className="kicker">Your plan</p>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="num text-5xl font-semibold tracking-tight text-ink">{usd(quote.priceUsdPerDay)}</span>
            <span className="text-muted">/ day while running</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Up to <span className="num text-ink-2">{quote.activity.decisionsPerDay}</span> decisions a day ·{" "}
            <span className="num text-ink-2">{usd(quote.priceUsdPerDecision, 3)}</span> each
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-line-soft bg-black/25 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Yearly share of your vault</span>
            <span
              className={cx(
                "num text-sm",
                drag.band === "comfortable" ? "text-gain" : drag.band === "high" ? "text-warn" : "text-loss",
              )}
            >
              {Number.isFinite(drag.annualShare) ? pct(drag.annualShare) : "—"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cx(
                "h-full rounded-full transition-all duration-500",
                drag.band === "comfortable" ? "bg-gain" : drag.band === "high" ? "bg-warn" : "bg-loss",
              )}
              style={{ width: `${Math.min(100, (drag.annualShare / 0.5) * 100)}%` }}
            />
          </div>
          <Badge tone={band[drag.band].tone}>{band[drag.band].text}</Badge>
        </div>

        <ul className="space-y-2 text-sm text-muted">
          <li className="flex justify-between gap-4">
            <span>Daily spending limit you sign</span>
            <span className="num text-ink-2">≈ {capSui.toFixed(2)} SUI</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Paused or closed</span>
            <span className="text-ink-2">$0</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>First 3 days</span>
            <span className="text-ink-2">Free</span>
          </li>
        </ul>

        <ButtonLink href={`/start?model=${modelKey}&activity=${level}`} size="lg" className="w-full">
          Start with this plan
        </ButtonLink>
      </div>
    </div>
  );
}
