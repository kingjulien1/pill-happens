"use client";

import {
  createElement,
  lazy,
  Suspense,
  useId,
  type CSSProperties,
} from "react";
import {
  CircleDot,
  CircleDashed,
  Cloud,
  Coffee,
  Droplet,
  FlaskConical,
  Flower2,
  Gem,
  Heart,
  Leaf,
  Moon,
  MoonStar,
  NotebookText,
  Package,
  Pill,
  PillBottle,
  ShieldCheck,
  Smile,
  SoapDispenserDroplet,
  Sparkles,
  Star,
  Sun,
  Syringe,
  Tablets,
  Zap,
  createLucideIcon,
  type LucideIcon,
  type IconNode,
} from "lucide-react";
import type { Medication } from "@/lib/domain";
import {
  getMedicationColor,
  isMedicationIcon,
  isMedicationLucideIcon,
  type MedicationIconName,
} from "@/lib/medication-appearance";
import { getSvgIcon, type SvgMedicationIconName } from "@/lib/svg-icon-catalog";
import type { TABLET_ARTWORK } from "@/lib/tablet-icons/artwork";
import {
  TABLET_SHAPES,
  type TabletShapeName,
} from "@/lib/tablet-icons/geometry";
import {
  TABLET_OUTLINE_COMPONENTS,
  Tramal,
  Testavan,
} from "@/components/tablet-icons";
import { cn } from "@/lib/utils";
import { getMedicationClassification } from "@/lib/medication-classification";
import { COFFEE_POT_NODES } from "@/lib/coffee-pot-icon";

const glyphs = {
  pill: Pill,
  tablets: Tablets,
  capsule: PillBottle,
  droplet: Droplet,
  syringe: Syringe,
  "flask-conical": FlaskConical,
  heart: Heart,
  sparkles: Sparkles,
  sun: Sun,
  moon: Moon,
  "moon-star": MoonStar,
  "notebook-text": NotebookText,
  "flower-2": Flower2,
  leaf: Leaf,
  star: Star,
  cloud: Cloud,
  coffee: Coffee,
  smile: Smile,
  "shield-check": ShieldCheck,
  zap: Zap,
  "circle-dot": CircleDot,
  gem: Gem,
} satisfies Partial<Record<MedicationIconName, LucideIcon>>;

type OriginalSvgIconName = Exclude<
  SvgMedicationIconName,
  (typeof TABLET_ARTWORK)[number]["value"]
>;

/** Exact local asset geometry, rendered directly rather than through CSS masks. */
const ORIGINAL_SVG_NODES = {
  "svg:coffee-pot": COFFEE_POT_NODES,
  "svg:tablet-single": [
    ["circle", { cx: "12", cy: "12", r: "10", key: "outline" }],
    ["path", { d: "m4.92 19.08 14.16-14.16", key: "score" }],
  ],
  "svg:tablet-angled": [
    [
      "path",
      {
        d: "M16.33 3.92a8.8 4.9-50 1 0-11.66 13.16 8.8 4.9-50 1 0 11.66-13.16Z",
        key: "face",
      },
    ],
    [
      "path",
      {
        d: "m16.33 3.92 3 3a8.8 4.9-50 0 1-11.66 13.16l-3-3",
        key: "depth",
      },
    ],
    ["path", { d: "m12.57 3.27-4.14 14.46", key: "score" }],
  ],
  "svg:nose": [
    [
      "path",
      {
        d: "M13 3.2c-.4 5.1 1.9 8.3 4.3 12 1.1 1.7 2.4 3.3 1.8 4.4-.6 1.1-2.1 1.5-3.6 1.7",
      },
    ],
    ["path", { d: "M9 14.8c-2.4-.9-4.3.7-4.9 2.5-.6 1.6.1 2.9 1.7 3.9" }],
    ["path", { d: "M8.5 20.7c1.3-.9 2.9-.9 4.3 0" }],
  ],
  "svg:butterfly": [
    [
      "path",
      {
        d: "M12 9c-3-6-9-7-9-1 0 3 3 5 6 5-6 0-6 7-2 7 3 0 5-5 5-8m0-3c3-6 9-7 9-1 0 3-3 5-6 5 6 0 6 7 2 7-3 0-5-5-5-8M12 9l-2-5m2 5 2-5",
      },
    ],
  ],
  "svg:calm-wave": [
    [
      "path",
      {
        d: "M3 11c3-5 6 5 9 0s6 5 9 0M3 17c3-5 6 5 9 0s6 5 9 0",
      },
    ],
    [
      "path",
      {
        d: "M12 3v3M10.5 4.5h3",
      },
    ],
  ],
  "svg:cloud-hug": [
    [
      "path",
      {
        d: "M6 17a4.5 4.5 0 0 1-.5-9A6.5 6.5 0 0 1 18 7a5 5 0 0 1 0 10",
      },
    ],
    [
      "path",
      {
        d: "M8 15c0 2.5 1.5 4 4 5 2.5-1 4-2.5 4-5M8 15l3 1m5-1-3 1",
      },
    ],
  ],
  "svg:cozy-cup": [
    [
      "path",
      {
        d: "M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h1a3 3 0 0 1 0 6h-1M7 3v2m5-2v2",
      },
    ],
    [
      "path",
      {
        d: "M8 12.5c1.5 1.5 3.5 1.5 5 0",
      },
    ],
  ],
  "svg:heart-leaf": [
    [
      "path",
      {
        d: "M12 20 4.5 12.5a5 5 0 0 1 7.5-6.6 5 5 0 0 1 7.5 6.6Z",
      },
    ],
    [
      "path",
      {
        d: "M12 15c-1.5-3 0-6 4-6 0 4-1 6-4 6Zm0 0-1.5 2",
      },
    ],
  ],
  "svg:little-sprout": [
    [
      "path",
      {
        d: "M12 20v-8M12 15C6 15 3 12 3 7c6 0 9 3 9 8Zm0-3c0-5 3-8 9-8 0 5-3 8-9 8ZM7 21h10",
      },
    ],
  ],
  "svg:lucky-star": [
    [
      "path",
      {
        d: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z",
      },
    ],
    [
      "path",
      {
        d: "M10 12.5c1 1.2 3 1.2 4 0",
      },
    ],
  ],
  "svg:mountain-path": [
    [
      "path",
      {
        d: "m2.5 20 7-13 5 8 3-5 4 10M6.5 20h5M9.5 7l2-4M9.5 7l4 1",
      },
    ],
    [
      "path",
      {
        d: "M16 20c-4-2 3-3 0-5",
      },
    ],
  ],
  "svg:music-note": [
    [
      "path",
      {
        d: "M9 17V6l11-3v11M9 10l11-3",
      },
    ],
    [
      "ellipse",
      {
        cx: "6",
        cy: "18",
        rx: "3",
        ry: "2.5",
      },
    ],
    [
      "ellipse",
      {
        cx: "17",
        cy: "15",
        rx: "3",
        ry: "2.5",
      },
    ],
  ],
  "svg:orbit-tablets": [
    [
      "circle",
      {
        cx: "7.25",
        cy: "8",
        r: "4",
      },
    ],
    [
      "path",
      {
        d: "m4.5 10.75 5.5-5.5",
      },
    ],
    [
      "circle",
      {
        cx: "16.75",
        cy: "16",
        r: "4",
      },
    ],
    [
      "path",
      {
        d: "M13 16h7.5M15 4c3 .5 5 2.3 5.5 5M9 20c-3-.5-5-2.3-5.5-5",
      },
    ],
  ],
  "svg:pill-spark": [
    [
      "path",
      {
        d: "m5 10 4-4a4.25 4.25 0 0 1 6 6l-4 4a4.25 4.25 0 0 1-6-6Z",
      },
    ],
    [
      "path",
      {
        d: "m7 8 6 6M18 3v4m-2-2h4m-2 11v4m-2-2h4",
      },
    ],
  ],
  "svg:sunny-side": [
    [
      "circle",
      {
        cx: "12",
        cy: "12",
        r: "6",
      },
    ],
    [
      "path",
      {
        d: "M12 2v1m0 18v1M2 12h1m18 0h1M5 5l.7.7m12.6 12.6.7.7M19 5l-.7.7M5.7 18.3 5 19M9.5 13.5c1.5 1.5 3.5 1.5 5 0",
      },
    ],
    [
      "circle",
      {
        cx: "10",
        cy: "10",
        r: ".65",
        fill: "currentColor",
        stroke: "none",
      },
    ],
    [
      "circle",
      {
        cx: "14",
        cy: "10",
        r: ".65",
        fill: "currentColor",
        stroke: "none",
      },
    ],
  ],
} satisfies Record<OriginalSvgIconName, IconNode>;

function OriginalSvgGlyph({
  value,
  className,
}: {
  value: OriginalSvgIconName;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={
        value === "svg:coffee-pot" ||
        value === "svg:nose" ||
        value === "svg:tablet-single" ||
        value === "svg:tablet-angled"
          ? 2
          : 2.5
      }
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-medication-glyph={value}
      data-medication-svg={value}
      className={cn("size-6 shrink-0", className)}
    >
      {ORIGINAL_SVG_NODES[value].map(([tag, attributes], index) =>
        createElement(tag, { ...attributes, key: `${value}-${index}` }),
      )}
    </svg>
  );
}

const DynamicMedicationGlyph = lazy(() => import("./dynamic-medication-glyph"));

/** Inline vectors preserve cutouts; the entrance primes Safari's mask resolution. */
function ColoredTabletGlyph({
  value,
  shape,
  color,
  className,
}: {
  value: string;
  shape: TabletShapeName;
  color: string;
  className?: string;
}) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const maskId = `medication-${shape}-${instance}`;
  const [body, ...details] = TABLET_SHAPES[shape].nodes;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-medication-glyph={value}
      data-medication-svg={value}
      data-tablet-variant="color"
      className={cn("size-6 shrink-0", className)}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="24"
          height="24"
          style={{ maskType: "luminance" }}
        >
          {createElement(body[0], {
            ...body[1],
            fill: "white",
            stroke: "white",
          })}
          {details.map(([tag, attributes]) =>
            createElement(tag, {
              ...attributes,
              fill: "none",
              stroke: "black",
            }),
          )}
        </mask>
      </defs>
      <rect width="24" height="24" fill={color} mask={`url(#${maskId})`} />
    </svg>
  );
}

/** Names and emoji are validated; custom SVGs use only local allowlisted geometry. */
export function MedicationGlyph({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  const value =
    typeof icon === "string" && isMedicationIcon(icon) ? icon : "pill";
  const svgIcon = getSvgIcon(value);
  if (svgIcon) {
    if (svgIcon.variant === "outline" && svgIcon.shape) {
      const Tablet = TABLET_OUTLINE_COMPONENTS[svgIcon.shape];
      return (
        <Tablet
          aria-hidden="true"
          focusable="false"
          strokeWidth={2.75}
          className={cn("size-6 shrink-0", className)}
          data-medication-glyph={value}
          data-medication-svg={value}
          data-tablet-variant="outline"
        />
      );
    }
    if (svgIcon.variant === "color" && svgIcon.shape && svgIcon.color) {
      return (
        <ColoredTabletGlyph
          value={value}
          shape={svgIcon.shape}
          color={svgIcon.color.hex}
          className={className}
        />
      );
    }
    return (
      <OriginalSvgGlyph
        value={svgIcon.value as OriginalSvgIconName}
        className={className}
      />
    );
  }
  const Glyph = glyphs[value as keyof typeof glyphs];

  if (Glyph) {
    return (
      <Glyph
        aria-hidden="true"
        focusable="false"
        strokeWidth={2.75}
        className={cn("size-6 shrink-0", className)}
        data-medication-glyph={value}
      />
    );
  }

  if (isMedicationLucideIcon(value) && value !== "capsule") {
    return (
      <span
        aria-hidden="true"
        data-medication-glyph={value}
        className={cn("inline-flex size-6 shrink-0", className)}
      >
        <Suspense
          fallback={
            <CircleDashed
              aria-hidden="true"
              focusable="false"
              strokeWidth={2.75}
              className="size-full opacity-40"
              data-glyph-loading
            />
          }
        >
          <DynamicMedicationGlyph name={value} />
        </Suspense>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      data-medication-glyph="emoji"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center leading-none",
        className,
      )}
      style={{ containerType: "size" }}
    >
      <span style={{ fontSize: "85cqi", lineHeight: 1 }}>{value}</span>
    </span>
  );
}

// A single scored tablet in perspective, using the shared native SVG artwork.
const AngledTablet = createLucideIcon(
  "tablet-angled",
  ORIGINAL_SVG_NODES["svg:tablet-angled"],
);

const typeGlyphs = {
  tablet: AngledTablet,
  capsule: Pill,
  drops: Droplet,
  pump: SoapDispenserDroplet,
  "pump-bottle": Tramal,
  "gel-dispenser": Testavan,
  other: Package,
} satisfies Record<Medication["form"], LucideIcon>;

export function MedicationTypeIcon({
  type,
  className,
  strokeWidth = 2.75,
}: {
  type: Medication["form"];
  className?: string;
  strokeWidth?: number;
}) {
  const Glyph = typeGlyphs[type] ?? Package;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      strokeWidth={strokeWidth}
      className={cn("size-5 shrink-0", className)}
      data-medication-type={type}
    />
  );
}

/** A restrained tint keeps every medication color legible in either OS theme. */
export function MedicationIcon({
  color,
  icon,
  rotation = 0,
  small = false,
  isBenzodiazepine = false,
  isOpioid = false,
  className,
}: {
  color?: string;
  icon?: string;
  rotation?: number;
  small?: boolean;
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
  className?: string;
}) {
  const appearance = getMedicationColor(color);
  const style = {
    "--medication-color": appearance.hex,
    "--medication-rotation": `${rotation}deg`,
    color:
      "color-mix(in srgb, var(--medication-color) var(--medication-symbol-mix), var(--foreground))",
    backgroundColor:
      "color-mix(in srgb, var(--medication-color) 12%, transparent)",
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      data-medication-mark
      data-medication-color={appearance.value}
      data-benzodiazepine={isBenzodiazepine || undefined}
      data-opioid={isOpioid || undefined}
      data-medication-classification={getMedicationClassification({
        isBenzodiazepine,
        isOpioid,
      })}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl",
        small ? "size-10" : "size-12",
        className,
      )}
      style={style}
    >
      <MedicationGlyph icon={icon} className={small ? "size-5" : "size-6"} />
    </span>
  );
}
