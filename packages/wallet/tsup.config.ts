import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@creit.tech/stellar-wallets-kit", "@soroform/provider"],
  banner: { js: '"use client";' },
});
