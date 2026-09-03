# @sorokit/contract

The core of Sorokit: a pipeline that turns a Soroban contract's spec
into Zod schemas and typed React hooks, entirely at runtime from a
`contractId`. There is no code generation step: the first call for a
given contract fetches its spec, derives its Zod schemas, and caches
the result, so swapping which contract a hook points at never requires
rerunning a command. Exposes `sorobanTypeToZod`, `generateContractSchemas`,
`useContractCall`, `useContractSend`, and `useSorobanForm`.

Full documentation: https://docs.sorokit.xyz (see the repository root
README for the current status of the docs site).
