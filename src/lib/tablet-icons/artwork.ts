import { TABLET_SHAPES, type TabletShapeName } from "./geometry";

export type TabletArtworkColor = { name: string; hex: string };
type ArtworkDefinition = {
  slug: string;
  componentName: string;
  variant: "outline" | "color";
  shape: TabletShapeName;
  aliases: readonly string[];
  keywords: readonly string[];
  color?: TabletArtworkColor;
  src: string;
  value: string;
};

/** Static sRGB equivalents of the installed Tailwind palette, plus requested Zinc. */
export const TABLET_COLORS = {
  lime: { name: "Lime 300", hex: "#bbf451" },
  sky: { name: "Sky 300", hex: "#74d4ff" },
  blue: { name: "Blue 300", hex: "#8ec5ff" },
  zinc: { name: "Zinc 300", hex: "#D4D4D8" },
  yellow: { name: "Yellow 200", hex: "#fff085" },
  red: { name: "Red 300", hex: "#ffa2a2" },
  coral: { name: "Red 400", hex: "#ff6467" },
  viagra: { name: "Blue 400", hex: "#51a2ff" },
} as const satisfies Record<string, TabletArtworkColor>;

const outlineDefinitions = [
  [
    "tablet-meridian",
    ["round", "scored", "tablet", "normal", "rund", "geteilt", "tablette"],
  ],
  [
    "tablet-pebble",
    ["round", "small", "plain", "tablet", "rund", "klein", "tablette"],
  ],
  [
    "tablet-halo",
    ["round", "large", "plain", "tablet", "rund", "gross", "tablette"],
  ],
  [
    "tablet-dualmark",
    ["round", "scored", "letters", "a b", "ritalin", "rund", "buchstaben"],
  ],
  [
    "tablet-splitlet",
    [
      "round",
      "scored",
      "small",
      "sleep",
      "quetialan 100",
      "queatialan 100",
      "schlaf",
    ],
  ],
  [
    "tablet-scorecrest",
    ["round", "scored", "sleep", "dominal forte", "schlaf"],
  ],
  [
    "tablet-minidot",
    [
      "round",
      "tiny",
      "small",
      "sleep",
      "queatialan 25",
      "quetialan 25",
      "klein",
      "schlaf",
    ],
  ],
  [
    "tablet-wideplain",
    [
      "round",
      "large",
      "plain",
      "sleep",
      "queatialan 200",
      "quetialan 200",
      "gross",
      "schlaf",
    ],
  ],
  [
    "tablet-wideplain-plus",
    ["round", "larger", "plain", "venlafaxin", "gross"],
  ],
  ["viagra", ["rounded diamond", "diamond", "tablet", "blue", "raute", "blau"]],
  ["euthyrox", ["round", "scored", "em", "50", "fifty", "rund", "geteilt"]],
] as const satisfies readonly (readonly [TabletShapeName, readonly string[]])[];

const colorDefinitions = [
  [
    "bromazepam",
    "Bromazepam",
    "tablet-meridian",
    "lime",
    ["green", "grun", "scored", "round"],
  ],
  [
    "diazepam",
    "Diazepam",
    "tablet-meridian",
    "sky",
    ["blue", "blau", "scored", "round"],
  ],
  [
    "alprazolam",
    "Alprazolam",
    "tablet-pebble",
    "blue",
    ["blue", "blau", "small", "klein", "round"],
  ],
  [
    "valium",
    "Valium",
    "tablet-halo",
    "zinc",
    ["white", "weiss", "large", "gross", "round"],
  ],
  [
    "ritalin",
    "Ritalin",
    "tablet-dualmark",
    "zinc",
    ["white", "weiss", "a b", "letters", "buchstaben"],
  ],
  [
    "quetialan-100",
    "Quetialan100",
    "tablet-splitlet",
    "yellow",
    ["queatialan 100", "yellow", "gelb", "sleep", "schlaf"],
  ],
  [
    "dominal-forte",
    "DominalForte",
    "tablet-scorecrest",
    "red",
    ["coral", "red", "rot", "sleep", "schlaf"],
  ],
  [
    "queatialan-25",
    "Queatialan25",
    "tablet-minidot",
    "coral",
    [
      "quetialan 25",
      "red",
      "rot",
      "coral",
      "small",
      "klein",
      "sleep",
      "schlaf",
    ],
  ],
  [
    "queatialan-200",
    "Queatialan200",
    "tablet-wideplain",
    "zinc",
    ["quetialan 200", "white", "weiss", "sleep", "schlaf"],
  ],
  [
    "venlafaxin",
    "Venlafaxin",
    "tablet-wideplain-plus",
    "zinc",
    ["white", "weiss", "larger", "grosser", "round"],
  ],
  [
    "viagra",
    "Viagra",
    "viagra",
    "viagra",
    ["blue", "blau", "diamond", "raute"],
  ],
  [
    "euthyrox",
    "Euthyrox",
    "euthyrox",
    "zinc",
    ["white", "weiss", "em", "50", "fifty"],
  ],
] as const satisfies readonly (readonly [
  string,
  string,
  TabletShapeName,
  keyof typeof TABLET_COLORS,
  readonly string[],
])[];

/** One source for public SVG files, canonical component names, and search metadata. */
export const TABLET_ARTWORK = [
  ...outlineDefinitions.map(([slug, keywords]) => ({
    slug,
    componentName: TABLET_SHAPES[slug].componentName,
    variant: "outline" as const,
    shape: slug,
    aliases: TABLET_SHAPES[slug].aliases,
    keywords,
    src: `/icons/medications/tablets/outline/${slug}.svg`,
    value: `svg:${slug}` as `svg:${typeof slug}`,
  })),
  ...colorDefinitions.map(([slug, componentName, shape, color, keywords]) => ({
    slug,
    componentName,
    variant: "color" as const,
    shape,
    aliases: [slug],
    keywords,
    color: TABLET_COLORS[color],
    src: `/icons/medications/tablets/color/${slug}.svg`,
    value: `svg:color:${slug}` as `svg:color:${typeof slug}`,
  })),
] satisfies readonly ArtworkDefinition[];
