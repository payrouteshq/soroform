import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { devtoolsWriteLog } from "@soroform/core";
import { WriteLogPanel } from "./write-log-panel.js";

describe("WriteLogPanel", () => {
  beforeEach(() => {
    devtoolsWriteLog.clear();
  });

  it("shows an empty-state message with no logged writes", () => {
    render(<WriteLogPanel />);
    expect(screen.getByText(/No contract writes logged yet/)).toBeInTheDocument();
  });

  it("renders a logged write's contract, method, and status", () => {
    devtoolsWriteLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "success",
      args: { to: "GABC", amount: 100n },
      result: true,
      updatedAt: Date.now(),
    });
    render(<WriteLogPanel />);
    expect(screen.getByText("CABC")).toBeInTheDocument();
    expect(screen.getByText(".transfer(...)")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("renders an error message when the write failed", () => {
    devtoolsWriteLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "error",
      error: { kind: "user-rejected", message: "The user rejected the request", cause: undefined },
      updatedAt: Date.now(),
    });
    render(<WriteLogPanel />);
    expect(screen.getByText(/user-rejected: The user rejected the request/)).toBeInTheDocument();
  });

  it("copies the transaction XDR to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    devtoolsWriteLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "needsSignature",
      transaction: {
        operationType: "invokeHostFunction",
        sourceAccount: "GABC",
        minResourceFee: "100",
        transactionXdr: "AAAAAgAAAAA=",
      },
      updatedAt: Date.now(),
    });
    render(<WriteLogPanel />);
    screen.getByText("Copy transaction XDR").click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("AAAAAgAAAAA=");
  });
});
