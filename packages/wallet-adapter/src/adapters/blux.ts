import {
  blux as bluxClient,
  createConfig,
  events,
  getNetwork,
  switchNetwork,
  BluxEvent,
} from "@bluxcc/core";
import type { WalletAdapter, WalletConnector } from "../types.js";

type BluxConfig = Parameters<typeof createConfig>[0];

export interface BluxAdapterOptions extends Omit<BluxConfig, "networks" | "defaultNetwork"> {
  /**
   * Networks the Blux modal should offer.
   * @default Defaults to just the network `SorokitProvider` is configured with; pass this if you want Blux's own in-modal network switcher to offer more than one.
   */
  networks?: string[];
}

/**
 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { blux } from "@sorokit/wallet-adapter/blux";
 *
 * <SorokitProvider network="TESTNET" wallet={blux({ appId: "...", appName: "My App" })}>
 *   {children}
 * </SorokitProvider>;
 * ```
 */
export function blux(options: BluxAdapterOptions): WalletConnector {
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
      const signedTxXdr = (await bluxClient.signTransaction(
        xdr,
        opts?.networkPassphrase ? { network: opts.networkPassphrase } : undefined,
      )) as string;
      return { signedTxXdr, signerAddress: bluxClient.user?.address };
    },
    async signAuthEntry(authEntry, opts) {
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
