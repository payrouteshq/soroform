import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Asset } from "@stellar/stellar-sdk";
import { createRpcServer, normalizeError, queryKeys } from "@soroform/core";
import { useSoroformConfig } from "@soroform/provider";
import { formatAmount } from "./format-amount.js";

/** A normalized balance, regardless of which kind of asset it came from. */
export interface BalanceState {
  /** The raw integer amount, in the asset's smallest unit. */
  raw: bigint;
  /** `raw` formatted as a decimal string using `decimals`. */
  formatted: string;
  /** The asset's decimal places. */
  decimals: number;
}

export interface UseBalanceOptions {
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
    throw new Error(`Soroform: invalid classic asset id "${assetId}", expected "CODE:ISSUER".`);
  }
  return new Asset(code, issuer);
}

/**
 * Fetches an address's balance of a given asset, normalized to
 * `{ raw, formatted, decimals }` regardless of which kind of asset it is,
 * so a consuming component never has to branch on asset type itself.
 *
 * `assetId` accepts `"native"` for XLM, a classic asset in `"CODE:ISSUER"`
 * form, or a Soroban contract address (`C...`). Classic assets (native or
 * `CODE:ISSUER`) resolve through `rpc.Server.getAssetBalance`, which
 * covers both account and contract holders in one call and always uses 7
 * decimal places, the Stellar convention for classic assets and their
 * Stellar Asset Contract representation alike. An arbitrary contract
 * address is treated as a custom Soroban token and resolved by calling its
 * own `balance` and `decimals` methods.
 *
 * @example
 * ```tsx
 * import { useBalance } from "@soroform/hooks";
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
  const config = useSoroformConfig();

  return useQuery<BalanceState>({
    queryKey: queryKeys.balance(address, assetId),
    enabled: (options?.enabled ?? true) && Boolean(address) && Boolean(assetId),
    queryFn: async () => {
      const server = createRpcServer(config);
      try {
        if (isClassicAssetId(assetId)) {
          const asset = toClassicAsset(assetId);
          const response = await server.getAssetBalance(address, asset, config.networkPassphrase);
          const raw = response.balanceEntry ? BigInt(response.balanceEntry.amount) : 0n;
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
