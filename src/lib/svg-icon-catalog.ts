import {
  iconSearchText,
  normalizeIconQuery,
  tabletIconLabel,
  toIconComponentName,
} from "./icon-names";
import {
  TABLET_ARTWORK,
  type TabletArtworkColor,
} from "./tablet-icons/artwork";
import type { TabletShapeName } from "./tablet-icons/geometry";

/** Original monochrome artwork served from public/icons/medications. */
const definitions = [
  {
    slug: "pill-spark",
    label: "Pill spark",
    keywords: [
      "pill",
      "capsule",
      "medicine",
      "medication",
      "sparkle",
      "pille",
      "tablette",
      "kapsel",
      "medizin",
      "medikament",
      "funkeln",
    ],
  },
  {
    slug: "orbit-tablets",
    label: "Orbit tablets",
    keywords: [
      "tablet",
      "tablets",
      "pill",
      "medicine",
      "medication",
      "orbit",
      "pair",
      "tablette",
      "tabletten",
      "pille",
      "medizin",
      "medikament",
      "paar",
      "kreis",
    ],
  },
  {
    slug: "calm-wave",
    label: "Calm wave",
    keywords: [
      "calm",
      "wave",
      "water",
      "sea",
      "ocean",
      "relax",
      "ruhe",
      "ruhig",
      "welle",
      "wasser",
      "meer",
      "entspannen",
    ],
  },
  {
    slug: "heart-leaf",
    label: "Heart leaf",
    keywords: [
      "heart",
      "leaf",
      "love",
      "care",
      "nature",
      "plant",
      "herz",
      "blatt",
      "blatter",
      "liebe",
      "natur",
      "pflanze",
      "pflanzen",
    ],
  },
  {
    slug: "sunny-side",
    label: "Sunny side",
    keywords: [
      "sun",
      "sunny",
      "smile",
      "happy",
      "weather",
      "morning",
      "sonne",
      "sonnig",
      "lacheln",
      "freude",
      "wetter",
      "morgen",
    ],
  },
  {
    slug: "little-sprout",
    label: "Little sprout",
    keywords: [
      "sprout",
      "leaf",
      "plant",
      "nature",
      "growth",
      "garden",
      "green",
      "sprossling",
      "keimling",
      "blatt",
      "pflanze",
      "pflanzen",
      "natur",
      "wachstum",
      "garten",
      "grun",
    ],
  },
  {
    slug: "cloud-hug",
    label: "Cloud hug",
    keywords: [
      "cloud",
      "hug",
      "care",
      "soft",
      "weather",
      "sky",
      "wolke",
      "umarmung",
      "fursorge",
      "weich",
      "wetter",
      "himmel",
    ],
  },
  {
    slug: "lucky-star",
    label: "Lucky star",
    keywords: [
      "star",
      "lucky",
      "smile",
      "magic",
      "happy",
      "stern",
      "sterne",
      "gluck",
      "glucklich",
      "lacheln",
      "magie",
    ],
  },
  {
    slug: "cozy-cup",
    label: "Cozy cup",
    keywords: [
      "cup",
      "coffee",
      "tea",
      "drink",
      "cozy",
      "warm",
      "tasse",
      "kaffee",
      "tee",
      "trinken",
      "getrank",
      "gemutlich",
    ],
  },
  {
    slug: "mountain-path",
    label: "Mountain path",
    keywords: [
      "mountain",
      "path",
      "walk",
      "hike",
      "travel",
      "outdoors",
      "activity",
      "berg",
      "berge",
      "weg",
      "wandern",
      "reise",
      "reisen",
      "natur",
      "aktivitat",
    ],
  },
  {
    slug: "butterfly",
    label: "Butterfly",
    keywords: [
      "butterfly",
      "animal",
      "insect",
      "nature",
      "wings",
      "fly",
      "schmetterling",
      "tier",
      "tiere",
      "insekt",
      "natur",
      "flugel",
      "fliegen",
    ],
  },
  {
    slug: "music-note",
    label: "Music note",
    keywords: [
      "music",
      "note",
      "song",
      "sound",
      "listen",
      "activity",
      "musik",
      "musiknote",
      "lied",
      "klang",
      "horen",
      "aktivitat",
    ],
  },
] as const;

export type SvgMedicationIconName =
  | `svg:${(typeof definitions)[number]["slug"]}`
  | (typeof TABLET_ARTWORK)[number]["value"];
export type SvgIconCatalogEntry = {
  value: SvgMedicationIconName;
  label: string;
  componentName: string;
  aliases: readonly string[];
  src: string;
  keywords: readonly string[];
  variant: "mask" | "outline" | "color";
  shape?: TabletShapeName;
  color?: TabletArtworkColor;
};

const localKeywords = [
  "svg",
  "vector",
  "local",
  "project",
  "custom",
  "lokal",
  "vektor",
  "projekt",
];

function spellingAliases(slug: string): string[] {
  const alternate = slug.includes("quetialan")
    ? slug.replace("quetialan", "queatialan")
    : slug.includes("queatialan")
      ? slug.replace("queatialan", "quetialan")
      : null;
  return alternate
    ? [alternate, toIconComponentName(alternate), tabletIconLabel(alternate)]
    : [];
}

/** Persist stable IDs, never filenames supplied by a user or arbitrary SVG text. */
export const SVG_ICON_CATALOG: readonly SvgIconCatalogEntry[] = [
  ...definitions.map(({ slug, label, keywords }) => ({
    value: `svg:${slug}` as const,
    label,
    componentName: toIconComponentName(slug),
    aliases: [slug],
    variant: "mask" as const,
    src: `/icons/medications/${slug}.svg`,
    keywords: [...localKeywords, ...keywords],
  })),
  ...TABLET_ARTWORK.map((entry): SvgIconCatalogEntry => ({
    ...entry,
    label: tabletIconLabel(entry.slug),
    aliases: [
      ...entry.aliases,
      ...spellingAliases(entry.slug),
      entry.variant === "color"
        ? `${entry.componentName}Color`
        : `${entry.componentName}Icon`,
    ],
    keywords: [
      ...localKeywords,
      "tablet",
      "tablette",
      "tablets",
      "medication",
      "medikament",
      ...(entry.variant === "color"
        ? [
            "color",
            "colored",
            "colour",
            "coloured",
            "pastel",
            "flat",
            "fixed",
            "farbig",
            "farbe",
          ]
        : ["outline", "stroke", "tintable", "kontur"]),
      ...entry.keywords,
    ],
  })),
];

const iconsByValue = new Map<string, SvgIconCatalogEntry>(
  SVG_ICON_CATALOG.map((entry) => [entry.value, entry]),
);

export function getSvgIcon(value: string): SvgIconCatalogEntry | undefined {
  return iconsByValue.get(value);
}

export function isMedicationSvgIcon(
  value: string,
): value is SvgMedicationIconName {
  return iconsByValue.has(value);
}

const searchable = SVG_ICON_CATALOG.map((entry) => {
  const identities = [
    entry.value,
    entry.value.slice(4),
    entry.label,
    entry.componentName,
    ...entry.aliases,
  ];
  return {
    entry,
    names: identities.flatMap((identity) => {
      const name = normalizeIconQuery(identity);
      return [name, name.replaceAll(" ", "")];
    }),
    text: iconSearchText(identities, entry.keywords),
  };
});

/** Search the checked-in collection without an external request or upload. */
export function searchSvgIcons(
  query: string,
  limit = 96,
): SvgIconCatalogEntry[] {
  const normalized = normalizeIconQuery(query);
  if (!normalized || limit <= 0 || Number.isNaN(limit)) return [];
  const terms = normalized.split(/\s+/);
  return searchable
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .sort((left, right) => {
      const score = (names: string[]) =>
        names.includes(normalized)
          ? 0
          : names.some((name) => name.startsWith(normalized))
            ? 1
            : 2;
      return score(left.names) - score(right.names);
    })
    .slice(0, Number.isFinite(limit) ? Math.floor(limit) : searchable.length)
    .map(({ entry }) => entry);
}
