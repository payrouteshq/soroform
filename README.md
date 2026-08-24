# Soroform

Soroform is a React/Next.js SDK layered on top of `@stellar/stellar-sdk`.
It turns a deployed Soroban contract's spec directly into typed,
validated React hooks and forms, without touching XDR, ScVal, or manual
argument encoding by hand. There is no code generation step: hooks fetch
a contract's spec at runtime from its `contractId` and derive the Zod
schema and result decoding automatically, so swapping contracts never
requires rerunning a command.

Full documentation: https://docs.soroform.dev (docs site is being built
out as part of this repository, see `docs/`).

## Status

This repository is under active development. See the milestone list in
the project plan for current progress. Nothing here is published to npm
yet.

## Repository layout

```
packages/
  core/       @soroform/core       framework-agnostic config, query keys, error normalization
  provider/   @soroform/provider   SoroformProvider, useSoroformConfig
  wallet/     @soroform/wallet     WalletProvider, useWallet, ConnectWalletButton
  hooks/      @soroform/hooks      useAccount, useBalance, useTransactionStatus, useNetworkStatus
  contract/   @soroform/contract   runtime spec-to-Zod pipeline, useContractRead, useContractWrite, useContractForm
  devtools/   @soroform/devtools   SoroformDevtools panel
examples/
  next-app/   Next.js 15 App Router example
  vite-app/   Vite + React example
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

## License

Apache-2.0, see `LICENSE`.
