import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Asset } from "@stellar/stellar-sdk";
import { createRpcServer, normalizeError, queryKeys, type RpcServer } from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";
import { formatAmount } from "./format-amount.js";

export interface BalanceState {
  /**
   * The raw integer amount, in the asset's smallest unit.
   */
  raw: bigint;
  /**
   * `raw` formatted as a decimal string using `decimals`.
   */
  formatted: string;
  /**
   * The asset's decimal places.
   */
  decimals: number;
}

export interface UseBalanceOptions {
  /**
   * Whether to enable the query.
   * @default true
   */
  enabled?: boolean;
}

const CLASSIC_ASSET_DECIMALS = 7;

function isClassicAssetId(assetId: string): boolean {
  return assetId === "native" || assetId.includes(":");
}

function toClassicAsset(assetId: string): Asset {
  if (assetId === "native") return Asset.native();

  const [code, issuer] = assetId.split(":");

  if (!code || !issuer) {
    throw new Error(`Sorokit: invalid classic asset id "${assetId}", expected "CODE:ISSUER".`);
  }

  return new Asset(code, issuer);
}

/**
 * `RpcServer.getAssetBalance` always reads a G-address's balance through
 * `getTrustline`, but native XLM has no trustline representation
 * (`Asset.native().toTrustLineXdrObject()` throws), so it can never be
 * looked up that way. The native balance lives directly on the account
 * entry instead.
 */
async function fetchNativeBalance(server: RpcServer, address: string): Promise<bigint> {
  try {
    const entry = await server.getAccountEntry(address);
    return entry.balance;
  } catch {
    // Account not yet funded on this network.
    return 0n;
  }
}

/**
 * @example
 * ```tsx
 * import { useBalance } from "@sorokit/hooks";
 *
 * function XlmBalance({ address }: { address: string }) {
 *   const { data, isLoading } = useBalance(address, "native");
 *   if (isLoading) return <p>Loading...</p>;
 *   return <p>{data?.formatted} XLM</p>;
 * }
 * ```
 */
export function useBalance(
  address: string,
  assetId: string,
  options?: UseBalanceOptions,
): UseQueryResult<BalanceState> {
  const config = useSorokitConfig();

  return useQuery<BalanceState>({
    queryKey: queryKeys.balance(address, assetId),
    enabled: (options?.enabled ?? true) && Boolean(address) && Boolean(assetId),
    queryFn: async () => {
      const server = createRpcServer(config);
      try {
        if (isClassicAssetId(assetId)) {
          let raw: bigint;
          if (assetId === "native") {
            raw = await fetchNativeBalance(server, address);
          } else {
            const asset = toClassicAsset(assetId);
            const response = await server.getAssetBalance(address, asset, config.networkPassphrase);
            raw = response.balanceEntry ? BigInt(response.balanceEntry.amount) : 0n;
          }
          return {
            raw,
            formatted: formatAmount(raw, CLASSIC_ASSET_DECIMALS),
            decimals: CLASSIC_ASSET_DECIMALS,
          };
        }

        const [{ result: raw }, { result: decimals }] = await Promise.all([
          server.queryContract<bigint>(
            assetId,
            "balance",
            { id: address },
            config.networkPassphrase,
          ),
          server.queryContract<number>(assetId, "decimals", undefined, config.networkPassphrase),
        ]);
        return { raw, formatted: formatAmount(raw, decimals), decimals };
      } catch (error) {
        throw normalizeError(error);
      }
    },
  });
}
