import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_PASSPHRASE = "Test SDF Network ; September 2015";
const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

const { mockBluxClient, mockCreateConfig, mockSwitchNetwork, mockGetNetwork, mockHandlers } =
  vi.hoisted(() => {
    const mockHandlers = new Map<string, Set<(payload: unknown) => void>>();

    return {
      mockBluxClient: {
        login: vi.fn(async () => ({ address: TEST_ADDRESS })),
        logout: vi.fn(),
        signTransaction: vi.fn(async (xdr: string) => `${xdr}-signed`),
        signAuthEntry: vi.fn(async (entry: string) => `${entry}-signed`),
        user: undefined as { address: string } | undefined,
      },
      mockCreateConfig: vi.fn(),
      mockSwitchNetwork: vi.fn(),
      mockGetNetwork: vi.fn(() => TEST_PASSPHRASE),
      mockHandlers,
    };
  });

vi.mock("@bluxcc/core", () => ({
  blux: mockBluxClient,
  createConfig: mockCreateConfig,
  switchNetwork: mockSwitchNetwork,
  getNetwork: mockGetNetwork,
  events: {
    on: (event: string, handler: (payload: unknown) => void) => {
      const set = mockHandlers.get(event) ?? new Set();
      set.add(handler);
      mockHandlers.set(event, set);
      return () => set.delete(handler);
    },
  },
  BluxEvent: {
    LoggedIn: "blux:logged_in",
    LoggedOut: "blux:logged_out",
    NetworkChanged: "blux:network_changed",
  },
}));

const { blux } = await import("./blux.js");

function emit(event: string, payload: unknown) {
  mockHandlers.get(event)?.forEach((handler) => handler(payload));
}

describe("blux adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandlers.clear();
    mockBluxClient.user = undefined;
  });

  it("initializes with showWalletUIs: false by default, and the current network as the only one", () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    adapter.init(TEST_PASSPHRASE);
    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "app-1",
        appName: "Test App",
        showWalletUIs: false,
        networks: [TEST_PASSPHRASE],
        defaultNetwork: TEST_PASSPHRASE,
      }),
    );
  });

  it("lets an explicit showWalletUIs override the default", () => {
    const adapter = blux({ appId: "app-1", appName: "Test App", showWalletUIs: true });
    adapter.init(TEST_PASSPHRASE);
    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ showWalletUIs: true }),
    );
  });

  it("calls switchNetwork instead of createConfig once already initialized", () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    adapter.init(TEST_PASSPHRASE);
    adapter.init("Public Global Stellar Network ; September 2015");
    expect(mockCreateConfig).toHaveBeenCalledTimes(1);
    expect(mockSwitchNetwork).toHaveBeenCalledWith(
      "Public Global Stellar Network ; September 2015",
    );
  });

  it("connect() logs in and resolves the address", async () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    await expect(adapter.connect()).resolves.toEqual({ address: TEST_ADDRESS });
  });

  it("disconnect() logs out", async () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    await adapter.disconnect();
    expect(mockBluxClient.logout).toHaveBeenCalled();
  });

  it("signTransaction and signAuthEntry return the signed value with the current signer address", async () => {
    mockBluxClient.user = { address: TEST_ADDRESS };
    const adapter = blux({ appId: "app-1", appName: "Test App" });

    await expect(adapter.signTransaction("xdr")).resolves.toEqual({
      signedTxXdr: "xdr-signed",
      signerAddress: TEST_ADDRESS,
    });
    await expect(adapter.signAuthEntry("entry")).resolves.toEqual({
      signedAuthEntry: "entry-signed",
      signerAddress: TEST_ADDRESS,
    });
  });

  it("onStateChange() maps LoggedIn and NetworkChanged events to WalletAdapterState", () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    const listener = vi.fn();
    adapter.onStateChange(listener);

    emit("blux:logged_in", { user: { address: TEST_ADDRESS } });
    expect(listener).toHaveBeenCalledWith({ address: TEST_ADDRESS, network: TEST_PASSPHRASE });

    emit("blux:network_changed", { network: "Test SDF Future Network ; October 2022" });
    expect(listener).toHaveBeenCalledWith({
      address: undefined,
      network: "Test SDF Future Network ; October 2022",
    });
  });

  it("onDisconnect() fires on a LoggedOut event", () => {
    const adapter = blux({ appId: "app-1", appName: "Test App" });
    const listener = vi.fn();
    adapter.onDisconnect(listener);
    emit("blux:logged_out", undefined);
    expect(listener).toHaveBeenCalled();
  });
});
