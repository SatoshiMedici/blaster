"use client";

import { useCurrentAccount, useDAppKit, useWallets } from "@mysten/dapp-kit-react";
import { isEnokiWallet } from "@mysten/enoki";
import { Check, Copy, LogOut, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shortAddr } from "@/lib/format";
import { Button } from "./ui";

/**
 * Branded wallet connection (SPEC 1b screen 1). Lists every Sui-standard wallet the browser has
 * (Slush, Phantom, Backpack, Suiet, Nightly, OKX, …) and, when Enoki is configured, social sign-in
 * through zkLogin (Google; Facebook and Twitch optional). Each option is a wallet-standard wallet,
 * so they all connect the same way.
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

/** Turns wallet errors into something a person can act on. */
function friendlyError(e: unknown): string {
  const msg = (e as Error)?.message ?? "";
  if (/reject|denied|cancel/i.test(msg)) return "The request was declined in your wallet. Try again when ready.";
  if (/popup|window/i.test(msg))
    return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
  if (/chain|network/i.test(msg)) return "Switch your wallet to Sui Mainnet, then try again.";
  return msg || "Couldn't connect. Try again, or pick another wallet.";
}

type WalletItem = ReturnType<typeof useWallets>[number];

function ConnectDialog({ onClose }: { onClose: () => void }) {
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const social = wallets.filter((w) => isEnokiWallet(w));
  const installed = wallets.filter((w) => !isEnokiWallet(w));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const connect = async (w: WalletItem) => {
    setPending(w.name);
    setError(null);
    try {
      await dAppKit.connectWallet({ wallet: w });
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(null);
    }
  };

  // Rendered at the document root: inside the header, `backdrop-filter` would make `fixed`
  // position relative to the header and clip the dialog.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        tabIndex={-1}
        className="card relative max-h-[calc(100dvh-2rem)] w-full max-w-md animate-rise overflow-y-auto p-6 outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="connect-title" className="text-xl font-semibold tracking-tight">
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

        {social.length > 0 ? (
          <div className="mt-6 grid gap-2">
            {social.map((w) => (
              <WalletRow key={w.name} wallet={w} pending={pending} onPick={connect} label={`Continue with ${w.name}`} />
            ))}
            <p className="text-center font-mono text-[11px] text-faint">
              No wallet needed: a Sui address from your login
            </p>
          </div>
        ) : null}

        {social.length > 0 ? (
          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <span className="hairline flex-1" /> or use a wallet <span className="hairline flex-1" />
          </div>
        ) : null}

        <div className={social.length > 0 ? "space-y-2" : "mt-6 space-y-2"}>
          {installed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
              No Sui wallet found in this browser. Install Slush, Phantom, Backpack or another Sui wallet.
            </p>
          ) : (
            installed.map((w) => <WalletRow key={w.name} wallet={w} pending={pending} onPick={connect} />)
          )}
        </div>

        {social.length === 0 ? (
          <p className="mt-5 rounded-xl border border-line-soft bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-muted">
            Prefer Google? Choose <span className="text-ink-2">Slush</span>: its web wallet lets you sign in with
            Google, no extension needed.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function WalletRow({
  wallet,
  pending,
  onPick,
  label,
}: {
  wallet: WalletItem;
  pending: string | null;
  onPick: (w: WalletItem) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={pending !== null}
      onClick={() => onPick(wallet)}
      className="flex w-full items-center gap-3 rounded-xl border border-line-soft bg-white/[0.02] px-4 py-3 text-left transition hover:border-punch/40 hover:bg-white/[0.05] disabled:opacity-50"
    >
      {/* biome-ignore lint/performance/noImgElement: wallet icons are data URIs from the wallet standard */}
      <img src={wallet.icon} alt="" className="size-8 rounded-lg" />
      <span className="flex-1 text-sm font-medium">{label ?? wallet.name}</span>
      <span className="font-mono text-[11px] text-faint">{pending === wallet.name ? "Approve in wallet…" : ""}</span>
    </button>
  );
}
