import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prepared vendor WASM/workers are copied from npm and are not app sources.
  globalIgnores([".next/**", "next-env.d.ts", "public/sleep-ocr/**"]),
]);
