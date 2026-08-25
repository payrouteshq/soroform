import { useSyncExternalStore } from "react";
import { devtoolsWriteLog, type ContractWriteLogEntry } from "@soroform/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const STATUS_VARIANT: Record<
  ContractWriteLogEntry["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  idle: "secondary",
  simulating: "outline",
  needsSignature: "outline",
  submitting: "outline",
  success: "default",
  error: "destructive",
};

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? `${val.toString()}n` : val),
    2,
  );
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard access can be denied by the browser
  }
}

function WriteLogRow({ entry }: { entry: ContractWriteLogEntry }) {
  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-xs">
          <span className="truncate">{entry.contractId}</span>
          <span className="text-muted-foreground">.{entry.method}(...)</span>
          <Badge variant={STATUS_VARIANT[entry.status]} className="ml-auto">
            {entry.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-xs">
        {entry.args !== undefined && (
          <details>
            <summary className="cursor-pointer">args</summary>
            <pre className="whitespace-pre-wrap">{safeStringify(entry.args)}</pre>
          </details>
        )}
        {entry.result !== undefined && (
          <details open>
            <summary className="cursor-pointer">result</summary>
            <pre className="whitespace-pre-wrap">{safeStringify(entry.result)}</pre>
          </details>
        )}
        {entry.error && (
          <p className="text-destructive">
            {entry.error.kind}: {entry.error.message}
          </p>
        )}
        {entry.transaction && (
          <div className="space-y-1.5">
            <p>
              operation: {entry.transaction.operationType ?? "unknown"} · source:{" "}
              {entry.transaction.sourceAccount ?? "unknown"} · min resource fee:{" "}
              {entry.transaction.minResourceFee ?? "unknown"}
            </p>
            {entry.transaction.transactionXdr && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void copyToClipboard(entry.transaction!.transactionXdr!);
                }}
              >
                Copy transaction XDR
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WriteLogPanel() {
  const entries = useSyncExternalStore(
    devtoolsWriteLog.subscribe.bind(devtoolsWriteLog),
    devtoolsWriteLog.getAll.bind(devtoolsWriteLog),
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No contract writes logged yet this session.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      {entries.map((entry, index) => (
        <div key={entry.id}>
          {index > 0 && <Separator />}
          <WriteLogRow entry={entry} />
        </div>
      ))}
    </ScrollArea>
  );
}
