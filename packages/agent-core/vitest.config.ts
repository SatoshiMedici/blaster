import { defineConfig } from "vitest/config";

// Vitest sets MODE=test; the agent only accepts dry|live, and tests must never be live.
export default defineConfig({ test: { env: { MODE: "dry" } } });
