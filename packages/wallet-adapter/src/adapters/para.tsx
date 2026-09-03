import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ParaProvider as ParaSDKProvider,
  useAccount,
  useLogout,
  useModal,
  type Environment,
} from "@getpara/react-sdk";
import { useStellarSigner } from "@getpara/react-sdk/stellar";
import type { WalletAdapter, WalletAdapterState, WalletConnector } from "../types.js";

type ParaProviderConfig = React.ComponentProps<typeof ParaSDKProvider>["paraClientConfig"];

export interface ParaConnectorOptions {
  /**
   * Your Para app id, from the [Para developer portal](https://developer.getpara.com/).
   */
  apiKey: string;
  /**
   * Defaults to `Environment.BETA`.
   * @default `Environment.BETA`
   */
  environment?: Environment;
  /**
   * Additional Para client config, passed straight through to Para's own provider.
   */
  paraClientConfig?: Omit<ParaProviderConfig, "apiKey" | "env">;
}

/**

 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { para } from "@sorokit/wallet-adapter/para";
 *
 * <SorokitProvider network="TESTNET" wallet={para({ apiKey: "..." })}>
 *   {children}
 * </SorokitProvider>;
 * ```
 */
export function para(options: ParaConnectorOptions): WalletConnector {
  const { apiKey, environment, paraClientConfig } = options;
  const queryClient = new QueryClient();

  function Provider({ children }: { children?: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ParaSDKProvider paraClientConfig={{ ...paraClientConfig, apiKey, env: environment }}>
          {children}
        </ParaSDKProvider>
      </QueryClientProvider>
    );
  }

  function useAdapter(networkPassphrase: string): WalletAdapter {
    const { openModal } = useModal();
    const { embedded, isConnected } = useAccount();
    const { logoutAsync } = useLogout();
    const { stellarSigner } = useStellarSigner({ networkPassphrase });

    const stellarWallet = embedded?.wallets?.find((wallet) => wallet.type === "STELLAR");
    const address = isConnected ? stellarWallet?.address : undefined;

    const pendingConnect = React.useRef<{
      resolve: (value: { address: string }) => void;
      reject: (reason: unknown) => void;
    } | null>(null);
    const stateListenerRef = React.useRef<((state: WalletAdapterState) => void) | null>(null);
    const disconnectListenerRef = React.useRef<(() => void) | null>(null);
    const wasConnectedRef = React.useRef(false);

    React.useEffect(() => {
      if (address && pendingConnect.current) {
        pendingConnect.current.resolve({ address });
        pendingConnect.current = null;
      }

      stateListenerRef.current?.({ address, network: networkPassphrase });

      if (wasConnectedRef.current && !isConnected) {
        disconnectListenerRef.current?.();
      }
      wasConnectedRef.current = isConnected;
    }, [address, isConnected, networkPassphrase]);

    return React.useMemo<WalletAdapter>(
      () => ({
        // No-op: Para is multi-chain and configured once via its own
        // provider, not per network passphrase.
        init: () => {},
        connect: () =>
          new Promise((resolve, reject) => {
            pendingConnect.current = { resolve, reject };
            openModal();
          }),
        disconnect: async () => {
          await logoutAsync();
        },
        async signTransaction(xdr) {
          if (!stellarSigner) throw new Error("Para: no connected Stellar wallet to sign with.");
          const { signedTxXdr } = await stellarSigner.signTransaction(xdr);
          return { signedTxXdr, signerAddress: address };
        },
        async signAuthEntry(authEntry) {
          if (!stellarSigner) throw new Error("Para: no connected Stellar wallet to sign with.");
          return stellarSigner.signAuthEntry(authEntry);
        },
        onStateChange(listener) {
          stateListenerRef.current = listener;
          return () => {
            stateListenerRef.current = null;
          };
        },
        onDisconnect(listener) {
          disconnectListenerRef.current = listener;
          return () => {
            disconnectListenerRef.current = null;
          };
        },
      }),
      [address, logoutAsync, openModal, stellarSigner],
    );
  }

  return { Provider, useAdapter };
}
