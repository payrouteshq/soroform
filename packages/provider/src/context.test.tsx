import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@soroform/wallet-adapter";
import type { WalletAdapter, WalletConnector } from "@soroform/wallet-adapter";
import { SoroformProvider, useSoroformConfig } from "./context.js";

const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

function createFakeConnector(): WalletConnector {
  let stateListener: ((state: { address: string | undefined; network: string | undefined }) => void) | undefined;

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
  const config = useSoroformConfig();
  return <span data-testid="probe">{JSON.stringify(config)}</span>;
}

function QueryClientProbe() {
  const client = useQueryClient();
  return <span data-testid="probe">{String(client.getDefaultOptions().queries?.staleTime)}</span>;
}

describe("SoroformProvider", () => {
  it("renders its children", () => {
    render(
      <SoroformProvider network="testnet">
        <span>hello</span>
      </SoroformProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("resolves and propagates config from the network prop", () => {
    render(
      <SoroformProvider network="testnet">
        <ConfigProbe />
      </SoroformProvider>,
    );
    const config = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(config.network).toBe("testnet");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("propagates rpcUrl and horizonUrl overrides", () => {
    render(
      <SoroformProvider
        network="testnet"
        rpcUrl="https://custom-rpc.example.com"
        horizonUrl="https://custom-horizon.example.com"
      >
        <ConfigProbe />
      </SoroformProvider>,
    );
    const config = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(config.rpcUrl).toBe("https://custom-rpc.example.com");
    expect(config.horizonUrl).toBe("https://custom-horizon.example.com");
  });

  it("creates a default QueryClient with a 5 second staleTime when none is passed", () => {
    render(
      <SoroformProvider network="testnet">
        <QueryClientProbe />
      </SoroformProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("5000");
  });

  it("uses an explicitly passed QueryClient instead of creating one", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 42 } },
    });
    render(
      <SoroformProvider network="testnet" queryClient={client}>
        <QueryClientProbe />
      </SoroformProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("42");
  });
});

describe("useSoroformConfig", () => {
  it("throws when called outside a SoroformProvider", () => {
    const originalError = console.error;
    console.error = () => {};
    expect(() => render(<ConfigProbe />)).toThrow(
      /useSoroformConfig must be called within a <SoroformProvider>/,
    );
    console.error = originalError;
  });
});

describe("SoroformProvider wallet prop", () => {
  it("mounts the connector so useWallet() works, without a separate WalletProvider", async () => {
    render(
      <SoroformProvider network="testnet" wallet={createFakeConnector()}>
        <WalletProbe />
      </SoroformProvider>,
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
      <SoroformProvider network="testnet" wallet={connector}>
        <WalletProbe />
      </SoroformProvider>,
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
        <SoroformProvider network="testnet">
          <WalletProbe />
        </SoroformProvider>,
      ),
    ).toThrow(/useWallet must be called within a <WalletProvider>/);
    console.error = originalError;
  });
});

describe("SoroformProvider devtools prop", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("does not render devtools when the prop is omitted", () => {
    process.env.NODE_ENV = "development";
    render(
      <SoroformProvider network="testnet">
        <span>hello</span>
      </SoroformProvider>,
    );
    expect(screen.queryByRole("button", { name: "Soroform" })).not.toBeInTheDocument();
  });

  it("renders devtools with defaults when passed true", () => {
    process.env.NODE_ENV = "development";
    render(
      <SoroformProvider network="testnet" devtools>
        <span>hello</span>
      </SoroformProvider>,
    );
    expect(screen.getByRole("button", { name: "Soroform" })).toBeInTheDocument();
  });

  it("forwards an options object to SoroformDevtools", () => {
    process.env.NODE_ENV = "development";
    render(
      <SoroformProvider network="testnet" devtools={{ initialOpen: true }}>
        <span>hello</span>
      </SoroformProvider>,
    );
    expect(screen.getByRole("tab", { name: "Sends" })).toBeInTheDocument();
  });
});
