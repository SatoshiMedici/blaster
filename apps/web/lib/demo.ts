/**
 * Demo data for the preview build. The API (SPEC §13 step 6) and the stats engine (step 8) don't
 * exist yet, so the dashboard, feed and leaderboard render this deterministic, clearly labelled
 * sample. Every surface that uses it shows a "Demo data" badge. Replace with API queries.
 *
 * Prices and plans are NOT demo: they come from `@blast-agents/shared` (`quotePlan`, etc.).
 */

/** SUI/USD used to convert prices in the preview. The API will serve the checked live price. */
export const DEMO_SUI_USD = 0.87;

export type Verdict = "executed" | "clamped" | "rejected" | "hold";

export type FeedEntry = {
  id: string;
  atMs: number;
  model: string;
  summary: string;
  trigger: string;
  actions: Array<{
    side: "buy" | "sell";
    symbol: string;
    amountSui: number;
    reason: string;
    verdict: Verdict;
    note?: string;
    digest?: string;
  }>;
};

const H = 3_600_000;
const M = 60_000;

/** Fixed "now" so server and client render identically. */
export const DEMO_NOW = Date.UTC(2026, 10, 4, 14, 30);

export const DEMO_FEED: FeedEntry[] = [
  {
    id: "d7",
    atMs: DEMO_NOW - 3 * M,
    model: "Claude Sonnet 5.5",
    trigger: "new launch",
    summary: "Two new launches; one has a fair opening round and low sell burn. Small entry, keep dry powder.",
    actions: [
      {
        side: "buy",
        symbol: "NEBULA",
        amountSui: 4.2,
        reason: "Opening round settled evenly, burn 1%, 31% to graduation.",
        verdict: "executed",
        digest: "8hT3…qW2x",
      },
      {
        side: "buy",
        symbol: "CATZ",
        amountSui: 6,
        reason: "Fast early volume.",
        verdict: "rejected",
        note: "Sell burn 18% is above the 10% screen",
      },
    ],
  },
  {
    id: "d6",
    atMs: DEMO_NOW - 34 * M,
    model: "Claude Sonnet 5.5",
    trigger: "position moved +14%",
    summary: "MOONFISH ran ahead of its curve. Take a third off and let the rest ride.",
    actions: [
      {
        side: "sell",
        symbol: "MOONFISH",
        amountSui: 3.1,
        reason: "Lock part of a +14% move before the 80% crossing.",
        verdict: "executed",
        digest: "4Rk9…Lm7p",
      },
    ],
  },
  {
    id: "d5",
    atMs: DEMO_NOW - 2 * H,
    model: "Claude Sonnet 5.5",
    trigger: "scheduled check",
    summary: "Nothing worth paying fees for. Holding.",
    actions: [],
  },
  {
    id: "d4",
    atMs: DEMO_NOW - 3 * H - 12 * M,
    model: "Claude Sonnet 5.5",
    trigger: "curve crossed 50%",
    summary: "MOONFISH crossed half-way with steady buyers. Add within limits.",
    actions: [
      {
        side: "buy",
        symbol: "MOONFISH",
        amountSui: 9,
        reason: "Momentum with broad holders.",
        verdict: "clamped",
        note: "Reduced from 9 to 5 SUI: per-trade limit",
        digest: "2Qz1…Vb8n",
      },
    ],
  },
  {
    id: "d3",
    atMs: DEMO_NOW - 6 * H,
    model: "Claude Sonnet 5.5",
    trigger: "new launch",
    summary: "Three launches, all thin. Skip.",
    actions: [],
  },
];

export const DEMO_VAULT = {
  objectId: "0x7a3c9f21b0e4d8a6c5f1e2d3b4a59687c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
  model: "Claude Sonnet 5.5",
  modelKey: "claude",
  activity: "steady" as const,
  preset: "balanced" as const,
  status: "running" as "running" | "paused" | "halted",
  depositedSui: 1_150,
  valueSui: 1_212.4,
  feesPaidSui: 9.3,
  sinceDays: 8,
  decisionsToday: 9,
  positions: [
    { symbol: "MOONFISH", tokens: "1.82M", costSui: 11.2, valueSui: 14.9, toGraduation: 0.71, heldFor: "3h 12m" },
    { symbol: "NEBULA", tokens: "640K", costSui: 4.2, valueSui: 4.05, toGraduation: 0.33, heldFor: "3m" },
    { symbol: "SPARK", tokens: "2.4M", costSui: 7.5, valueSui: 5.6, toGraduation: 0.22, heldFor: "1d 4h" },
  ],
};

/** Vault value vs net deposits over the last 8 days, every 6 h; trades marked. */
export const DEMO_SERIES = Array.from({ length: 33 }, (_, i) => {
  const t = DEMO_NOW - (32 - i) * 6 * H;
  const deposits = i < 12 ? 1_000 : 1_150;
  const drift = Math.sin(i / 3.2) * 18 + Math.sin(i / 1.3) * 6 + i * 2.1;
  return {
    t,
    label: new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    value: Math.round((deposits + drift - (i < 12 ? 0 : 6)) * 10) / 10,
    deposits,
    trade: i % 7 === 3 ? ("buy" as const) : i % 9 === 5 ? ("sell" as const) : undefined,
  };
});

export type ModelStat = {
  key: string;
  label: string;
  medianTwr: number;
  inProfit: number;
  medianDrawdown: number;
  winRate: number;
  vaults: number;
  holdRatio: number;
  latencyS: number;
  series: number[];
};

export const DEMO_MODEL_STATS: ModelStat[] = [
  {
    key: "claude",
    label: "Claude Sonnet 5.5",
    medianTwr: 0.046,
    inProfit: 0.54,
    medianDrawdown: 0.11,
    winRate: 0.47,
    vaults: 412,
    holdRatio: 0.71,
    latencyS: 6.1,
    series: [0, 0.6, 1.1, 0.4, 1.9, 2.6, 2.1, 3.4, 3.9, 4.6],
  },
  {
    key: "chatgpt",
    label: "GPT-6.1 Sol",
    medianTwr: 0.021,
    inProfit: 0.49,
    medianDrawdown: 0.14,
    winRate: 0.44,
    vaults: 388,
    holdRatio: 0.58,
    latencyS: 4.8,
    series: [0, 0.9, 0.2, -0.6, 0.4, 1.3, 0.8, 1.6, 1.2, 2.1],
  },
  {
    key: "grok",
    label: "Grok 4.7",
    medianTwr: -0.012,
    inProfit: 0.42,
    medianDrawdown: 0.19,
    winRate: 0.39,
    vaults: 141,
    holdRatio: 0.49,
    latencyS: 3.9,
    series: [0, 1.4, 0.7, -0.8, -1.9, -0.6, -1.4, -0.3, -1.6, -1.2],
  },
];

export type LeaderRow = {
  rank: number;
  alias: string;
  model: string;
  twr: number;
  drawdown: number;
  winRate: number;
  trades: number;
  days: number;
};

export const DEMO_LEADERS: LeaderRow[] = [
  {
    rank: 1,
    alias: "0x4f…c1",
    model: "Claude Sonnet 5.5",
    twr: 0.318,
    drawdown: 0.08,
    winRate: 0.58,
    trades: 61,
    days: 29,
  },
  { rank: 2, alias: "0x9a…07", model: "GPT-6.1 Sol", twr: 0.244, drawdown: 0.07, winRate: 0.55, trades: 44, days: 30 },
  {
    rank: 3,
    alias: "0x12…ab",
    model: "Claude Sonnet 5.5",
    twr: 0.261,
    drawdown: 0.11,
    winRate: 0.52,
    trades: 88,
    days: 27,
  },
  {
    rank: 4,
    alias: "0xd3…e9",
    model: "DeepSeek V4 Pro",
    twr: 0.192,
    drawdown: 0.09,
    winRate: 0.5,
    trades: 37,
    days: 19,
  },
  { rank: 5, alias: "0x77…2f", model: "Grok 4.7", twr: 0.287, drawdown: 0.16, winRate: 0.46, trades: 102, days: 30 },
  {
    rank: 6,
    alias: "0x0c…5d",
    model: "Claude Haiku 5.5",
    twr: 0.133,
    drawdown: 0.08,
    winRate: 0.49,
    trades: 133,
    days: 22,
  },
  { rank: 7, alias: "0xb8…41", model: "GPT-6.1 Sol", twr: -0.041, drawdown: 0.12, winRate: 0.4, trades: 29, days: 14 },
  {
    rank: 8,
    alias: "0x5e…90",
    model: "Gemini 3.5 Flash",
    twr: -0.088,
    drawdown: 0.21,
    winRate: 0.37,
    trades: 57,
    days: 25,
  },
];

export const DEMO_EXTREMES = {
  wins: [
    {
      alias: "0x77…2f",
      model: "Grok 4.7",
      symbol: "ORBIT",
      pnlSui: 48.2,
      reason: "Bought the 50% crossing, sold before graduation.",
    },
    {
      alias: "0x4f…c1",
      model: "Claude Sonnet 5.5",
      symbol: "MOONFISH",
      pnlSui: 31.7,
      reason: "Scaled out across two +15% moves.",
    },
  ],
  losses: [
    {
      alias: "0x5e…90",
      model: "Gemini 3.5 Flash",
      symbol: "RUGPUP",
      pnlSui: -22.4,
      reason: "Entered late; creator sold into the curve.",
    },
    {
      alias: "0xb8…41",
      model: "GPT-6.1 Sol",
      symbol: "TURBO",
      pnlSui: -14.9,
      reason: "Momentum faded after the opening round.",
    },
  ],
};

/** Ticker lines for the landing page. */
export const DEMO_TICKER = [
  "Claude bought NEBULA · 4.2 SUI · executed",
  "GPT-6.1 held · nothing worth the fees",
  "Grok sold ORBIT · 12.0 SUI · executed",
  "Risk check clamped a buy from 9 → 5 SUI",
  "DeepSeek rejected CATZ · sell burn 18%",
  "Haiku bought SPARK · 1.5 SUI · executed",
  "Owner paused vault 0x0c…5d · instant",
  "Claude sold MOONFISH · 3.1 SUI · +14%",
];
