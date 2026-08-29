---
"@sorokit/core": minor
"@sorokit/provider": minor
"@sorokit/wallet-adapter": minor
"@sorokit/hooks": minor
"@sorokit/contract": minor
"@sorokit/devtools": minor
---

Initial release of the Sorokit SDK.

- `@sorokit/core`: config resolution, query key factories, RPC/Horizon
  passthroughs, and a `SorokitError` normalizer covering all 16
  `@stellar/stellar-sdk/contract` error classes.
- `@sorokit/provider`: `SorokitProvider`, the single entry point for
  network config, wallet connection (`wallet`), and devtools (`devtools`),
  and `useSorokitConfig`.
- `@sorokit/wallet-adapter`: `useWallet` and `ConnectWalletButton`, driven
  by whichever `WalletConnector` is passed to `SorokitProvider`'s `wallet`
  prop — `stellarWalletsKit()` (`@creit.tech/stellar-wallets-kit`), `blux()`
  (`@bluxcc/core`), or `para()` (`@getpara/react-sdk`), or your own.
- `@sorokit/contract`: `sorobanTypeToZod`, `generateContractSchemas`,
  `useContractCall`, `useContractSend`, and `useSorobanForm`. No code
  generation step: a contract's spec and Zod schemas are fetched and
  derived entirely at runtime from its `contractId`.
- `@sorokit/hooks`: `useAccount`, `useBalance`, `useTransactionStatus`,
  and `useNetworkStatus`.
- `@sorokit/devtools`: `SorokitDevtools`, a development-only panel
  logging contract write activity and the TanStack Query cache.
