import { MEDICATION_COLORS } from "@/lib/medication-appearance";

export type GuideColor = {
  label: string;
  hex: string;
  usage: string;
};

/** Reference values from globals.css and JournalBackground; not theme controls. */
export const GUIDE_THEME_GROUPS = [
  {
    id: "ember",
    title: "The Ember Palette",
    description:
      "The five original colors behind the dark background and branding.",
    colors: [
      {
        label: "Ink",
        hex: "#120f17",
        usage: "Deep background and dark overlays",
      },
      { label: "Cocoa", hex: "#2a0f0a", usage: "Warm depth in the gradient" },
      { label: "Clay", hex: "#9a3412", usage: "Deep orange accents" },
      {
        label: "Ember",
        hex: "#f97316",
        usage: "Brand glow and warm highlights",
      },
      {
        label: "Sand",
        hex: "#fed7aa",
        usage: "Dark-mode text and main button",
      },
    ],
  },
  {
    id: "light-background",
    title: "The Light Background",
    description:
      "Porcelain, coral and terracotta keep the same warm direction in daylight.",
    colors: [
      { label: "Porcelain", hex: "#f6f2f4", usage: "Page background" },
      { label: "Blush", hex: "#edc0b8", usage: "Soft gradient fold" },
      { label: "Terracotta", hex: "#e69b89", usage: "Deeper gradient fold" },
      { label: "Apricot", hex: "#f6b49c", usage: "Warm gradient highlight" },
      {
        label: "Chalk",
        hex: "#fffdfd",
        usage: "Bright background and popovers",
      },
    ],
  },
  {
    id: "light-interface",
    title: "Light Interface Colors",
    description: "Text, surfaces, controls and edges from the light theme.",
    colors: [
      {
        label: "Primary Ink",
        hex: "#120f17",
        usage: "Primary and accent base",
      },
      {
        label: "Text & Button",
        hex: "#211b1b",
        usage: "Foreground and action fill",
      },
      { label: "Card", hex: "#fffdfdf2", usage: "Chalk at about 95% opacity" },
      {
        label: "Secondary Surface",
        hex: "#ece6e9",
        usage: "Secondary controls",
      },
      {
        label: "Muted Surface",
        hex: "#f0ebee",
        usage: "Quiet supporting areas",
      },
      {
        label: "Secondary Text",
        hex: "#51414a",
        usage: "Hints and descriptions",
      },
      { label: "Border", hex: "#d8cbd2", usage: "Panel edges" },
      { label: "Input", hex: "#9b838e", usage: "Input edges" },
      {
        label: "Accent Wash",
        hex: "#120f1712",
        usage: "Ink at about 7% opacity",
      },
      {
        label: "Focus & Destructive",
        hex: "#9a3412",
        usage: "Focus rings and destructive controls",
      },
    ],
  },
  {
    id: "dark-interface",
    title: "Dark Interface Colors",
    description:
      "Peach foregrounds and dark neutral surfaces for the evening theme.",
    colors: [
      {
        label: "Text & Button",
        hex: "#fed7aa",
        usage: "Foreground and action fill",
      },
      {
        label: "Primary & Focus",
        hex: "#fff1d6",
        usage: "Bright primary and focus rings",
      },
      {
        label: "Card",
        hex: "#1b171aed",
        usage: "Warm charcoal at about 93% opacity",
      },
      { label: "Popover", hex: "#211b1b", usage: "Menus and popovers" },
      {
        label: "Secondary Surface",
        hex: "#302522",
        usage: "Secondary controls",
      },
      {
        label: "Muted Surface",
        hex: "#2b2222",
        usage: "Quiet supporting areas",
      },
      {
        label: "Secondary Text",
        hex: "#fed7aa99",
        usage: "Sand at exactly 60% opacity",
      },
      { label: "Border", hex: "#50423a", usage: "Panel edges" },
      { label: "Input", hex: "#776255", usage: "Input edges" },
      {
        label: "Accent Wash",
        hex: "#fff1d61a",
        usage: "Bright peach at about 10% opacity",
      },
      {
        label: "Destructive",
        hex: "#ffbd8a",
        usage: "Destructive control text",
      },
    ],
  },
  {
    id: "brand-effects",
    title: "Brand & Button Details",
    description:
      "The extra warm tones used by the branding face and specular button edge.",
    colors: [
      {
        label: "Dark Brand Edge",
        hex: "#fff0db",
        usage: "Fine bright branding outline in dark mode",
      },
      {
        label: "Light Brand Edge",
        hex: "#ffd9cd",
        usage: "Coral branding outline in light mode",
      },
      {
        label: "Light Brand Face",
        hex: "#211b20eb",
        usage: "Smoky face at about 92% opacity",
      },
      {
        label: "Dark Brand Face",
        hex: "#120f17eb",
        usage: "Ink face at about 92% opacity",
      },
      {
        label: "Light Brand Fold",
        hex: "#7d352c",
        usage: "Middle of the light brand gradient",
      },
      {
        label: "Dark Brand Fold",
        hex: "#6b2b17",
        usage: "Middle of the dark brand gradient",
      },
      {
        label: "Copper Rim",
        hex: "#c2410c",
        usage: "Moving dark-mode button highlight",
      },
      {
        label: "Light Halo",
        hex: "#e57f6940",
        usage: "Coral branding glow at about 25%",
      },
      {
        label: "Light Outer Glow",
        hex: "#ed9f8f26",
        usage: "Soft coral halo at about 15%",
      },
      {
        label: "Dark Halo",
        hex: "#f9731633",
        usage: "Ember branding glow at 20%",
      },
      {
        label: "Dark Outer Glow",
        hex: "#ffbd8526",
        usage: "Soft apricot halo at about 15%",
      },
    ],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  description: string;
  colors: readonly GuideColor[];
}[];

export const GUIDE_MEDICATION_COLORS = MEDICATION_COLORS.map((color) => ({
  ...color,
  family: !color.value.startsWith("tw-")
    ? "Original"
    : color.value === "tw-black" || color.value === "tw-white"
      ? "Black & White"
      : color.label.replace(/ \d+$/, ""),
}));

export const GUIDE_COLOR_FAMILIES = [
  ...new Set(GUIDE_MEDICATION_COLORS.map((color) => color.family)),
];

export const GUIDE_THEME_COPY = GUIDE_THEME_GROUPS.map(
  (group) =>
    `${group.title}\n${group.colors.map((color) => `${color.label}: ${color.hex}`).join("\n")}`,
).join("\n\n");
