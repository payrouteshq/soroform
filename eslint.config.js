// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "docs/**",
      "**/.next/**",
      "**/*.generated.ts",
      "**/*.generated.css",
      // tsup (via bundle-require) writes a transient
      // `<config>.bundled_<random>.{mjs,cjs}` next to config files like
      // tsup.config.ts while it runs, then deletes it. `lint` and `build`
      // aren't ordered against each other for the same package (turbo's
      // `lint`/`typecheck`/`test` only depend on `^build`, upstream
      // packages' builds), so ESLint's own file glob can catch this file
      // mid-existence and then fail with ENOENT once `build` deletes it
      // out from under the read. Excluding the pattern avoids the race
      // entirely, rather than relying on task ordering or retries.
      "**/*.bundled_*.mjs",
      "**/*.bundled_*.cjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      // vi.mock's importOriginal<T>() is idiomatically typed with an
      // inline `typeof import(...)`, since it must reference the
      // original module's type at that exact generic position.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
);
