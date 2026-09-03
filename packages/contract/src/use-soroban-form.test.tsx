import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { xdr } from "@stellar/stellar-sdk";
import { Spec } from "@stellar/stellar-sdk/contract";
import { QueryClient } from "@tanstack/react-query";
import { SorokitProvider } from "@sorokit/provider";
import { useSorobanForm } from "./use-soroban-form.js";

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

const { mockClientFrom } = vi.hoisted(() => ({ mockClientFrom: vi.fn() }));

vi.mock("@stellar/stellar-sdk/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/contract")>();
  return { ...actual, Client: { ...actual.Client, from: mockClientFrom } };
});

const CONTRACT_ID = "CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5";
const VALID_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";

function renderWithProviders(children: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SorokitProvider network="TESTNET" queryClient={queryClient}>
      {children}
    </SorokitProvider>,
  );
}

interface TransferFields {
  to: string;
  amount: bigint;
}

function TransferForm(props: { initial: Partial<TransferFields> }) {
  const { setValue, handleSubmit, formState } = useSorobanForm<TransferFields>({
    contractId: CONTRACT_ID,
    method: "transfer",
  });

  return (
    <div>
      <span data-testid="submitCount">{formState.submitCount}</span>
      <span data-testid="errors">{JSON.stringify(Object.keys(formState.errors))}</span>
      <button
        onClick={() => {
          if (props.initial.to !== undefined) setValue("to", props.initial.to);
          if (props.initial.amount !== undefined) setValue("amount", props.initial.amount);
          void handleSubmit(() => {})();
        }}
      >
        submit
      </button>
    </div>
  );
}

describe("useSorobanForm", () => {
  it("rejects an invalid address, populating formState.errors.to", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    renderWithProviders(<TransferForm initial={{ to: "not-an-address", amount: 100n }} />);

    screen.getByText("submit").click();

    await waitFor(() => {
      expect(screen.getByTestId("errors")).toHaveTextContent("to");
    });
  });

  it("accepts a valid address and bigint amount with no errors", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    renderWithProviders(<TransferForm initial={{ to: VALID_ADDRESS, amount: 100n }} />);

    screen.getByText("submit").click();

    await waitFor(() => {
      expect(screen.getByTestId("submitCount")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("errors")).toHaveTextContent("[]");
  });

  it("rejects a non-bigint amount", async () => {
    mockClientFrom.mockResolvedValue({ spec: buildFixtureSpec() });
    renderWithProviders(
      <TransferForm initial={{ to: VALID_ADDRESS, amount: 100 as unknown as bigint }} />,
    );

    screen.getByText("submit").click();

    await waitFor(() => {
      expect(screen.getByTestId("errors")).toHaveTextContent("amount");
    });
  });
});
