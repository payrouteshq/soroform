import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  resolveSoroformConfig,
  type SoroformConfig,
  type SoroformNetwork,
} from "@soroform/core";

const SoroformConfigContext = React.createContext<SoroformConfig | undefined>(undefined);

/**
 * Reads the {@link SoroformConfig} supplied by the nearest
 * {@link SoroformProvider} ancestor.
 *
 * @throws If called outside a {@link SoroformProvider}.
 *
 * @example
 * ```tsx
 * import { useSoroformConfig } from "@soroform/provider";
 *
 * function NetworkBadge() {
 *   const config = useSoroformConfig();
 *   return <span>{config.network}</span>;
 * }
 * ```
 */
export function useSoroformConfig(): SoroformConfig {
  const config = React.useContext(SoroformConfigContext);
  if (!config) {
    throw new Error(
      "useSoroformConfig must be called within a <SoroformProvider>.",
    );
  }
  return config;
}

/**
 * Creates the default `QueryClient` used when a {@link SoroformProvider}
 * is not given one explicitly. Contract reads are simulation calls
 * against a live network, so they use a short 5 second `staleTime` rather
 * than TanStack Query's default of 0, and `refetchOnWindowFocus` is
 * disabled since blockchain state does not follow typical web app
 * refetch-on-focus heuristics.
 */
function createDefaultQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export interface SoroformProviderProps {
  /** The Stellar network to target. */
  network: SoroformNetwork;
  /** Overrides the network's default Soroban RPC URL. */
  rpcUrl?: string;
  /** Overrides the network's default Horizon URL. */
  horizonUrl?: string;
  /** Overrides the network's default passphrase. */
  networkPassphrase?: string;
  /**
   * A pre-constructed `QueryClient` to use instead of the default one. Pass
   * this if your app already has its own `QueryClient` (or its own
   * `QueryClientProvider` higher in the tree) that Soroform's hooks should
   * share.
   */
  queryClient?: QueryClient;
  children?: React.ReactNode;
}

/**
 * The root provider for Soroform. Resolves a {@link SoroformConfig} from
 * the given network (and any overrides) and supplies it to the rest of the
 * tree via {@link useSoroformConfig}, while also wrapping children in a
 * TanStack Query `QueryClientProvider` so every Soroform hook has a query
 * client to use.
 *
 * If your app already renders its own `QueryClientProvider`, pass that
 * client's instance as `queryClient` so Soroform shares it instead of
 * creating a second one.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoroformProvider network="testnet">
 *       {children}
 *     </SoroformProvider>
 *   );
 * }
 * ```
 */
export function SoroformProvider(props: SoroformProviderProps) {
  const { network, rpcUrl, horizonUrl, networkPassphrase, queryClient, children } =
    props;

  const config = React.useMemo(
    () => resolveSoroformConfig({ network, rpcUrl, horizonUrl, networkPassphrase }),
    [network, rpcUrl, horizonUrl, networkPassphrase],
  );

  const [ownedQueryClient] = React.useState(() => queryClient ?? createDefaultQueryClient());
  const client = queryClient ?? ownedQueryClient;

  return (
    <SoroformConfigContext.Provider value={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SoroformConfigContext.Provider>
  );
}
