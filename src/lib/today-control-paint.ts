import type { CSSProperties } from "react";

/** One material family: a prominent satin face and quieter glass tools. */
const tones = {
  light: {
    face: "#43284f",
    ink: "#fff3fc",
    secondary: "#ead1ef",
    highlight: "#c4b5fd47",
    blush: "#f9a8d426",
    rim: "#6e4b8540",
    edge: "#f4deff59",
    shadow: "#34213f38",
    well: "#f5ddff14",
    toolFace: "#edddf2bd",
    toolOpaque: "#edddf2",
    toolInk: "#543360",
    toolRim: "#a88abc47",
    toolEdge: "#fff2fdba",
  },
  dark: {
    face: "#e8d3f5",
    ink: "#35233f",
    secondary: "#62436d",
    highlight: "#fff5fce6",
    blush: "#f5b8dfb3",
    rim: "#cbb0ed38",
    edge: "#fff6ffbf",
    shadow: "#110b2352",
    well: "#50305d14",
    toolFace: "#392d49ad",
    toolOpaque: "#392d49",
    toolInk: "#e8d2f7",
    toolRim: "#cbb0ed38",
    toolEdge: "#f2ddff47",
  },
} as const;

const token = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const names = Object.keys(tones.light) as (keyof typeof tones.light)[];

/** Explicit light/dark pigments are available to CSS before hydration. */
export const TODAY_CONTROL_PAINT = Object.fromEntries(
  (["light", "dark"] as const).flatMap((mode) =>
    names.map((name) => [
      `--control-${token(name)}-${mode}`,
      tones[mode][name],
    ]),
  ),
) as CSSProperties & Record<`--control-${string}`, string>;

export const controlModeDeclarations = (mode: "light" | "dark") =>
  names
    .map(
      (name) =>
        `--control-${token(name)}: var(--control-${token(name)}-${mode});`,
    )
    .join("\n");
