import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True once the component has hydrated on the client. Backed by
 * useSyncExternalStore (server snapshot false, client snapshot true)
 * rather than a useState+useEffect pair, so there is no setState call
 * inside an effect to trip react-hooks/set-state-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
