import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { devtoolsSendLog } from "@sorokit/core";
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
      status: "SUCCESS",
      args: { to: "GABC", amount: 100n },
      result: true,
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByText("CABC")).toBeInTheDocument();
    expect(screen.getByText(".transfer(...)")).toBeInTheDocument();
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
  });

  it("renders an error message when the send failed", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "ERROR",
      error: { kind: "USER_REJECTED", message: "The user rejected the request", cause: undefined },
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByText(/USER_REJECTED: The user rejected the request/)).toBeInTheDocument();
  });

  it("links a submitted hash to Stellar Expert on the matching network", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "SUBMITTING",
      network: "PUBLIC",
      hash: "abc123",
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByRole("link", { name: /Stellar Expert/ })).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/public/tx/abc123",
    );
  });

  it("uses the testnet explorer for a testnet send", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "SUBMITTING",
      network: "TESTNET",
      hash: "abc123",
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.getByRole("link", { name: /Stellar Expert/ })).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/testnet/tx/abc123",
    );
  });

  it("omits the explorer link on a network Stellar Expert does not index", () => {
    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "SUBMITTING",
      network: "STANDALONE",
      hash: "abc123",
      updatedAt: Date.now(),
    });
    render(<SendLogPanel />);
    expect(screen.queryByRole("link", { name: /Stellar Expert/ })).not.toBeInTheDocument();
  });

  it("copies the transaction XDR to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    devtoolsSendLog.record({
      id: "a",
      contractId: "CABC",
      method: "transfer",
      status: "NEEDS_SIGNATURE",
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
