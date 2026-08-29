import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SorokitProvider } from "@sorokit/provider";
import { useBalance } from "./use-balance.js";

const { mockGetAssetBalance, mockQueryContract } = vi.hoisted(() => ({
  mockGetAssetBalance: vi.fn(),
  mockQueryContract: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  class FakeServer {
    getAssetBalance = mockGetAssetBalance;
    queryContract = mockQueryContract;
  }
  return { ...actual, Server: FakeServer };
});

const ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const TOKEN_CONTRACT = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";

function renderWithProvider(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SorokitProvider network="testnet" queryClient={queryClient}>
      {children}
    </SorokitProvider>,
  );
}

function Probe(props: { assetId: string }) {
  const { data, isLoading } = useBalance(ADDRESS, props.assetId);
  if (isLoading) return <span data-testid="state">loading</span>;
  return (
    <span data-testid="state">
      {JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}
    </span>
  );
}

describe("useBalance", () => {
  it("resolves a native balance via getAssetBalance with 7 decimals", async () => {
    mockGetAssetBalance.mockResolvedValue({
      latestLedger: 100,
      balanceEntry: { amount: "15000000", authorized: true, clawback: false },
    });
    renderWithProvider(<Probe assetId="native" />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        '{"raw":"15000000","formatted":"1.5","decimals":7}',
      );
    });
  });

  it("resolves a classic CODE:ISSUER balance", async () => {
    mockGetAssetBalance.mockResolvedValue({
      latestLedger: 100,
      balanceEntry: { amount: "1000000000", authorized: true, clawback: false },
    });
    renderWithProvider(
      <Probe assetId="USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent('"formatted":"100"');
    });
  });

  it("returns a zero balance when there is no trustline", async () => {
    mockGetAssetBalance.mockResolvedValue({ latestLedger: 100 });
    renderWithProvider(<Probe assetId="native" />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        '{"raw":"0","formatted":"0","decimals":7}',
      );
    });
  });

  it("resolves a custom Soroban token via balance + decimals contract calls", async () => {
    mockQueryContract.mockImplementation(async (_contractId: string, method: string) => {
      if (method === "balance") return { result: 42_500_000n, isReadCall: true };
      if (method === "decimals") return { result: 6, isReadCall: true };
      throw new Error(`unexpected method ${method}`);
    });
    renderWithProvider(<Probe assetId={TOKEN_CONTRACT} />);
    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent(
        '{"raw":"42500000","formatted":"42.5","decimals":6}',
      );
    });
  });
});
