import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { SoroformProvider } from "@soroform/provider";
import { useEffectStream } from "./use-effect-stream.js";

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
    effects = () => builder;
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
    <SoroformProvider network="testnet" queryClient={queryClient}>
      {children}
    </SoroformProvider>,
  );
}

function Probe() {
  const { events, isStreaming } = useEffectStream(ADDRESS);
  return <span data-testid="state">{JSON.stringify({ count: events.length, isStreaming })}</span>;
}

describe("useEffectStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a stream scoped to the address with cursor=now", async () => {
    mockStream.mockReturnValue(vi.fn());
    renderWithProvider(<Probe />);
    await waitFor(() => {
      expect(mockForAccount).toHaveBeenCalledWith(ADDRESS);
      expect(mockCursor).toHaveBeenCalledWith("now");
      expect(mockStream).toHaveBeenCalled();
    });
  });

  it("appends incoming effect records", async () => {
    let onmessage: ((record: unknown) => void) | undefined;
    mockStream.mockImplementation((options: { onmessage?: (record: unknown) => void }) => {
      onmessage = options.onmessage;
      return vi.fn();
    });

    renderWithProvider(<Probe />);
    await waitFor(() => expect(onmessage).toBeDefined());

    onmessage!({ id: "1", type: "account_credited" });

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent('"count":1');
    });
  });

  it("does not open a stream when disabled", async () => {
    function DisabledProbe() {
      useEffectStream(ADDRESS, { enabled: false });
      return null;
    }
    renderWithProvider(<DisabledProbe />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockStream).not.toHaveBeenCalled();
  });
});
