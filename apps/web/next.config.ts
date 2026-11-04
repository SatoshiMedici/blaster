import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@blast-agents/shared", "@blast-agents/vault-sdk"],
  poweredByHeader: false,
};

export default config;
