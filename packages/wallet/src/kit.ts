import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import type { ModuleInterface } from "@creit.tech/stellar-wallets-kit";
import { Networks as WalletKitNetworks } from "@creit.tech/stellar-wallets-kit";

/**
 * The wallet modules `<WalletProvider>` registers by default when no
 * `modules` prop is given. Limited to modules with a no-argument
 * constructor, so no extra setup (API keys, project IDs) is required to
 * get a working wallet picker out of the box. Hardware wallets and
 * WalletConnect-based modules need such setup, so they are not included
 * here; pass them explicitly via the `modules` prop instead.
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
 * Converts a Stellar network passphrase (as used by
 * `SoroformConfig.networkPassphrase`) into the `Networks` enum value
 * `StellarWalletsKit` expects. The two enums share identical string
 * values, so this is a safe reinterpretation rather than a lookup that can
 * fail for the five well-known networks; passphrases outside that set
 * (a fully custom network) are passed through as-is, since the kit only
 * uses this value as a plain string forwarded to wallet modules.
 */
export function toWalletKitNetwork(networkPassphrase: string): WalletKitNetworks {
  return networkPassphrase as WalletKitNetworks;
}

export { WalletKitNetworks };
