import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { TABLET_ARTWORK } from "../src/lib/tablet-icons/artwork";
import {
  TABLET_SHAPES,
  type TabletIconNode,
} from "../src/lib/tablet-icons/geometry";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const check = process.argv.includes("--check");

function attributes(attrs: Record<string, string | number>) {
  return Object.entries(attrs)
    .filter(([name]) => name !== "key")
    .map(([name, value]) => {
      const attribute = name.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      const escaped = String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;");
      return `${attribute}="${escaped}"`;
    })
    .join(" ");
}

function node(
  [tag, attrs]: TabletIconNode[number],
  overrides: Record<string, string | number> = {},
) {
  return `<${tag} ${attributes({ ...attrs, ...overrides })} />`;
}

async function main() {
  const expected = new Map<string, string>();
  for (const artwork of TABLET_ARTWORK) {
    const [body, ...marks] = TABLET_SHAPES[artwork.shape].nodes;
    let contents = TABLET_SHAPES[artwork.shape].nodes
      .map((part) => node(part))
      .join("\n");
    if (artwork.variant === "color") {
      const maskId = `${artwork.slug}-cutouts`;
      const silhouette = node(body, { fill: "white", stroke: "white" });
      const cutouts = marks
        .map((part) => node(part, { fill: "none", stroke: "black" }))
        .join("\n");
      // One painted surface avoids overlap artifacts; all detail is transparent.
      contents = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">${silhouette}${cutouts}</mask></defs><rect width="24" height="24" fill="${artwork.color.hex}" stroke="none" mask="url(#${maskId})" />`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contents}</svg>`;
    expected.set(
      path.join(projectRoot, "public", artwork.src),
      await format(svg, { parser: "html" }),
    );
  }
  const problems: string[] = [];
  for (const variant of ["outline", "color"]) {
    const directory = path.join(
      projectRoot,
      "public/icons/medications/tablets",
      variant,
    );
    if (!check) await mkdir(directory, { recursive: true });
    const existing = await readdir(directory).catch(() => []);
    for (const filename of existing.filter((name) => name.endsWith(".svg"))) {
      const filenamePath = path.join(directory, filename);
      if (!expected.has(filenamePath)) {
        if (check)
          problems.push(
            `Unexpected generated asset: ${path.relative(projectRoot, filenamePath)}`,
          );
        else await unlink(filenamePath);
      }
    }
  }
  for (const [filename, contents] of expected) {
    if (check) {
      const actual = await readFile(filename, "utf8").catch(() => null);
      if (actual !== contents)
        problems.push(`Regenerate ${path.relative(projectRoot, filename)}`);
    } else {
      await writeFile(filename, contents);
    }
  }
  if (problems.length) throw new Error(problems.join("\n"));
  process.stdout.write(
    `${check ? "Verified" : "Generated"} ${expected.size} tablet SVG files.\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Tablet icon generation failed."}\n`,
  );
  process.exitCode = 1;
});
