import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@stellar/stellar-sdk", "@sorokit/core", "@sorokit/provider"],
  banner: { js: '"use client";' },
});
