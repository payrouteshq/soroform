import { useQueryClient } from "@tanstack/react-query";
import { createHorizonServer, queryKeys, type Horizon } from "@sorokit/core";
import { useSorokitConfig } from "@sorokit/provider";
import { useHorizonStream, type useHorizonStreamResult } from "./stream-core.js";

export type EffectStreamRecord = Horizon.ServerApi.EffectRecord;

export interface UseEffectStreamOptions {
  /**
   * Whether the stream should be open. Defaults to `true`
   */
  enabled?: boolean;
  /**
   * Called for every effect received, in addition to the returned state updating
   */
  onEffect?: (record: EffectStreamRecord) => void;
  /**
   * The Horizon cursor to start from.
   * Defaults to `"now"`, so only effects that arrive after the hook mounts are received;
   * pass a specific cursor to resume from a known point instead
   */
  cursor?: string;
  /**
   * How many recent effects to keep in `events`. Defaults to 50
   */
  maxEvents?: number;
}

/**
 * Subscribes to every effect an account is involved in (trustline changes,
 * sponsorship changes, signer changes, and more, not just payments) over
 * Horizon's SSE stream, live for as long as the component is mounted. On
 * every effect, invalidates that address's `useBalance` queries
 * automatically.
 *
 * @example
 * ```tsx
 * import { useEffectStream } from "@sorokit/hooks";
 *
 * function ActivityFeed({ address }: { address: string }) {
 *   const { events } = useEffectStream(address);
 *   return (
 *     <ul>
 *       {events.map((effect) => (
 *         <li key={effect.id}>{effect.type}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useEffectStream(
  address: string,
  options: UseEffectStreamOptions = {},
): useHorizonStreamResult<EffectStreamRecord> {
  const { enabled = true, onEffect, cursor = "now", maxEvents } = options;
  const config = useSorokitConfig();
  const queryClient = useQueryClient();

  return useHorizonStream<EffectStreamRecord>(
    () => {
      const horizon = createHorizonServer(config);
      return horizon.effects().forAccount(address).cursor(cursor);
    },
    [address, config.horizonUrl, cursor],
    {
      enabled: enabled && Boolean(address),
      maxEvents,
      onMessage: (record) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.balancesByAddress(address) });
        onEffect?.(record);
      },
    },
  );
}
