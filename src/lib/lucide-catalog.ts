import {
  LUCIDE_ICON_ALIASES,
  LUCIDE_ICON_NAMES,
  type LucideMedicationIconName,
} from "./lucide-icon-names";

export type LucideCatalogEntry = {
  value: LucideMedicationIconName;
  label: string;
  keywords: string[];
};

const iconNames = new Set<string>(LUCIDE_ICON_NAMES);

/** Local English/German discovery terms; the original icon names remain stable. */
const topicKeywords: readonly [RegExp, readonly string[]][] = [
  [
    /pill|tablet|syringe|stethoscope|hospital|ambulance|cross|bandage|thermometer|flask|test-tube|microscope|dna|heart-pulse/,
    [
      "medicine",
      "medication",
      "health",
      "medical",
      "medikament",
      "medizin",
      "gesundheit",
      "arznei",
    ],
  ],
  [/pill|tablet/, ["capsule", "tablet", "kapsel", "tablette", "pille"]],
  [
    /droplet|droplets|pipette/,
    ["drops", "water", "liquid", "tropfen", "wasser", "flussig"],
  ],
  [/heart/, ["love", "care", "liebe", "herz", "fursorge"]],
  [
    /bird|cat|dog|fish|rabbit|rat|squirrel|turtle|snail|bug|worm|paw|shell|shrimp|beef|bone/,
    [
      "animal",
      "animals",
      "pet",
      "nature",
      "tier",
      "tiere",
      "haustier",
      "natur",
    ],
  ],
  [/bird/, ["vogel", "vogelwelt"]],
  [/cat/, ["katze", "katzen"]],
  [/dog|paw/, ["hund", "hunde", "pfote"]],
  [/fish|shell|shrimp/, ["fisch", "meer", "ocean", "sea"]],
  [
    /leaf|flower|sprout|tree|clover|wheat|vegan|cannabis|shrub|palm|cherry/,
    [
      "plant",
      "plants",
      "nature",
      "garden",
      "pflanze",
      "pflanzen",
      "natur",
      "garten",
      "green",
      "grun",
    ],
  ],
  [/flower/, ["blume", "blumen", "blute", "bloom"]],
  [/leaf/, ["blatt", "blatter", "leaves"]],
  [/tree|palm|shrub/, ["baum", "baume", "wald", "forest"]],
  [
    /sun|moon|cloud|rain|snow|wind|rainbow|eclipse|tornado|haze|sunrise|sunset|umbrella/,
    ["weather", "sky", "wetter", "himmel"],
  ],
  [/sun|sunrise|sunset/, ["sonne", "sunshine", "morning", "morgen"]],
  [/moon|bed|sleep/, ["mond", "night", "sleep", "nacht", "schlaf"]],
  [/cloud/, ["wolke", "wolken"]],
  [
    /star|sparkle|sparkles|wand|party|confetti/,
    [
      "magic",
      "celebrate",
      "fun",
      "stern",
      "sterne",
      "funkeln",
      "feiern",
      "magie",
    ],
  ],
  [
    /user|person|people|contact|baby|accessibility|hand|finger|thumb|footprints|ear|eye|brain|bone|smile|laugh|angry|frown|meh|annoyed|heart|venus|mars|transgender/,
    [
      "people",
      "person",
      "body",
      "human",
      "menschen",
      "mensch",
      "korper",
      "korperteile",
    ],
  ],
  [
    /hand|finger|thumb/,
    ["hands", "hande", "hand", "finger", "gesture", "geste"],
  ],
  [/footprints/, ["feet", "foot", "fuss", "fusse", "walking", "gehen"]],
  [
    /smile|laugh|frown|angry|meh|annoyed|face/,
    ["face", "mood", "emotion", "gesicht", "stimmung", "gefuhl"],
  ],
  [/smile|laugh/, ["happy", "joy", "glucklich", "freude", "lacheln"]],
  [
    /apple|banana|cherry|citrus|grape|carrot|salad|soup|pizza|sandwich|hamburger|croissant|cookie|cake|candy|ice-cream|lollipop|popcorn|egg|ham|beef|fish|nut|wheat|utensils|chef|cooking|drumstick/,
    ["food", "eat", "meal", "essen", "nahrung", "lebensmittel", "kuche"],
  ],
  [
    /coffee|cup|glass|wine|beer|martini|bottle|milk|juice/,
    ["drink", "beverage", "trinken", "getrank", "getranke"],
  ],
  [/coffee|cup-soda/, ["tea", "kaffee", "tee", "tasse"]],
  [/apple|banana|cherry|citrus|grape/, ["fruit", "obst", "frucht"]],
  [
    /bike|dumbbell|biceps|activity|sport|volleyball|football|goal|trophy|medal|award|swords|tent|mountain|footprints/,
    [
      "activity",
      "activities",
      "sport",
      "exercise",
      "fitness",
      "aktivitat",
      "aktivitaten",
      "bewegung",
    ],
  ],
  [
    /music|audio|headphone|earphone|guitar|drum|piano|mic|speaker|radio|disc/,
    ["music", "sound", "listen", "musik", "klang", "horen"],
  ],
  [
    /game|dice|puzzle|joystick|toy|balloon|party/,
    ["play", "game", "fun", "spielen", "spiel", "spass"],
  ],
  [
    /paint|palette|brush|pencil|pen|scissors|origami|drama/,
    ["art", "creative", "craft", "kunst", "kreativ", "basteln"],
  ],
  [
    /plane|train|tram|bus|car|taxi|truck|bike|bicycle|scooter|ship|sailboat|boat|rocket|helicopter|cable-car|fuel/,
    [
      "transport",
      "travel",
      "vehicle",
      "reise",
      "reisen",
      "verkehr",
      "fahrzeug",
    ],
  ],
  [/plane/, ["flight", "flug", "flugzeug"]],
  [/bike|bicycle/, ["fahrrad", "radfahren", "cycling"]],
  [/train|tram/, ["zug", "bahn", "eisenbahn"]],
  [
    /map|compass|navigation|globe|earth|luggage|suitcase|backpack|ticket|passport/,
    ["travel", "journey", "trip", "reise", "reisen", "urlaub", "holiday"],
  ],
  [
    /house|home|building|landmark|castle|church|school|store|hotel|hospital|warehouse|factory|tent|mountain|map-pin/,
    ["place", "places", "location", "ort", "orte", "gebaude"],
  ],
  [/home|house/, ["zuhause", "haus", "heim"]],
  [
    /book|library|notebook|graduation|school/,
    ["read", "learn", "study", "buch", "lesen", "lernen"],
  ],
  [
    /alarm|clock|watch|timer|calendar|hourglass/,
    ["time", "date", "reminder", "zeit", "datum", "erinnerung"],
  ],
  [
    /gift|gem|diamond|crown|ribbon|award|medal/,
    ["special", "reward", "treasure", "geschenk", "belohnung", "schatz"],
  ],
  [
    /lamp|lightbulb|flashlight|flame|candle|sun/,
    ["light", "bright", "licht", "hell"],
  ],
  [
    /phone|computer|laptop|monitor|tablet|keyboard|mouse|camera|tv|watch|headphone|battery|plug|cable/,
    ["technology", "device", "object", "technik", "gerat", "gegenstand"],
  ],
  [
    /key|lock|shield|vault/,
    ["safe", "protect", "security", "sicher", "schutz", "sicherheit"],
  ],
  [
    /circle|square|triangle|diamond|hexagon|octagon|pentagon|rectangle|shapes|infinity|asterisk|plus|minus|equal|percent|hash|at-sign|ampersand|check|x|ban/,
    ["symbol", "symbols", "abstract", "shape", "symbole", "abstrakt", "form"],
  ],
  [
    /check|badge-check|circle-check/,
    ["done", "complete", "yes", "fertig", "erledigt", "ja"],
  ],
];

const aliasesByName = new Map<string, string[]>();
for (const [alias, name] of Object.entries(LUCIDE_ICON_ALIASES)) {
  const aliases = aliasesByName.get(name) ?? [];
  aliases.push(alias.replaceAll("-", " "));
  aliasesByName.set(name, aliases);
}

function readableName(name: string): string {
  return name
    .replaceAll("-", " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export const LUCIDE_ICON_CATALOG: readonly LucideCatalogEntry[] =
  LUCIDE_ICON_NAMES.map((value) => ({
    value,
    label: readableName(value),
    keywords: [
      ...(aliasesByName.get(value) ?? []),
      ...topicKeywords.flatMap(([pattern, keywords]) =>
        pattern.test(value) ? keywords : [],
      ),
    ],
  }));

export function isLucideIconName(
  value: string,
): value is LucideMedicationIconName {
  return iconNames.has(value);
}

export function getLucideIconLabel(value: string): string | undefined {
  if (value === "capsule") return "Capsule";
  return isLucideIconName(value) ? readableName(value) : undefined;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const searchableIcons = LUCIDE_ICON_CATALOG.map((entry) => ({
  entry,
  name: normalizeSearch(entry.value),
  text: normalizeSearch(
    [entry.value, entry.label, ...entry.keywords].join(" "),
  ),
}));

/** Search stays on-device and returns one result per unique Lucide drawing. */
export function searchLucideIcons(
  query: string,
  limit = 96,
): LucideCatalogEntry[] {
  const normalized = normalizeSearch(query);
  if (!normalized || limit <= 0 || Number.isNaN(limit)) return [];
  const terms = normalized.split(/\s+/);
  return searchableIcons
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .sort((left, right) => {
      const score = (name: string) =>
        name === normalized ? 0 : name.startsWith(normalized) ? 1 : 2;
      return score(left.name) - score(right.name);
    })
    .slice(
      0,
      Number.isFinite(limit) ? Math.floor(limit) : searchableIcons.length,
    )
    .map(({ entry }) => entry);
}
