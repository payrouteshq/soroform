import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SoroformProvider } from "@soroform/provider";
import { WalletProvider, useWallet } from "./context.js";

interface MockKitEvent {
  eventType: string;
  payload: Record<string, unknown>;
}

const {
  mockKit,
  stateListeners,
  disconnectListeners,
  TEST_PASSPHRASE,
  TEST_ADDRESS,
} = vi.hoisted(() => {
  const stateListeners: Array<(event: MockKitEvent) => void> = [];
  const disconnectListeners: Array<(event: MockKitEvent) => void> = [];
  const TEST_PASSPHRASE = "Test SDF Network ; September 2015";
  const TEST_ADDRESS =
    "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

  const mockKit = {
    init: vi.fn(),
    setNetwork: vi.fn(),
    on: vi.fn((type: string, callback: (event: MockKitEvent) => void) => {
      if (type === "STATE_UPDATE") stateListeners.push(callback);
      if (type === "DISCONNECT") disconnectListeners.push(callback);
      return () => {
        const list =
          type === "STATE_UPDATE" ? stateListeners : disconnectListeners;
        const index = list.indexOf(callback);
        if (index >= 0) list.splice(index, 1);
      };
    }),
    authModal: vi.fn(async () => {
      const event: MockKitEvent = {
        eventType: "STATE_UPDATE",
        payload: { address: TEST_ADDRESS, networkPassphrase: TEST_PASSPHRASE },
      };
      stateListeners.forEach((callback) => callback(event));
      return { address: TEST_ADDRESS };
    }),
    disconnect: vi.fn(async () => {
      disconnectListeners.forEach((callback) =>
        callback({ eventType: "DISCONNECT", payload: {} }),
      );
    }),
    signTransaction: vi.fn(async (xdr: string) => ({
      signedTxXdr: `${xdr}-signed`,
    })),
    signAuthEntry: vi.fn(async (authEntry: string) => ({
      signedAuthEntry: `${authEntry}-signed`,
    })),
  };

  return {
    mockKit,
    stateListeners,
    disconnectListeners,
    TEST_PASSPHRASE,
    TEST_ADDRESS,
  };
});

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: mockKit,
  KitEventType: {
    STATE_UPDATED: "STATE_UPDATE",
    WALLET_SELECTED: "WALLET_SELECTED",
    DISCONNECT: "DISCONNECT",
  },
  Networks: {
    PUBLIC: "Public Global Stellar Network ; September 2015",
    TESTNET: TEST_PASSPHRASE,
    FUTURENET: "Test SDF Future Network ; October 2022",
    SANDBOX: "Local Sandbox Stellar Network ; September 2022",
    STANDALONE: "Standalone Network ; February 2017",
  },
}));

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

function renderWithProviders() {
  return render(
    <SoroformProvider network="testnet">
      <WalletProvider>
        <Probe />
      </WalletProvider>
    </SoroformProvider>,
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    stateListeners.length = 0;
    disconnectListeners.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    stateListeners.length = 0;
    disconnectListeners.length = 0;
  });

  it("starts disconnected", () => {
    renderWithProviders();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
  });

  it("updates address after connect() resolves a STATE_UPDATE event", async () => {
    renderWithProviders();
    screen.getByText("connect").click();
    await waitFor(() => {
      expect(screen.getByTestId("connected")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("address")).toHaveTextContent(TEST_ADDRESS);
  });

  it("clears address after disconnect() fires a DISCONNECT event", async () => {
    renderWithProviders();
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
    renderWithProviders();
    expect(mockKit.on).toHaveBeenCalledWith(
      "STATE_UPDATE",
      expect.any(Function),
    );
    expect(mockKit.on).toHaveBeenCalledWith("DISCONNECT", expect.any(Function));
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
