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
import { useSoroformConfig } from "@soroform/provider";
import { WalletProvider } from "../context.js";
import type { WalletAdapter, WalletAdapterState } from "../types.js";

/**
 * `createConfig`'s parameter type, extracted structurally from `ParaSDKProvider`
 * itself rather than importing a config type by name, since Para's own
 * naming for it (`ParaProviderProps`, `IParaClientConfig`, ...) has shifted
 * across doc versions.
 */
type ParaProviderConfig = React.ComponentProps<typeof ParaSDKProvider>["paraClientConfig"];

export interface ParaWalletProviderProps {
  /** Your Para app id, from the [Para developer portal](https://developer.getpara.com/). */
  apiKey: string;
  /** Defaults to `Environment.BETA`. */
  environment?: Environment;
  /** Additional Para client config, passed straight through to `ParaProvider`. */
  paraClientConfig?: Omit<ParaProviderConfig, "apiKey" | "env">;
  children?: React.ReactNode;
}

const queryClient = new QueryClient();

/**
 * Renders Para's own provider and connect modal (`ParaProvider` /
 * `useModal()`), and bridges Para's React-hooks-based account and signing
 * state into a `WalletAdapter`, wiring it straight into `WalletProvider`.
 *
 * Unlike `stellarWalletsKit()`/`blux()`, this is a **component**, not a
 * factory function returning a plain `WalletAdapter` object: Para's connect
 * UI (`ParaProvider`'s embedded `ParaModal`) only exists as a React
 * component tied to Para's own context, with no framework-agnostic
 * equivalent that opens the same experience. Render this in place of
 * `WalletProvider` directly; it renders `WalletProvider` internally.
 *
 * `@getpara/react-sdk` and `@tanstack/react-query` are peer dependencies:
 * install them alongside `@soroform/wallet-adapter` to use this adapter.
 *
 * Built from Para's documentation (`docs.getpara.com`), not exercised
 * against a live Para account — Para requires an `apiKey` from their
 * dashboard to test at all. If something here doesn't match Para's actual
 * runtime behavior, the fix almost certainly belongs in the small
 * `useMemo` block below, not in `WalletProvider` itself.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 * import { ParaWalletProvider } from "@soroform/wallet-adapter/adapters/para";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoroformProvider network="testnet">
 *       <ParaWalletProvider apiKey="...">{children}</ParaWalletProvider>
 *     </SoroformProvider>
 *   );
 * }
 * ```
 */
export function ParaWalletProvider(props: ParaWalletProviderProps) {
  const { apiKey, environment, paraClientConfig, children } = props;

  return (
    <QueryClientProvider client={queryClient}>
      <ParaSDKProvider paraClientConfig={{ ...paraClientConfig, apiKey, env: environment }}>
        <ParaWalletBridge>{children}</ParaWalletBridge>
      </ParaSDKProvider>
    </QueryClientProvider>
  );
}

function ParaWalletBridge(props: { children?: React.ReactNode }) {
  const config = useSoroformConfig();
  const { openModal } = useModal();
  const { embedded, isConnected } = useAccount();
  const { logoutAsync } = useLogout();
  const { stellarSigner } = useStellarSigner({ networkPassphrase: config.networkPassphrase });

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

    stateListenerRef.current?.({ address, network: config.networkPassphrase });

    if (wasConnectedRef.current && !isConnected) {
      disconnectListenerRef.current?.();
    }
    wasConnectedRef.current = isConnected;
  }, [address, isConnected, config.networkPassphrase]);

  const adapter = React.useMemo<WalletAdapter>(
    () => ({
      // No-op: Para is multi-chain and configured once via ParaProvider's
      // own paraClientConfig, not per network passphrase.
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

  return <WalletProvider adapter={adapter}>{props.children}</WalletProvider>;
}
