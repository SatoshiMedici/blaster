import { describe, expect, it } from "vitest";
import { cacheHitAlarmFloor, onModelFailure, PlatformSpendGuard, VaultSpendLedger } from "../src/budget.ts";
import { warmUpThenFanOut } from "../src/openrouter.ts";
import { DEFAULT_SCREEN, screenLaunches } from "../src/screener.ts";
import type { LaunchView } from "../src/snapshot.ts";

const launch = (id: string, over: Partial<LaunchView> = {}): LaunchView => ({
  launch_id: id,
  untrusted_symbol: "X",
  untrusted_name: "X",
  lifecycle: "Live",
  minutes_since_public: 10,
  progress_to_graduation_pct: 20,
  fdv_sui: 1_000,
  real_reserve_sui: 100,
  graduation_target_sui: 8_000,
  trade_fee_pct: 1.5,
  creator_sell_burn_pct: 1,
  opening_round: null,
  had_opening_round: false,
  ...over,
});

describe("screenLaunches", () => {
  it("drops uneconomic launches with a reason", () => {
    const r = screenLaunches(
      [
        launch("a"),
        launch("b", { creator_sell_burn_pct: 30 }),
        launch("c", { progress_to_graduation_pct: 95 }),
        launch("d", { real_reserve_sui: 1 }),
      ],
      new Set(),
    );
    expect(r.kept.map((l) => l.launch_id)).toEqual(["a"]);
    expect(r.rejected.map((x) => x.why)).toEqual([
      "sell burn too high",
      "too close to graduation",
      "reserve too small",
    ]);
  });

  it("always keeps held launches and bounds the snapshot size in a stable order", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      launch(`l${String(i).padStart(2, "0")}`, { real_reserve_sui: 100 + i }),
    );
    const held = launch("zz", { creator_sell_burn_pct: 40 });
    const r = screenLaunches([...many, held], new Set(["zz"]));
    expect(r.kept).toHaveLength(DEFAULT_SCREEN.maxLaunches);
    expect(r.kept.some((l) => l.launch_id === "zz")).toBe(true);
    const ids = r.kept.map((l) => l.launch_id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("warmUpThenFanOut", () => {
  it("finishes the first call before starting any other", async () => {
    const order: string[] = [];
    await warmUpThenFanOut([1, 2, 3], async (n) => {
      order.push(`start${n}`);
      await new Promise((r) => setTimeout(r, n === 1 ? 20 : 1));
      order.push(`end${n}`);
      return n;
    });
    expect(order.slice(0, 2)).toEqual(["start1", "end1"]);
  });
});

describe("spend backstops", () => {
  it("stops a vault at its daily AI dollar ceiling", () => {
    const l = new VaultSpendLedger(0.45);
    l.record("v", 0.44, 0);
    expect(l.allow("v", 0)).toBe(true);
    l.record("v", 0.02, 0);
    expect(l.allow("v", 0)).toBe(false);
    expect(l.allow("v", 86_400_000)).toBe(true);
  });

  it("an empty OpenRouter balance stops every call", () => {
    const g = new PlatformSpendGuard(100);
    expect(onModelFailure(g, "out_of_credits")).toBe("hold_and_stop_all");
    expect(g.allow(0)).toBe(false);
    expect(onModelFailure(new PlatformSpendGuard(100), "timeout")).toBe("hold");
  });

  it("alarms below 80% of the best possible cache hit rate", () => {
    expect(cacheHitAlarmFloor(10)).toBeCloseTo(0.72);
    expect(cacheHitAlarmFloor(1)).toBe(0);
  });
});
