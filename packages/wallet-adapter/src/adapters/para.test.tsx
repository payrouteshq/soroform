import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "../context.js";
import type { WalletConnector } from "../types.js";

const TEST_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";
const TEST_PASSPHRASE = "Test SDF Network ; September 2015";

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

const { para } = await import("./para.js");

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

/**
 * Mirrors what `SoroformProvider`'s `wallet` prop mounts internally: the
 * connector's own `Provider` (if any), wrapping a component that calls
 * `useAdapter()` and hands the result to the low-level `WalletProvider`.
 */
function Harness(props: { connector: WalletConnector; children?: React.ReactNode }) {
  const adapter = props.connector.useAdapter(TEST_PASSPHRASE);
  return (
    <WalletProvider adapter={adapter} networkPassphrase={TEST_PASSPHRASE}>
      {props.children}
    </WalletProvider>
  );
}

function renderConnector(connector: WalletConnector, children: React.ReactNode) {
  const tree = <Harness connector={connector}>{children}</Harness>;
  return connector.Provider ? <connector.Provider>{tree}</connector.Provider> : tree;
}

function renderWithProviders() {
  const connector = para({ apiKey: "test-key" });
  return { connector, ...render(renderConnector(connector, <Probe />)) };
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
    const { connector, rerender } = renderWithProviders();

    screen.getByText("connect").click();
    expect(mockOpenModal).toHaveBeenCalled();

    mockUseAccount.mockReturnValue(connectedAccount());
    rerender(renderConnector(connector, <Probe />));

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
    render(renderConnector(para({ apiKey: "test-key" }), <SignProbe />));

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
