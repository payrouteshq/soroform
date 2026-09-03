import * as React from "react";

export interface Streamable<T> {
  stream(options: {
    onmessage?: (record: T) => void;
    onerror?: (event: MessageEvent) => void;
  }): () => void;
}

export interface UseHorizonStream$PrivateResult<T> {
  /**
   * Records received this session, newest first, capped at `maxEvents`
   */
  events: T[];
  /**
   * The most recently received record, if any
   */
  latest: T | undefined;
  /**
   * Whether the stream connection is currently open
   */
  isStreaming: boolean;
}

const DEFAULT_MAX_EVENTS = 50;

export function useHorizonStream$Private<T>(
  build: () => Streamable<T> | undefined,
  deps: unknown[],
  options: {
    enabled?: boolean;
    onMessage?: (record: T) => void;
    maxEvents?: number;
  } = {},
): UseHorizonStream$PrivateResult<T> {
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
