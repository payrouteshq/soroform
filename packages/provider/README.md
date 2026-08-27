# @soroform/provider

The single entry point for Soroform: `SoroformProvider` wraps
`@tanstack/react-query`'s `QueryClientProvider`, supplies a
`SoroformConfig` (network, RPC URL, Horizon URL) to the rest of the React
tree, and — via its `wallet` and `devtools` props — mounts wallet
connection and Soroform's devtools panel for you, so nothing else needs
to be nested under it manually.

```tsx
import { SoroformProvider } from "@soroform/provider";
import { stellarWalletsKit } from "@soroform/wallet-adapter/stellar-wallets-kit";

<SoroformProvider network="testnet" wallet={stellarWalletsKit()} devtools>
  {children}
</SoroformProvider>;
```

Full documentation: https://docs.soroform.dev (see the repository root
README for the current status of the docs site).
