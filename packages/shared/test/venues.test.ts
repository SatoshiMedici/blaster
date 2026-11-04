import { describe, expect, it } from "vitest";
import { ALL_VENUES_MASK, liveVenues, maskToVenues, VENUES, venuesToMask } from "../src/index.ts";

describe("venues", () => {
  it("bits match the Move constants (Blast = 1, SuiPump = 2)", () => {
    expect(VENUES.blast.bit).toBe(1);
    expect(VENUES.suipump.bit).toBe(2);
    expect(ALL_VENUES_MASK).toBe(3);
  });

  it("round-trips between IDs and the on-chain mask", () => {
    expect(venuesToMask(["blast", "suipump"])).toBe(3);
    expect(maskToVenues(2)).toEqual(["suipump"]);
    expect(() => venuesToMask([])).toThrow();
  });

  it("offers only venues whose vault adapter is live", () => {
    expect(liveVenues()).toEqual(["blast"]);
  });
});
