import {
  createLucideIcon,
  type IconNode,
  type LucideProps,
} from "lucide-react";
import type { MedicationType } from "@/lib/medication-types";
import { TABLET_COLORS } from "@/lib/tablet-icons/artwork";
import { DISPENSER_SHAPES } from "@/lib/tablet-icons/dispenser-geometry";

/** The full-opacity pigment of the catalog's colored Levomethasan artwork. */
export const MEDICATION_FORM_FILL = TABLET_COLORS.zinc.hex;
const filled = { fill: MEDICATION_FORM_FILL };

/** Original outlines stay separate from closed fill silhouettes. */
const formNodes = {
  tablet: [
    [
      "path",
      {
        d: "m16.33 3.92 3 3a8.8 4.9-50 0 1-11.66 13.16l-3-3Z",
        ...filled,
        stroke: "none",
        key: "depth-fill",
      },
    ],
    [
      "path",
      {
        d: "M16.33 3.92a8.8 4.9-50 1 0-11.66 13.16 8.8 4.9-50 1 0 11.66-13.16Z",
        ...filled,
        key: "face",
      },
    ],
    [
      "path",
      { d: "m16.33 3.92 3 3a8.8 4.9-50 0 1-11.66 13.16l-3-3", key: "depth" },
    ],
    ["path", { d: "m12.57 3.27-4.14 14.46", key: "score" }],
  ],
  capsule: [
    [
      "path",
      {
        d: "m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z",
        ...filled,
        key: "body",
      },
    ],
    ["path", { d: "m8.5 8.5 7 7", key: "score" }],
  ],
  drops: [
    [
      "path",
      {
        d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
        ...filled,
        key: "body",
      },
    ],
  ],
  pump: [
    [
      "path",
      {
        d: "M6 10h7v11H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z",
        ...filled,
        stroke: "none",
        key: "bottle-fill",
      },
    ],
    [
      "path",
      {
        d: "M8 10V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3Z",
        ...filled,
        stroke: "none",
        key: "neck-fill",
      },
    ],
    ["path", { d: "M10.5 2v4", key: "stem" }],
    ["path", { d: "M14 2H7a2 2 0 0 0-2 2", key: "pump" }],
    [
      "path",
      {
        d: "M9.607 21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h7V7a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3",
        key: "bottle",
      },
    ],
    [
      "path",
      {
        d: "M19.29 14.76A6.67 6.67 0 0 1 17 11a6.6 6.6 0 0 1-2.29 3.76c-1.15.92-1.71 2.04-1.71 3.19 0 2.22 1.8 4.05 4 4.05s4-1.83 4-4.05c0-1.16-.57-2.26-1.71-3.19Z",
        ...filled,
        key: "drop",
      },
    ],
  ],
  "pump-bottle": DISPENSER_SHAPES.tramal.nodes.map(
    ([tag, attributes], index) => [
      tag,
      { ...attributes, ...(index === 0 ? filled : {}) },
    ],
  ),
  "gel-dispenser": DISPENSER_SHAPES.testavan.nodes.map(
    ([tag, attributes], index) => [
      tag,
      { ...attributes, ...(index === 0 ? filled : {}) },
    ],
  ),
  other: [
    [
      "path",
      {
        d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
        ...filled,
        key: "body",
      },
    ],
    ["path", { d: "M12 22V12", key: "fold" }],
    ["polyline", { points: "3.29 7 12 12 20.71 7", key: "edges" }],
    ["path", { d: "m7.5 4.27 9 5.15", key: "tape" }],
  ],
} satisfies Record<MedicationType, IconNode>;

const glyphs = Object.fromEntries(
  Object.entries(formNodes).map(([form, nodes]) => [
    form,
    createLucideIcon(`medication-form-${form}`, nodes),
  ]),
) as Record<MedicationType, ReturnType<typeof createLucideIcon>>;

/** One native vector serves both the artwork overlay and its inline copy. */
export function MedicationFormGlyph({
  form = "other",
  size = 20,
  strokeWidth = 2.5,
  ...props
}: LucideProps & { form?: MedicationType }) {
  const normalized = Object.hasOwn(glyphs, form) ? form : "other";
  const Glyph = glyphs[normalized];
  return (
    <Glyph
      {...props}
      size={size}
      strokeWidth={strokeWidth}
      stroke="#000000"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-medication-form-glyph={normalized}
      data-medication-form-fill={MEDICATION_FORM_FILL}
    />
  );
}
