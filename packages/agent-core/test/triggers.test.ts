import { resolveActivity } from "@blast-agents/shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRIGGER_CONFIG,
  evaluateTriggers,
  initialTriggerState,
  recordDecision,
  triggerConfigFor,
} from "../src/triggers.ts";

const MIN = 60_000;
const market = (...ls: Array<[string, number]>) =>
  ls.map(([launch_id, p]) => ({ launch_id, progress_to_graduation_pct: p }));

describe("evaluateTriggers", () => {
  it("fires immediately for a new vault", () => {
    const r = evaluateTriggers(initialTriggerState(), market(["a", 10]), [], 0);
    expect(r.fire).toBe(true);
    expect(r.reasons).toContain("vault_created");
  });

  it("does nothing when nothing changed", () => {
    const s = recordDecision(market(["a", 10]), [], 0, initialTriggerState());
    expect(evaluateTriggers(s, market(["a", 12]), [], 60 * MIN)).toEqual({
      fire: false,
      reasons: [],
      waitingForGap: false,
    });
  });

  it("coalesces new launches until the gap opens", () => {
    const s = recordDecision(market(["a", 10]), [], 0, initialTriggerState());
    const early = evaluateTriggers(s, market(["a", 10], ["b", 1]), [], 5 * MIN);
    expect(early).toEqual({ fire: false, reasons: ["new_launch"], waitingForGap: true });
    const later = evaluateTriggers(s, market(["a", 10], ["b", 1], ["c", 1]), [], DEFAULT_TRIGGER_CONFIG.minGapMs);
    expect(later.fire).toBe(true);
  });

  it("fires on a 50% or 80% crossing", () => {
    const s = recordDecision(market(["a", 45]), [], 0, initialTriggerState());
    expect(evaluateTriggers(s, market(["a", 51]), [], 31 * MIN).reasons).toEqual(["progress_cross"]);
    expect(evaluateTriggers(s, market(["a", 49]), [], 31 * MIN).fire).toBe(false);
  });

  it("a held position moving >10% is urgent and skips the gap", () => {
    const s = recordDecision(market(["a", 10]), [{ launch_id: "a", value_sui: 10 }], 0, initialTriggerState());
    const r = evaluateTriggers(s, market(["a", 10]), [{ launch_id: "a", value_sui: 8.9 }], 1 * MIN);
    expect(r.fire).toBe(true);
    expect(r.reasons).toEqual(["position_move"]);
    expect(evaluateTriggers(s, market(["a", 10]), [{ launch_id: "a", value_sui: 9.5 }], 1 * MIN).fire).toBe(false);
  });

  it("checks in on the plan's interval", () => {
    const s = recordDecision(market(["a", 10]), [], 0, initialTriggerState());
    expect(evaluateTriggers(s, market(["a", 10]), [], 2 * 60 * MIN).reasons).toEqual(["scheduled"]);
    const watchful = triggerConfigFor(resolveActivity({ level: "watchful" }));
    expect(evaluateTriggers(s, market(["a", 10]), [], 2 * 60 * MIN, watchful).fire).toBe(false);
    expect(evaluateTriggers(s, market(["a", 10]), [], 6 * 60 * MIN, watchful).reasons).toEqual(["scheduled"]);
  });

  it("an intense plan reacts to new launches within minutes", () => {
    const intense = triggerConfigFor(resolveActivity({ level: "intense" }));
    const s = recordDecision(market(["a", 10]), [], 0, initialTriggerState());
    expect(evaluateTriggers(s, market(["a", 10], ["b", 2]), [], 2 * MIN, intense).fire).toBe(true);
  });

  it("forgets launches that left the market", () => {
    const s1 = recordDecision(market(["a", 10], ["b", 10]), [], 0, initialTriggerState());
    const s2 = recordDecision(market(["b", 10]), [], 1, s1);
    expect(s2.seenLaunchIds).toEqual(["b"]);
  });
});
