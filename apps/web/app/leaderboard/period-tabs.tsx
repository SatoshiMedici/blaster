"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui";

/** 7d / 30d / all-time (SPEC 9.1, default 30d). Wired to `GET /leaderboard?period=` once the API exists. */
export function PeriodTabs() {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");
  return (
    <Segmented
      label="Period"
      size="sm"
      value={period}
      onChange={setPeriod}
      options={[
        { value: "7d", label: "7 days" },
        { value: "30d", label: "30 days" },
        { value: "all", label: "All time" },
      ]}
    />
  );
}
