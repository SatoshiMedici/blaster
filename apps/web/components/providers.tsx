"use client";

import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react";
import { type AuthProvider, enokiWalletsInitializer } from "@mysten/enoki";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { APP_NAME } from "@/lib/site";

const GRPC_URL = process.env.NEXT_PUBLIC_SUI_GRPC_URL ?? "https://fullnode.mainnet.sui.io:443";

/**
 * Social sign-in through Sui zkLogin, via Mysten's Enoki (SPEC 1b). Each provider is a
 * wallet-standard wallet, so it appears in the same wallet list and signs like any wallet.
 * Enabled only when the Enoki public key and that provider's OAuth client ID are configured.
 * Enoki supports Google, Facebook and Twitch (not X).
 */
function socialProviders(): Partial<Record<AuthProvider, { clientId: string }>> {
  const providers: Partial<Record<AuthProvider, { clientId: string }>> = {};
  const google = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebook = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
  const twitch = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  if (google) providers.google = { clientId: google };
  if (facebook) providers.facebook = { clientId: facebook };
  if (twitch) providers.twitch = { clientId: twitch };
  return providers;
}

const enokiApiKey = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
const providers = socialProviders();
export const SOCIAL_LOGIN_ENABLED = Boolean(enokiApiKey) && Object.keys(providers).length > 0;

/** Wallet connection (Sui wallet standard via dApp Kit). Mainnet only. */
const dAppKit = createDAppKit({
  networks: ["mainnet"],
  defaultNetwork: "mainnet",
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: GRPC_URL }),
  autoConnect: true,
  // Name shown in Slush's connect prompt (otherwise the page title is used).
  slushWalletConfig: { appName: APP_NAME },
  // A throwaway in-browser wallet for local testing only. Never enable in production.
  enableBurnerWallet: process.env.NEXT_PUBLIC_ENABLE_BURNER_WALLET === "1",
  walletInitializers:
    SOCIAL_LOGIN_ENABLED && enokiApiKey ? [enokiWalletsInitializer({ apiKey: enokiApiKey, providers })] : [],
});

declare module "@mysten/dapp-kit-react" {
  interface Register {
    dAppKit: typeof dAppKit;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
    </QueryClientProvider>
  );
}
