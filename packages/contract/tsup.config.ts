import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "react-hook-form",
    "@hookform/resolvers",
    "@hookform/resolvers/zod",
    "zod",
    "@stellar/stellar-sdk",
    "@sorokit/core",
    "@sorokit/provider",
    "@sorokit/wallet-adapter",
  ],
  banner: { js: '"use client";' },
});
