"use client";

import { lazy, Suspense, type CSSProperties } from "react";
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
  type LucideIcon,
} from "lucide-react";
import type { Medication } from "@/lib/domain";
import {
  getMedicationColor,
  isMedicationIcon,
  isMedicationLucideIcon,
  type MedicationIconName,
} from "@/lib/medication-appearance";
import { getSvgIcon } from "@/lib/svg-icon-catalog";
import { TABLET_OUTLINE_COMPONENTS } from "@/components/tablet-icons";
import { cn } from "@/lib/utils";

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

const DynamicMedicationGlyph = lazy(() => import("./dynamic-medication-glyph"));

/** Names and emoji are validated; local SVG URLs come only from the catalog. */
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
    if (svgIcon.variant === "color") {
      return (
        <span
          aria-hidden="true"
          data-medication-glyph={value}
          data-medication-svg={value}
          data-tablet-variant="color"
          className={cn("inline-flex size-6 shrink-0", className)}
          style={{
            backgroundImage: `url("${svgIcon.src}")`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      );
    }
    return (
      <span
        aria-hidden="true"
        data-medication-glyph={value}
        data-medication-svg={value}
        className={cn("inline-flex size-6 shrink-0", className)}
        style={{
          backgroundColor: "currentColor",
          maskImage: `url("${svgIcon.src}")`,
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskImage: `url("${svgIcon.src}")`,
          WebkitMaskSize: "contain",
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
        }}
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

const typeGlyphs = {
  tablet: Tablets,
  capsule: Pill,
  drops: Droplet,
  pump: SoapDispenserDroplet,
  other: Package,
} satisfies Record<Medication["form"], LucideIcon>;

export function MedicationTypeIcon({
  type,
  className,
}: {
  type: Medication["form"];
  className?: string;
}) {
  const Glyph = typeGlyphs[type] ?? Package;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      strokeWidth={2.75}
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
  className,
}: {
  color?: string;
  icon?: string;
  rotation?: number;
  small?: boolean;
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
