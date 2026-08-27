import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SoroformProvider } from "@soroform/provider";
import { useWallet } from "../context.js";

const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";

interface MockAccount {
  isConnected: boolean;
  embedded: { wallets: Array<{ type: string; address: string }> } | undefined;
  external: undefined;
  connectionType: string | undefined;
  isLoading: boolean;
}

interface MockStellarSigner {
  stellarSigner:
    | {
        signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
        signAuthEntry: (
          entry: string,
        ) => Promise<{ signedAuthEntry: string; signerAddress: string }>;
      }
    | undefined;
}

const {
  mockOpenModal,
  mockLogoutAsync,
  mockUseAccount,
  mockUseStellarSigner,
  mockSignTransaction,
  mockSignAuthEntry,
} = vi.hoisted(() => ({
  mockOpenModal: vi.fn(),
  mockLogoutAsync: vi.fn(async () => {}),
  mockUseAccount: vi.fn<() => MockAccount>(() => ({
    isConnected: false,
    embedded: undefined,
    external: undefined,
    connectionType: undefined,
    isLoading: false,
  })),
  mockUseStellarSigner: vi.fn<() => MockStellarSigner>(() => ({ stellarSigner: undefined })),
  mockSignTransaction: vi.fn(async (xdr: string) => ({ signedTxXdr: `${xdr}-signed` })),
  mockSignAuthEntry: vi.fn(async (entry: string) => ({
    signedAuthEntry: `${entry}-signed`,
    signerAddress: TEST_ADDRESS,
  })),
}));

vi.mock("@getpara/react-sdk", () => ({
  ParaProvider: ({ children }: { children: React.ReactNode }) => children,
  useModal: () => ({ isOpen: false, openModal: mockOpenModal, closeModal: vi.fn() }),
  useAccount: mockUseAccount,
  useLogout: () => ({ logout: vi.fn(), logoutAsync: mockLogoutAsync }),
}));

vi.mock("@getpara/react-sdk/stellar", () => ({
  useStellarSigner: mockUseStellarSigner,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return actual;
});

const { ParaWalletProvider } = await import("./para.js");

function connectedAccount() {
  return {
    isConnected: true,
    embedded: { wallets: [{ type: "STELLAR", address: TEST_ADDRESS }] },
    external: undefined,
    connectionType: "embedded",
    isLoading: false,
  };
}

function Probe() {
  const wallet = useWallet();
  return (
    <div>
      <span data-testid="address">{wallet.address ?? "none"}</span>
      <span data-testid="connected">{String(wallet.isConnected)}</span>
      <button onClick={() => wallet.connect()}>connect</button>
      <button onClick={() => wallet.disconnect()}>disconnect</button>
    </div>
  );
}

function renderWithProviders() {
  return render(
    <SoroformProvider network="testnet">
      <ParaWalletProvider apiKey="test-key">
        <Probe />
      </ParaWalletProvider>
    </SoroformProvider>,
  );
}

describe("ParaWalletProvider", () => {
  it("starts disconnected", () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      embedded: undefined,
      external: undefined,
      connectionType: undefined,
      isLoading: false,
    });
    renderWithProviders();
    expect(screen.getByTestId("address")).toHaveTextContent("none");
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
  });

  it("connect() opens the Para modal and resolves once useAccount reports a Stellar wallet", async () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      embedded: undefined,
      external: undefined,
      connectionType: undefined,
      isLoading: false,
    });
    const { rerender } = renderWithProviders();

    screen.getByText("connect").click();
    expect(mockOpenModal).toHaveBeenCalled();

    mockUseAccount.mockReturnValue(connectedAccount());
    rerender(
      <SoroformProvider network="testnet">
        <ParaWalletProvider apiKey="test-key">
          <Probe />
        </ParaWalletProvider>
      </SoroformProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("connected")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("address")).toHaveTextContent(TEST_ADDRESS);
  });

  it("disconnect() calls logoutAsync", async () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    renderWithProviders();
    screen.getByText("disconnect").click();
    await waitFor(() => {
      expect(mockLogoutAsync).toHaveBeenCalled();
    });
  });

  it("signTransaction and signAuthEntry delegate to the Stellar signer from useStellarSigner", async () => {
    mockUseAccount.mockReturnValue(connectedAccount());
    mockUseStellarSigner.mockReturnValue({
      stellarSigner: { signTransaction: mockSignTransaction, signAuthEntry: mockSignAuthEntry },
    });

    function SignProbe() {
      const wallet = useWallet();
      const [result, setResult] = React.useState<string>("none");
      return (
        <div>
          <span data-testid="result">{result}</span>
          <button
            onClick={async () => {
              const tx = await wallet.signTransaction("xdr");
              const auth = await wallet.signAuthEntry("entry");
              setResult(JSON.stringify({ tx, auth }));
            }}
          >
            sign
          </button>
        </div>
      );
    }
    render(
      <SoroformProvider network="testnet">
        <ParaWalletProvider apiKey="test-key">
          <SignProbe />
        </ParaWalletProvider>
      </SoroformProvider>,
    );

    screen.getByText("sign").click();

    await waitFor(() => {
      expect(screen.getByTestId("result")).toHaveTextContent(
        JSON.stringify({
          tx: { signedTxXdr: "xdr-signed", signerAddress: TEST_ADDRESS },
          auth: { signedAuthEntry: "entry-signed", signerAddress: TEST_ADDRESS },
        }),
      );
    });
  });
});
