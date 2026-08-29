# @sorokit/provider

The single entry point for Sorokit: `SorokitProvider` wraps
`@tanstack/react-query`'s `QueryClientProvider`, supplies a
`SorokitConfig` (network, RPC URL, Horizon URL) to the rest of the React
tree, and — via its `wallet` and `devtools` props — mounts wallet
connection and Sorokit's devtools panel for you, so nothing else needs
to be nested under it manually.

```tsx
import { SorokitProvider } from "@sorokit/provider";
import { stellarWalletsKit } from "@sorokit/wallet-adapter/stellar-wallets-kit";

<SorokitProvider network="testnet" wallet={stellarWalletsKit()} devtools>
  {children}
</SorokitProvider>;
```

Full documentation: https://docs.sorokit.dev (see the repository root
README for the current status of the docs site).
