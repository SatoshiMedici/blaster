import "dotenv/config";

const env = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") throw new Error(`Missing env ${name}`);
  return value;
};
const sui = (name: string, fallback: string): bigint => BigInt(Math.round(Number(env(name, fallback)) * 1e9));

export const SUI_TYPE = "0x2::sui::SUI";
export const MIST_PER_SUI = 1_000_000_000n;

/** "dry" simulates every trade and signs nothing. "live" signs and submits. */
export const MODE = env("MODE", "dry") as "dry" | "live";
if (MODE !== "dry" && MODE !== "live") throw new Error("MODE must be dry or live");

export const SUI_GRPC_URL = env("SUI_GRPC_URL", "https://fullnode.mainnet.sui.io:443");
export const TICK_SECONDS = Number(env("TICK_SECONDS", "60"));
export const MAX_LAUNCHES_IN_SNAPSHOT = Number(env("MAX_LAUNCHES_IN_SNAPSHOT", "25"));

/** Hard limits. The models can ask for anything; these decide what can happen. */
export const LIMITS = {
  maxTradeMist: sui("MAX_TRADE_SUI", "5"),
  maxPositionMist: sui("MAX_POSITION_SUI", "15"),
  maxDailySpendMist: sui("MAX_DAILY_SPEND_SUI", "50"),
  gasReserveMist: sui("GAS_RESERVE_SUI", "2"),
  maxOpenPositions: Number(env("MAX_OPEN_POSITIONS", "5")),
  maxActionsPerTick: Number(env("MAX_ACTIONS_PER_TICK", "2")),
  slippageBps: BigInt(env("SLIPPAGE_BPS", "300")),
  /** Skip launches whose creator sell burn is above this (curve sells lose this share). */
  maxSellBurnBps: BigInt(env("MAX_SELL_BURN_BPS", "1000")),
  /** A bot that falls this far below its starting value stops trading. */
  maxDrawdownBps: BigInt(env("MAX_DRAWDOWN_BPS", "3000")),
};

export type AgentConfig = {
  name: "claude" | "chatgpt";
  model: string;
  secretKey: string | undefined;
};

export const AGENTS: AgentConfig[] = [
  {
    name: "claude",
    model: env("CLAUDE_MODEL", "claude-sonnet-5-5"),
    secretKey: process.env.CLAUDE_SUI_SECRET_KEY,
  },
  {
    name: "chatgpt",
    model: env("OPENAI_MODEL", "gpt-6.1-sol"),
    secretKey: process.env.CHATGPT_SUI_SECRET_KEY,
  },
];
