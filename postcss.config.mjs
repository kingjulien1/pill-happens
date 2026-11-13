import { resolve } from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Turbopack loads plugin keys from a generated chunk, not this config file.
    [resolve(process.cwd(), "scripts/postcss-appearance.cjs")]: {},
  },
};
export default config;
