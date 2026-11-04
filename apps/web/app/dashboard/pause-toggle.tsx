"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Pause / resume. In production this returns a PTB for the owner to sign (SPEC §7); preview toggles locally. */
export function PauseToggle() {
  const [paused, setPaused] = useState(false);
  return (
    <Button variant={paused ? "primary" : "secondary"} onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
      {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
      {paused ? "Resume agent" : "Pause agent"}
    </Button>
  );
}
