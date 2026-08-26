import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { devtoolsSendLog } from "@soroform/core";
import { SendLogPanel } from "./send-log-panel.js";

describe("SendLogPanel", () => {
  beforeEach(() => {
    devtoolsSendLog.clear();
  });

  it("shows an empty-state message with no logged sends", () => {
    render(<SendLogPanel />);
    expect(screen.getByText(/No contract sends logged yet/)).toBeInTheDocument();
  });

  it("renders a logged send's contract, method, and status", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "success",
      args: { to: "GABC", amount: 100n },
      result: true,
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByText("CABC")).toBeInTheDocument();
    expect(screen.getByText(".transfer(...)")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("renders an error message when the send failed", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "error",
      error: { kind: "user-rejected", message: "The user rejected the request", cause: undefined },
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByText(/user-rejected: The user rejected the request/)).toBeInTheDocument();
  });

  it("copies the transaction XDR to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    devtoolsSendLog.record({
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
    render(<SendLogPanel />);
    screen.getByText("Copy transaction XDR").click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("AAAAAgAAAAA=");
  });
});
