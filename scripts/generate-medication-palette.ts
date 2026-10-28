import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const require = createRequire(import.meta.url);
const themePath = require.resolve("tailwindcss/theme.css");
const packagePath = require.resolve("tailwindcss/package.json");
const outputPath = fileURLToPath(
  new URL("../src/lib/medication-palette.ts", import.meta.url),
);

/** Convert the installed theme's OKLCH values to opaque, clipped sRGB hex. */
function toHex(value: string): string {
  const match = value.match(
    /^oklch\(([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+|none)\)$/,
  );
  if (!match) throw new Error(`Unsupported Tailwind color: ${value}`);

  const lightness = Number(match[1]) / (match[2] ? 100 : 1);
  const chroma = Number(match[3]);
  const hue = match[4] === "none" ? 0 : (Number(match[4]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${channels
    .map((linear) => {
      const clipped = Math.max(0, Math.min(1, linear));
      const srgb =
        clipped <= 0.0031308
          ? 12.92 * clipped
          : 1.055 * clipped ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

async function main() {
  const [theme, packageJson] = await Promise.all([
    readFile(themePath, "utf8"),
    readFile(packagePath, "utf8"),
  ]);
  const version: string = JSON.parse(packageJson).version;
  const colors = Array.from(
    theme.matchAll(/--color-([a-z]+)-(\d+):\s*(oklch\([^)]+\));/g),
    ([, family, shade, cssColor]) => ({
      value: `tw-${family}-${shade}`,
      label: `${family[0].toUpperCase()}${family.slice(1)} ${shade}`,
      hex: toHex(cssColor),
    }),
  );
  if (colors.length < 200) throw new Error("Tailwind palette is incomplete");
  colors.push(
    { value: "tw-black", label: "Black", hex: "#000000" },
    { value: "tw-white", label: "White", hex: "#ffffff" },
  );

  const output = await format(
    `/**
 * Generated from tailwindcss ${version} theme.css by scripts/generate-medication-palette.ts.
 * OKLCH is converted to opaque sRGB hex for swatches and alpha-suffixed accents.
 * Regenerate with: node --import tsx scripts/generate-medication-palette.ts
 */
export const TAILWIND_MEDICATION_COLORS = [
${colors
  .map(
    ({ value, label, hex }) =>
      `  { value: "${value}", label: "${label}", hex: "${hex}" },`,
  )
  .join("\n")}
] as const;
`,
    { parser: "typescript" },
  );

  if (process.argv.includes("--check")) {
    if ((await readFile(outputPath, "utf8")) !== output) {
      throw new Error(
        "Medication palette is stale; regenerate it before committing",
      );
    }
    console.log(
      `Medication palette is current (${colors.length} Tailwind colors).`,
    );
  } else {
    await writeFile(outputPath, output);
    console.log(`Generated ${colors.length} Tailwind medication colors.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
