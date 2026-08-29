import * as React from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  resolveSorokitConfig,
  resumePendingTransactions,
  type SorokitConfig,
  type SorokitNetwork,
} from "@sorokit/core";
import { WalletProvider } from "@sorokit/wallet-adapter";
import type { WalletConnector } from "@sorokit/wallet-adapter";
import { SorokitDevtools, type SorokitDevtoolsProps } from "@sorokit/devtools";

const SorokitConfigContext = React.createContext<SorokitConfig | undefined>(undefined);

/**
 * Reads the {@link SorokitConfig} supplied by the nearest
 * {@link SorokitProvider} ancestor.
 *
 * @throws If called outside a {@link SorokitProvider}.
 *
 * @example
 * ```tsx
 * import { useSorokitConfig } from "@sorokit/provider";
 *
 * function NetworkBadge() {
 *   const config = useSorokitConfig();
 *   return <span>{config.network}</span>;
 * }
 * ```
 */
export function useSorokitConfig(): SorokitConfig {
  const config = React.useContext(SorokitConfigContext);
  if (!config) {
    throw new Error("useSorokitConfig must be called within a <SorokitProvider>.");
  }
  return config;
}

/**
 * Creates the default `QueryClient` used when a {@link SorokitProvider}
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

export interface SorokitProviderProps {
  /** The Stellar network to target. */
  network: SorokitNetwork;
  /** Overrides the network's default Soroban RPC URL. */
  rpcUrl?: string;
  /** Overrides the network's default Horizon URL. */
  horizonUrl?: string;
  /** Overrides the network's default passphrase. */
  networkPassphrase?: string;
  /**
   * A pre-constructed `QueryClient` to use instead of the default one. Pass
   * this if your app already has its own `QueryClient` (or its own
   * `QueryClientProvider` higher in the tree) that Sorokit's hooks should
   * share.
   */
  queryClient?: QueryClient;
  /**
   * The wallet connector to drive `useWallet()` with — `stellarWalletsKit()`,
   * `blux()`, or `para()` from `@sorokit/wallet-adapter`, or your own
   * `WalletConnector`. Hot-swappable: pass a different connector and
   * `SorokitProvider` remounts the wallet layer with it. Omit it if your
   * app doesn't need wallet connection.
   */
  wallet?: WalletConnector;
  /**
   * Renders `SorokitDevtools` for you — pass `true` for the defaults, or
   * an options object (e.g. `{ initialOpen: true }`). Omit it (or pass
   * `false`) to not render devtools at all. `SorokitDevtools` itself only
   * renders in development, regardless of this prop.
   */
  devtools?: boolean | SorokitDevtoolsProps;
  children?: React.ReactNode;
}

/**
 * The root provider for Sorokit, and the single entry point for wiring an
 * app into it: network config, wallet connection, and devtools all go
 * through this one component instead of several nested providers.
 *
 * Resolves a {@link SorokitConfig} from the given network (and any
 * overrides) and supplies it to the rest of the tree via
 * {@link useSorokitConfig}, wraps children in a TanStack Query
 * `QueryClientProvider` so every Sorokit hook has a query client to use,
 * and — when `wallet` is passed — mounts that connector so `useWallet()`
 * works anywhere below.
 *
 * If your app already renders its own `QueryClientProvider`, pass that
 * client's instance as `queryClient` so Sorokit shares it instead of
 * creating a second one.
 *
 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SorokitProvider network="testnet" wallet={stellarWalletsKit()} devtools>
 *       {children}
 *     </SorokitProvider>
 *   );
 * }
 * ```
 */
export function SorokitProvider(props: SorokitProviderProps) {
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
    () => resolveSorokitConfig({ network, rpcUrl, horizonUrl, networkPassphrase }),
    [network, rpcUrl, horizonUrl, networkPassphrase],
  );

  const [ownedQueryClient] = React.useState(() => queryClient ?? createDefaultQueryClient());
  const client = queryClient ?? ownedQueryClient;

  const devtoolsProps = devtools === true ? {} : devtools || undefined;

  const body = (
    <SorokitConfigContext.Provider value={config}>
      <QueryClientProvider client={client}>
        <PendingTransactionResumer config={config} />
        {children}
        {devtoolsProps && <SorokitDevtools {...devtoolsProps} />}
      </QueryClientProvider>
    </SorokitConfigContext.Provider>
  );

  // `WalletMount` (calling `wallet.useAdapter()`) sits between `wallet.Provider`
  // and Sorokit's own `QueryClientProvider` deliberately: an SDK like Para
  // that needs its own react-query client for its own hooks (via its own
  // `Provider`) must resolve that client, not Sorokit's, when `useAdapter()`
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
 * `SorokitProvider`'s own body so it can reach the query client and
 * invalidate the reads each resumed transaction affected.
 */
function PendingTransactionResumer(props: { config: SorokitConfig }) {
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
