import * as React from "react";
import type { AuthEntrySignResult, SignOptions, WalletAdapter, WalletSignResult } from "./types.js";

export interface WalletState {
  /**
   * The connected account's public key
   */
  address: string | undefined;
  /**
   * The network passphrase the wallet last reported
   */
  network: string | undefined;
  /**
   * Whether the wallet is connected
   */
  isConnected: boolean;
  /**
   * Opens whatever UI the configured adapter uses to connect a wallet.
   */
  connect: () => Promise<{ address: string }>;
  /**
   * Disconnects the wallet
   */
  disconnect: () => Promise<void>;
  /**
   * Signs a transaction
   */
  signTransaction: (xdr: string, opts?: SignOptions) => Promise<WalletSignResult>;
  /**
   * Signs an auth entry
   */
  signAuthEntry: (authEntry: string, opts?: SignOptions) => Promise<AuthEntrySignResult>;
}

const WalletContext = React.createContext<WalletState | undefined>(undefined);

/**
 * Reads the wallet connection state and signing functions supplied by the
 * nearest {@link WalletProvider} ancestor.
 *
 * @throws If called outside a {@link WalletProvider}.
 *
 * @example
 * ```tsx
 * import { useWallet } from "@sorokit/wallet-adapter";
 *
 * function AccountBadge() {
 *   const { address, isConnected, connect } = useWallet();
 *
 *   if (!isConnected) {
 *     return <button onClick={() => connect()}>Connect</button>;
 *   }
 *   return <span>{address}</span>;
 * }
 * ```
 */
export function useWallet(): WalletState {
  const state = React.useContext(WalletContext);

  if (!state) throw new Error("useWallet must be called within a <WalletProvider>.");

  return state;
}

export interface WalletProviderProps {
  /**
   * The wallet connector to drive. Pass your own {@link WalletAdapter} —
   */
  adapter: WalletAdapter;
  /**
   * The network passphrase to initialize (and re-initialize) the adapter with.
   */
  networkPassphrase: string;
  children?: React.ReactNode;
}

/**
 * @example
 * ```tsx
 * import { WalletProvider } from "@sorokit/wallet-adapter";
 *
 * <WalletProvider adapter={myAdapter} networkPassphrase="Test SDF Network ; September 2015">
 *   {children}
 * </WalletProvider>;
 * ```
 */
export function WalletProvider(props: WalletProviderProps) {
  const { adapter, networkPassphrase, children } = props;

  const [address, setAddress] = React.useState<string | undefined>(undefined);
  const [network, setNetwork] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    adapter.init(networkPassphrase);

    const unsubscribeState = adapter.onStateChange((state) => {
      setAddress(state.address);
      setNetwork(state.network);
    });
    const unsubscribeDisconnect = adapter.onDisconnect(() => {
      setAddress(undefined);
    });

    return () => {
      unsubscribeState();
      unsubscribeDisconnect();
    };
  }, [adapter, networkPassphrase]);

  const state = React.useMemo<WalletState>(
    () => ({
      address,
      network,
      isConnected: address !== undefined,
      connect: () => adapter.connect(),
      disconnect: () => adapter.disconnect(),
      signTransaction: (xdr, opts) => adapter.signTransaction(xdr, opts),
      signAuthEntry: (authEntry, opts) => adapter.signAuthEntry(authEntry, opts),
    }),
    [adapter, address, network],
  );

  return <WalletContext.Provider value={state}>{children}</WalletContext.Provider>;
}
