import { Horizon } from "@stellar/stellar-sdk";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import type { SorokitConfig } from "./config.js";

export function createRpcServer(config: SorokitConfig): RpcServer {
  return new RpcServer(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
}

export function createHorizonServer(config: SorokitConfig): Horizon.Server {
  return new Horizon.Server(config.horizonUrl, {
    allowHttp: config.horizonUrl.startsWith("http://"),
  });
}

export type { RpcServer };

export { Horizon };
