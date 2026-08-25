import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { SoroformProvider, useSoroformConfig } from "./context.js";

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
