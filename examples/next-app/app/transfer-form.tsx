"use client";

import { useSorobanForm, useContractSend } from "@soroform/contract";
import { useWallet } from "@soroform/wallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NATIVE_SAC_CONTRACT_ID } from "./contract";

interface TransferFields {
  to: string;
  amount: bigint;
}

export function TransferForm() {
  const wallet = useWallet();
  const { register, handleSubmit, formState } = useSorobanForm<TransferFields>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "transfer",
  });
  const { status, sendAsync, error, data } = useContractSend<null>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "transfer",
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!wallet.address) return;
    await sendAsync({ from: wallet.address, ...values }).catch(() => {});
  });

  const isBusy = status === "simulating" || status === "submitting";

  if (!wallet.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer native XLM</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Connect a wallet to send a transfer.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer native XLM</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="to">Recipient address</Label>
            <Input id="to" placeholder="G..." {...register("to")} />
            {formState.errors.to && (
              <p className="text-sm text-destructive">
                {String(formState.errors.to.message)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (whole XLM)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="1.5"
              {...register("amount", {
                setValueAs: (value: string) =>
                  value === "" ? undefined : BigInt(Math.round(Number(value) * 10_000_000)),
              })}
            />
            {formState.errors.amount && (
              <p className="text-sm text-destructive">
                {String(formState.errors.amount.message)}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isBusy}>
            {status === "idle" || status === "success" ? "Transfer" : status}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error.message}</p>}
        {status === "success" && (
          <p className="mt-3 text-sm text-muted-foreground">Sent. Result: {String(data)}</p>
        )}
      </CardContent>
    </Card>
  );
}
