/**
 * Activity levels: how much the agent works, chosen by the user, not capped by the platform.
 *
 * The user picks a level (or a custom number of decisions per day). The level sets how often the
 * agent may call its model and how quickly it reacts; the daily price follows from it
 * (`pricing.ts`). The only ceiling is the one the user chose. Trades per decision are bounded only
 * by the user's on-chain risk limits.
 */
import { z } from "zod";

export const ACTIVITY_LEVEL_IDS = ["watchful", "steady", "active", "intense", "custom"] as const;
export type ActivityLevelId = (typeof ACTIVITY_LEVEL_IDS)[number];

export type ActivityLevel = {
  id: ActivityLevelId;
  label: string;
  /** Plain words for the Choose screen. */
  description: string;
  /** Most model decisions per UTC day. The user's own budget, prepaid by the daily fee. */
  decisionsPerDay: number;
  /** Checks in on its own at least this often (ms), even when the market is quiet. */
  scheduledEveryMs: number;
  /** Non-urgent triggers (new launches, curve crossings) wait this long after the last decision. */
  minGapMs: number;
};

const MIN = 60_000;
const HOUR = 60 * MIN;

export const ACTIVITY_LEVELS: Record<Exclude<ActivityLevelId, "custom">, ActivityLevel> = {
  watchful: {
    id: "watchful",
    label: "Watchful",
    description: "Checks a few times a day and reacts to big moves in what it holds.",
    decisionsPerDay: 6,
    scheduledEveryMs: 6 * HOUR,
    minGapMs: 2 * HOUR,
  },
  steady: {
    id: "steady",
    label: "Steady",
    description: "Looks at new launches about every half hour.",
    decisionsPerDay: 24,
    scheduledEveryMs: 2 * HOUR,
    minGapMs: 30 * MIN,
  },
  active: {
    id: "active",
    label: "Active",
    description: "Reacts to new launches within about ten minutes.",
    decisionsPerDay: 72,
    scheduledEveryMs: HOUR,
    minGapMs: 10 * MIN,
  },
  intense: {
    id: "intense",
    label: "Intense",
    description: "Reacts within a couple of minutes, all day.",
    decisionsPerDay: 288,
    scheduledEveryMs: 15 * MIN,
    minGapMs: 2 * MIN,
  },
};

/** The default the Choose screen starts on. */
export const DEFAULT_ACTIVITY: ActivityLevelId = "steady";

/** Custom budgets: 1 decision a day up to one per tick (every minute). */
export const CUSTOM_DECISIONS_RANGE = { min: 1, max: 1_440 } as const;

export const ActivityChoice = z.discriminatedUnion("level", [
  z.object({ level: z.enum(["watchful", "steady", "active", "intense"]) }),
  z.object({
    level: z.literal("custom"),
    decisionsPerDay: z.number().int().min(CUSTOM_DECISIONS_RANGE.min).max(CUSTOM_DECISIONS_RANGE.max),
  }),
]);
export type ActivityChoice = z.infer<typeof ActivityChoice>;

/**
 * Resolves a choice to a concrete level. A custom budget spreads evenly over the day: the
 * scheduled check runs at the average spacing (1 min – 24 h) and the coalescing gap is half of it.
 */
export function resolveActivity(choice: ActivityChoice): ActivityLevel {
  if (choice.level !== "custom") return ACTIVITY_LEVELS[choice.level];
  const n = choice.decisionsPerDay;
  const spacing = (24 * HOUR) / n;
  return {
    id: "custom",
    label: "Custom",
    description: `Up to ${n} decision${n === 1 ? "" : "s"} a day.`,
    decisionsPerDay: n,
    scheduledEveryMs: Math.min(24 * HOUR, Math.max(MIN, Math.round(spacing))),
    minGapMs: Math.min(12 * HOUR, Math.max(MIN, Math.round(spacing / 2))),
  };
}
