import {
  blux as bluxClient,
  createConfig,
  events,
  getNetwork,
  switchNetwork,
  BluxEvent,
} from "@bluxcc/core";
import type { WalletAdapter, WalletConnector } from "../types.js";

/**
 * `createConfig`'s parameter type, extracted structurally from the
 * function itself rather than importing `IConfig` by name: the published
 * `@bluxcc/core` does not yet re-export that type from its package root
 * (only `createConfig` itself), even though its own source defines it.
 */
type BluxConfig = Parameters<typeof createConfig>[0];

export interface BluxAdapterOptions extends Omit<BluxConfig, "networks" | "defaultNetwork"> {
  /**
   * Networks the Blux modal should offer. Defaults to just the network
   * `SorokitProvider` is configured with; pass this if you want Blux's
   * own in-modal network switcher to offer more than one.
   */
  networks?: string[];
}

/**
 * A `WalletConnector` backed by `@bluxcc/core`, a wallet and authentication
 * SDK supporting Freighter, Rabet, xBull, LOBSTR, Hana, Ledger, Trezor,
 * WalletConnect, and non-wallet login (email, passkey, social) through
 * one modal. Pass it as `SorokitProvider`'s `wallet` prop.
 *
 * Signing runs headlessly against the connected wallet
 * (`showWalletUIs: false`) unless overridden, matching
 * `stellarWalletsKit()`'s behavior: only `connect()` opens a Blux UI,
 * never `signTransaction`/`signAuthEntry`.
 *
 * `@bluxcc/core` is a peer dependency: install it, along with the wallet
 * SDKs it integrates (see its own peer dependencies), alongside
 * `@sorokit/wallet-adapter` to use this connector. Requires an `appId` from the
 * [Blux dashboard](https://dashboard.blux.cc/).
 *
 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { blux } from "@sorokit/wallet-adapter/blux";
 *
 * <SorokitProvider network="testnet" wallet={blux({ appId: "...", appName: "My App" })}>
 *   {children}
 * </SorokitProvider>;
 * ```
 */
export function blux(options: BluxAdapterOptions): WalletConnector {
  // Scoped to this connector instance, not the module; see the identical
  // comment in the stellarWalletsKit() connector for why.
  let bluxInitialized = false;

  const adapter: WalletAdapter = {
    init(networkPassphrase) {
      if (!bluxInitialized) {
        createConfig({
          showWalletUIs: false,
          ...options,
          networks: options.networks ?? [networkPassphrase],
          defaultNetwork: networkPassphrase,
        });
        bluxInitialized = true;
      } else {
        switchNetwork(networkPassphrase);
      }
    },
    async connect() {
      const user = await bluxClient.login();
      return { address: user.address };
    },
    async disconnect() {
      bluxClient.logout();
    },
    async signTransaction(xdr, opts) {
      // `blux.signTransaction` resolves `Promise<unknown>` in the currently
      // published @bluxcc/core, even though it always resolves the signed
      // XDR string here (showWalletUIs is forced off above). Cast rather
      // than fight the upstream type; see the blux() adapter's own docs.
      const signedTxXdr = (await bluxClient.signTransaction(
        xdr,
        opts?.networkPassphrase ? { network: opts.networkPassphrase } : undefined,
      )) as string;
      return { signedTxXdr, signerAddress: bluxClient.user?.address };
    },
    async signAuthEntry(authEntry, opts) {
      // Same untyped-Promise situation as signTransaction above.
      const signedAuthEntry = (await bluxClient.signAuthEntry(
        authEntry,
        opts?.networkPassphrase ? { network: opts.networkPassphrase } : undefined,
      )) as string;
      return { signedAuthEntry, signerAddress: bluxClient.user?.address };
    },
    onStateChange(listener) {
      const unsubscribeLogin = events.on(BluxEvent.LoggedIn, ({ user }) => {
        listener({ address: user.address, network: getNetwork() });
      });
      const unsubscribeNetwork = events.on(BluxEvent.NetworkChanged, ({ network }) => {
        listener({ address: bluxClient.user?.address, network });
      });
      return () => {
        unsubscribeLogin();
        unsubscribeNetwork();
      };
    },
    onDisconnect(listener) {
      return events.on(BluxEvent.LoggedOut, () => listener());
    },
  };

  return { useAdapter: () => adapter };
}
