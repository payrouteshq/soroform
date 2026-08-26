import * as React from "react";
import { StellarWalletsKit, KitEventType } from "@creit.tech/stellar-wallets-kit";
import type { ModuleInterface } from "@creit.tech/stellar-wallets-kit";
import { useSoroformConfig } from "@soroform/provider";
import { createDefaultModules, toWalletKitNetwork } from "./kit.js";

let kitInitialized = false;

interface WalletSignResult {
  signedTxXdr: string;
  signerAddress?: string;
}

interface AuthEntrySignResult {
  signedAuthEntry: string;
  signerAddress?: string;
}

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
  /** Opens the wallet picker modal and connects the selected wallet. */
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<WalletSignResult>;
  signAuthEntry: (
    authEntry: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<AuthEntrySignResult>;
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
 * import { useWallet } from "@soroform/wallet";
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
   * Wallet modules to offer in the connection picker. Defaults to
   * Freighter, xBull, Albedo, Lobstr, Hana, and Rabet, which all work
   * without extra setup. Pass your own list to add hardware wallets,
   * WalletConnect, or to narrow the picker down.
   */
  modules?: ModuleInterface[];
  /** The wallet ID to preselect, if any was previously connected. */
  selectedWalletId?: string;
  children?: React.ReactNode;
}

/**
 * Wraps the app in a wallet connection context, backed by
 * `@creit.tech/stellar-wallets-kit`. Must be rendered inside a
 * `SoroformProvider`, which supplies the network this provider connects
 * wallets on.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 * import { WalletProvider } from "@soroform/wallet";
 *
 * export function App({ children }: { children: React.ReactNode }) {
 *   return (
 *     <SoroformProvider network="testnet">
 *       <WalletProvider>{children}</WalletProvider>
 *     </SoroformProvider>
 *   );
 * }
 * ```
 */
export function WalletProvider(props: WalletProviderProps) {
  const { modules, selectedWalletId, children } = props;
  const config = useSoroformConfig();

  const [address, setAddress] = React.useState<string | undefined>(undefined);
  const [network, setNetwork] = React.useState<string | undefined>(undefined);

  const resolvedModules = React.useMemo(() => modules ?? createDefaultModules(), [modules]);

  React.useEffect(() => {
    if (!kitInitialized) {
      StellarWalletsKit.init({
        modules: resolvedModules,
        selectedWalletId,
        network: toWalletKitNetwork(config.networkPassphrase),
      });
      kitInitialized = true;
    } else {
      StellarWalletsKit.setNetwork(toWalletKitNetwork(config.networkPassphrase));
    }

    const unsubscribeState = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        setAddress(event.payload.address);
        setNetwork(event.payload.networkPassphrase);
      },
    );
    const unsubscribeDisconnect = StellarWalletsKit.on(
      KitEventType.DISCONNECT,
      () => {
        setAddress(undefined);
      },
    );

    return () => {
      unsubscribeState();
      unsubscribeDisconnect();
    };
  }, [config.networkPassphrase, selectedWalletId, resolvedModules]);

  const state = React.useMemo<WalletState>(
    () => ({
      address,
      network,
      isConnected: address !== undefined,
      connect: () => StellarWalletsKit.authModal(),
      disconnect: () => StellarWalletsKit.disconnect(),
      signTransaction: (xdr, opts) => StellarWalletsKit.signTransaction(xdr, opts),
      signAuthEntry: (authEntry, opts) =>
        StellarWalletsKit.signAuthEntry(authEntry, opts),
    }),
    [address, network],
  );

  return <WalletContext.Provider value={state}>{children}</WalletContext.Provider>;
}
