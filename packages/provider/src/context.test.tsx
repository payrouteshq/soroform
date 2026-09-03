import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@sorokit/wallet-adapter";
import type { WalletAdapter, WalletConnector } from "@sorokit/wallet-adapter";
import { SorokitProvider, useSorokitConfig } from "./context.js";

const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

function createFakeConnector(): WalletConnector {
  let stateListener:
    ((state: { address: string | undefined; network: string | undefined }) => void) | undefined;

  const adapter: WalletAdapter = {
    init: vi.fn(),
    connect: vi.fn(async () => {
      stateListener?.({ address: TEST_ADDRESS, network: "Test SDF Network ; September 2015" });
      return { address: TEST_ADDRESS };
    }),
    disconnect: vi.fn(async () => {}),
    signTransaction: vi.fn(async (xdr: string) => ({ signedTxXdr: xdr })),
    signAuthEntry: vi.fn(async (authEntry: string) => ({ signedAuthEntry: authEntry })),
    onStateChange: vi.fn((listener) => {
      stateListener = listener;
      return () => {
        stateListener = undefined;
      };
    }),
    onDisconnect: vi.fn(() => () => {}),
  };

  return { useAdapter: () => adapter };
}

function WalletProbe() {
  const wallet = useWallet();
  return (
    <div>
      <span data-testid="address">{wallet.address ?? "none"}</span>
      <button onClick={() => wallet.connect()}>connect</button>
    </div>
  );
}

function ConfigProbe() {
  const config = useSorokitConfig();
  return <span data-testid="probe">{JSON.stringify(config)}</span>;
}

function QueryClientProbe() {
  const client = useQueryClient();
  return <span data-testid="probe">{String(client.getDefaultOptions().queries?.staleTime)}</span>;
}

describe("SorokitProvider", () => {
  it("renders its children", () => {
    render(
      <SorokitProvider network="TESTNET">
        <span>hello</span>
      </SorokitProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("resolves and propagates config from the network prop", () => {
    render(
      <SorokitProvider network="TESTNET">
        <ConfigProbe />
      </SorokitProvider>,
    );
    const config = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(config.network).toBe("TESTNET");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("propagates rpcUrl and horizonUrl overrides", () => {
    render(
      <SorokitProvider
        network="TESTNET"
        rpcUrl="https://custom-rpc.example.com"
        horizonUrl="https://custom-horizon.example.com"
      >
        <ConfigProbe />
      </SorokitProvider>,
    );
    const config = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(config.rpcUrl).toBe("https://custom-rpc.example.com");
    expect(config.horizonUrl).toBe("https://custom-horizon.example.com");
  });

  it("creates a default QueryClient with a 5 second staleTime when none is passed", () => {
    render(
      <SorokitProvider network="TESTNET">
        <QueryClientProbe />
      </SorokitProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("5000");
  });

  it("uses an explicitly passed QueryClient instead of creating one", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 42 } },
    });
    render(
      <SorokitProvider network="TESTNET" queryClient={client}>
        <QueryClientProbe />
      </SorokitProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("42");
  });
});

describe("useSorokitConfig", () => {
  it("throws when called outside a SorokitProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<ConfigProbe />)).toThrow(
      /useSorokitConfig must be called within a <SorokitProvider>/,
    );
    console.error = originalError;
  });
});

describe("SorokitProvider wallet prop", () => {
  it("mounts the connector so useWallet() works, without a separate WalletProvider", async () => {
    render(
      <SorokitProvider network="TESTNET" wallet={createFakeConnector()}>
        <WalletProbe />
      </SorokitProvider>,
    );
    expect(screen.getByTestId("address")).toHaveTextContent("none");

    screen.getByText("connect").click();
    await waitFor(() => {
      expect(screen.getByTestId("address")).toHaveTextContent(TEST_ADDRESS);
    });
  });

  it("mounts the connector's own Provider, if it has one, above everything else", () => {
    const connector: WalletConnector = {
      ...createFakeConnector(),
      Provider: ({ children }) => <div data-testid="connector-provider">{children}</div>,
    };
    render(
      <SorokitProvider network="TESTNET" wallet={connector}>
        <WalletProbe />
      </SorokitProvider>,
    );
    expect(screen.getByTestId("connector-provider")).toContainElement(
      screen.getByTestId("address"),
    );
  });

  it("useWallet() throws without a wallet prop, same as an unmounted WalletProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() =>
      render(
        <SorokitProvider network="TESTNET">
          <WalletProbe />
        </SorokitProvider>,
      ),
    ).toThrow(/useWallet must be called within a <WalletProvider>/);
    console.error = originalError;
  });
});

describe("SorokitProvider devtools prop", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("does not render devtools when the prop is omitted", () => {
    process.env.NODE_ENV = "development";
    render(
      <SorokitProvider network="TESTNET">
        <span>hello</span>
      </SorokitProvider>,
    );
    expect(screen.queryByRole("button", { name: "Open Sorokit devtools" })).not.toBeInTheDocument();
  });

  it("renders devtools with defaults when passed true", () => {
    process.env.NODE_ENV = "development";
    render(
      <SorokitProvider network="TESTNET" devtools>
        <span>hello</span>
      </SorokitProvider>,
    );
    expect(screen.getByRole("button", { name: "Open Sorokit devtools" })).toBeInTheDocument();
  });

  it("forwards an options object to SorokitDevtools", () => {
    process.env.NODE_ENV = "development";
    render(
      <SorokitProvider network="TESTNET" devtools={{ initialOpen: true }}>
        <span>hello</span>
      </SorokitProvider>,
    );
    expect(screen.getByRole("tab", { name: "Sends" })).toBeInTheDocument();
  });
});
