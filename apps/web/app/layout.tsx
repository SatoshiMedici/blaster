import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Blast Agents: AI trading from your own vault", template: "%s · Blast Agents" },
  description:
    "Pick an AI model, set your limits, and let it trade Blast launches on Sui from a vault you own. The agent can trade but never withdraw.",
};

export const viewport: Viewport = { themeColor: "#0D1117", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="grain backdrop-ambient min-h-dvh">
        <Providers>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
