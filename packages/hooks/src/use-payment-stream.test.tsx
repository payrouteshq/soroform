import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SorokitProvider } from "@sorokit/provider";
import { usePaymentStream } from "./use-payment-stream.js";

const { mockStream, mockCursor, mockForAccount } = vi.hoisted(() => {
  const mockStream = vi.fn();
  const mockCursor = vi.fn();
  const mockForAccount = vi.fn();
  return { mockStream, mockCursor, mockForAccount };
});

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  const builder = {
    forAccount: mockForAccount,
    cursor: mockCursor,
    stream: mockStream,
  };
  mockForAccount.mockReturnValue(builder);
  mockCursor.mockReturnValue(builder);

  class FakeHorizonServer {
    payments = () => builder;
  }

  return {
    ...actual,
    Horizon: { ...actual.Horizon, Server: FakeHorizonServer },
  };
});

const ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

function renderWithProvider(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SorokitProvider network="testnet" queryClient={queryClient}>
      {children}
    </SorokitProvider>,
  );
}

function Probe(props: { onPayment?: (record: unknown) => void }) {
  const { events, latest, isStreaming } = usePaymentStream(ADDRESS, {
    onPayment: props.onPayment,
  });
  return (
    <span data-testid="state">{JSON.stringify({ count: events.length, latest, isStreaming })}</span>
  );
}

describe("usePaymentStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a stream scoped to the address with cursor=now", async () => {
    const close = vi.fn();
    mockStream.mockReturnValue(close);
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(mockForAccount).toHaveBeenCalledWith(ADDRESS);
      expect(mockCursor).toHaveBeenCalledWith("now");
      expect(mockStream).toHaveBeenCalled();
    });
  });

  it("appends incoming records and calls onPayment", async () => {
    const onPayment = vi.fn();
    let onmessage: ((record: unknown) => void) | undefined;
    mockStream.mockImplementation((options: { onmessage?: (record: unknown) => void }) => {
      onmessage = options.onmessage;
      return vi.fn();
    });

    renderWithProvider(<Probe onPayment={onPayment} />);
    await waitFor(() => expect(onmessage).toBeDefined());

    onmessage!({ id: "1", type: "payment" });

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent('"count":1');
    });
    expect(onPayment).toHaveBeenCalledWith({ id: "1", type: "payment" });
  });

  it("closes the stream on unmount", async () => {
    const close = vi.fn();
    mockStream.mockReturnValue(close);
    const { unmount } = renderWithProvider(<Probe />);
    await waitFor(() => expect(mockStream).toHaveBeenCalled());
    unmount();
    expect(close).toHaveBeenCalled();
  });

  it("invalidates account and balance queries for the address on a new payment", async () => {
    let onmessage: ((record: unknown) => void) | undefined;
    mockStream.mockImplementation((options: { onmessage?: (record: unknown) => void }) => {
      onmessage = options.onmessage;
      return vi.fn();
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    function Spy() {
      usePaymentStream(ADDRESS);
      return null;
    }
    render(
      <SorokitProvider network="testnet" queryClient={queryClient}>
        <Spy />
      </SorokitProvider>,
    );
    await waitFor(() => expect(onmessage).toBeDefined());

    onmessage!({ id: "1", type: "payment" });

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["sorokit", "account", ADDRESS],
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["sorokit", "balance", ADDRESS],
      });
    });
  });
});
