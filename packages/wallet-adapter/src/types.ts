import type * as React from "react";

export interface WalletAdapterState {
  /**
   * The connected account's public key
   */
  address: string | undefined;
  /**
   * The network passphrase the wallet last reported
   */
  network: string | undefined;
}

export interface WalletSignResult {
  /**
   * The signed transaction XDR
   */
  signedTxXdr: string;
  /**
   * The address of the signer
   */
  signerAddress?: string;
}

export interface AuthEntrySignResult {
  /**
   * The signed auth entry
   */
  signedAuthEntry: string;
  /**
   * The address of the signer
   */
  signerAddress?: string;
}

export interface SignOptions {
  /**
   * The network passphrase to sign the transaction with
   */
  networkPassphrase?: string;
  /**
   * The address of the signer
   */
  address?: string;
}

/**
 * The contract every wallet connector Sorokit can drive implements.
 * `stellarWalletsKit()` (from `@sorokit/wallet-adapter/stellar-wallets-kit`)
 * and `blux()` (from `@sorokit/wallet-adapter/blux`) both return one of
 * these; write your own to plug in a wallet SDK Sorokit doesn't ship an
 * adapter for.
 *
 * Construct an adapter once — at module scope, or in a `useMemo` with an
 * empty dependency array — and pass the same reference to `WalletProvider`.
 * A fresh adapter object on every render makes `WalletProvider` tear down
 * and resubscribe its listeners on every render too.
 */
export interface WalletAdapter {
  /**
   * Called once when `WalletProvider` mounts, and again whenever the
   * network passphrase it's configured with changes.
   */
  init(networkPassphrase: string): void;
  /**
   * Opens whatever UI this adapter uses to connect a wallet.
   */
  connect(): Promise<{ address: string }>;
  /**
   * Disconnects the wallet
   */
  disconnect(): Promise<void>;
  /**
   * Signs a transaction
   */
  signTransaction(xdr: string, opts?: SignOptions): Promise<WalletSignResult>;
  /**
   * Signs an auth entry
   */
  signAuthEntry(authEntry: string, opts?: SignOptions): Promise<AuthEntrySignResult>;
  /**
   * Subscribes to address/network changes the adapter's own UI causes
   * (including a successful `connect()`).
   * @returns An unsubscribe function.
   */
  onStateChange(listener: (state: WalletAdapterState) => void): () => void;
  /**
   * Subscribes to a disconnect fired by the wallet itself, outside of
   * `WalletProvider` calling `disconnect()`. Returns an unsubscribe function.
   * @returns An unsubscribe function.
   */
  onDisconnect(listener: () => void): () => void;
}

export interface WalletConnector {
  /**
   * Extra React context this connector's SDK needs mounted above the rest
   * of the app (e.g. Para's own SDK provider and query client).
   * NB: Most connectors don't need this.
   */
  Provider?: React.ComponentType<{ children?: React.ReactNode }>;
  /**
   * Returns the `WalletAdapter` to drive. Called as a hook from inside
   * `SorokitProvider` (and, when `Provider` is set, from inside it)
   */
  useAdapter(networkPassphrase: string): WalletAdapter;
}
