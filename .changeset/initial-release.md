---
"@soroform/core": minor
"@soroform/provider": minor
"@soroform/wallet-adapter": minor
"@soroform/hooks": minor
"@soroform/contract": minor
"@soroform/devtools": minor
---

Initial release of the Soroform SDK.

- `@soroform/core`: config resolution, query key factories, RPC/Horizon
  passthroughs, and a `SoroformError` normalizer covering all 16
  `@stellar/stellar-sdk/contract` error classes.
- `@soroform/provider`: `SoroformProvider`, the single entry point for
  network config, wallet connection (`wallet`), and devtools (`devtools`),
  and `useSoroformConfig`.
- `@soroform/wallet-adapter`: `useWallet` and `ConnectWalletButton`, driven
  by whichever `WalletConnector` is passed to `SoroformProvider`'s `wallet`
  prop — `stellarWalletsKit()` (`@creit.tech/stellar-wallets-kit`), `blux()`
  (`@bluxcc/core`), or `para()` (`@getpara/react-sdk`), or your own.
- `@soroform/contract`: `sorobanTypeToZod`, `generateContractSchemas`,
  `useContractCall`, `useContractSend`, and `useSorobanForm`. No code
  generation step: a contract's spec and Zod schemas are fetched and
  derived entirely at runtime from its `contractId`.
- `@soroform/hooks`: `useAccount`, `useBalance`, `useTransactionStatus`,
  and `useNetworkStatus`.
- `@soroform/devtools`: `SoroformDevtools`, a development-only panel
  logging contract write activity and the TanStack Query cache.
