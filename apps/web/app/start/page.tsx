import type { Metadata } from "next";
import { Suspense } from "react";
import { StartFlow } from "./start-flow";

export const metadata: Metadata = { title: "Start an agent" };

export default function StartPage() {
  return (
    <Suspense>
      <StartFlow />
    </Suspense>
  );
}
