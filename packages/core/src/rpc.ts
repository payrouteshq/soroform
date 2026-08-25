import { Horizon } from "@stellar/stellar-sdk";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import type { SoroformConfig } from "./config.js";

/**
 * Creates an `rpc.Server` for the given resolved config. This is a thin
 * factory, not an abstraction: the returned server is the real
 * `@stellar/stellar-sdk/rpc` `Server`, used as-is by the rest of Soroform.
 * Kept here so every package that needs an RPC connection constructs it
 * the same way, from the same config shape.
 *
 * @example
 * ```ts
 * import { resolveSoroformConfig, createRpcServer } from "@soroform/core";
 *
 * const config = resolveSoroformConfig({ network: "testnet" });
 * const server = createRpcServer(config);
 * const health = await server.getHealth();
 * ```
 */
export function createRpcServer(config: SoroformConfig): RpcServer {
  return new RpcServer(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
}

/**
 * Creates a `Horizon.Server` for the given resolved config. Used for
 * classic-network reads that the RPC server does not serve, such as
 * general-purpose account and payment history browsing.
 *
 * @example
 * ```ts
 * import { resolveSoroformConfig, createHorizonServer } from "@soroform/core";
 *
 * const config = resolveSoroformConfig({ network: "testnet" });
 * const horizon = createHorizonServer(config);
 * const account = await horizon.loadAccount("G...");
 * ```
 */
export function createHorizonServer(config: SoroformConfig): Horizon.Server {
  return new Horizon.Server(config.horizonUrl, {
    allowHttp: config.horizonUrl.startsWith("http://"),
  });
}

export type { RpcServer };
export { Horizon };
