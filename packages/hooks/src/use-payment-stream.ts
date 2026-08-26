import { useQueryClient } from "@tanstack/react-query";
import { createHorizonServer, queryKeys, type Horizon } from "@soroform/core";
import { useSoroformConfig } from "@soroform/provider";
import { useHorizonStream, type UseHorizonStreamResult } from "./stream-core.js";

/** A payment-shaped operation received from `usePaymentStream`. */
export type PaymentStreamRecord = Horizon.ServerApi.OperationRecord;

export interface UsePaymentStreamOptions {
  /** Whether the stream should be open. Defaults to `true`. */
  enabled?: boolean;
  /** Called for every payment received, in addition to the returned state updating. */
  onPayment?: (record: PaymentStreamRecord) => void;
  /**
   * The Horizon cursor to start from. Defaults to `"now"`, so only
   * payments that arrive after the hook mounts are received; pass a
   * specific cursor to resume from a known point instead.
   */
  cursor?: string;
  /** How many recent payments to keep in `events`. Defaults to 50. */
  maxEvents?: number;
}

/**
 * Subscribes to an account's incoming and outgoing payments over Horizon's
 * SSE stream, live for as long as the component is mounted. On every
 * payment, invalidates that address's `useAccount` and `useBalance`
 * queries automatically, so a balance or sequence number displayed
 * elsewhere in the app updates without a manual refetch.
 *
 * @example
 * ```tsx
 * import { usePaymentStream, useBalance } from "@soroform/hooks";
 *
 * function LiveBalance({ address }: { address: string }) {
 *   const { data: balance } = useBalance(address, "native");
 *   usePaymentStream(address, {
 *     onPayment: (payment) => toast(`New payment: ${payment.type}`),
 *   });
 *   return <p>{balance?.formatted} XLM</p>;
 * }
 * ```
 */
export function usePaymentStream(
  address: string,
  options: UsePaymentStreamOptions = {},
): UseHorizonStreamResult<PaymentStreamRecord> {
  const { enabled = true, onPayment, cursor = "now", maxEvents } = options;
  const config = useSoroformConfig();
  const queryClient = useQueryClient();

  return useHorizonStream<PaymentStreamRecord>(
    () => {
      const horizon = createHorizonServer(config);
      return horizon.payments().forAccount(address).cursor(cursor);
    },
    [address, config.horizonUrl, cursor],
    {
      enabled: enabled && Boolean(address),
      maxEvents,
      onMessage: (record) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.account(address) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.balancesByAddress(address) });
        onPayment?.(record);
      },
    },
  );
}
