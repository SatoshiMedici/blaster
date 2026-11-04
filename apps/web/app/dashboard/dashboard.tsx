"use client";

import { describeEmptyVault, type VaultState, VaultTransactions } from "@blast-agents/vault-sdk";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, ExternalLink, KeyRound, Pause, Play, Wallet } from "lucide-react";
import { useState } from "react";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { WalletButton } from "@/components/wallet";
import { executedDigest, ownedVaults, ownerCapFor, suiBalance } from "@/lib/chain";
import { API_URL, CAN_START, OPERATOR_ADDRESS, TREASURY_ADDRESS, VAULT_PACKAGE } from "@/lib/config";
import { cx, shortAddr, sui, usd } from "@/lib/format";
import { useSuiPrice } from "@/lib/price";

/** Everything here is read from Sui mainnet or built as a real transaction for the owner to sign. */
export function Dashboard() {
  const account = useCurrentAccount();
  const price = useSuiPrice();
  const balance = useQuery({
    queryKey: ["balance", account?.address],
    queryFn: () => suiBalance(account?.address ?? ""),
    enabled: Boolean(account),
  });
  const vaults = useQuery({
    queryKey: ["vaults", account?.address],
    queryFn: () => ownedVaults(account?.address ?? ""),
    enabled: Boolean(account && VAULT_PACKAGE),
  });

  if (!account) {
    return (
      <Container className="py-24">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <Wallet className="mx-auto size-8 text-punch" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Connect to see your vaults</h1>
          <p className="mt-2 text-sm text-muted">
            Your vaults, balances and agent activity are read straight from Sui for the connected address.
          </p>
          <div className="mt-7 flex justify-center">
            <WalletButton size="lg" label="Connect wallet" />
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <a
            href={`https://suiscan.xyz/mainnet/account/${account.address}`}
            target="_blank"
            rel="noreferrer"
            className="num mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            {shortAddr(account.address)} <ExternalLink className="size-3" />
          </a>
        </div>
        {CAN_START ? <ButtonLink href="/start">New vault</ButtonLink> : null}
      </div>

      <section className="card grid gap-6 p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Wallet balance</p>
          <p className="num mt-1 text-2xl">
            {balance.data !== undefined ? sui(balance.data, 2) : balance.isError ? "unavailable" : "…"}
          </p>
          <p className="num text-xs text-muted">
            {balance.data !== undefined && price.data ? usd(balance.data * price.data.price) : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">SUI price</p>
          <p className="num mt-1 text-2xl">
            {price.data ? usd(price.data.price, 4) : price.isError ? "unavailable" : "…"}
          </p>
          <p className="text-xs text-muted">{price.data ? `live · ${price.data.source}` : ""}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Vaults</p>
          <p className="num mt-1 text-2xl">
            {!VAULT_PACKAGE ? "0" : vaults.data === undefined ? "…" : vaults.data.length}
          </p>
          <p className="text-xs text-muted">{VAULT_PACKAGE ? "on-chain" : "contract not deployed yet"}</p>
        </div>
      </section>

      {!VAULT_PACKAGE ? (
        <LaunchStatus />
      ) : vaults.isError ? (
        <p className="card p-6 text-sm text-loss">Couldn't read your vaults from Sui. Try again shortly.</p>
      ) : vaults.data && vaults.data.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-semibold">No vault yet</h2>
          <p className="mt-2 text-sm text-muted">Start an agent to create your first vault.</p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/start">Start an agent</ButtonLink>
          </div>
        </div>
      ) : (
        vaults.data?.map((v) => (
          <VaultCard key={v.objectId} vault={v} owner={account.address} suiUsd={price.data?.price} />
        ))
      )}
    </Container>
  );
}

/** What is live and what isn't, stated plainly. */
function LaunchStatus() {
  const items: Array<[string, boolean, string]> = [
    ["Wallet connection", true, "Any Sui wallet"],
    ["Live Blast market data", true, "Read from mainnet"],
    ["Vault contract", Boolean(VAULT_PACKAGE), "Tested; publishing after audit"],
    ["Operator and treasury", Boolean(OPERATOR_ADDRESS && TREASURY_ADDRESS), "Configured at launch"],
    ["Agent service (AI decisions, fees, activity)", Boolean(API_URL), "In build"],
  ];
  return (
    <section className="card p-6">
      <h2 className="font-semibold tracking-tight">Launch status</h2>
      <p className="mt-1 text-sm text-muted">
        Vaults open when every item below is live. Until then nothing can be deposited.
      </p>
      <ul className="mt-5 space-y-3">
        {items.map(([label, ok, note]) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            {ok ? <CheckCircle2 className="size-4 text-gain" /> : <CircleDashed className="size-4 text-faint" />}
            <span className={ok ? "text-ink" : "text-muted"}>{label}</span>
            <span className="ml-auto text-xs text-faint">{ok ? "live" : note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VaultCard({ vault, owner, suiUsd }: { vault: VaultState; owner: string; suiUsd?: number }) {
  const dAppKit = useDAppKit();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "gain" | "loss"; text: string } | null>(null);
  const agentActive = vault.tradeCapId !== null;
  const tokens = [...vault.tokens.entries()];

  /** Builds a real PTB, has the wallet sign and execute it, then refreshes from chain. */
  const run = async (label: string, build: (tx: Transaction, ownerCap: string) => void) => {
    if (!VAULT_PACKAGE || !vault.initialSharedVersion) return;
    setBusy(label);
    setMessage(null);
    try {
      const ownerCap = await ownerCapFor(owner, vault.objectId);
      if (!ownerCap) throw new Error("This wallet doesn't hold the vault's owner key.");
      const tx = new Transaction();
      build(tx, ownerCap);
      const digest = executedDigest(await dAppKit.signAndExecuteTransaction({ transaction: tx }));
      setMessage({ tone: "gain", text: `${label}: done (${shortAddr(digest)}).` });
      await qc.invalidateQueries({ queryKey: ["vaults"] });
    } catch (e) {
      setMessage({ tone: "loss", text: `${label}: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  const vt = VAULT_PACKAGE ? new VaultTransactions(VAULT_PACKAGE) : null;
  const ref = { objectId: vault.objectId, initialSharedVersion: vault.initialSharedVersion ?? "0" };

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold tracking-tight">Vault</h2>
            <Badge tone={vault.paused ? "warn" : agentActive ? "gain" : "neutral"}>
              {vault.paused ? "paused" : agentActive ? "agent active" : "agent revoked"}
            </Badge>
          </div>
          <a
            href={`https://suiscan.xyz/mainnet/object/${vault.objectId}`}
            target="_blank"
            rel="noreferrer"
            className="num mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            {shortAddr(vault.objectId)} <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="text-right">
          <p className="num text-2xl">{sui(Number(vault.suiMist) / 1e9, 2)}</p>
          <p className="num text-xs text-muted">
            {suiUsd ? `${usd((Number(vault.suiMist) / 1e9) * suiUsd)} · ` : ""}
            {tokens.length} token position{tokens.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {tokens.length > 0 ? (
        <ul className="mt-5 space-y-1.5 text-sm">
          {tokens.map(([type, amount]) => (
            <li key={type} className="flex justify-between gap-4">
              <span className="truncate font-mono text-xs text-muted">{type.split("::").slice(-1)[0]}</span>
              <span className="num text-ink-2">{amount.toString()}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-6 grid gap-3 border-t border-white/[0.05] pt-5 text-sm sm:grid-cols-3">
        {[
          ["Per trade", sui(Number(vault.limits.maxTrade) / 1e9)],
          ["Per launch", sui(Number(vault.limits.maxPerLaunch) / 1e9)],
          ["Spend per day", sui(Number(vault.limits.maxDailySpend) / 1e9)],
          ["Open positions", `${vault.openPositions} of ${vault.limits.maxOpenPositions}`],
          ["Daily spending limit", sui(Number(vault.dailyFeeCapMist) / 1e9, 3)],
          ["Spent today", sui(Number(vault.spentTodayMist) / 1e9)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 sm:block">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="num text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>

      {vt ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.05] pt-5">
          {vault.paused ? (
            <ActionButton
              busy={busy}
              label="Resume"
              icon={<Play className="size-4" />}
              onClick={() => run("Resume", (tx, cap) => vt.resume(tx, { vault: ref, ownerCap: cap }))}
            />
          ) : (
            <ActionButton
              busy={busy}
              label="Pause"
              icon={<Pause className="size-4" />}
              onClick={() => run("Pause", (tx, cap) => vt.pause(tx, { vault: ref, ownerCap: cap }))}
            />
          )}
          <ActionButton
            busy={busy}
            label="Withdraw everything"
            title={describeEmptyVault(tokens.length).join(" ")}
            onClick={() =>
              run("Withdraw everything", (tx, cap) =>
                vt.emptyVault(tx, { vault: ref, ownerCap: cap, tokenTypes: tokens.map(([t]) => t), recipient: owner }),
              )
            }
          />
          {agentActive ? (
            <ActionButton
              busy={busy}
              danger
              label="Revoke agent"
              icon={<KeyRound className="size-4" />}
              onClick={() => run("Revoke agent", (tx, cap) => vt.revokeAgent(tx, { vault: ref, ownerCap: cap }))}
            />
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className={cx("mt-4 text-sm", message.tone === "gain" ? "text-gain" : "text-loss")}>{message.text}</p>
      ) : null}

      <p className="mt-5 text-xs text-faint">
        {API_URL
          ? "Agent decisions and trades appear in the activity feed."
          : "The agent's decisions and trades will appear here once the agent service is live. Withdraw and revoke work now, directly on-chain."}
      </p>
    </section>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  busy,
  danger,
  title,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  busy: string | null;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={busy !== null}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50",
        danger
          ? "border-loss/30 bg-loss/[0.06] text-loss hover:bg-loss/[0.12]"
          : "border-line-soft bg-white/[0.02] text-ink hover:border-punch/40",
      )}
    >
      {icon} {busy === label ? "Confirm in wallet…" : label}
    </button>
  );
}
