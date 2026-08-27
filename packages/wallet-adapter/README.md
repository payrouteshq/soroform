# @soroform/wallet-adapter

Adapter-agnostic wallet connection and signing layer for Soroform. You
don't render anything from this package directly in most apps — pass one
of its connectors as `SoroformProvider`'s `wallet` prop instead
(`@soroform/provider`), and `useWallet()`/`ConnectWalletButton` work
anywhere below it.

Three connectors ship as separate entry points, each with its own peer
dependency so you only install what you use:

- `@soroform/wallet-adapter/stellar-wallets-kit` — `stellarWalletsKit()`, backed by `@creit.tech/stellar-wallets-kit`
- `@soroform/wallet-adapter/blux` — `blux()`, backed by `@bluxcc/core`
- `@soroform/wallet-adapter/para` — `para()`, backed by `@getpara/react-sdk`

```tsx
import { SoroformProvider } from "@soroform/provider";
import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";

<SoroformProvider network="testnet" wallet={stellarWalletsKit()}>
  {children}
</SoroformProvider>;
```

Write your own connector if none of these fit your wallet SDK — implement
the `WalletAdapter` interface exported from the package root, then wrap it
as `{ useAdapter: () => myAdapter }`, which already satisfies
`WalletConnector`.

Full documentation: https://docs.soroform.dev (see the repository root
README for the current status of the docs site).
