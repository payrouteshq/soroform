import type * as React from "react";

/** The live connection state a `WalletAdapter` reports to `WalletProvider`. */
export interface WalletAdapterState {
  address: string | undefined;
  network: string | undefined;
}

export interface WalletSignResult {
  signedTxXdr: string;
  signerAddress?: string;
}

export interface AuthEntrySignResult {
  signedAuthEntry: string;
  signerAddress?: string;
}

export interface SignOptions {
  networkPassphrase?: string;
  address?: string;
}

/**
 * The contract every wallet connector Soroform can drive implements.
 * `stellarWalletsKit()` (from `@soroform/wallet-adapter/stellar-wallets-kit`)
 * and `blux()` (from `@soroform/wallet-adapter/blux`) both return one of
 * these; write your own to plug in a wallet SDK Soroform doesn't ship an
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
  /** Opens whatever UI this adapter uses to connect a wallet. */
  connect(): Promise<{ address: string }>;
  disconnect(): Promise<void>;
  signTransaction(xdr: string, opts?: SignOptions): Promise<WalletSignResult>;
  signAuthEntry(authEntry: string, opts?: SignOptions): Promise<AuthEntrySignResult>;
  /**
   * Subscribes to address/network changes the adapter's own UI causes
   * (including a successful `connect()`). Returns an unsubscribe function.
   */
  onStateChange(listener: (state: WalletAdapterState) => void): () => void;
  /**
   * Subscribes to a disconnect fired by the wallet itself, outside of
   * `WalletProvider` calling `disconnect()`. Returns an unsubscribe function.
   */
  onDisconnect(listener: () => void): () => void;
}

/**
 * What `stellarWalletsKit()`, `blux()`, and `para()` each return, and what
 * `SoroformProvider`'s `wallet` prop expects. This is the layer that makes
 * `SoroformProvider` the single entry point: SDKs that just need a plain
 * `WalletAdapter` (Stellar Wallets Kit, Blux) only implement `useAdapter`;
 * SDKs whose connect UI is only reachable through their own React context
 * (Para) also supply `Provider`, and `SoroformProvider` mounts it for you
 * instead of you rendering e.g. `ParaProvider` yourself.
 *
 * A custom `WalletAdapter` becomes a connector by wrapping it:
 * `{ useAdapter: () => myAdapter }`.
 */
export interface WalletConnector {
  /**
   * Extra React context this connector's SDK needs mounted above the rest
   * of the app (e.g. Para's own SDK provider and query client). Most
   * connectors don't need this.
   */
  Provider?: React.ComponentType<{ children?: React.ReactNode }>;
  /**
   * Returns the `WalletAdapter` to drive. Called as a hook from inside
   * `SoroformProvider` (and, when `Provider` is set, from inside it) — for
   * hook-driven SDKs this is where those hooks actually run; for
   * SDKs that just build a plain adapter object, it's a no-op accessor.
   * Receives the network passphrase `SoroformProvider` resolved from its
   * `network` prop.
   */
  useAdapter(networkPassphrase: string): WalletAdapter;
}
