import * as React from "react";

/**
 * The shape every Horizon `CallBuilder` satisfies once narrowed to a single
 * account (`.forAccount(...)`) and cursor. Structurally typed against the
 * real SDK's `stream()` method rather than importing its (unexported)
 * `CallBuilder` class.
 */
export interface Streamable<T> {
  stream(options: {
    onmessage?: (record: T) => void;
    onerror?: (event: MessageEvent) => void;
  }): () => void;
}

export interface UseHorizonStreamResult<T> {
  /** Records received this session, newest first, capped at `maxEvents`. */
  events: T[];
  /** The most recently received record, if any. */
  latest: T | undefined;
  /** Whether the stream connection is currently open. */
  isStreaming: boolean;
}

const DEFAULT_MAX_EVENTS = 50;

/**
 * Shared lifecycle plumbing for a Horizon SSE stream: opens on mount (and
 * whenever `deps` changes), closes on unmount, and keeps the last
 * `maxEvents` received records in state. Not exported from `@soroform/hooks`
 * directly; `usePaymentStream` and `useEffectStream` are the public,
 * typed entry points built on top of it.
 */
export function useHorizonStream<T>(
  build: () => Streamable<T> | undefined,
  deps: unknown[],
  options: {
    enabled?: boolean;
    onMessage?: (record: T) => void;
    maxEvents?: number;
  } = {},
): UseHorizonStreamResult<T> {
  const { enabled = true, maxEvents = DEFAULT_MAX_EVENTS } = options;
  const [events, setEvents] = React.useState<T[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const onMessageRef = React.useRef(options.onMessage);
  onMessageRef.current = options.onMessage;

  React.useEffect(() => {
    if (!enabled) return;
    const builder = build();
    if (!builder) return;

    setIsStreaming(true);
    const close = builder.stream({
      onmessage: (record) => {
        setEvents((prev) => [record, ...prev].slice(0, maxEvents));
        onMessageRef.current?.(record);
      },
      onerror: () => {
        setIsStreaming(false);
      },
    });

    return () => {
      setIsStreaming(false);
      close();
    };
  }, [enabled, maxEvents, ...deps]);

  return { events, latest: events[0], isStreaming };
}
