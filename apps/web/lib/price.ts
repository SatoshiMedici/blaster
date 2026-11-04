"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Live SUI/USD for display and quotes, from public price APIs (Binance first, CoinGecko as a
 * fallback). The fee job charges from a separately checked multi-source price (`aggregatePrice`).
 */
async function fetchSuiUsd(): Promise<{ price: number; source: string }> {
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SUIUSDT", { cache: "no-store" });
    const j = (await r.json()) as { price?: string };
    const p = Number(j.price);
    if (r.ok && p > 0) return { price: p, source: "Binance" };
  } catch {
    // fall through to the next source
  }
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd", {
    cache: "no-store",
  });
  const j = (await r.json()) as { sui?: { usd?: number } };
  const p = Number(j.sui?.usd);
  if (r.ok && p > 0) return { price: p, source: "CoinGecko" };
  throw new Error("SUI price unavailable");
}

export function useSuiPrice() {
  return useQuery({
    queryKey: ["sui-usd"],
    queryFn: fetchSuiUsd,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
}
