import * as React from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  resolveSoroformConfig,
  resumePendingTransactions,
  type SoroformConfig,
  type SoroformNetwork,
} from "@soroform/core";
import { WalletProvider } from "@soroform/wallet-adapter";
import type { WalletConnector } from "@soroform/wallet-adapter";
import { SoroformDevtools, type SoroformDevtoolsProps } from "@soroform/devtools";

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
    throw new Error("useSoroformConfig must be called within a <SoroformProvider>.");
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
  /**
   * The wallet connector to drive `useWallet()` with — `stellarWalletsKit()`,
   * `blux()`, or `para()` from `@soroform/wallet-adapter`, or your own
   * `WalletConnector`. Hot-swappable: pass a different connector and
   * `SoroformProvider` remounts the wallet layer with it. Omit it if your
   * app doesn't need wallet connection.
   */
  wallet?: WalletConnector;
  /**
   * Renders `SoroformDevtools` for you — pass `true` for the defaults, or
   * an options object (e.g. `{ initialOpen: true }`). Omit it (or pass
   * `false`) to not render devtools at all. `SoroformDevtools` itself only
   * renders in development, regardless of this prop.
   */
  devtools?: boolean | SoroformDevtoolsProps;
  children?: React.ReactNode;
}

/**
 * The root provider for Soroform, and the single entry point for wiring an
 * app into it: network config, wallet connection, and devtools all go
 * through this one component instead of several nested providers.
 *
 * Resolves a {@link SoroformConfig} from the given network (and any
 * overrides) and supplies it to the rest of the tree via
 * {@link useSoroformConfig}, wraps children in a TanStack Query
 * `QueryClientProvider` so every Soroform hook has a query client to use,
 * and — when `wallet` is passed — mounts that connector so `useWallet()`
 * works anywhere below.
 *
 * If your app already renders its own `QueryClientProvider`, pass that
 * client's instance as `queryClient` so Soroform shares it instead of
 * creating a second one.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 * import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoroformProvider network="testnet" wallet={stellarWalletsKit()} devtools>
 *       {children}
 *     </SoroformProvider>
 *   );
 * }
 * ```
 */
export function SoroformProvider(props: SoroformProviderProps) {
  const {
    network,
    rpcUrl,
    horizonUrl,
    networkPassphrase,
    queryClient,
    wallet,
    devtools,
    children,
  } = props;

  const config = React.useMemo(
    () => resolveSoroformConfig({ network, rpcUrl, horizonUrl, networkPassphrase }),
    [network, rpcUrl, horizonUrl, networkPassphrase],
  );

  const [ownedQueryClient] = React.useState(() => queryClient ?? createDefaultQueryClient());
  const client = queryClient ?? ownedQueryClient;

  const devtoolsProps = devtools === true ? {} : devtools || undefined;

  const body = (
    <SoroformConfigContext.Provider value={config}>
      <QueryClientProvider client={client}>
        <PendingTransactionResumer config={config} />
        {children}
        {devtoolsProps && <SoroformDevtools {...devtoolsProps} />}
      </QueryClientProvider>
    </SoroformConfigContext.Provider>
  );

  // `WalletMount` (calling `wallet.useAdapter()`) sits between `wallet.Provider`
  // and Soroform's own `QueryClientProvider` deliberately: an SDK like Para
  // that needs its own react-query client for its own hooks (via its own
  // `Provider`) must resolve that client, not Soroform's, when `useAdapter()`
  // runs — see `WalletConnector`'s docs.
  const withWallet = wallet ? (
    <WalletMount connector={wallet} networkPassphrase={config.networkPassphrase}>
      {body}
    </WalletMount>
  ) : (
    body
  );

  return wallet?.Provider ? <wallet.Provider>{withWallet}</wallet.Provider> : withWallet;
}

function WalletMount(props: {
  connector: WalletConnector;
  networkPassphrase: string;
  children?: React.ReactNode;
}) {
  const adapter = props.connector.useAdapter(props.networkPassphrase);
  return (
    <WalletProvider adapter={adapter} networkPassphrase={props.networkPassphrase}>
      {props.children}
    </WalletProvider>
  );
}

/**
 * Resumes transactions that were in flight when the page was last
 * unloaded. Rendered inside `QueryClientProvider` rather than run from
 * `SoroformProvider`'s own body so it can reach the query client and
 * invalidate the reads each resumed transaction affected.
 */
function PendingTransactionResumer(props: { config: SoroformConfig }) {
  const { config } = props;
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const controller = new AbortController();
    void resumePendingTransactions(config, {
      signal: controller.signal,
      onSettled: (entry) => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.contractCallsByContract(entry.networkPassphrase, entry.contractId),
        });
      },
    });
    return () => controller.abort();
  }, [config, queryClient]);

  return null;
}
