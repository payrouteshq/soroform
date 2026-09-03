# Sorokit Vite example

A simpler, non-Next React app demonstrating the same Sorokit flow as
`examples/next-app`: `SorokitProvider`, `WalletProvider`,
`ConnectWalletButton`, `useContractCall`, `useSorobanForm`,
`useContractSend`, `useBalance`, `useNetworkStatus`, and `SorokitDevtools`.

It targets the testnet native XLM Stellar Asset Contract
(`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`), a real contract
that exists on every Stellar network with no deployment step, so this example
works immediately with no setup beyond a testnet wallet.

## Running it

From the repository root:

```
pnpm --filter vite-app dev
```

Or from this directory:

```
pnpm dev
```

Open the printed local URL. Connect a testnet-funded wallet (Freighter,
xBull, Albedo, Lobstr, Hana, or Rabet) to see your balance and send a
transfer. Fund a testnet account with
[Friendbot](https://friendbot.stellar.org) if you need one.

Full documentation: see the repository root README for the current status of
the docs site.
