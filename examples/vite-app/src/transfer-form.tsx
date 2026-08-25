import { useContractForm, useContractWrite } from "@soroform/contract";
import { useWallet } from "@soroform/wallet";
import { NATIVE_SAC_CONTRACT_ID } from "./contract";

interface TransferFields {
  to: string;
  amount: bigint;
}

export function TransferForm() {
  const wallet = useWallet();
  const { register, handleSubmit, formState } = useContractForm<TransferFields>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "transfer",
  });
  const { status, writeAsync, error, data } = useContractWrite<null>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "transfer",
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!wallet.address) return;
    // The SAC's transfer method also takes `from`, the authorizing
    // account; it is always the connected wallet's own address, so it is
    // supplied here rather than asked for in the form.
    await writeAsync({ from: wallet.address, ...values }).catch(() => {
      // useContractWrite's own `error` field already reflects the failure;
      // this catch only stops the rejection from becoming unhandled.
    });
  });

  const isBusy = status === "simulating" || status === "submitting";

  if (!wallet.isConnected) {
    return (
      <div className="card">
        <h2>Transfer native XLM</h2>
        <p>Connect a wallet to send a transfer.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Transfer native XLM</h2>
      <form onSubmit={onSubmit}>
        <label>
          Recipient address
          <input {...register("to")} placeholder="G..." />
          {formState.errors.to && (
            <span className="error">{String(formState.errors.to.message)}</span>
          )}
        </label>
        <label>
          Amount (whole XLM)
          <input
            type="text"
            inputMode="decimal"
            placeholder="1.5"
            {...register("amount", {
              setValueAs: (value: string) =>
                value === "" ? undefined : BigInt(Math.round(Number(value) * 10_000_000)),
            })}
          />
          {formState.errors.amount && (
            <span className="error">{String(formState.errors.amount.message)}</span>
          )}
        </label>
        <button type="submit" disabled={isBusy}>
          {status === "idle" || status === "success" ? "Transfer" : status}
        </button>
      </form>
      {error && <p className="error">{error.message}</p>}
      {status === "success" && <p>Sent. Result: {String(data)}</p>}
    </div>
  );
}
