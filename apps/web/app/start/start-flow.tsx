"use client";

import {
  ACTIVITY_LEVELS,
  type ActivityChoice,
  CUSTOM_DECISIONS_RANGE,
  DEFAULT_FREE_DAYS,
  feeDrag,
  MODEL_CATALOG,
  type PresetId,
  quoteFeeTerms,
  quotePlan,
  RISK_PRESETS,
  recommendPlan,
  settingsToLimits,
  suiToMist,
} from "@blast-agents/shared";
import { describeCreate } from "@blast-agents/vault-sdk";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ArrowLeft, ArrowRight, Check, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, ButtonLink, Container, Segmented } from "@/components/ui";
import { WalletButton } from "@/components/wallet";
import { DEMO_SUI_USD } from "@/lib/demo";
import { cx, pct, sui, usd } from "@/lib/format";

/** Placeholders until the vault package is published and the operator / treasury are configured. */
const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? `0x${"0".repeat(62)}a1`;
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? `0x${"0".repeat(62)}b2`;
const VAULT_PUBLISHED = Boolean(process.env.NEXT_PUBLIC_VAULT_PACKAGE_ID);

type Level = keyof typeof ACTIVITY_LEVELS | "custom";
const STEPS = ["Connect", "Choose", "Start"] as const;
const PRESETS: PresetId[] = ["careful", "balanced", "degen"];

export function StartFlow() {
  const params = useSearchParams();
  const account = useCurrentAccount();
  const [step, setStep] = useState(account ? 1 : 0);
  const [modelKey, setModelKey] = useState(() => {
    const m = params.get("model");
    return MODEL_CATALOG.some((x) => x.key === m) ? (m as string) : "claude";
  });
  const [level, setLevel] = useState<Level>(() => {
    const a = params.get("activity");
    return a && a in ACTIVITY_LEVELS ? (a as Level) : "steady";
  });
  const [custom, setCustom] = useState(12);
  const [preset, setPreset] = useState<PresetId>("balanced");
  const [depositSui, setDepositSui] = useState("1000");
  const [accepted, setAccepted] = useState(false);
  const [started, setStarted] = useState(false);

  const choice: ActivityChoice = level === "custom" ? { level: "custom", decisionsPerDay: custom } : { level };
  const deposit = Math.max(0, Number(depositSui) || 0);
  const vaultUsd = deposit * DEMO_SUI_USD;
  const quote = quotePlan(modelKey, choice); // pure and cheap: no memo needed
  const drag = feeDrag(quote.priceUsdPerDay, vaultUsd);
  const suggested = vaultUsd > 0 ? recommendPlan(modelKey, vaultUsd) : null;
  // When this model only fits at a trickle, show the model that fits the most activity.
  const alternative =
    vaultUsd > 0 && (!suggested || suggested.activity.decisionsPerDay < ACTIVITY_LEVELS.watchful.decisionsPerDay)
      ? MODEL_CATALOG.filter((m) => m.key !== modelKey)
          .map((m) => recommendPlan(m.key, vaultUsd))
          .filter((q): q is NonNullable<typeof q> => q !== null)
          .sort(
            (a, b) => b.activity.decisionsPerDay - a.activity.decisionsPerDay || a.priceUsdPerDay - b.priceUsdPerDay,
          )[0]
      : undefined;
  const altModel = alternative ? MODEL_CATALOG.find((m) => m.key === alternative.modelKey) : undefined;
  const terms = quoteFeeTerms(quote.priceUsdPerDay, DEMO_SUI_USD);
  const depositMist = deposit > 0 ? suiToMist(depositSui) : 0n;
  const limits = settingsToLimits(RISK_PRESETS[preset].settings, depositMist);
  const model = MODEL_CATALOG.find((m) => m.key === modelKey) ?? MODEL_CATALOG[0];

  if (started) return <Started modelLabel={model?.label ?? ""} price={quote.priceUsdPerDay} />;

  return (
    <Container className="py-12 sm:py-16">
      <Stepper step={step} onStep={(s) => (s <= step ? setStep(s) : undefined)} />

      {!VAULT_PUBLISHED ? (
        <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-warn/20 bg-warn/[0.06] px-4 py-3 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            <span className="font-medium text-ink">Preview.</span> The vault contract isn't published yet, so nothing is
            signed or deposited. Prices and limits below are computed exactly as they will be at launch.
          </p>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="mx-auto mt-10 max-w-xl text-center animate-rise">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.03em]">
            Connect the wallet that will own your vault.
          </h1>
          <p className="mt-4 text-muted">
            Any Sui wallet works. Only this address can withdraw, change limits or revoke the agent.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            {account ? (
              <Button size="lg" onClick={() => setStep(1)}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <WalletButton size="lg" label="Connect wallet" />
            )}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Explore the plans first
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px] animate-rise">
          <div className="space-y-10">
            <Block n={1} title="Model" hint="Same market data and limits for every model. Pick on style and price.">
              <div className="space-y-3">
                {(["premium", "standard", "budget"] as const).map((tier) => (
                  <div key={tier} className="grid gap-2 sm:grid-cols-[88px_1fr] sm:items-center">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">{tier}</span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {MODEL_CATALOG.filter((m) => m.tier === tier).map((m) => {
                        const active = m.key === modelKey;
                        const price = quotePlan(m.key, choice).priceUsdPerDay;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setModelKey(m.key)}
                            className={cx(
                              "relative rounded-xl border px-3.5 py-3 text-left transition",
                              active
                                ? "border-punch/60 bg-punch/[0.07] shadow-[0_0_0_3px_rgb(255_76_152/0.12)]"
                                : "border-line-soft bg-white/[0.02] hover:border-line",
                            )}
                          >
                            <span className="block text-sm font-medium">{m.label}</span>
                            <span className="num mt-1 block text-xs text-muted">{usd(price)}/day</span>
                            {active ? <Check className="absolute top-3 right-3 size-4 text-punch" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Block>

            <Block
              n={2}
              title="How active"
              hint="You decide how often the agent may act. More activity costs more; there is no cap of ours."
            >
              <Segmented
                label="Activity level"
                value={level}
                onChange={setLevel}
                options={[
                  ...Object.values(ACTIVITY_LEVELS).map((l) => ({
                    value: l.id as Level,
                    label: l.label,
                    hint: `${l.decisionsPerDay}/day`,
                  })),
                  { value: "custom" as Level, label: "Custom", hint: `${custom}/day` },
                ]}
              />
              {level === "custom" ? (
                <div className="mt-4">
                  <label htmlFor="custom" className="flex justify-between text-sm text-muted">
                    Decisions per day <span className="num text-ink">{custom}</span>
                  </label>
                  <input
                    id="custom"
                    type="range"
                    min={CUSTOM_DECISIONS_RANGE.min}
                    max={500}
                    value={custom}
                    onChange={(e) => setCustom(Number(e.target.value))}
                    className="mt-2 w-full accent-punch"
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">{ACTIVITY_LEVELS[level].description}</p>
              )}
            </Block>

            <Block
              n={3}
              title="Risk limits"
              hint="Written on-chain. The agent can't exceed them, whatever the model says."
            >
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const s = RISK_PRESETS[p].settings;
                  const active = p === preset;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPreset(p)}
                      className={cx(
                        "rounded-xl border p-3.5 text-left transition",
                        active
                          ? "border-punch/60 bg-punch/[0.07]"
                          : "border-line-soft bg-white/[0.02] hover:border-line",
                      )}
                    >
                      <span className="block text-sm font-medium">{RISK_PRESETS[p].label}</span>
                      <span className="mt-2 block font-mono text-[11px] leading-5 text-faint">
                        {s.perTradeBps / 100}% / trade
                        <br />
                        {s.dailySpendBps / 100}% / day
                        <br />
                        stop at −{s.drawdownStopBps / 100}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </Block>

            <Block n={4} title="Deposit" hint="No minimum. You can add or withdraw any time.">
              <div className="flex items-center gap-2 rounded-2xl border border-line-soft bg-black/20 p-2 focus-within:border-punch/50">
                <input
                  inputMode="decimal"
                  aria-label="Deposit in SUI"
                  value={depositSui}
                  onChange={(e) => setDepositSui(e.target.value.replace(/[^\d.]/g, ""))}
                  className="num min-w-0 flex-1 bg-transparent px-3 py-2 text-2xl text-ink outline-none"
                />
                <span className="font-mono text-sm text-muted">SUI</span>
                <button
                  type="button"
                  disabled={!account}
                  title={account ? "Use wallet balance" : "Connect a wallet to use Max"}
                  className="rounded-xl border border-line px-3 py-2 text-xs text-ink-2 hover:border-punch/50 disabled:opacity-40"
                >
                  Max
                </button>
              </div>
              <p className="num mt-2 text-xs text-muted">
                ≈ {usd(vaultUsd, 0)} at {usd(DEMO_SUI_USD)}/SUI
              </p>
            </Block>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-b from-punch/[0.08] to-transparent p-6">
                <p className="kicker">Your plan</p>
                <p className="mt-3 text-sm text-ink-2">
                  {model?.label} · {quote.activity.label}
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="num text-4xl font-semibold text-ink">{usd(quote.priceUsdPerDay)}</span>
                  <span className="text-sm text-muted">/ day</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Up to {quote.activity.decisionsPerDay} decisions a day · first {DEFAULT_FREE_DAYS} days free
                </p>
              </div>
              <div className="space-y-4 p-6 pt-2">
                <Row label="Yearly share of vault">
                  <span
                    className={cx(
                      drag.band === "comfortable" ? "text-gain" : drag.band === "high" ? "text-warn" : "text-loss",
                    )}
                  >
                    {Number.isFinite(drag.annualShare) ? pct(drag.annualShare) : "—"}
                  </span>
                </Row>
                {drag.band !== "comfortable" && suggested ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (suggested.activity.id === "custom") {
                        setLevel("custom");
                        setCustom(suggested.activity.decisionsPerDay);
                      } else setLevel(suggested.activity.id as Level);
                    }}
                    className="w-full rounded-xl border border-gain/25 bg-gain/[0.06] px-3 py-2.5 text-left text-xs text-ink-2 hover:border-gain/50"
                  >
                    <Sparkles className="mr-1 inline size-3.5 text-gain" />
                    For this vault we suggest <span className="text-ink">{suggested.activity.label}</span> (
                    {suggested.activity.decisionsPerDay}/day, {usd(suggested.priceUsdPerDay)}/day). Tap to apply.
                  </button>
                ) : null}
                {drag.band !== "comfortable" && alternative && altModel ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModelKey(alternative.modelKey);
                      if (alternative.activity.id === "custom") {
                        setLevel("custom");
                        setCustom(alternative.activity.decisionsPerDay);
                      } else setLevel(alternative.activity.id as Level);
                    }}
                    className="w-full rounded-xl border border-info/25 bg-info/[0.06] px-3 py-2.5 text-left text-xs text-ink-2 hover:border-info/50"
                  >
                    Or switch to <span className="text-ink">{altModel.label}</span> at {alternative.activity.label} (
                    {alternative.activity.decisionsPerDay}/day, {usd(alternative.priceUsdPerDay)}/day). Tap to apply.
                  </button>
                ) : null}
                {drag.band !== "comfortable" && !suggested && !alternative && vaultUsd > 0 ? (
                  <p className="rounded-xl border border-warn/25 bg-warn/[0.06] px-3 py-2.5 text-xs text-ink-2">
                    Even the lightest plan is above 10% a year for this vault. Try a budget model or a larger deposit.
                  </p>
                ) : null}
                <div className="hairline" />
                <Row label="Max per trade">{sui(Number(limits.maxTrade) / 1e9)}</Row>
                <Row label="Max per launch">{sui(Number(limits.maxPerLaunch) / 1e9)}</Row>
                <Row label="Max spend per day">{sui(Number(limits.maxDailySpend) / 1e9)}</Row>
                <Row label="Open positions">{limits.maxOpenPositions}</Row>
                <Row label="Daily spending limit (fee cap)">≈ {sui(Number(terms.dailyFeeCapMist) / 1e9)}</Row>
                <Button size="lg" className="mt-2 w-full" disabled={deposit <= 0} onClick={() => setStep(2)}>
                  Review and start <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mx-auto mt-10 max-w-2xl animate-rise">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">One signature. Here is exactly what it does.</h1>
          <ol className="card mt-8 divide-y divide-white/[0.05]">
            {describeCreate({
              limits,
              fees: {
                dailyFeeCapMist: terms.dailyFeeCapMist.toString(),
                treasury: TREASURY,
                freeDays: DEFAULT_FREE_DAYS,
              },
              depositMist,
              operator: OPERATOR,
              priceUsdPerDay: quote.priceUsdPerDay,
            }).map((line, i) => (
              <li key={line} className="flex gap-4 px-6 py-4 text-sm leading-relaxed text-ink-2">
                <span className="num mt-0.5 text-faint">{String(i + 1).padStart(2, "0")}</span>
                <span className={i === 6 ? "text-ink" : undefined}>{line}</span>
              </li>
            ))}
          </ol>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line-soft bg-white/[0.02] p-4 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 size-4 accent-punch"
            />
            I understand an AI will trade memecoins with these funds, that most memecoin traders lose money, and that I
            can lose all of the funds in my vault.
          </label>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button size="lg" disabled={!accepted} onClick={() => setStarted(true)}>
              {VAULT_PUBLISHED ? "Sign and start" : "Start (preview)"} <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}
    </Container>
  );
}

function Stepper({ step, onStep }: { step: number; onStep: (s: number) => void }) {
  return (
    <nav aria-label="Progress" className="mx-auto flex max-w-md items-center justify-between">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <button
            type="button"
            onClick={() => onStep(i)}
            className="flex items-center gap-2"
            aria-current={i === step ? "step" : undefined}
          >
            <span
              className={cx(
                "num flex size-8 items-center justify-center rounded-full border text-xs transition",
                i < step && "border-punch bg-punch text-white",
                i === step && "border-punch text-punch shadow-[0_0_0_4px_rgb(255_76_152/0.15)]",
                i > step && "border-line text-faint",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cx("text-sm", i <= step ? "text-ink" : "text-faint")}>{s}</span>
          </button>
          {i < STEPS.length - 1 ? (
            <span className={cx("mx-3 h-px flex-1", i < step ? "bg-punch/60" : "bg-line")} />
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function Block({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="num text-xs text-punch">0{n}</span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="num text-ink-2">{children}</span>
    </div>
  );
}

function Started({ modelLabel, price }: { modelLabel: string; price: number }) {
  return (
    <Container className="py-20">
      <div className="card mx-auto max-w-lg p-10 text-center animate-rise">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gain/10 text-gain">
          <Check className="size-7" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Your agent is reading the market…</h1>
        <p className="mt-3 text-sm text-muted">
          {modelLabel} will make its first decision in about a minute. {usd(price)}/day after the free days; pause any
          time.
        </p>
        <Badge tone="warn" className="mt-5">
          Preview · nothing was signed
        </Badge>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/dashboard">Open dashboard</ButtonLink>
          <Link href="/" className="inline-flex h-10 items-center px-4 text-sm text-muted hover:text-ink">
            Home
          </Link>
        </div>
      </div>
    </Container>
  );
}
