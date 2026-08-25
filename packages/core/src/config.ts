import { Networks } from "@stellar/stellar-sdk";

/**
 * A Stellar network Soroform can target. `"custom"` is for standalone
 * networks, sandboxes, or any deployment that is not one of the well-known
 * public networks.
 */
export type SoroformNetwork = "testnet" | "mainnet" | "futurenet" | "custom";

/**
 * Configuration a consuming app supplies to {@link resolveSoroformConfig}.
 * For `"testnet"` and `"futurenet"`, `rpcUrl`, `horizonUrl`, and
 * `networkPassphrase` all have well-known defaults and may be omitted. For
 * `"mainnet"`, `rpcUrl` must be supplied explicitly: there is no single
 * free public RPC endpoint for the public network. For `"custom"`, all
 * three fields are required.
 */
export interface SoroformConfigInput {
  network: SoroformNetwork;
  rpcUrl?: string;
  horizonUrl?: string;
  networkPassphrase?: string;
}

/**
 * A fully resolved Soroform configuration: every field is populated, either
 * from an explicit override or from the network's well-known defaults.
 */
export interface SoroformConfig {
  network: SoroformNetwork;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}

interface NetworkDefaults {
  rpcUrl?: string;
  horizonUrl: string;
  networkPassphrase: string;
}

const NETWORK_DEFAULTS: Record<Exclude<SoroformNetwork, "custom">, NetworkDefaults> = {
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
 * Resolves a {@link SoroformConfigInput} into a fully populated
 * {@link SoroformConfig}, filling in well-known defaults for `rpcUrl`,
 * `horizonUrl`, and `networkPassphrase` where the network provides them.
 *
 * @throws If `network` is `"custom"` and any of `rpcUrl`, `horizonUrl`, or
 * `networkPassphrase` is omitted, or if `network` is `"mainnet"` and
 * `rpcUrl` is omitted (mainnet has no default RPC endpoint).
 *
 * @example
 * ```ts
 * import { resolveSoroformConfig } from "@soroform/core";
 *
 * const config = resolveSoroformConfig({ network: "testnet" });
 * console.log(config.rpcUrl); // "https://soroban-testnet.stellar.org"
 * ```
 */
export function resolveSoroformConfig(input: SoroformConfigInput): SoroformConfig {
  if (input.network === "custom") {
    if (!input.rpcUrl || !input.horizonUrl || !input.networkPassphrase) {
      throw new Error(
        'Soroform: network "custom" requires rpcUrl, horizonUrl, and networkPassphrase to all be provided.',
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
      `Soroform: network "${input.network}" has no default rpcUrl; pass one explicitly.`,
    );
  }

  return {
    network: input.network,
    rpcUrl,
    horizonUrl: input.horizonUrl ?? defaults.horizonUrl,
    networkPassphrase: input.networkPassphrase ?? defaults.networkPassphrase,
  };
}
