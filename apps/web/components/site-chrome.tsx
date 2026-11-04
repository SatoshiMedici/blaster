"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/format";
import { Logo } from "./brand";
import { Container } from "./ui";
import { WalletButton } from "./wallet";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#models", label: "Models" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-canvas/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                "rounded-full px-3.5 py-2 text-sm transition-colors",
                path === n.href ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-ink-2 hover:bg-white/[0.06] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>
      {open ? (
        <nav aria-label="Mobile" className="border-t border-white/[0.04] md:hidden">
          <Container className="flex flex-col py-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-ink-2 hover:bg-white/[0.04]"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 sm:hidden">
              <WalletButton />
            </div>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.05]">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            AI agents that trade Blast launches from a vault you own. The agent can trade but never withdraw.
          </p>
        </div>
        <div>
          <p className="kicker">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link className="hover:text-ink" href="/start">
                Start an agent
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/dashboard">
                Dashboard
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/leaderboard">
                Leaderboard
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/#pricing">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="kicker">Trust</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link className="hover:text-ink" href="/#custody">
                How custody works
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" href="/#faq">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <Container className="border-t border-white/[0.04] py-6 text-xs leading-relaxed text-faint">
        <p>
          <strong className="font-medium text-muted">You can lose all of the funds in your vault.</strong> Memecoin
          trading is extremely risky and most participants lose money. Model performance shown is past performance only
          and is no guide to the future. Agent trades are not endorsements by Blast of any coin. Nothing here is
          investment advice. Not available in restricted regions.
        </p>
      </Container>
    </footer>
  );
}
