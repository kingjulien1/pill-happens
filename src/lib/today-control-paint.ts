import type { CSSProperties } from "react";

/** One material family: a prominent satin face and quieter glass tools. */
const tones = {
  light: {
    face: "#582447",
    ink: "#fff7fc",
    secondary: "#f8d7ea",
    highlight: "#dfc1f43d",
    blush: "#f9a8d428",
    rim: "#a95f963d",
    edge: "#f2d2e780",
    shadow: "#6a2e6630",
    well: "#fff4fb14",
    toolFace: "#f8e9f4e8",
    toolOpaque: "#f8e9f4",
    toolInk: "#9d174d",
    toolRim: "#b65a923b",
    toolEdge: "#bc72a461",
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
