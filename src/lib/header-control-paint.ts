import type { CSSProperties } from "react";

type HeaderControlPaint = CSSProperties &
  Record<`--header-control-${string}`, string>;

/**
 * Shared header/loader pigments, including literal prepaint fallbacks. The cup
 * surface is a background list: paint it on its own layer at the shared opacity
 * instead of mixing a gradient list as though it were one color.
 */
export const HEADER_CONTROL_PAINT: Readonly<HeaderControlPaint> = Object.freeze(
  {
    "--header-control-cup-base":
      "color-mix(in srgb, #4e456e 94%, var(--palette-rose, #f9a8d4))",
    "--header-control-cup-surface":
      "radial-gradient(ellipse at 5% 4%, color-mix(in srgb, var(--palette-rose, #f9a8d4) 20%, transparent), transparent 70%), radial-gradient(ellipse at 96% 98%, color-mix(in srgb, var(--palette-iris, #b7c9f5) 21%, transparent), transparent 66%), var(--header-control-cup-base)",
    "--header-control-base":
      "color-mix(in srgb, var(--color-fuchsia-900, oklch(40.1% 0.17 325.612)) 87%, transparent)",
    "--header-control-surface-opacity": "0.31",
    "--header-control-bright-ink":
      "color-mix(in srgb, #c1b6cc 80%, var(--palette-white, #ffffff) 20%)",
    "--header-control-ink":
      "color-mix(in srgb, var(--color-purple-400, oklch(71.4% 0.203 305.504)) 67%, var(--header-control-bright-ink) 33%)",
    "--header-control-thick-edge":
      "color-mix(in srgb, var(--header-control-ink) 70%, var(--color-pink-200, oklch(89.9% 0.061 343.231)) 30%)",
    // The former 8%-alpha soft outer ring loses one third of its visibility once.
    "--header-control-outer-edge":
      "color-mix(in srgb, var(--header-control-ink) calc(8% * 2 / 3), transparent)",
    "--header-control-inner-edge":
      "color-mix(in srgb, var(--header-control-ink) 67%, transparent)",
    // SVG score lines require a plain color, never the layered cup background.
    "--header-control-score-ink": "var(--header-control-cup-base)",
  } satisfies HeaderControlPaint,
);

/** Same declarations for the server-rendered loading curtain before app CSS. */
export const HEADER_CONTROL_PAINT_CSS = Object.entries(HEADER_CONTROL_PAINT)
  .map(([name, value]) => `${name}: ${value};`)
  .join("\n");
