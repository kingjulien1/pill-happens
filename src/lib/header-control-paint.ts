import type { CSSProperties } from "react";

type HeaderControlPaint = CSSProperties &
  Record<`--header-control-${string}`, string>;

/**
 * Header controls and the critical loader share an opaque Pink950 foundation,
 * one 67% Mauve900 overlay, and Pink400 artwork and inset edges. Keeping the
 * overlay on its own layer avoids fading the icons or the foundation with it.
 */
export const HEADER_CONTROL_PAINT: Readonly<HeaderControlPaint> = Object.freeze(
  {
    "--header-control-cup-base":
      "color-mix(in srgb, var(--color-mauve-900, oklch(21.2% 0.019 322.12)) 67%, var(--color-pink-950, oklch(28.4% 0.109 3.907)))",
    "--header-control-cup-surface":
      "var(--color-mauve-900, oklch(21.2% 0.019 322.12))",
    "--header-control-base": "var(--color-pink-950, oklch(28.4% 0.109 3.907))",
    "--header-control-surface-opacity": "0.67",
    "--header-control-bright-ink":
      "var(--color-pink-400, oklch(71.8% 0.202 349.761))",
    "--header-control-ink": "var(--header-control-bright-ink)",
    "--header-control-thick-edge": "var(--header-control-ink)",
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
