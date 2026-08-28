import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SoroformProvider } from "@soroform/provider";
import { useAccount } from "./use-account.js";

const { mockGetAccount } = vi.hoisted(() => ({ mockGetAccount: vi.fn() }));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  class FakeServer {
    getAccount = mockGetAccount;
  }
  return { ...actual, Server: FakeServer };
});

const ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

function renderWithProvider(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SoroformProvider network="testnet" queryClient={queryClient}>
      {children}
    </SoroformProvider>,
  );
}

function Probe() {
  const { data, isLoading } = useAccount(ADDRESS);
  if (isLoading) return <span data-testid="state">loading</span>;
  return <span data-testid="state">{JSON.stringify(data)}</span>;
}

describe("useAccount", () => {
  it("reports an existing account's sequence number", async () => {
    mockGetAccount.mockResolvedValue({ sequenceNumber: () => "123456789" });
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        '{"exists":true,"sequence":"123456789"}',
      );
    });
  });

  it("reports exists: false for a missing account, without a query error", async () => {
    mockGetAccount.mockRejectedValue(new Error(`Account not found: ${ADDRESS}`));
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent('{"exists":false}');
    });
  });
});
