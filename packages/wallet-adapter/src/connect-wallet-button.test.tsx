import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectWalletButton } from "./connect-wallet-button.js";
import * as walletContext from "./context.js";

describe("ConnectWalletButton", () => {
  it("shows the connect label and calls connect() when disconnected", () => {
    const connect = vi.fn();
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      address: undefined,
      network: undefined,
      isConnected: false,
      connect,
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAuthEntry: vi.fn(),
    });

    render(<ConnectWalletButton />);
    const button = screen.getByRole("button", { name: "Connect Wallet" });
    button.click();
    expect(connect).toHaveBeenCalled();
  });

  it("shows a truncated address and calls disconnect() when connected", () => {
    const disconnect = vi.fn();
    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      address,
      network: "Test SDF Network ; September 2015",
      isConnected: true,
      connect: vi.fn(),
      disconnect,
      signTransaction: vi.fn(),
      signAuthEntry: vi.fn(),
    });

    render(<ConnectWalletButton />);
    const button = screen.getByRole("button", { name: /GABCDE\.\.\.STUV/ });
    button.click();
    expect(disconnect).toHaveBeenCalled();
  });

  it("respects a custom connectLabel", () => {
    vi.spyOn(walletContext, "useWallet").mockReturnValue({
      address: undefined,
      network: undefined,
      isConnected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAuthEntry: vi.fn(),
    });

    render(<ConnectWalletButton connectLabel="Sign in" />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
