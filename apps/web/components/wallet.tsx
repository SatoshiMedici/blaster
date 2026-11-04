"use client";

import { useCurrentAccount, useDAppKit, useWallets } from "@mysten/dapp-kit-react";
import { Check, Copy, LogOut, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx, shortAddr } from "@/lib/format";
import { Button } from "./ui";

/**
 * Branded wallet connection (SPEC 1b screen 1). Lists every installed Sui-standard wallet (Slush,
 * Phantom, Backpack, Suiet, Nightly, OKX, …) and offers Google / X sign-in through zkLogin.
 * The zkLogin path needs an Enoki key and is shown as coming soon until it is configured.
 */
export function WalletButton({ size = "md", label = "Connect" }: { size?: "md" | "lg"; label?: string }) {
  const account = useCurrentAccount();
  const [open, setOpen] = useState(false);

  if (account) return <AccountPill address={account.address} />;
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Wallet className="size-4" /> {label}
      </Button>
      {open ? <ConnectDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AccountPill({ address }: { address: string }) {
  const dAppKit = useDAppKit();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white/[0.03] p-1 pl-3">
      <span className="size-2 rounded-full bg-gain" aria-hidden />
      <span className="num px-1.5 text-sm text-ink-2">{shortAddr(address)}</span>
      <button
        type="button"
        aria-label="Copy address"
        className="rounded-full p-1.5 text-muted hover:bg-white/[0.06] hover:text-ink"
        onClick={() => {
          void navigator.clipboard?.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <button
        type="button"
        aria-label="Disconnect"
        className="rounded-full p-1.5 text-muted hover:bg-white/[0.06] hover:text-ink"
        onClick={() => void dAppKit.disconnectWallet()}
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}

function ConnectDialog({ onClose }: { onClose: () => void }) {
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* The backdrop is a real button, so closing by click is also reachable without a mouse. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        tabIndex={-1}
        className="card relative w-full max-w-md animate-rise p-6 outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="kicker">Step 1 of 3</p>
            <h2 id="connect-title" className="mt-2 text-xl font-semibold tracking-tight">
              Connect to own your vault
            </h2>
            <p className="mt-1 text-sm text-muted">Your address owns the vault. We never see your keys.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-white/[0.06] hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {wallets.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
              No Sui wallet found in this browser. Install Slush, Phantom or another Sui wallet, or sign in with Google
              below.
            </p>
          ) : (
            wallets.map((w) => (
              <button
                key={w.name}
                type="button"
                disabled={pending !== null}
                onClick={async () => {
                  setPending(w.name);
                  setError(null);
                  try {
                    await dAppKit.connectWallet({ wallet: w });
                    onClose();
                  } catch (e) {
                    setError((e as Error).message || "Connection was rejected");
                  } finally {
                    setPending(null);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-line-soft bg-white/[0.02] px-4 py-3 text-left transition hover:border-punch/40 hover:bg-white/[0.05] disabled:opacity-50"
              >
                {/* biome-ignore lint/performance/noImgElement: wallet icons are data URIs from the wallet standard */}
                <img src={w.icon} alt="" className="size-8 rounded-lg" />
                <span className="flex-1 text-sm font-medium">{w.name}</span>
                <span className="font-mono text-[11px] text-faint">
                  {pending === w.name ? "Approve in wallet…" : "Detected"}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="hairline flex-1" /> or <span className="hairline flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {["Google", "X"].map((p) => (
            <button
              key={p}
              type="button"
              disabled
              title="zkLogin via Enoki: needs the Enoki key in config"
              className="flex items-center justify-center gap-2 rounded-xl border border-line-soft bg-white/[0.02] px-4 py-3 text-sm text-muted"
            >
              Continue with {p}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center font-mono text-[11px] text-faint">Google / X sign-in (zkLogin) is coming soon</p>

        {error ? <p className={cx("mt-4 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss")}>{error}</p> : null}
      </div>
    </div>
  );
}
