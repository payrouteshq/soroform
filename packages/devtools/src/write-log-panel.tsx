import { useSyncExternalStore } from "react";
import { devtoolsWriteLog, type ContractWriteLogEntry } from "@soroform/core";

const STATUS_COLORS: Record<ContractWriteLogEntry["status"], string> = {
  idle: "#9ca3af",
  simulating: "#60a5fa",
  needsSignature: "#fbbf24",
  submitting: "#818cf8",
  success: "#34d399",
  error: "#f87171",
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
    // Clipboard access can be denied by the browser; there is nothing
    // more useful to do here than silently no-op.
  }
}

function WriteLogRow(props: { entry: ContractWriteLogEntry }) {
  const { entry } = props;
  return (
    <div
      style={{
        padding: "0.75rem",
        borderBottom: "1px solid #27272a",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          style={{
            display: "inline-block",
            width: "0.5rem",
            height: "0.5rem",
            borderRadius: "9999px",
            background: STATUS_COLORS[entry.status],
          }}
        />
        <strong>{entry.contractId}</strong>
        <span>.{entry.method}(...)</span>
        <span style={{ marginLeft: "auto", color: "#a1a1aa" }}>{entry.status}</span>
      </div>

      {entry.args !== undefined && (
        <details style={{ marginTop: "0.25rem" }}>
          <summary>args</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{safeStringify(entry.args)}</pre>
        </details>
      )}

      {entry.result !== undefined && (
        <details style={{ marginTop: "0.25rem" }} open>
          <summary>result</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{safeStringify(entry.result)}</pre>
        </details>
      )}

      {entry.error && (
        <p style={{ color: STATUS_COLORS.error, marginTop: "0.25rem" }}>
          {entry.error.kind}: {entry.error.message}
        </p>
      )}

      {entry.transaction && (
        <div style={{ marginTop: "0.25rem" }}>
          <p style={{ margin: 0 }}>
            operation: {entry.transaction.operationType ?? "unknown"} | source:{" "}
            {entry.transaction.sourceAccount ?? "unknown"} | min resource fee:{" "}
            {entry.transaction.minResourceFee ?? "unknown"}
          </p>
          {entry.transaction.transactionXdr && (
            <button
              type="button"
              onClick={() => {
                void copyToClipboard(entry.transaction!.transactionXdr!);
              }}
              style={{
                marginTop: "0.25rem",
                fontSize: "0.7rem",
                padding: "0.15rem 0.4rem",
                cursor: "pointer",
              }}
            >
              Copy transaction XDR
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Lists `useContractWrite` activity logged to `@soroform/core`'s
 * `devtoolsWriteLog` store, newest last. Subscribes via
 * `useSyncExternalStore`, so it updates live as writes progress through
 * their status transitions.
 */
export function WriteLogPanel() {
  const entries = useSyncExternalStore(
    devtoolsWriteLog.subscribe.bind(devtoolsWriteLog),
    devtoolsWriteLog.getAll.bind(devtoolsWriteLog),
  );

  if (entries.length === 0) {
    return (
      <p style={{ padding: "0.75rem", color: "#a1a1aa", fontSize: "0.8rem" }}>
        No contract writes logged yet this session.
      </p>
    );
  }

  return (
    <div style={{ overflowY: "auto" }}>
      {entries.map((entry) => (
        <WriteLogRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
