import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { assertMainnet, launchpad } from "./chain.ts";
import { AGENTS, LIMITS, MODE, TICK_SECONDS } from "./config.ts";
import { collectOpeningRounds, executeOrder } from "./executor.ts";
import { loadState, log, saveState } from "./journal.ts";
import { check } from "./risk.ts";
import { type Market, readAgent, readMarket } from "./snapshot.ts";
import { makeTrader, type Trader } from "./traders.ts";

type Agent = {
  trader: Trader;
  address: string;
  signer?: Ed25519Keypair;
  opponent: string;
};

function setup(): Agent[] {
  return AGENTS.map((cfg, i) => {
    const signer = cfg.secretKey ? Ed25519Keypair.fromSecretKey(cfg.secretKey) : undefined;
    const address = signer?.toSuiAddress() ?? process.env[`${cfg.name.toUpperCase()}_ADDRESS`];
    if (!address)
      throw new Error(
        `Set ${cfg.name.toUpperCase()}_SUI_SECRET_KEY, or ${cfg.name.toUpperCase()}_ADDRESS for a watch-only dry run`,
      );
    if (MODE === "live" && !signer) throw new Error(`live mode needs ${cfg.name.toUpperCase()}_SUI_SECRET_KEY`);
    const other = AGENTS[(i + 1) % AGENTS.length] ?? cfg;
    return { trader: makeTrader(cfg.name, cfg.model), address, signer, opponent: `${other.name} (${other.model})` };
  });
}

async function runAgent(agent: Agent, market: Market): Promise<string> {
  const name = agent.trader.name;
  const state = loadState(name);
  const today = new Date().toISOString().slice(0, 10);
  if (state.spendDay !== today) Object.assign(state, { spendDay: today, spentTodayMist: "0" });

  const wallet = { address: agent.address, signer: agent.signer };
  const live = MODE === "live";

  // 1. Housekeeping: settle and collect our opening-round bids.
  const bids = new Set(state.bidLaunchIds);
  for (const line of await collectOpeningRounds(bids, wallet, live)) log(name, { kind: "round", line });
  state.bidLaunchIds = [...bids];
  for (const id of state.bidLaunchIds) if (!state.heldLaunchIds.includes(id)) state.heldLaunchIds.push(id);

  // 2. Read the wallet and score it.
  const held = [...state.heldLaunchIds];
  const { view, positionMist, tokens } = await readAgent(agent.address, market, held, BigInt(state.spentTodayMist));
  state.heldLaunchIds = held.filter((id) => (tokens.get(id) ?? 0n) > 0n || bids.has(id));
  // SUI locked in undelivered opening-round bids still counts toward the score.
  let bidMist = 0n;
  for (const id of bids) bidMist += await launchpad.getOpeningRoundBid(id, agent.address).catch(() => 0n);
  const valueMist =
    BigInt(Math.round(view.sui_balance * 1e9)) + bidMist + [...positionMist.values()].reduce((a, b) => a + b, 0n);
  state.startValueMist ??= valueMist.toString();
  const start = BigInt(state.startValueMist);
  const drawdownBps = start > 0n && valueMist < start ? ((start - valueMist) * 10_000n) / start : 0n;
  const halted = drawdownBps >= LIMITS.maxDrawdownBps;

  // 3. Ask the model. A timeout or a crash counts as hold.
  const decision = await Promise.race([
    agent.trader.decide({ market: market.launches, marketJson: market.json, me: view, opponent: agent.opponent }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("model timeout")), 90_000)),
  ]).catch((error: Error) => ({ summary: `error, holding: ${error.message}`, actions: [] }));
  log(name, { kind: "decision", model: agent.trader.model, value_sui: Number(valueMist) / 1e9, decision });

  // 4. Plain-code risk check, then execute what passed.
  const verdicts = await check(decision.actions, {
    market,
    spendableMist: BigInt(Math.round(view.spendable_sui * 1e9)),
    spentTodayMist: BigInt(state.spentTodayMist),
    positionMist,
    tokens,
    halted,
  });
  for (const v of verdicts) {
    if (!v.order) {
      log(name, { kind: "rejected", action: v.action, why: v.rejected });
      continue;
    }
    const result = await executeOrder(v.order, market, wallet, live);
    log(name, { kind: "order", order: v.order, result });
    if (!result.ok) continue;
    if (v.order.kind !== "sell") state.spentTodayMist = (BigInt(state.spentTodayMist) + v.order.quoteMist).toString();
    if (v.order.kind === "join") state.bidLaunchIds.push(v.order.launchId);
    if (v.order.kind !== "sell" && !state.heldLaunchIds.includes(v.order.launchId))
      state.heldLaunchIds.push(v.order.launchId);
  }
  saveState(name, state);
  const pnl = ((Number(valueMist) - Number(start)) / 1e9).toFixed(3);
  return `${name.padEnd(8)} value ${(Number(valueMist) / 1e9).toFixed(3)} SUI  pnl ${pnl}${halted ? "  HALTED" : ""}  | ${decision.summary.slice(0, 100)}`;
}

async function tick(agents: Agent[]): Promise<void> {
  const market = await readMarket();
  // Same snapshot for both models, decided in parallel: a fair fight.
  const lines = await Promise.all(
    agents.map((a) => runAgent(a, market).catch((e: Error) => `${a.trader.name}: error ${e.message}`)),
  );
  console.log(`\n[${market.at}] ${MODE.toUpperCase()} · ${market.launches.length} tradable launches`);
  for (const line of lines) console.log(`  ${line}`);
}

async function main() {
  await assertMainnet();
  const agents = setup();
  console.log(`Blast arena: ${agents.map((a) => `${a.trader.name}=${a.trader.model}`).join(" vs ")} · mode ${MODE}`);
  if (process.argv.includes("--once")) return tick(agents);
  for (;;) {
    await tick(agents).catch((e: Error) => console.error("tick failed:", e.message));
    await new Promise((r) => setTimeout(r, TICK_SECONDS * 1000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
