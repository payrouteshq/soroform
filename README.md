<p align="center">
  <img src="docs/logo/light.png" alt="Sorokit" width="120" />
</p>

<h1 align="center">Sorokit</h1>

<p align="center">wagmi for Stellar.</p>

Sorokit is a React/Next.js SDK layered on top of `@stellar/stellar-sdk`.
It turns a deployed Soroban contract's spec directly into typed,
validated React hooks and forms, without touching XDR, ScVal, or manual
argument encoding by hand. There is no code generation step: hooks fetch
a contract's spec at runtime from its `contractId` and derive the Zod
schema and result decoding automatically, so swapping contracts never
requires rerunning a command. A wallet layer (`useWallet`,
`ConnectWalletButton`, swappable connectors for Stellar Wallets Kit,
Blux, and Para) and a development-only devtools panel come from the
same `SorokitProvider` entry point.

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
  const { data } = useContractCall<bigint>({
    contractId: "CCJZ...",
    method: "balance",
    args: { id: "GABC..." },
  });
  return <p>{data?.toString()}</p>;
}
```

Full documentation: https://docs.sorokit.dev (docs site is being built
out as part of this repository, see `docs/`).

## Status

This repository is under active development. See the milestone list in
the project plan for current progress. Nothing here is published to npm
yet.

## Repository layout

```
packages/
  core/           @sorokit/core            framework-agnostic config, query keys, error normalization
  provider/       @sorokit/provider        SorokitProvider — the entry point: network config, wallet, and devtools all wire in here
  wallet-adapter/ @sorokit/wallet-adapter  useWallet, ConnectWalletButton, plus the stellarWalletsKit()/blux()/para() connectors
  hooks/          @sorokit/hooks           useBalance, useTransactionStatus, useNetworkStatus, useEffectStream
  contract/       @sorokit/contract        runtime spec-to-Zod pipeline, useContractCall, useContractSend, useSorobanForm
  devtools/       @sorokit/devtools        SorokitDevtools panel
examples/
  next-app/   Next.js 15 App Router example
  vite-app/   Vite + React example
apps/
  landing/    Marketing site
docs/         Mintlify documentation site
```

## Development

This is a pnpm workspace managed with Turborepo. Requires Node 22 (see
`.nvmrc`) and pnpm 10.

```
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

To record a changeset for a change you are about to commit:

```
pnpm changeset
```

## Documentation

The docs site lives in `docs/` and is built with Mintlify. To preview it
locally:

```
pnpm docs:dev
```

## License

Apache-2.0, see `LICENSE`.
