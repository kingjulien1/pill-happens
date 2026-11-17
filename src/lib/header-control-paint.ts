import type { CSSProperties } from "react";
import {
  TODAY_CONTROL_PAINT,
  controlModeDeclarations,
} from "./today-control-paint";

type HeaderControlPaint = CSSProperties & Record<`--${string}`, string>;

/** The toolbar and critical loader inherit the same lilac/plum glass material. */
export const HEADER_CONTROL_PAINT: Readonly<HeaderControlPaint> = Object.freeze(
  {
    ...TODAY_CONTROL_PAINT,
    "--header-control-cup-base": "var(--control-tool-opaque)",
    "--header-control-cup-surface": "var(--control-tool-face)",
    "--header-control-base": "var(--control-tool-rim)",
    "--header-control-surface-opacity": "0.74",
    "--header-control-bright-ink": "var(--control-tool-ink)",
    "--header-control-ink": "var(--control-tool-ink)",
    "--header-control-thick-edge": "var(--control-tool-edge)",
    "--header-control-outer-edge": "var(--control-tool-rim)",
    "--header-control-inner-edge": "var(--control-tool-edge)",
    "--header-control-score-ink": "var(--control-tool-opaque)",
  } satisfies HeaderControlPaint,
);

/** Native system preference owns the same critical paint before app CSS. */
export const HEADER_CONTROL_PAINT_CSS =
  Object.entries(HEADER_CONTROL_PAINT)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n") +
  "\n" +
  controlModeDeclarations("light");
export const HEADER_CONTROL_DARK_CSS = controlModeDeclarations("dark");
