import type { IconNode } from "lucide-react";
import { TESTAVAN_COLOR_NODES } from "./supplied-color-geometry";

/** The supplied tramal-bottle.svg, preserved as five flat painted vector layers. */
const tramalColorNodes: IconNode = [
  [
    "path",
    {
      fill: "#874817",
      d: "M9 8h6v2c0 .8.4 1.2 1.1 1.5 1.8.9 2.9 2.4 2.9 4.2V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4.3c0-1.8 1.1-3.3 2.9-4.2C8.6 11.2 9 10.8 9 10Z",
      key: "bottle",
    },
  ],
  [
    "rect",
    {
      x: "8",
      y: "7",
      width: "8",
      height: "2.5",
      rx: "1",
      fill: "#AAB3B9",
      key: "collar",
    },
  ],
  [
    "path",
    {
      fill: "#FFF8EB",
      d: "M9 7.4V4a2 2 0 0 1 2-2h2a2 2 0 0 1 1.8 1.1H18c.7 0 1.3.4 1.6 1l1 2a.8.8 0 0 1-1.4.7l-1-1.3H15v1.9Z",
      key: "pump",
    },
  ],
  [
    "rect",
    {
      x: "6.5",
      y: "14",
      width: "11",
      height: "6",
      rx: "1",
      fill: "#FFF8EB",
      key: "label",
    },
  ],
  [
    "path",
    {
      fill: "#16AD81",
      d: "M6.5 17h11v2a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1Z",
      key: "label-band",
    },
  ],
];

/**
 * Centered dispenser silhouettes in Lucide's 24px viewport. The first node is
 * one closed outer body, including the pump; subsequent nodes are cutout detail.
 * Packaging text and photographic reflections are deliberately omitted.
 */
export const DISPENSER_SHAPES = {
  tramal: {
    componentName: "Tramal",
    aliases: ["tramal", "metered-pump-bottle", "dosierpumpen-flasche"],
    colorNodes: tramalColorNodes,
    nodes: [
      [
        "path",
        {
          d: "M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 1.8 1.1H18c.7 0 1.3.4 1.6 1l1 2a.8.8 0 0 1-1.4.7l-1-1.3H15V7h.25a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-.75.75H15V10c0 .8.4 1.2 1.1 1.5 1.8.9 2.9 2.4 2.9 4.2V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4.3c0-1.8 1.1-3.3 2.9-4.2C8.6 11.2 9 10.8 9 10v-.5h-.25A.75.75 0 0 1 8 8.75v-1A.75.75 0 0 1 8.75 7Z",
          key: "body",
        },
      ],
      ["path", { d: "M9 7h6M9 9.5h6", strokeWidth: "1", key: "collar" }],
      [
        "rect",
        {
          x: "6.5",
          y: "14",
          width: "11",
          height: "6",
          rx: "1",
          strokeWidth: "1",
          key: "label",
        },
      ],
      ["path", { d: "M6.5 17h11", strokeWidth: "1", key: "label-band" }],
    ],
  },
  testavan: {
    componentName: "Testavan",
    aliases: ["testavan", "gel-pump-dispenser", "gel-spender"],
    colorNodes: TESTAVAN_COLOR_NODES,
    nodes: [
      [
        "path",
        {
          d: "M10.5 2h3a.5.5 0 0 1 .5.5V4h1v1h-1V7c1 0 1.5.75 1.5 1.5V20a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8.5c0-.75.5-1.5 1.5-1.5V2.5a.5.5 0 0 1 .5-.5Z",
          key: "body",
        },
      ],
      ["path", { d: "M10 7h4M8.5 9h7", strokeWidth: "1", key: "collar" }],
      [
        "rect",
        {
          x: "10.25",
          y: "12",
          width: "3.5",
          height: "7",
          rx: "0.75",
          strokeWidth: "1",
          key: "label",
        },
      ],
    ],
  },
} satisfies Record<
  string,
  {
    componentName: string;
    aliases: readonly string[];
    nodes: IconNode;
    colorNodes?: IconNode;
  }
>;
