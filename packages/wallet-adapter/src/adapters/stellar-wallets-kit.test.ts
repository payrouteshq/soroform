import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockKitEvent {
  eventType: string;
  payload: Record<string, unknown>;
}

const { mockKit, stateListeners, disconnectListeners, TEST_PASSPHRASE, TEST_ADDRESS } = vi.hoisted(
  () => {
    const stateListeners: Array<(event: MockKitEvent) => void> = [];
    const disconnectListeners: Array<(event: MockKitEvent) => void> = [];
    const TEST_PASSPHRASE = "Test SDF Network ; September 2015";
    const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

    const mockKit = {
      init: vi.fn(),
      setNetwork: vi.fn(),
      on: vi.fn((type: string, callback: (event: MockKitEvent) => void) => {
        if (type === "STATE_UPDATE") stateListeners.push(callback);
        if (type === "DISCONNECT") disconnectListeners.push(callback);
        return () => {
          const list = type === "STATE_UPDATE" ? stateListeners : disconnectListeners;
          const index = list.indexOf(callback);
          if (index >= 0) list.splice(index, 1);
        };
      }),
      authModal: vi.fn(async () => {
        stateListeners.forEach((callback) =>
          callback({
            eventType: "STATE_UPDATE",
            payload: { address: TEST_ADDRESS, networkPassphrase: TEST_PASSPHRASE },
          }),
        );
        return { address: TEST_ADDRESS };
      }),
      disconnect: vi.fn(async () => {
        disconnectListeners.forEach((callback) =>
          callback({ eventType: "DISCONNECT", payload: {} }),
        );
      }),
      signTransaction: vi.fn(async (xdr: string) => ({ signedTxXdr: `${xdr}-signed` })),
      signAuthEntry: vi.fn(async (authEntry: string) => ({
        signedAuthEntry: `${authEntry}-signed`,
      })),
    };

    return { mockKit, stateListeners, disconnectListeners, TEST_PASSPHRASE, TEST_ADDRESS };
  },
);

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: mockKit,
  KitEventType: {
    STATE_UPDATED: "STATE_UPDATE",
    WALLET_SELECTED: "WALLET_SELECTED",
    DISCONNECT: "DISCONNECT",
  },
}));

const { stellarWalletsKit } = await import("./stellar-wallets-kit.js");

describe("stellarWalletsKit", () => {
  beforeEach(() => {
    stateListeners.length = 0;
    disconnectListeners.length = 0;
    vi.clearAllMocks();
  });

  it("initializes the underlying kit with the default modules on the first init() call", () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    adapter.init(TEST_PASSPHRASE);
    expect(mockKit.init).toHaveBeenCalledWith(
      expect.objectContaining({ network: TEST_PASSPHRASE }),
    );
    expect(mockKit.setNetwork).not.toHaveBeenCalled();
  });

  it("calls setNetwork instead of init() once already initialized", () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    adapter.init(TEST_PASSPHRASE);
    adapter.init("Public Global Stellar Network ; September 2015");
    expect(mockKit.init).toHaveBeenCalledTimes(1);
    expect(mockKit.setNetwork).toHaveBeenCalledWith(
      "Public Global Stellar Network ; September 2015",
    );
  });

  it("connect() opens the auth modal and resolves the address", async () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    await expect(adapter.connect()).resolves.toEqual({ address: TEST_ADDRESS });
  });

  it("onStateChange() maps STATE_UPDATED events to WalletAdapterState", () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    const listener = vi.fn();
    adapter.onStateChange(listener);
    stateListeners.forEach((callback) =>
      callback({
        eventType: "STATE_UPDATE",
        payload: { address: TEST_ADDRESS, networkPassphrase: TEST_PASSPHRASE },
      }),
    );
    expect(listener).toHaveBeenCalledWith({ address: TEST_ADDRESS, network: TEST_PASSPHRASE });
  });

  it("onDisconnect() fires on a DISCONNECT event", () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    const listener = vi.fn();
    adapter.onDisconnect(listener);
    disconnectListeners.forEach((callback) => callback({ eventType: "DISCONNECT", payload: {} }));
    expect(listener).toHaveBeenCalled();
  });

  it("signTransaction and signAuthEntry pass through to the kit", async () => {
    const adapter = stellarWalletsKit().useAdapter(TEST_PASSPHRASE);
    await expect(adapter.signTransaction("xdr")).resolves.toEqual({
      signedTxXdr: "xdr-signed",
    });
    await expect(adapter.signAuthEntry("entry")).resolves.toEqual({
      signedAuthEntry: "entry-signed",
    });
  });
});
