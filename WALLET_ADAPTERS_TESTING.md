# Testing the wallet adapter refactor

`@soroform/wallet-adapter` (renamed from `@soroform/wallet`) is no longer
tied to one wallet connector. `WalletProvider` now takes a required
`adapter` prop; Soroform ships three adapters as separate entry points
(`stellarWalletsKit()`, `blux()`, `ParaWalletProvider`), and `WalletAdapter`
is exported as a public type for anyone writing their own.

This is a guide to actually exercising that change, not just running the
automated suite (though start there).

## 1. Automated checks

From the repo root:

```bash
pnpm exec turbo run lint typecheck test build --force
```

Expect all packages, both examples, and `apps/landing` to pass. The
wallet-adapter-specific tests live in:

- `packages/wallet-adapter/src/context.test.tsx` — `WalletProvider`/`useWallet` against a hand-rolled fake `WalletAdapter`, no real SDK involved
- `packages/wallet-adapter/src/adapters/stellar-wallets-kit.test.ts` — the `stellarWalletsKit()` factory against a mocked `@creit.tech/stellar-wallets-kit`
- `packages/wallet-adapter/src/adapters/blux.test.ts` — the `blux()` factory against a mocked `@bluxcc/core`
- `packages/wallet-adapter/src/adapters/para.test.tsx` — `ParaWalletProvider` against mocked `@getpara/react-sdk`/`@getpara/react-sdk/stellar` hooks

To run just this package:

```bash
cd packages/wallet-adapter
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

After `pnpm build`, confirm the three adapters produced genuinely separate
bundles (no cross-contamination between the wallet SDKs):

```bash
grep -l "bluxcc\|getpara" dist/adapters/stellar-wallets-kit.js dist/index.js   # should print nothing
grep -l "getpara\|stellar-wallets-kit" dist/adapters/blux.js                  # should print nothing
grep -l "bluxcc\|stellar-wallets-kit" dist/adapters/para.js                   # should print nothing
```

## 2. Manual test: `stellarWalletsKit()` in a real browser

This is the default adapter and the one both example apps use.

1. Install a testnet-capable wallet extension if you don't have one —
   [Freighter](https://www.freighter.app/) is the easiest (Chrome/Firefox),
   set it to **Testnet** in its network switcher.
2. Fund a testnet account: open Freighter, copy the `G...` address, fund
   it via [Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS)
   or the button in Freighter itself.
3. Run either example:

   ```bash
   cd examples/next-app && pnpm dev     # http://localhost:3000
   # or
   cd examples/vite-app && pnpm dev     # http://localhost:5173
   ```

4. In the browser:
   - Click **Connect Wallet**. The Stellar Wallets Kit picker should open
     and list Freighter (and any other installed wallets); select it and
     approve the connection popup.
   - The button should now show your truncated `G...` address.
   - The **Your account** card should populate with a sequence number.
   - Fill in the transfer form with any `G...` address as recipient and a
     small amount, submit. The button cycles through
     `simulating → needsSignature → submitting → success`; approve the
     signature prompt Freighter shows.
   - Open the devtools panel (floating "Soroform" button, bottom-right).
     The **Sends** tab should show the transfer with `status: success`,
     decoded `result`, and a **Copy transaction XDR** button that actually
     copies something.
   - Click the connect button again (now showing your address) — it
     should disconnect, and the UI should revert to "Connect Wallet".
5. Switch Freighter to a different network than the app (e.g. Public)
   and reload — confirm nothing silently breaks (the app stays on its
   configured `testnet`; `WalletProvider` doesn't need to match Freighter's
   own network for the picker to work, since `stellarWalletsKit()` calls
   `.init()`/`.setNetwork()` with the app's own passphrase).

## 3. Manual test: `blux()`

Blux requires an `appId` from the [Blux dashboard](https://dashboard.blux.cc/) —
there isn't one wired into the example apps by default, since it's a
per-account credential. To test it:

1. Sign up at [dashboard.blux.cc](https://dashboard.blux.cc/), create a
   project, copy its `appId`.
2. In `examples/vite-app/src/App.tsx`, temporarily swap the adapter:

   ```diff
   -import { stellarWalletsKit } from "@soroform/wallet-adapter/adapters/stellar-wallets-kit";
   +import { blux } from "@soroform/wallet-adapter/adapters/blux";

   -const adapter = stellarWalletsKit();
   +const adapter = blux({ appId: "YOUR_APP_ID", appName: "Soroform vite-app" });
   ```

3. `pnpm add @bluxcc/core` in `examples/vite-app` (it's a peer dependency,
   not bundled).
4. `pnpm dev`, then:
   - Click **Connect Wallet** — Blux's own modal should open (wallet list,
     plus email/passkey/social if enabled for your project).
   - Connect a wallet the same way as the SWK test above.
   - Repeat the transfer-form test. Since the adapter forces
     `showWalletUIs: false`, signing should go straight to your wallet
     extension's own popup, **not** a second Blux confirmation modal in
     between.
   - Disconnect, confirm the UI reverts.
5. Revert the temporary `App.tsx` change (and the added dependency)
   afterward — it shouldn't ship as part of the example.

## 4. Manual test: `ParaWalletProvider`

Para requires an `apiKey` from the [Para developer portal](https://developer.getpara.com/) —
not wired into the example apps by default. To test it:

1. Sign up, create a project, copy its `apiKey` (beta environment is fine
   for testing).
2. In `examples/vite-app/src/App.tsx`, temporarily swap the whole provider:

   ```diff
   -import { stellarWalletsKit } from "@soroform/wallet-adapter/adapters/stellar-wallets-kit";
   +import { ParaWalletProvider } from "@soroform/wallet-adapter/adapters/para";

   -const adapter = stellarWalletsKit();

    export function App() {
      return (
        <SoroformProvider network="testnet">
   -      <WalletProvider adapter={adapter}>
   +      <ParaWalletProvider apiKey="YOUR_API_KEY">
            {/* ...the rest of the app... */}
   -      </WalletProvider>
   +      </ParaWalletProvider>
        </SoroformProvider>
      );
    }
   ```

3. `pnpm add @getpara/react-sdk @tanstack/react-query` in `examples/vite-app`
   (both peer dependencies; `@tanstack/react-query` may already be present
   transitively, but add it explicitly if the build complains).
4. `pnpm dev`, then:
   - Click **Connect Wallet** — Para's own modal should open, offering
     email/social/passkey login plus external wallets (Freighter, etc.),
     since `useModal().openModal()` is what `ParaWalletProvider` calls.
   - Connect any way you like. `useAccount()`'s `embedded.wallets` should
     include a Stellar wallet once connected; confirm the connect button
     shows a `G...` address afterward (not stuck on "Connect Wallet" — if
     it hangs here, the `embedded.wallets.find(w => w.type === "STELLAR")`
     lookup in `para.tsx` isn't matching what Para's SDK actually reports,
     which is exactly the kind of drift the docs-only build couldn't rule
     out — see the `<Note>` in `wallet-provider.mdx`).
   - Repeat the transfer-form test; approve however Para prompts for it.
   - Disconnect, confirm the UI reverts.
5. Revert the temporary `App.tsx` change (and the added dependencies)
   afterward.

## 5. Manual test: a custom `WalletAdapter`

Confirms the interface itself is usable by something Soroform doesn't
ship, without needing a real wallet SDK:

```tsx
import type { WalletAdapter } from "@soroform/wallet-adapter";

const fakeAdapter: WalletAdapter = {
  init: () => {},
  connect: async () => ({ address: "GFAKE...ADDRESS" }),
  disconnect: async () => {},
  signTransaction: async (xdr) => ({ signedTxXdr: xdr }),
  signAuthEntry: async (entry) => ({ signedAuthEntry: entry }),
  onStateChange: () => () => {},
  onDisconnect: () => () => {},
};
```

Swap this in as `adapter` in either example, click Connect — the address
should appear immediately (no real UI, no real signing), confirming
`WalletProvider` doesn't assume anything SDK-specific.

## 6. What's verified vs. not

**Built, tested, and manually verifiable (above):**
`stellarWalletsKit()`, `blux()`, `ParaWalletProvider`, and the
`WalletAdapter` interface itself. Para's automated test
(`para.test.tsx`) mocks `@getpara/react-sdk`/`@getpara/react-sdk/stellar`
at their real published type shapes, but hasn't been exercised against a
live Para account — see the `<Note>` in `wallet-provider.mdx` and the
caveat in section 4 above.

**Researched, not built** — precise technical reasons, not just "different
architecture":

- **passkey-kit / smart-account-kit** (`github.com/stellar/passkey-kit`,
  `github.com/stellar/smart-account-kit`) — these are smart-contract
  wallets: a `C...` contract is the "address", not a funded `G...`
  keypair. `useContractSend` builds transactions via
  `AssembledTransaction.build({ publicKey: wallet.address, ... })`
  (`@stellar/stellar-sdk/contract`), and that call needs `publicKey` to be
  a funded `G...` account with a sequence number, because it becomes the
  transaction's *source account*. A contract address has neither. So this
  isn't something an adapter shim can "provision around" by e.g. faking a
  sequence number — it's `useContractSend` itself that would need to
  support decoupling "who authorizes" (the passkey/smart-account signer)
  from "who pays / is the source" (a separate funded account or relayer).
  That's a real feature addition, not an adapter.
- **Privy** — confirmed to support Stellar now, but only at their generic
  "Tier 2: raw sign" tier; no Stellar-specific signing helper (comparable
  to Para's `useStellarSigner`) exists in their docs yet to build a
  correct `signTransaction`/`signAuthEntry` mapping against.

## 7. `@bluxcc/core` upstream fix

`packages/wallet-adapter/src/adapters/blux.ts` casts `blux.signTransaction`/
`signAuthEntry`'s result to `string`, because the currently **published**
`@bluxcc/core` types those `Promise<unknown>`. A local clone of
`blux-core` at `~/Desktop/freedom/blux-core` has this fixed (typed as
`Promise<string>` / `Promise<SendTransactionResult>`, matching what the
code actually resolves) as an uncommitted diff, ready for review before
opening a PR. Once that ships upstream, the casts in `blux.ts` become
redundant but harmless.
