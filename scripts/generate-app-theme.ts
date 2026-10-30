import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  APP_THEME_TOKENS,
  APP_THEME_VALUES,
  renderAppThemeCss,
} from "../src/lib/app-theme";

const outputPath = fileURLToPath(
  new URL("../src/app/theme.css", import.meta.url),
);
const offlinePath = fileURLToPath(
  new URL("../public/offline.html", import.meta.url),
);
const offlineRoles = new Set([
  "background",
  "foreground",
  "muted-foreground",
  "card",
  "border",
  "glow",
  "primary",
  "primary-foreground",
  "ring",
  "shadow",
]);

function offlineTheme() {
  const values = (mode: "light" | "dark") =>
    APP_THEME_TOKENS.filter((item) => offlineRoles.has(item.id))
      .map((item) => `${item.token}: ${item[mode]};`)
      .join("\n");
  return `:root { color-scheme: light; ${values("light")} }
  @media (prefers-color-scheme: dark) { :root { color-scheme: dark; ${values("dark")} } }`;
}

async function main() {
  const output = await format(renderAppThemeCss(), { parser: "css" });
  const offlineSource = await readFile(offlinePath, "utf8");
  const offlineOutput = await format(
    offlineSource
      .replace(
        /\/\* BEGIN GENERATED APP THEME \*\/[\s\S]*?\/\* END GENERATED APP THEME \*\//,
        `/* BEGIN GENERATED APP THEME */\n${offlineTheme()}\n/* END GENERATED APP THEME */`,
      )
      .replace(
        /content="#[a-f\d]+"(\s+media="\(prefers-color-scheme: light\)")/i,
        `content="${APP_THEME_VALUES.light.background}"$1`,
      )
      .replace(
        /content="#[a-f\d]+"(\s+media="\(prefers-color-scheme: dark\)")/i,
        `content="${APP_THEME_VALUES.dark.background}"$1`,
      ),
    { parser: "html" },
  );
  if (process.argv.includes("--check")) {
    if ((await readFile(outputPath, "utf8")) !== output)
      throw new Error(
        "Application theme is stale; run npm run theme:generate.",
      );
    if (offlineSource !== offlineOutput)
      throw new Error("Offline theme is stale; run npm run theme:generate.");
    console.log(
      `Application theme is current (${APP_THEME_TOKENS.length} roles per mode).`,
    );
  } else {
    await writeFile(outputPath, output);
    await writeFile(offlinePath, offlineOutput);
    console.log(
      `Generated ${APP_THEME_TOKENS.length} application theme roles per mode.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
