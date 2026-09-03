import * as React from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type QueryStatusLabel = "fetching" | "paused" | "stale" | "fresh" | "inactive";

const STATUS_ORDER: QueryStatusLabel[] = ["fresh", "fetching", "paused", "stale", "inactive"];

const STATUS_VARIANT: Record<QueryStatusLabel, "default" | "secondary" | "outline" | "ghost"> = {
  fresh: "default",
  fetching: "outline",
  paused: "outline",
  stale: "secondary",
  inactive: "ghost",
};

function getQueryStatusLabel(query: Query): QueryStatusLabel {
  if (query.state.fetchStatus === "fetching") return "fetching";
  if (!query.getObserversCount()) return "inactive";
  if (query.state.fetchStatus === "paused") return "paused";
  if (query.isStale()) return "stale";
  return "fresh";
}

function useQueryCacheEntries(): Query[] {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();
  const snapshotRef = React.useRef<Query[] | null>(null);

  return React.useSyncExternalStore(
    (onStoreChange) =>
      queryCache.subscribe(() => {
        snapshotRef.current = null;
        onStoreChange();
      }),
    () => (snapshotRef.current ??= queryCache.getAll()),
  );
}

function QueryCacheRow({ query }: { query: Query }) {
  const status = getQueryStatusLabel(query);

  return (
    <Card size="sm" className="rounded-none border-x-0 border-t-0 shadow-none">
      <CardContent className="flex items-center gap-3 font-mono text-xs">
        <span className="w-4 shrink-0 text-right text-muted-foreground">
          {query.getObserversCount()}
        </span>
        <span className="min-w-0 flex-1 truncate">{JSON.stringify(query.queryKey)}</span>
        <Badge variant={STATUS_VARIANT[status]} className="shrink-0 uppercase">
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function QueryCachePanel() {
  const queries = useQueryCacheEntries();

  const counts = React.useMemo(() => {
    const result: Record<QueryStatusLabel, number> = {
      fresh: 0,
      fetching: 0,
      paused: 0,
      stale: 0,
      inactive: 0,
    };
    for (const query of queries) result[getQueryStatusLabel(query)] += 1;
    return result;
  }, [queries]);

  if (queries.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No queries cached yet this session.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {STATUS_ORDER.map((status) => (
          <Badge key={status} variant={STATUS_VARIANT[status]} className="uppercase">
            {status} {counts[status]}
          </Badge>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {queries.map((query, index) => (
          <div key={query.queryHash}>
            {index > 0 && <Separator />}
            <QueryCacheRow query={query} />
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
