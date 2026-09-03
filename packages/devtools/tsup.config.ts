import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "@tanstack/react-query", "@sorokit/core"],
  banner: { js: '"use client";' },
  loader: { ".css": "text" },
});
