import {
  StellarWalletsKit,
  KitEventType,
  type ModuleInterface,
  type Networks as WalletKitNetworks,
} from "@creit.tech/stellar-wallets-kit";
import type { WalletAdapter, WalletConnector } from "../types.js";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";

export interface StellarWalletsKitAdapterOptions {
  /**
   * @default `defaultModules()` from `@creit.tech/stellar-wallets-kit`.
   */
  modules?: ModuleInterface[];
  /**
   * The wallet ID to preselect, if any was previously connected.
   */
  selectedWalletId?: string;
}

/**
 * @example
 * ```tsx
 * import { SorokitProvider } from "@sorokit/provider";
 * import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";
 *
 * <SorokitProvider network="TESTNET" wallet={stellarWalletsKit()}>
 *   {children}
 * </SorokitProvider>;
 * ```
 */
export function stellarWalletsKit(options: StellarWalletsKitAdapterOptions = {}): WalletConnector {
  let kitInitialized = false;

  const adapter: WalletAdapter = {
    init(networkPassphrase) {
      if (!kitInitialized) {
        StellarWalletsKit.init({
          modules: options.modules ?? defaultModules(),
          selectedWalletId: options.selectedWalletId,
          network: networkPassphrase as WalletKitNetworks,
        });
        kitInitialized = true;
      } else {
        StellarWalletsKit.setNetwork(networkPassphrase as WalletKitNetworks);
      }
    },
    connect: () => StellarWalletsKit.authModal(),
    disconnect: () => StellarWalletsKit.disconnect(),
    signTransaction: (xdr, opts) => StellarWalletsKit.signTransaction(xdr, opts),
    signAuthEntry: (authEntry, opts) => StellarWalletsKit.signAuthEntry(authEntry, opts),
    onStateChange(listener) {
      return StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
        listener({ address: event.payload.address, network: event.payload.networkPassphrase });
      });
    },
    onDisconnect(listener) {
      return StellarWalletsKit.on(KitEventType.DISCONNECT, () => listener());
    },
  };

  return { useAdapter: () => adapter };
}
