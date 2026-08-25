import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // This package uses client-only React APIs (context, state). Next.js's
  // App Router bundler requires "use client" at the top of the actual
  // compiled output, not just the source, or it refuses to bundle any
  // Server Component that transitively imports this package.
  banner: { js: '"use client";' },
});
