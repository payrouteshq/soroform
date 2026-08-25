import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { QueryClient } from "@tanstack/react-query";
import { SoroformProvider } from "@soroform/provider";
import { useContractRead } from "./use-contract-read.js";

const T = xdr.ScSpecTypeDef;

function buildFixtureSpec(): Spec {
  const balance = new xdr.ScSpecFunctionV0({
    doc: "",
    name: "balance",
    inputs: [new xdr.ScSpecFunctionInputV0({ doc: "", name: "id", type: T.scSpecTypeAddress() })],
    outputs: [T.scSpecTypeI128()],
  });
  return new Spec([xdr.ScSpecEntry.scSpecEntryFunctionV0(balance)]);
}

const { mockClientFrom, mockQueryContract } = vi.hoisted(() => ({
  mockClientFrom: vi.fn(),
  mockQueryContract: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/contract")>();
  return {
    ...actual,
    Client: { ...actual.Client, from: mockClientFrom },
  };
});

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  class FakeServer {
    queryContract = mockQueryContract;
  }
  return { ...actual, Server: FakeServer };
});

const VALID_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const CONTRACT_ID = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";

function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <SoroformProvider network="testnet" queryClient={queryClient}>
      {children}
    </SoroformProvider>,
  );
}

function BalanceProbe(props: { args: Record<string, unknown> }) {
  const { data, error, isLoading } = useContractRead<bigint>({
    contractId: CONTRACT_ID,
    method: "balance",
    args: props.args,
  });
  if (isLoading) return <span data-testid="state">loading</span>;
  if (error) return <span data-testid="state">error:{error.message}</span>;
  return <span data-testid="state">{String(data)}</span>;
}

describe("useContractRead", () => {
  it("decodes a successful read via server.queryContract", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockQueryContract.mockResolvedValue({ result: 500n, isReadCall: true });

    renderWithProviders(<BalanceProbe args={{ id: VALID_ADDRESS }} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("500");
    });
    expect(mockQueryContract).toHaveBeenCalledWith(
      CONTRACT_ID,
      "balance",
      { id: VALID_ADDRESS },
      expect.any(String),
    );
  });

  it("rejects invalid args before ever calling the network", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockQueryContract.mockClear();

    renderWithProviders(<BalanceProbe args={{ id: "not-an-address" }} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error:");
    });
    expect(mockQueryContract).not.toHaveBeenCalled();
  });

  it("normalizes a network error into a SoroformError", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockQueryContract.mockRejectedValue(new Error("network is down"));

    renderWithProviders(<BalanceProbe args={{ id: VALID_ADDRESS }} />);

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error:network is down");
    });
  });
});
