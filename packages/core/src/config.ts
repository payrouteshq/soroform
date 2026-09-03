import { Networks } from "@stellar/stellar-sdk";

export type SorokitNetwork = keyof typeof Networks | "CUSTOM";

export interface SorokitConfigInput {
  /**
   * The network to target
   */
  network: SorokitNetwork;
  /**
   * The RPC URL to use
   */
  rpcUrl?: string;
  /**
   * The Horizon URL to use
   */
  horizonUrl?: string;
  /**
   * The network passphrase to use
   * @default `undefined`
   */
  networkPassphrase?: string;
}

/**
 * A fully resolved Sorokit configuration: every field is populated, either
 * from an explicit override or from the network's well-known defaults.
 */
export interface SorokitConfig {
  /**
   * The network to target
   */
  network: SorokitNetwork;
  /**
   * The RPC URL to use
   */
  rpcUrl: string;
  /**
   * The Horizon URL to use
   */
  horizonUrl: string;
  /**
   * The network passphrase to use
   */
  networkPassphrase: string;
}

interface NetworkDefaults {
  /**
   * The RPC URL to use
   */
  rpcUrl?: string;
  /**
   * The Horizon URL to use
   */
  horizonUrl?: string;
  /**
   * The network passphrase to use
   */
  networkPassphrase: string;
}

const NETWORK_DEFAULTS: Record<Exclude<SorokitNetwork, "CUSTOM">, NetworkDefaults> = {
  TESTNET: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
  },
  FUTURENET: {
    rpcUrl: "https://rpc-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    networkPassphrase: Networks.FUTURENET,
  },
  PUBLIC: {
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: Networks.PUBLIC,
  },
  SANDBOX: {
    rpcUrl: undefined,
    horizonUrl: undefined,
    networkPassphrase: Networks.SANDBOX,
  },
  STANDALONE: {
    rpcUrl: undefined,
    horizonUrl: undefined,
    networkPassphrase: Networks.STANDALONE,
  },
};

export function resolveSorokitConfig(input: SorokitConfigInput): SorokitConfig {
  if (input.network === "CUSTOM") {
    if (!input.rpcUrl || !input.horizonUrl || !input.networkPassphrase) {
      throw new Error(
        'Sorokit: network "CUSTOM" requires rpcUrl, horizonUrl, and networkPassphrase to all be provided.',
      );
    }
    return {
      network: "CUSTOM",
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
    horizonUrl: input.horizonUrl ?? defaults.horizonUrl ?? "",
    networkPassphrase: input.networkPassphrase ?? defaults.networkPassphrase,
  };
}
