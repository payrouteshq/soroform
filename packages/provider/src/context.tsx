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
  /**
   * The Stellar network to target.
   */
  network: SorokitNetwork;
  /**
   * Overrides the network's default Soroban RPC URL.
   */
  rpcUrl?: string;
  /**
   * Overrides the network's default Horizon URL.
   */
  horizonUrl?: string;
  /**
   * Overrides the network's default passphrase.
   */
  networkPassphrase?: string;
  /**
   * A pre-constructed `QueryClient` to use instead of the default one.
   * Pass this if your app already has its own `QueryClient` (or its own
   * `QueryClientProvider` higher in the tree) that Sorokit's hooks should
   * share.
   */
  queryClient?: QueryClient;
  /**
   * The wallet connector to drive `useWallet()` with;
   * Can be an instance of `stellarWalletsKit()`, `blux()`, or `para()` from `@sorokit/wallet-adapter`
   */
  wallet?: WalletConnector;
  /**
   * Renders `SorokitDevtools` in development; pass `true` for the defaults, or
   * an options object (e.g. `{ initialOpen: true }`).
   * Omit it (or pass `false`) to not render devtools at all.
   */
  devtools?: boolean | SorokitDevtoolsProps;
  children?: React.ReactNode;
}

/**
 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SorokitProvider network="TESTNET" wallet={stellarWalletsKit()} devtools>
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
