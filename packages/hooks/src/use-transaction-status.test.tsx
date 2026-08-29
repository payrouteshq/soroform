import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SorokitProvider } from "@sorokit/provider";
import { useTransactionStatus } from "./use-transaction-status.js";

const { mockPollTransaction } = vi.hoisted(() => ({ mockPollTransaction: vi.fn() }));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  class FakeServer {
    pollTransaction = mockPollTransaction;
  }
  return { ...actual, Server: FakeServer };
});

const HASH = "c4515e3bdc0897f21cc5dbec8c82cf0a936d4741cb74a8e158eb51b9fb00411a";

function renderWithProvider(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SorokitProvider network="testnet" queryClient={queryClient}>
      {children}
    </SorokitProvider>,
  );
}

function Probe() {
  const { data, isLoading } = useTransactionStatus(HASH);
  if (isLoading) return <span data-testid="state">loading</span>;
  return <span data-testid="state">{data?.status}</span>;
}

describe("useTransactionStatus", () => {
  it("polls via server.pollTransaction using BasicSleepStrategy", async () => {
    mockPollTransaction.mockResolvedValue({ status: "SUCCESS" });
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("SUCCESS");
    });
    expect(mockPollTransaction).toHaveBeenCalledWith(
      HASH,
      expect.objectContaining({ sleepStrategy: expect.any(Function) }),
    );
  });
});
