/** CSS viewport conventions used by the two guide layouts; px assumes 16px initial text. */
export const GUIDE_SIDEBAR_QUERY = "(min-width: 64rem)";
export const GUIDE_SIDEBAR_MIN_PX = 1024;
export const GUIDE_WIDTH_STEPS = [
  320, 384, 448, 512, 576, 640, 672, 768, 896, 1024, 1152, 1280, 1440, 1536,
  1664, 1792, 1920, 2080, 2240, 2400, 2560,
] as const;

export const GUIDE_LAYOUT_BANDS = [
  {
    name: "Base",
    token: "Unprefixed",
    min: 0,
    cap: 512,
    gutter: 16,
    gap: 24,
    sidebar: false,
    intent: "One readable column; inline contents and full-width controls.",
  },
  {
    name: "Small",
    token: "sm",
    min: 640,
    cap: 576,
    gutter: 24,
    gap: 24,
    sidebar: false,
    intent: "More breathing room, with the same focused reading order.",
  },
  {
    name: "Medium",
    token: "md",
    min: 768,
    cap: 672,
    gutter: 32,
    gap: 32,
    sidebar: false,
    intent: "Paired steps and comparisons where their own content fits.",
  },
  {
    name: "Large",
    token: "lg",
    min: 1024,
    cap: 896,
    gutter: 32,
    gap: 32,
    sidebar: true,
    intent: "A wider reading canvas with a persistent contents rail.",
  },
  {
    name: "Extra Large",
    token: "xl",
    min: 1280,
    cap: 1152,
    gutter: 40,
    gap: 48,
    sidebar: true,
    intent:
      "Reading column and generous contents rail, approximately three to one.",
  },
  {
    name: "Extra Extra Large",
    token: "2xl",
    min: 1536,
    cap: 1440,
    gutter: 48,
    gap: 64,
    sidebar: true,
    intent: "Larger rail and more spacious side-by-side references.",
  },
  {
    name: "Wide",
    token: "Project extension",
    min: 1920,
    cap: 1792,
    gutter: 64,
    gap: 80,
    sidebar: true,
    intent:
      "A broad reference layout while prose keeps a readable line length.",
  },
  {
    name: "Ultra Wide",
    token: "Project extension",
    min: 2560,
    cap: 2400,
    gutter: 80,
    gap: 96,
    sidebar: true,
    intent: "Extra room for reference grids rather than stretched paragraphs.",
  },
] as const;

export const GUIDE_RESPONSIVE_SOURCES = {
  tailwind: "https://tailwindcss.com/docs/responsive-design",
  maxWidth: "https://tailwindcss.com/docs/max-width",
  bootstrap: "https://getbootstrap.com/docs/5.3/layout/breakpoints/",
  mdn: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design",
  reflow: "https://www.w3.org/WAI/WCAG22/Understanding/reflow.html",
} as const;
