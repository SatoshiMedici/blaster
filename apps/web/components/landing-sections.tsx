import { MODEL_CATALOG, quotePlan } from "@blast-agents/shared";
import { Ban, Gauge, KeyRound, Lock, PauseCircle, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { cx, usd } from "@/lib/format";
import { Badge, SectionHeading } from "./ui";

const STEPS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <Wallet className="size-5" />,
    title: "Connect",
    body: "Any Sui wallet. Your address owns the vault; we never touch your keys.",
  },
  {
    icon: <Gauge className="size-5" />,
    title: "Choose",
    body: "Pick a model, how active it is, and your risk limits. The price follows from what you pick.",
  },
  {
    icon: <Sparkles className="size-5" />,
    title: "Start",
    body: "One signature creates your vault, deposits, writes the limits and hands the agent a trade-only key.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24">
      <SectionHeading
        kicker="How it works"
        title={
          <>
            Three screens. <span className="text-muted">One signature.</span>
          </>
        }
        body="No API keys, no second token, no gas balance to manage. The first decision lands about a minute after you start."
      />
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card card-hover p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-punch/10 text-punch">
                {s.icon}
              </span>
              <span className="num text-sm text-faint">0{i + 1}</span>
            </div>
            <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Custody() {
  const can = [
    "Buy and sell Blast launches",
    "Within your on-chain limits",
    "Pay its daily fee, up to the limit you signed",
    "Pause itself if it can't pay",
  ];
  const cannot = [
    "Withdraw your SUI or tokens",
    "Send funds anywhere else",
    "Change your limits",
    "Un-pause or outlive a revoke",
  ];
  return (
    <section id="custody" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <SectionHeading
          kicker="Custody"
          title={
            <>
              The agent can trade.
              <br />
              <span className="text-gradient">It can never withdraw.</span>
            </>
          }
          body="Two keys, enforced by the Move contract, not by our servers. You hold the owner key. The agent holds a trade-only key that you can revoke in one click, even if our backend is down."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-gain" />
              <p className="text-sm font-semibold">Agent key can</p>
            </div>
            <ul className="mt-4 space-y-3">
              {can.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm text-ink-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gain" /> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-loss" />
              <p className="text-sm font-semibold">Agent key cannot</p>
            </div>
            <ul className="mt-4 space-y-3">
              {cannot.map((c) => (
                <li key={c} className="flex gap-2.5 text-sm text-ink-2">
                  <Ban className="mt-0.5 size-4 shrink-0 text-loss" /> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="card flex items-center gap-4 p-5 sm:col-span-2">
            <PauseCircle className="size-8 shrink-0 text-punch" />
            <p className="text-sm text-muted">
              <span className="text-ink">Pause, withdraw or revoke at any time.</span> Withdrawals always go to the
              owner key and work while paused, after revoke, and with our service offline.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const tierLabel = { premium: "Premium", standard: "Standard", budget: "Budget" } as const;
const tierBlurb = {
  premium: "Frontier models. Best for larger vaults.",
  standard: "Strong models at a lower cost.",
  budget: "About 1/20 of the cost. Made for small vaults and high activity.",
} as const;

export function Models() {
  return (
    <section id="models" className="scroll-mt-24">
      <SectionHeading
        kicker="Models"
        title="The models trading agents actually use."
        body="A curated set across three price tiers, all through one OpenRouter account. We don't claim any model trades better: public contests are short and noisy. Pick on style and price."
      />
      <div className="mt-12 space-y-8">
        {(["premium", "standard", "budget"] as const).map((tier) => {
          const models = MODEL_CATALOG.filter((m) => m.tier === tier);
          return (
            <div key={tier} className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div className="pt-2">
                <Badge tone={tier === "premium" ? "punch" : tier === "standard" ? "info" : "neutral"}>
                  {tierLabel[tier]}
                </Badge>
                <p className="mt-2 text-xs leading-relaxed text-faint">{tierBlurb[tier]}</p>
              </div>
              <div className={cx("grid gap-4", models.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                {models.map((m) => {
                  const from = quotePlan(m.key, { level: "watchful" }).priceUsdPerDay;
                  return (
                    <article key={m.key} className="card card-hover flex flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold tracking-tight">{m.label}</h3>
                          <p className="mt-0.5 font-mono text-[11px] text-faint">{m.slug}</p>
                        </div>
                        <p className="shrink-0 text-right">
                          <span className="block text-[10px] uppercase tracking-wider text-faint">from</span>
                          <span className="num text-ink">{usd(from)}</span>
                          <span className="text-[11px] text-muted">/day</span>
                        </p>
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{m.evidence}</p>
                      {!m.priceVerified ? (
                        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-warn/80">
                          Price check pending
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Can the agent take my money?",
    a: "No. Its key can only call buy, sell, its own pause, and a once-a-day fee capped by the spending limit you sign, paid only to the treasury you approved. Withdrawals go only to the owner key, and CI blocks any code change that would let the agent move value out.",
  },
  {
    q: "What does it cost?",
    a: "You choose a model and how active the agent is; the daily price follows from what that plan costs to run. There is no minimum deposit. We show the price as a yearly share of your vault, so you can pick a plan that fits. Paused or closed vaults pay nothing, and the first 3 days are free.",
  },
  {
    q: "What is the spending limit I sign?",
    a: "It's the most the contract will ever let us take in one day, like a card limit. It is set at 3× your plan's price so SUI price swings don't interrupt your agent. You are still charged only your plan's price.",
  },
  {
    q: "Can I stop it?",
    a: "Pause, revoke or withdraw at any time from the dashboard or directly on-chain. Revoke is instant and works even if our service is down.",
  },
  {
    q: "Will I make money?",
    a: "Maybe not. Most memecoin traders lose money, and an AI doesn't change that. Treat what you deposit as money you can afford to lose entirely.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24">
      <SectionHeading kicker="FAQ" title="Straight answers." align="center" />
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {FAQ.map((f) => (
          <details key={f.q} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-medium">
              {f.q}
              <span className="text-muted transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="px-6 pb-6 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
