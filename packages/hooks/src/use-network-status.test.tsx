import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SoroformProvider } from "@soroform/provider";
import { useNetworkStatus } from "./use-network-status.js";

const { mockGetHealth, mockGetLatestLedger } = vi.hoisted(() => ({
  mockGetHealth: vi.fn(),
  mockGetLatestLedger: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  class FakeServer {
    getHealth = mockGetHealth;
    getLatestLedger = mockGetLatestLedger;
  }
  return { ...actual, Server: FakeServer };
});

function renderWithProvider(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SoroformProvider network="testnet" queryClient={queryClient}>
      {children}
    </SoroformProvider>,
  );
}

function Probe() {
  const { data, isLoading } = useNetworkStatus();
  if (isLoading) return <span data-testid="state">loading</span>;
  return (
    <span data-testid="state">
      {data?.health.status}:{data?.latestLedger.sequence}
    </span>
  );
}

describe("useNetworkStatus", () => {
  it("combines getHealth and getLatestLedger into one result", async () => {
    mockGetHealth.mockResolvedValue({ status: "healthy", latestLedger: 100, oldestLedger: 1, ledgerRetentionWindow: 100 });
    mockGetLatestLedger.mockResolvedValue({ id: "abc", sequence: 100, protocolVersion: "21" });

    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("healthy:100");
    });
  });
});
