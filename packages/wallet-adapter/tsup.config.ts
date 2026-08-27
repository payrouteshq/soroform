import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/stellar-wallets-kit": "src/adapters/stellar-wallets-kit.ts",
    "adapters/blux": "src/adapters/blux.ts",
    "adapters/para": "src/adapters/para.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@creit.tech/stellar-wallets-kit",
    "@bluxcc/core",
    "@getpara/react-sdk",
    "@getpara/react-sdk/stellar",
    "@tanstack/react-query",
    "@soroform/provider",
  ],
  banner: { js: '"use client";' },
});
