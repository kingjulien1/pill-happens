import type { IconNode } from "lucide-react";

/**
 * Centered dispenser silhouettes in Lucide's 24px viewport. The first node is
 * one closed outer body, including the pump; subsequent nodes are cutout detail.
 * Packaging text and photographic reflections are deliberately omitted.
 */
export const DISPENSER_SHAPES = {
  tramal: {
    componentName: "Tramal",
    aliases: ["tramal", "metered-pump-bottle", "dosierpumpen-flasche"],
    nodes: [
      [
        "path",
        {
          d: "M9.5 2H13a1 1 0 0 1 1 1v.5h2.5a1 1 0 0 1 1 1V6H16v-.5h-2V7h-.75V9H14v2c0 1.5 3.5 1.5 3.5 5v4a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-4c0-3.5 3.5-3.5 3.5-5V9h.75V7H9.5Z",
          key: "body",
        },
      ],
      [
        "path",
        { d: "M9.5 7H14M10 9h4M10 11h4", strokeWidth: "1", key: "collar" },
      ],
      [
        "rect",
        {
          x: "8.75",
          y: "15.5",
          width: "6.5",
          height: "4",
          rx: "0.75",
          strokeWidth: "1",
          key: "label",
        },
      ],
    ],
  },
  testavan: {
    componentName: "Testavan",
    aliases: ["testavan", "gel-pump-dispenser", "gel-spender"],
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
  { componentName: string; aliases: readonly string[]; nodes: IconNode }
>;
