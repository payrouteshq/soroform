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
 * `stellarWalletsKit()` (from `@soroform/wallet-adapter/adapters/stellar-wallets-kit`)
 * and `blux()` (from `@soroform/wallet-adapter/adapters/blux`) both return one of
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
