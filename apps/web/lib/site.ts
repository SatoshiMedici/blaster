/** Site identity, shared by metadata, the manifest and wallet prompts. */
export const APP_NAME = "Blast Agents";
export const APP_DESCRIPTION =
  "Pick an AI model, set your limits, and let it trade Blast launches on Sui from a vault you own. The agent can trade but never withdraw.";

/** Canonical URL. Set NEXT_PUBLIC_SITE_URL to the production domain. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
