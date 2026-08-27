import * as React from "react";
import { useSoroformConfig } from "@soroform/provider";
import type { AuthEntrySignResult, SignOptions, WalletAdapter, WalletSignResult } from "./types.js";

/**
 * The shape of `useWallet()`'s return value. `signTransaction` and
 * `signAuthEntry` match `ClientOptions.signTransaction` /
 * `ClientOptions.signAuthEntry` from `@stellar/stellar-sdk/contract`, so
 * they can be passed straight through to `contract.Client` or
 * `AssembledTransaction`.
 */
export interface WalletState {
  /** The connected account's public key, or undefined if not connected. */
  address: string | undefined;
  /** The network passphrase the wallet last reported, if known. */
  network: string | undefined;
  isConnected: boolean;
  /** Opens whatever UI the configured adapter uses to connect a wallet. */
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string, opts?: SignOptions) => Promise<WalletSignResult>;
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
 * import { useWallet } from "@soroform/wallet-adapter";
 *
 * function AccountBadge() {
 *   const { address, isConnected, connect } = useWallet();
 *   if (!isConnected) {
 *     return <button onClick={() => connect()}>Connect</button>;
 *   }
 *   return <span>{address}</span>;
 * }
 * ```
 */
export function useWallet(): WalletState {
  const state = React.useContext(WalletContext);
  if (!state) {
    throw new Error("useWallet must be called within a <WalletProvider>.");
  }
  return state;
}

export interface WalletProviderProps {
  /**
   * The wallet connector to drive. Pass `stellarWalletsKit()` (from
   * `@soroform/wallet-adapter/adapters/stellar-wallets-kit`) or `blux()` (from
   * `@soroform/wallet-adapter/adapters/blux`), or your own {@link WalletAdapter}.
   * Construct it once and pass the same reference; see the adapter's own
   * docs for why.
   */
  adapter: WalletAdapter;
  children?: React.ReactNode;
}

/**
 * Wraps the app in a wallet connection context, driven by whichever
 * {@link WalletAdapter} is passed as `adapter`. Must be rendered inside a
 * `SoroformProvider`, which supplies the network this provider connects
 * wallets on.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 * import { WalletProvider } from "@soroform/wallet-adapter";
 * import { stellarWalletsKit } from "@soroform/wallet-adapter/adapters/stellar-wallets-kit";
 *
 * const adapter = stellarWalletsKit();
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoroformProvider network="testnet">
 *       <WalletProvider adapter={adapter}>{children}</WalletProvider>
 *     </SoroformProvider>
 *   );
 * }
 * ```
 */
export function WalletProvider(props: WalletProviderProps) {
  const { adapter, children } = props;
  const config = useSoroformConfig();

  const [address, setAddress] = React.useState<string | undefined>(undefined);
  const [network, setNetwork] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    adapter.init(config.networkPassphrase);

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
  }, [adapter, config.networkPassphrase]);

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
