---
"@soroform/core": minor
"@soroform/provider": minor
"@soroform/wallet": minor
"@soroform/hooks": minor
"@soroform/contract": minor
"@soroform/devtools": minor
---

Initial release of the Soroform SDK.

- `@soroform/core`: config resolution, query key factories, RPC/Horizon
  passthroughs, and a `SoroformError` normalizer covering all 16
  `@stellar/stellar-sdk/contract` error classes.
- `@soroform/provider`: `SoroformProvider` and `useSoroformConfig`.
- `@soroform/wallet`: `WalletProvider`, `useWallet`, and
  `ConnectWalletButton`, built on `@creit.tech/stellar-wallets-kit`.
- `@soroform/contract`: `sorobanTypeToZod`, `generateContractSchemas`,
  `useContractRead`, `useContractWrite`, and `useContractForm`. No code
  generation step: a contract's spec and Zod schemas are fetched and
  derived entirely at runtime from its `contractId`.
- `@soroform/hooks`: `useAccount`, `useBalance`, `useTransactionStatus`,
  and `useNetworkStatus`.
- `@soroform/devtools`: `SoroformDevtools`, a development-only panel
  logging contract write activity and the TanStack Query cache.
