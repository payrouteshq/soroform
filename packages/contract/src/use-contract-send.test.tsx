import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { SorokitProvider } from "@sorokit/provider";
import { devtoolsSendLog, pendingTransactions, type SorokitError } from "@sorokit/core";
import { useContractSend } from "./use-contract-send.js";

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

const { mockClientFrom, mockBuild, mockSign, mockSend, enqueued, sequencedServer } = vi.hoisted(
  () => ({
    mockClientFrom: vi.fn(),
    mockBuild: vi.fn(),
    mockSign: vi.fn(),
    mockSend: vi.fn(),
    /** Addresses the hook queued a send for, in order. */
    enqueued: [] as string[],
    sequencedServer: { marker: "sequenced-server" },
  }),
);

interface EnqueueArgs {
  address: string;
  onStart?: () => void;
  task: (context: { server: unknown; markSubmitted: () => void }) => Promise<unknown>;
}

vi.mock("@stellar/stellar-sdk/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/contract")>();
  return {
    ...actual,
    Client: { ...actual.Client, from: mockClientFrom },
    AssembledTransaction: { ...actual.AssembledTransaction, build: mockBuild },
  };
});

/**
 * The real sequencer resolves the account's sequence number over RPC, which
 * these tests have no network for. This stand-in keeps the part the hook
 * depends on — one send at a time per account, released the moment the
 * network accepts a transaction — and hands out a server the mocked
 * `AssembledTransaction.build` never actually calls. Sequence-number
 * projection itself is covered by `@sorokit/core`'s own tests.
 */
vi.mock("@sorokit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sorokit/core")>();
  let tail: Promise<void> = Promise.resolve();
  return {
    ...actual,
    transactionSequencer: {
      async enqueue({ address, onStart, task }: EnqueueArgs) {
        const previous = tail;
        let release!: () => void;
        tail = previous.then(() => new Promise<void>((resolve) => (release = resolve)));
        await previous;

        enqueued.push(address);
        onStart?.();
        try {
          return await task({ server: sequencedServer, markSubmitted: () => release() });
        } finally {
          release();
        }
      },
    },
  };
});

vi.mock("@sorokit/wallet-adapter", () => ({
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

const WALLET_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const CONTRACT_ID = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";
const TO_ADDRESS = "GDY7BN2SFRNLSMNNZI7CQL52OUITGPPJY3GF6TV22UVHEX6BD54YB3OL";

function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    queryClient,
    ...render(
      <SorokitProvider network="TESTNET" queryClient={queryClient}>
        {children}
      </SorokitProvider>,
    ),
  };
}

function TransferProbe(props: {
  args?: Record<string, unknown>;
  onError?: (error: SorokitError) => void;
}) {
  const { status, data, error, hash, sendAsync } = useContractSend<boolean>({
    contractId: CONTRACT_ID,
    method: "transfer",
  });
  const args = props.args ?? { to: TO_ADDRESS, amount: 100n };
  const { onError } = props;
  React.useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="data">{String(data)}</span>
      <span data-testid="error">{error?.message ?? "none"}</span>
      <span data-testid="kind">{error?.kind ?? "none"}</span>
      <span data-testid="hash">{hash ?? "none"}</span>
      <button
        onClick={() => {
          void sendAsync(args).catch(() => {});
        }}
      >
        write
      </button>
    </div>
  );
}

describe("useContractSend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devtoolsSendLog.clear();
    pendingTransactions.clear();
    enqueued.length = 0;
  });

  it("moves through simulating -> needsSignature -> submitting -> success", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    renderWithProviders(<TransferProbe />);
    expect(screen.getByTestId("status")).toHaveTextContent("IDLE");

    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("SUCCESS");
    });
    expect(screen.getByTestId("data")).toHaveTextContent("true");
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: CONTRACT_ID, method: "transfer" }),
    );
    expect(mockSign).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });

  it("invalidates contractCall queries for the contract on success", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    const { queryClient } = renderWithProviders(<TransferProbe />);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("SUCCESS");
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("moves to error when args fail schema validation, without calling build", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });

    renderWithProviders(<TransferProbe args={{ to: "not-an-address", amount: 100n }} />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("ERROR");
    });
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it("normalizes a validation failure into kind validation-failed with a Zod-prettified message and a raw ZodError cause", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    const onError = vi.fn();

    renderWithProviders(
      <TransferProbe args={{ to: "not-an-address", amount: 100n }} onError={onError} />,
    );
    screen.getByText("write").click();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    const error = onError.mock.calls[0]![0] as SorokitError;

    expect(error.kind).toBe("VALIDATION_FAILED");
    expect(error.message).not.toContain('"code"');
    expect(error.cause).toBeInstanceOf(z.ZodError);
    expect((error.cause as z.ZodError).issues.length).toBeGreaterThan(0);
    expect(screen.getByTestId("kind")).toHaveTextContent("VALIDATION_FAILED");
  });

  it("moves to error when the network call fails, normalizing the error message", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockBuild.mockRejectedValue(new Error("simulation failed"));

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("ERROR");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("simulation failed");
  });

  it("logs write status transitions to the devtools store in development", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("SUCCESS");
    });
    const entries = devtoolsSendLog.getAll();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.at(-1)?.status).toBe("SUCCESS");
    expect(entries.at(-1)?.contractId).toBe(CONTRACT_ID);
  });

  it("builds against the sequencer's server rather than resolving the account itself", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ result: true });
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("SUCCESS");
    });
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({ server: sequencedServer, publicKey: WALLET_ADDRESS }),
    );
    expect(enqueued).toEqual([WALLET_ADDRESS]);
  });

  it("queues a second send behind the first instead of racing it onto the same sequence number", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    let releaseFirst!: () => void;
    mockSend
      .mockImplementationOnce(
        () => new Promise((resolve) => (releaseFirst = () => resolve({ result: true }))),
      )
      .mockResolvedValue({ result: true });

    renderWithProviders(<TransferProbe />);
    const write = screen.getByText("write");
    write.click();
    write.click();

    await waitFor(() => expect(mockBuild).toHaveBeenCalledTimes(1));
    expect(enqueued).toHaveLength(1);

    releaseFirst();
    await waitFor(() => expect(mockBuild).toHaveBeenCalledTimes(2));
    expect(enqueued).toEqual([WALLET_ADDRESS, WALLET_ADDRESS]);
  });

  it("persists the transaction from the moment the network accepts it until it settles", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    mockSign.mockResolvedValue(undefined);
    mockBuild.mockResolvedValue({ sign: mockSign, send: mockSend });

    let settle!: () => void;
    mockSend.mockImplementation((watcher: { onSubmitted: (r: unknown) => void }) => {
      watcher.onSubmitted({ hash: "d34db33f" });
      return new Promise((resolve) => (settle = () => resolve({ result: true })));
    });

    renderWithProviders(<TransferProbe />);
    screen.getByText("write").click();

    await waitFor(() => {
      expect(screen.getByTestId("hash")).toHaveTextContent("d34db33f");
    });
    expect(pendingTransactions.getAll()).toEqual([
      expect.objectContaining({ hash: "d34db33f", contractId: CONTRACT_ID, method: "transfer" }),
    ]);

    settle();
    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("SUCCESS");
    });
    expect(pendingTransactions.getAll()).toEqual([]);
  });
});
