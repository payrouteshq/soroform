import * as React from "react";
import { devtoolsSendLog, type ContractSendLogEntry, type SorokitNetwork } from "@sorokit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const STATUS_VARIANT: Record<
  ContractSendLogEntry["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  IDLE: "secondary",
  QUEUED: "secondary",
  SIMULATING: "outline",
  NEEDS_SIGNATURE: "outline",
  SUBMITTING: "outline",
  SUCCESS: "default",
  ERROR: "destructive",
};

function safeStringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? `${val.toString()}n` : val),
    2,
  );
}

const EXPLORER_NETWORKS: Partial<Record<SorokitNetwork, string>> = {
  PUBLIC: "public",
  TESTNET: "testnet",
};

function stellarExpertTxUrl(entry: ContractSendLogEntry): string | undefined {
  const explorer = entry.network && EXPLORER_NETWORKS[entry.network];
  if (!explorer || !entry.hash) return undefined;
  return `https://stellar.expert/explorer/${explorer}/tx/${entry.hash}`;
}

function ArrowUpRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard access can be denied by the browser
  }
}

function SendLogRow({ entry }: { entry: ContractSendLogEntry }) {
  const transactionXdr = entry.transaction?.transactionXdr;
  const explorerUrl = stellarExpertTxUrl(entry);

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
          <p>
            operation: {entry.transaction.operationType ?? "unknown"} · source:{" "}
            {entry.transaction.sourceAccount ?? "unknown"} · min resource fee:{" "}
            {entry.transaction.minResourceFee ?? "unknown"}
          </p>
        )}
        {(transactionXdr || explorerUrl) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {transactionXdr && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void copyToClipboard(transactionXdr);
                }}
              >
                Copy transaction XDR
              </Button>
            )}
            {explorerUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  Stellar Expert
                  <ArrowUpRightIcon />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SendLogPanel() {
  const entries = React.useSyncExternalStore(
    devtoolsSendLog.subscribe.bind(devtoolsSendLog),
    devtoolsSendLog.getAll.bind(devtoolsSendLog),
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No contract sends logged yet this session.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      {entries.map((entry, index) => (
        <div key={entry.id}>
          {index > 0 && <Separator />}
          <SendLogRow entry={entry} />
        </div>
      ))}
    </ScrollArea>
  );
}
