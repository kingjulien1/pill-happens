import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { APP_COLORS } from "../src/lib/app-theme";

// Next.js supplies sharp for image optimization. These assets are derived from
// our existing vector mark; no new raster artwork or private input is involved.
const require = createRequire(import.meta.url);
const sharp = require("sharp") as typeof import("sharp").default;
const svgPath = new URL("../src/app/icon.svg", import.meta.url);
const targets = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: true },
] as const;

async function main() {
  const original = await readFile(svgPath, "utf8");
  const source = original.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>
    .background { fill: ${APP_COLORS.peach}; }
    .mark { stroke: ${APP_COLORS.ink}; }
    @media (prefers-color-scheme: dark) {
      .background { fill: ${APP_COLORS.ink}; }
      .mark { stroke: ${APP_COLORS.peach}; }
    }
  </style>`,
  );
  // Installed icons have a fixed palette; the browser SVG follows the system.
  const staticSource = source.replace(
    /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\n    \}/,
    "",
  );
  const check = process.argv.includes("--check");
  if (check && source !== original) throw new Error("App SVG theme is stale.");
  if (!check) await writeFile(svgPath, source);
  for (const { name, size, maskable } of targets) {
    const svg = maskable
      ? staticSource.replace('rx="20"', 'rx="0"')
      : staticSource;
    const output = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    const target = new URL(`../public/icons/app/${name}`, import.meta.url);
    if (check) {
      if (!(await readFile(target)).equals(output))
        throw new Error(`${name} is stale; run npm run icons:app.`);
    } else await writeFile(target, output);
  }
  console.log(
    `${check ? "Checked" : "Generated"} ${targets.length} app icons from ${fileURLToPath(svgPath)}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
