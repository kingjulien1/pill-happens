import type { IconNode } from "lucide-react";

/** Pure Lucide-compatible geometry; the first node is the tablet silhouette. */
export type TabletIconNode = IconNode;
type TabletShape = {
  componentName: string;
  aliases: readonly string[];
  nodes: TabletIconNode;
};

function round(radius: number): TabletIconNode {
  return [["circle", { cx: "12", cy: "12", r: String(radius), key: "body" }]];
}

function scored(radius: number): TabletIconNode {
  return [
    ...round(radius),
    ["path", { d: `M12 ${13 - radius}v${2 * radius - 2}`, key: "score" }],
  ];
}

/** Relative radii retain the size relationships in the supplied photo groups. */
export const TABLET_SHAPES = {
  "tablet-meridian": {
    componentName: "TabletMeridian",
    aliases: ["tablet-meridian", "tablet-bisect", "tablet-equator"],
    nodes: scored(9),
  },
  "tablet-pebble": {
    componentName: "TabletPebble",
    aliases: ["tablet-pebble", "tablet-petite", "tablet-dotlet"],
    nodes: round(6.5),
  },
  "tablet-halo": {
    componentName: "TabletHalo",
    aliases: ["tablet-halo", "tablet-plenum", "tablet-roundel"],
    nodes: round(10),
  },
  "tablet-dualmark": {
    componentName: "TabletDualmark",
    aliases: ["tablet-dualmark", "tablet-a-b"],
    nodes: [
      ...scored(9),
      [
        "path",
        {
          d: "m5.9 14.4 1.7-4.8 1.7 4.8M6.4 13h2.4",
          strokeWidth: "1",
          key: "letter-a",
        },
      ],
      [
        "path",
        {
          d: "M15 9.6v4.8h1.4a1.3 1.3 0 0 0 0-2.6H15m0-2.2h1.3a1.1 1.1 0 0 1 0 2.2",
          strokeWidth: "1",
          key: "letter-b",
        },
      ],
    ],
  },
  "tablet-splitlet": {
    componentName: "TabletSplitlet",
    aliases: ["tablet-splitlet"],
    nodes: scored(6.8),
  },
  "tablet-scorecrest": {
    componentName: "TabletScorecrest",
    aliases: ["tablet-scorecrest"],
    nodes: scored(8),
  },
  "tablet-minidot": {
    componentName: "TabletMinidot",
    aliases: ["tablet-minidot"],
    nodes: round(4.3),
  },
  "tablet-wideplain": {
    componentName: "TabletWideplain",
    aliases: ["tablet-wideplain"],
    nodes: round(9.3),
  },
  "tablet-wideplain-plus": {
    componentName: "TabletWideplainPlus",
    aliases: ["tablet-wideplain-plus"],
    nodes: round(10),
  },
  viagra: {
    componentName: "Viagra",
    aliases: ["viagra", "rounded-diamond-tablet"],
    nodes: [
      [
        "path",
        {
          d: "M12 5.5c1.9 0 8.7 4 9.5 5.3a2.6 2.6 0 0 1 0 2.4c-.8 1.3-7.6 5.3-9.5 5.3s-8.7-4-9.5-5.3a2.6 2.6 0 0 1 0-2.4C3.3 9.5 10.1 5.5 12 5.5Z",
          key: "body",
        },
      ],
      [
        "path",
        {
          d: "m5.8 10.6.8 2.8.8-2.8M8.3 10.6h.8m-.4 0v2.8m-.4 0h.8m.8 0 .8-2.8.8 2.8m-1.4-.8h1.2m2.7-1.6a1 1 0 0 0-1.6.8v1a1 1 0 0 0 1.7.7v-1h-.7m1.6 1.7v-2.8h.8a.7.7 0 0 1 0 1.4h-.8m.8 0 .9 1.4m.8 0 .8-2.8.8 2.8m-1.4-.8h1.2",
          strokeWidth: "0.65",
          key: "wordmark",
        },
      ],
    ],
  },
  euthyrox: {
    componentName: "Euthyrox",
    aliases: ["euthyrox", "tablet-em-fifty"],
    nodes: [
      ...round(9),
      ["path", { d: "M4 12h16", key: "score" }],
      [
        "path",
        {
          d: "M10.1 5.8H7.5v3.7h2.6M7.5 7.6h2.2m2.7 1.9V5.8l1.9 2.1 1.9-2.1v3.7",
          strokeWidth: "1",
          key: "letters-em",
        },
      ],
      [
        "path",
        {
          d: "M10.5 14.6H8v1.7h1.2a1.2 1.2 0 0 1 0 2.4H8m6.5-4.1c-1 0-1.4.7-1.4 2.1s.4 2 1.4 2 1.4-.6 1.4-2-.4-2.1-1.4-2.1Z",
          strokeWidth: "1",
          key: "imprint-fifty",
        },
      ],
    ],
  },
} satisfies Record<string, TabletShape>;

export type TabletShapeName = keyof typeof TABLET_SHAPES;
