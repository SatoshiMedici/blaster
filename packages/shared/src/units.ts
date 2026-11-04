export const MIST_PER_SUI = 1_000_000_000n;
export const SUI_TYPE = "0x2::sui::SUI";

/** Decimal SUI string or number -> MIST, rounding down. Rejects negatives and NaN. */
export function suiToMist(sui: number | string): bigint {
  const text = typeof sui === "number" ? sui.toFixed(9) : sui.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`invalid SUI amount: ${sui}`);
  const [whole = "0", frac = ""] = text.split(".");
  return BigInt(whole) * MIST_PER_SUI + BigInt(frac.padEnd(9, "0").slice(0, 9));
}

export function mistToSui(mist: bigint): number {
  return Number(mist) / 1e9;
}

export function formatSui(mist: bigint, decimals = 3): string {
  return mistToSui(mist).toFixed(decimals);
}
