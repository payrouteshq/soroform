# @sorokit/devtools

A development-only devtools panel for Sorokit. Renders nothing in
production builds. In development, shows a log of `useContractSend`
activity and the TanStack Query cache relevant to Sorokit's query keys.

Built with shadcn/ui components. If your app already uses shadcn, the
panel picks up your theme automatically, no setup needed. If not, it
falls back to shadcn's default look.

Full documentation: https://docs.sorokit.xyz (see the repository root
README for the current status of the docs site).
