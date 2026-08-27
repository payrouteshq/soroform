# @soroform/wallet-adapter

Adapter-agnostic wallet connection and signing layer for Soroform.
Provides `WalletProvider`, `useWallet`, and a minimally styled
`ConnectWalletButton`, driven by whichever `WalletAdapter` you pass in.

Two adapters ship as separate entry points, each with its own peer
dependency so you only install what you use:

- `@soroform/wallet-adapter/adapters/stellar-wallets-kit` — `stellarWalletsKit()`, backed by `@creit.tech/stellar-wallets-kit`
- `@soroform/wallet-adapter/adapters/blux` — `blux()`, backed by `@bluxcc/core`

```tsx
import { WalletProvider } from "@soroform/wallet-adapter";
import { stellarWalletsKit } from "@soroform/wallet-adapter/adapters/stellar-wallets-kit";

const adapter = stellarWalletsKit();

<WalletProvider adapter={adapter}>{children}</WalletProvider>;
```

Write your own adapter by implementing the `WalletAdapter` interface
exported from the package root if neither ships one for your wallet SDK.

Full documentation: https://docs.soroform.dev (see the repository root
README for the current status of the docs site).
