import { Networks } from "@stellar/stellar-sdk";

/**
 * A Stellar network Sorokit can target. `"custom"` is for standalone
 * networks, sandboxes, or any deployment that is not one of the well-known
 * public networks.
 */
export type SorokitNetwork = "testnet" | "mainnet" | "futurenet" | "custom";

/**
 * Configuration a consuming app supplies to {@link resolveSorokitConfig}.
 * For `"testnet"` and `"futurenet"`, `rpcUrl`, `horizonUrl`, and
 * `networkPassphrase` all have well-known defaults and may be omitted. For
 * `"mainnet"`, `rpcUrl` must be supplied explicitly: there is no single
 * free public RPC endpoint for the public network. For `"custom"`, all
 * three fields are required.
 */
export interface SorokitConfigInput {
  network: SorokitNetwork;
  rpcUrl?: string;
  horizonUrl?: string;
  networkPassphrase?: string;
}

/**
 * A fully resolved Sorokit configuration: every field is populated, either
 * from an explicit override or from the network's well-known defaults.
 */
export interface SorokitConfig {
  network: SorokitNetwork;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}

interface NetworkDefaults {
  rpcUrl?: string;
  horizonUrl: string;
  networkPassphrase: string;
}

const NETWORK_DEFAULTS: Record<Exclude<SorokitNetwork, "custom">, NetworkDefaults> = {
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
  },
  futurenet: {
    rpcUrl: "https://rpc-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    networkPassphrase: Networks.FUTURENET,
  },
  mainnet: {
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: Networks.PUBLIC,
  },
};

/**
 * Resolves a {@link SorokitConfigInput} into a fully populated
 * {@link SorokitConfig}, filling in well-known defaults for `rpcUrl`,
 * `horizonUrl`, and `networkPassphrase` where the network provides them.
 *
 * @throws If `network` is `"custom"` and any of `rpcUrl`, `horizonUrl`, or
 * `networkPassphrase` is omitted, or if `network` is `"mainnet"` and
 * `rpcUrl` is omitted (mainnet has no default RPC endpoint).
 *
 * @example
 * ```ts
 * import { resolveSorokitConfig } from "@sorokit/core";
 *
 * const config = resolveSorokitConfig({ network: "testnet" });
 * console.log(config.rpcUrl); // "https://soroban-testnet.stellar.org"
 * ```
 */
export function resolveSorokitConfig(input: SorokitConfigInput): SorokitConfig {
  if (input.network === "custom") {
    if (!input.rpcUrl || !input.horizonUrl || !input.networkPassphrase) {
      throw new Error(
        'Sorokit: network "custom" requires rpcUrl, horizonUrl, and networkPassphrase to all be provided.',
      );
    }
    return {
      network: "custom",
      rpcUrl: input.rpcUrl,
      horizonUrl: input.horizonUrl,
      networkPassphrase: input.networkPassphrase,
    };
  }

  const defaults = NETWORK_DEFAULTS[input.network];
  const rpcUrl = input.rpcUrl ?? defaults.rpcUrl;
  if (!rpcUrl) {
    throw new Error(
      `Sorokit: network "${input.network}" has no default rpcUrl; pass one explicitly.`,
    );
  }

  return {
    network: input.network,
    rpcUrl,
    horizonUrl: input.horizonUrl ?? defaults.horizonUrl,
    networkPassphrase: input.networkPassphrase ?? defaults.networkPassphrase,
  };
}
