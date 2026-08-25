import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { QueryClient } from "@tanstack/react-query";
import { SoroformProvider } from "@soroform/provider";
import { devtoolsWriteLog } from "@soroform/core";
import { useContractWrite } from "./use-contract-write.js";

const T = xdr.ScSpecTypeDef;

function buildFixtureSpec(): Spec {
  const transfer = new xdr.ScSpecFunctionV0({
    doc: "",
    name: "transfer",
    inputs: [
      new xdr.ScSpecFunctionInputV0({ doc: "", name: "to", type: T.scSpecTypeAddress() }),
      new xdr.ScSpecFunctionInputV0({ doc: "", name: "amount", type: T.scSpecTypeI128() }),
    ],
    outputs: [T.scSpecTypeBool()],
  });
  return new Spec([xdr.ScSpecEntry.scSpecEntryFunctionV0(transfer)]);
}

const { mockClientFrom, mockBuild, mockSign, mockSend } = vi.hoisted(() => ({
  mockClientFrom: vi.fn(),
  mockBuild: vi.fn(),
  mockSign: vi.fn(),
  mockSend: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/contract")>();
  return {
    ...actual,
    Client: { ...actual.Client, from: mockClientFrom },
    AssembledTransaction: { ...actual.AssembledTransaction, build: mockBuild },
  };
});

vi.mock("@soroform/wallet", () => ({
  useWallet: () => ({
    address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ",
    network: undefined,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAuthEntry: vi.fn(),
  }),
}));

const CONTRACT_ID = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";
const TO_ADDRESS = "GDY7BN2SFRNLSMNNZI7CQL52OUITGPPJY3GF6TV22UVHEX6BD54YB3OL";

function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { queryClient, ...render(
    <SoroformProvider network="testnet" queryClient={queryClient}>
      {children}
    </SoroformProvider>,
  ) };
}

function TransferProbe(props: { args?: Record<string, unknown> }) {
  const { status, data, error, writeAsync } = useContractWrite<boolean>({
    contractId: CONTRACT_ID,
    method: "transfer",
  });
  const args = props.args ?? { to: TO_ADDRESS, amount: 100n };
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="data">{String(data)}</span>
      <span data-testid="error">{error?.message ?? "none"}</span>
      <button
        onClick={() => {
          void writeAsync(args).catch(() => {});
        }}
      >
        write
      </button>
    </div>
  );
}

describe("useContractWrite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devtoolsWriteLog.clear();
  });

  it("moves through simulating -> needsSignature -> submitting -> success", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    renderWithProviders(<TransferProbe />);
    expect(screen.getByTestId("status")).toHaveTextContent("idle");

    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("data")).toHaveTextContent("true");
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: CONTRACT_ID, method: "transfer" }),
    );
    expect(mockSign).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });

  it("invalidates contractRead queries for the contract on success", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    const { queryClient } = renderWithProviders(<TransferProbe />);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("moves to error when args fail schema validation, without calling build", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });

    renderWithProviders(<TransferProbe args={{ to: "not-an-address", amount: 100n }} />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it("moves to error when the network call fails, normalizing the error message", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockBuild.mockRejectedValue(new Error("simulation failed"));

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("simulation failed");
  });

  it("logs write status transitions to the devtools store in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    const entries = devtoolsWriteLog.getAll();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.at(-1)?.status).toBe("success");
    expect(entries.at(-1)?.contractId).toBe(CONTRACT_ID);

    process.env.NODE_ENV = originalEnv;
  });
});
