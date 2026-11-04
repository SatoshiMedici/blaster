import { ArrowRight, ShieldCheck, Timer, Undo2 } from "lucide-react";
import { AgentTerminal } from "@/components/agent-terminal";
import { Custody, Faq, HowItWorks, Models, ModelVsModel, Ticker } from "@/components/landing-sections";
import { PricingCalculator } from "@/components/pricing-calculator";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid items-center gap-14 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div className="animate-rise">
            <p className="kicker inline-flex items-center gap-2 rounded-full border border-punch/20 bg-punch/[0.06] px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-punch" /> AI agents · your vault · Sui
            </p>
            <h1 className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]">
              An AI trades Blast launches. <span className="text-gradient">You keep the keys.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
              Pick a model, decide how active it is, set your limits. It trades from a vault you own and shows its
              reasoning for every move. Withdraw any time. You can lose money.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/start" size="lg">
                Start an agent <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/leaderboard" size="lg" variant="secondary">
                See the leaderboard
              </ButtonLink>
            </div>
            <ul className="mt-10 grid max-w-xl gap-3 text-sm text-ink-2 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-gain" /> Can't withdraw
              </li>
              <li className="flex items-center gap-2">
                <Undo2 className="size-4 text-gain" /> Revoke in one click
              </li>
              <li className="flex items-center gap-2">
                <Timer className="size-4 text-gain" /> Live in a minute
              </li>
            </ul>
          </div>
          <div className="relative animate-rise [animation-delay:120ms]">
            <div aria-hidden className="absolute -inset-8 -z-10 rounded-[2rem] bg-punch/20 opacity-50 blur-3xl" />
            <AgentTerminal />
          </div>
        </Container>
        <Ticker />
      </section>

      <Container className="space-y-32 pt-28">
        <HowItWorks />
        <Custody />
        <Models />
        <section id="pricing" className="scroll-mt-24">
          <SectionHeading
            kicker="Pricing"
            title={
              <>
                Pay for what your agent does. <span className="text-muted">No minimum.</span>
              </>
            }
            body="The price is built from what your plan costs to run (model calls and gas) plus a margin. Choose how active the agent is; see what it means for your vault before you sign."
          />
          <div className="mt-12">
            <PricingCalculator />
          </div>
        </section>
        <ModelVsModel />
        <Faq />

        <section className="card relative overflow-hidden px-6 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,rgb(255_76_152/0.25),transparent)]"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Your vault. Your limits. <span className="text-gradient">Its decisions, in the open.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              First 3 days free. Start with any amount; you can lose all of it.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/start" size="lg">
                Start an agent <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
