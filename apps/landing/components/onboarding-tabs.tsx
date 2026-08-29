"use client";

import { CodeBlock } from "@/components/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STEPS = [
  {
    value: "install",
    label: "1. Install",
    filename: "terminal",
    language: "bash",
    code: "pnpm add @sorokit/provider @sorokit/wallet-adapter @sorokit/contract",
  },
  {
    value: "connect",
    label: "2. Connect a wallet",
    filename: "providers.tsx",
    language: "tsx",
    code: `import { SorokitProvider } from "@sorokit/provider";
import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";

const wallet = stellarWalletsKit();

<SorokitProvider network="testnet" wallet={wallet} devtools>
  {children}
</SorokitProvider>`,
  },
  {
    value: "call",
    label: "3. Call your first hook",
    filename: "balance.tsx",
    language: "tsx",
    code: `import { useContractCall } from "@sorokit/contract";

const { data } = useContractCall<bigint>({
  contractId: "CCJZ...",
  method: "balance",
  args: { id: address },
});`,
  },
] as const;

export function OnboardingTabs() {
  return (
    <Tabs defaultValue="install" className="w-full items-center">
      <TabsList>
        {STEPS.map((step) => (
          <TabsTrigger key={step.value} value={step.value}>
            {step.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {STEPS.map((step) => (
        <TabsContent key={step.value} value={step.value} className="w-full max-w-2xl">
          <CodeBlock language={step.language} filename={step.filename} theme="dark">
            {step.code}
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  );
}
