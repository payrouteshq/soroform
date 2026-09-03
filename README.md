<p align="center">
  <img src="docs/logo/light.png" alt="Sorokit" width="120" />
</p>

<h1 align="center">Sorokit</h1>

<p align="center">wagmi for Stellar.</p>

Sorokit is the React UI layer for the Stellar blockchain. It turns your deployed
Soroban smart contracts directly into typed, validated React hooks and forms.

Most Stellar tools require you to manually encode arguments or run heavy
code-generation steps. Sorokit eliminates this by fetching your contract's spec
at runtime and deriving Zod schemas automatically. Point a hook at a new
contract ID, and your UI validation updates instantly.

## Key Features

- Zero code generation: No CLI commands to run and no generated files to manage.
- Runtime Zod validation: Every contract method becomes a type-safe form in seconds.
- Unified wallet identity: Swap between browser extensions, social logins, and passkeys without changing your component code.
- Engineered reliability: Transactions survive page refreshes and account sequences are managed automatically to prevent collisions.
- Integrated devtools: View simulations, auth trees, and resource usage directly in your app.

## Quick Example

```tsx
import { SorokitProvider } from "@sorokit/provider";
import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";
import { useContractCall } from "@sorokit/contract";

const wallet = stellarWalletsKit();

function App() {
  return (
    <SorokitProvider network="TESTNET" wallet={wallet} devtools>
      <Balance />
    </SorokitProvider>
  );
}

function Balance() {
  const { data, isLoading } = useContractCall<bigint>({
    contractId: "CCJZ...",
    method: "balance",
    args: { id: "GABC..." },
  });

  if (isLoading) return <p>Loading...</p>;
  return <p>Balance: {data?.toString()}</p>;
}
```

## Documentation

Full documentation and guides are available at: https://docs.sorokit.xyz

## Repository Layout

- packages/core: Framework-agnostic config, query keys, and error normalization.
- packages/provider: The single entry point for network, wallet, and devtools.
- packages/wallet-adapter: Connectors for Stellar Wallets Kit, Blux, and Para.
- packages/hooks: Hooks for balances, transaction status, and network health.
- packages/contract: The spec-to-Zod pipeline and contract action hooks.
- packages/devtools: The development-only inspection panel.

## Development

This is a pnpm workspace managed with Turborepo. Requires Node 22 and pnpm 10.

- pnpm install: Install all dependencies.
- pnpm build: Build all packages.
- pnpm test: Run the test suite.
- pnpm changeset: Record a version bump for a contribution.

## License

Apache-2.0, see LICENSE.
