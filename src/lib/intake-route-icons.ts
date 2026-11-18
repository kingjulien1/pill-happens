import type { IconNode } from "lucide-react";

/**
 * Lucide-compatible mouth and tongue geometry for a swallowed intake.
 * The upper crossbar is deliberately separate: it reads as the teeth line
 * from the supplied reference without relying on fill colors.
 */
export const SWALLOW_INTAKE_NODES: IconNode = [
  [
    "path",
    {
      d: "M5 11V8.75a7 7 0 0 1 14 0v6.75",
      key: "mouth-arch",
    },
  ],
  ["path", { d: "M5.15 9.25h13.7", key: "teeth-line" }],
  [
    "path",
    {
      d: "M5 11v3.5a7 7 0 0 0 14 0V13c-2.6-1.7-5.7-1.15-7.15 1.45-.55.95-.85 1.75-1 2.55",
      key: "tongue-and-jaw",
    },
  ],
];
