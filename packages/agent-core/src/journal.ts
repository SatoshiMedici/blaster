import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = process.env.DATA_DIR ?? "data";
mkdirSync(DIR, { recursive: true });

const json = (value: unknown) => JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

/** Everything an agent has to remember between ticks and restarts. */
export type AgentState = {
  startValueMist: string | null;
  heldLaunchIds: string[];
  bidLaunchIds: string[];
  spendDay: string;
  spentTodayMist: string;
};

export function loadState(agent: string): AgentState {
  const path = `${DIR}/${agent}.state.json`;
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as AgentState;
  return { startValueMist: null, heldLaunchIds: [], bidLaunchIds: [], spendDay: "", spentTodayMist: "0" };
}

export function saveState(agent: string, state: AgentState): void {
  writeFileSync(`${DIR}/${agent}.state.json`, json(state));
}

/** Append-only log: every decision, every verdict, every transaction. This feeds the leaderboard. */
export function log(agent: string, entry: Record<string, unknown>): void {
  appendFileSync(`${DIR}/${agent}.jsonl`, `${json({ at: new Date().toISOString(), agent, ...entry })}\n`);
}
