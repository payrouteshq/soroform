import {
  StellarWalletsKit,
  KitEventType,
  type ModuleInterface,
  type Networks as WalletKitNetworks,
} from "@creit.tech/stellar-wallets-kit";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import type { WalletAdapter, WalletConnector } from "../types.js";

export interface StellarWalletsKitAdapterOptions {
  /**
   * Wallet modules to offer in the connection picker. Defaults to
   * Freighter, xBull, Albedo, Lobstr, Hana, and Rabet, which all work
   * without extra setup. Pass your own list to add hardware wallets,
   * WalletConnect, or to narrow the picker down.
   */
  modules?: ModuleInterface[];
  /** The wallet ID to preselect, if any was previously connected. */
  selectedWalletId?: string;
}

/**
 * The wallet modules this adapter registers by default when no `modules`
 * option is given. Limited to modules with a no-argument constructor, so
 * no extra setup (API keys, project IDs) is required to get a working
 * wallet picker out of the box. Hardware wallets and WalletConnect-based
 * modules need such setup, so they are not included here; pass them
 * explicitly via the `modules` option instead.
 */
export function createDefaultModules(): ModuleInterface[] {
  return [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new LobstrModule(),
    new HanaModule(),
    new RabetModule(),
  ];
}

/**
 * A `WalletConnector` backed by `@creit.tech/stellar-wallets-kit`, a
 * multi-wallet connector supporting Freighter, xBull, Albedo, Lobstr,
 * Hana, Rabet, hardware wallets, and WalletConnect. Pass it as
 * `SoroformProvider`'s `wallet` prop.
 *
 * `@creit.tech/stellar-wallets-kit` is a peer dependency: install it
 * alongside `@soroform/wallet-adapter` to use this connector.
 *
 * @example
 * ```tsx
 * import { SoroformProvider } from "@soroform/provider";
 * import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";
 *
 * <SoroformProvider network="testnet" wallet={stellarWalletsKit()}>
 *   {children}
 * </SoroformProvider>;
 * ```
 */
export function stellarWalletsKit(options: StellarWalletsKitAdapterOptions = {}): WalletConnector {
  const modules = options.modules ?? createDefaultModules();
  // Scoped to this connector instance, not the module: StellarWalletsKit.init()
  // should run once per connector (guards React StrictMode's double-invoked
  // effect calling init() twice on mount), but a second, independent
  // stellarWalletsKit() call must still be able to initialize the kit.
  let kitInitialized = false;

  const adapter: WalletAdapter = {
    init(networkPassphrase) {
      if (!kitInitialized) {
        StellarWalletsKit.init({
          modules,
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
