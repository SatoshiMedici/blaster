/** Display formatting. Money is computed elsewhere in integer units; these only render. */

export const usd = (v: number, digits = 2) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const compactUsd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export const sui = (v: number, digits = 2) =>
  `${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} SUI`;

export const pct = (v: number, digits = 1, signed = false) => {
  const s = `${(v * 100).toFixed(digits)}%`;
  return signed && v > 0 ? `+${s}` : s;
};

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const timeAgo = (ms: number, now: number) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
};

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");
