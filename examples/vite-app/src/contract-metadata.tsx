import { useContractCall } from "@sorokit/contract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NATIVE_SAC_CONTRACT_ID } from "./contract";

export function ContractMetadata() {
  const symbol = useContractCall<string>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "symbol",
  });
  const decimals = useContractCall<number>({
    contractId: NATIVE_SAC_CONTRACT_ID,
    method: "decimals",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>symbol: {symbol.data ?? (symbol.isLoading ? "..." : symbol.error?.message)}</p>
        <p>decimals: {decimals.data ?? (decimals.isLoading ? "..." : decimals.error?.message)}</p>
      </CardContent>
    </Card>
  );
}
