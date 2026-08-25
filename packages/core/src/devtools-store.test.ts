import { describe, expect, it, vi } from "vitest";
import { devtoolsWriteLog, type ContractWriteLogEntry } from "./devtools-store.js";

function entry(overrides: Partial<ContractWriteLogEntry> = {}): ContractWriteLogEntry {
  return {
    id: "1",
    contractId: "CABC",
    method: "transfer",
    status: "idle",
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("devtoolsWriteLog", () => {
  it("records and lists entries", () => {
    devtoolsWriteLog.clear();
    devtoolsWriteLog.record(entry({ id: "a" }));
    devtoolsWriteLog.record(entry({ id: "b" }));
    expect(devtoolsWriteLog.getAll().map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("overwrites an entry recorded again with the same id", () => {
    devtoolsWriteLog.clear();
    devtoolsWriteLog.record(entry({ id: "a", status: "idle" }));
    devtoolsWriteLog.record(entry({ id: "a", status: "success" }));
    const all = devtoolsWriteLog.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe("success");
  });

  it("notifies subscribers on record and clear", () => {
    devtoolsWriteLog.clear();
    const listener = vi.fn();
    const unsubscribe = devtoolsWriteLog.subscribe(listener);
    devtoolsWriteLog.record(entry());
    expect(listener).toHaveBeenCalledTimes(1);
    devtoolsWriteLog.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    devtoolsWriteLog.record(entry());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a stable getAll() reference between calls when unchanged", () => {
    devtoolsWriteLog.clear();
    devtoolsWriteLog.record(entry({ id: "a" }));
    expect(devtoolsWriteLog.getAll()).toBe(devtoolsWriteLog.getAll());
  });

  it("returns a new getAll() reference after a mutation", () => {
    devtoolsWriteLog.clear();
    devtoolsWriteLog.record(entry({ id: "a" }));
    const first = devtoolsWriteLog.getAll();
    devtoolsWriteLog.record(entry({ id: "b" }));
    expect(devtoolsWriteLog.getAll()).not.toBe(first);
  });

  it("carries an optional transaction summary", () => {
    devtoolsWriteLog.clear();
    devtoolsWriteLog.record(
      entry({
        id: "a",
        transaction: {
          operationType: "invokeHostFunction",
          sourceAccount: "GABC",
          minResourceFee: "100",
          transactionXdr: "AAAA...",
        },
      }),
    );
    expect(devtoolsWriteLog.getAll()[0]?.transaction?.operationType).toBe(
      "invokeHostFunction",
    );
  });
});
