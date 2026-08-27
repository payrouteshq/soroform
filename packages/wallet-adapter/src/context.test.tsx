import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SoroformProvider } from "@soroform/provider";
import { WalletProvider, useWallet } from "./context.js";
import type { WalletAdapter, WalletAdapterState } from "./types.js";

const TEST_PASSPHRASE = "Test SDF Network ; September 2015";
const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

function createFakeAdapter() {
  let stateListener: ((state: WalletAdapterState) => void) | undefined;
  let disconnectListener: (() => void) | undefined;

  const adapter: WalletAdapter = {
    init: vi.fn(),
    connect: vi.fn(async () => {
      stateListener?.({ address: TEST_ADDRESS, network: TEST_PASSPHRASE });
      return { address: TEST_ADDRESS };
    }),
    disconnect: vi.fn(async () => {
      disconnectListener?.();
    }),
    signTransaction: vi.fn(async (xdr: string) => ({ signedTxXdr: `${xdr}-signed` })),
    signAuthEntry: vi.fn(async (authEntry: string) => ({
      signedAuthEntry: `${authEntry}-signed`,
    })),
    onStateChange: vi.fn((listener) => {
      stateListener = listener;
      return () => {
        stateListener = undefined;
      };
    }),
    onDisconnect: vi.fn((listener) => {
      disconnectListener = listener;
      return () => {
        disconnectListener = undefined;
      };
    }),
  };

  return adapter;
}

function Probe() {
  const wallet = useWallet();
  return (
    <div>
      <span data-testid="address">{wallet.address ?? "none"}</span>
      <span data-testid="connected">{String(wallet.isConnected)}</span>
      <button onClick={() => wallet.connect()}>connect</button>
      <button onClick={() => wallet.disconnect()}>disconnect</button>
    </div>
  );
}

function renderWithProviders(adapter: WalletAdapter) {
  return render(
    <SoroformProvider network="testnet">
      <WalletProvider adapter={adapter}>
        <Probe />
      </WalletProvider>
    </SoroformProvider>,
  );
}

describe("WalletProvider", () => {
  let adapter: WalletAdapter;

  beforeEach(() => {
    adapter = createFakeAdapter();
  });

  it("starts disconnected", () => {
    renderWithProviders(adapter);
    expect(screen.getByTestId("address")).toHaveTextContent("none");
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
  });

  it("calls adapter.init with the resolved network passphrase on mount", () => {
    renderWithProviders(adapter);
    expect(adapter.init).toHaveBeenCalledWith(TEST_PASSPHRASE);
  });

  it("updates address after connect() reports a state change", async () => {
    renderWithProviders(adapter);
    screen.getByText("connect").click();
    await waitFor(() => {
      expect(screen.getByTestId("connected")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("address")).toHaveTextContent(TEST_ADDRESS);
  });

  it("clears address after disconnect() fires the adapter's disconnect listener", async () => {
    renderWithProviders(adapter);
    screen.getByText("connect").click();
    await waitFor(() => {
      expect(screen.getByTestId("connected")).toHaveTextContent("true");
    });
    screen.getByText("disconnect").click();
    await waitFor(() => {
      expect(screen.getByTestId("connected")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("address")).toHaveTextContent("none");
  });

  it("registers state and disconnect listeners on mount", () => {
    renderWithProviders(adapter);
    expect(adapter.onStateChange).toHaveBeenCalledWith(expect.any(Function));
    expect(adapter.onDisconnect).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe("useWallet", () => {
  it("throws when called outside a WalletProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() =>
      render(
        <SoroformProvider network="testnet">
          <Probe />
        </SoroformProvider>,
      ),
    ).toThrow(/useWallet must be called within a <WalletProvider>/);
    console.error = originalError;
  });
});
