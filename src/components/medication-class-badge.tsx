import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { ComponentProps } from "react";
import {
  getMedicationIndicatorKinds,
  MEDICATION_INDICATORS,
  type MedicationIndicatorKind,
} from "@/components/medication-indicator";
import { cn } from "@/lib/utils";
import type { MedicationCategoryMetadata } from "@/lib/medication-categories";

type ClassificationFlags = MedicationCategoryMetadata;

export type { MedicationClass } from "@/lib/medication-classification";

export const MEDICATION_CLASS_MARKERS = MEDICATION_INDICATORS;

/** Compatibility hook: explicit glyphs replace extra class outlines. */
export const medicationClassHighlights: (
  medication?: ClassificationFlags,
) => string = () => "";

export function MedicationClassBadge({
  kind,
  className,
}: {
  kind: MedicationIndicatorKind;
  className?: string;
}) {
  const marker = MEDICATION_CLASS_MARKERS[kind];
  return (
    <span
      className={cn("benzodiazepine-badge medication-class-badge", className)}
      data-medication-class={kind}
      role="img"
      aria-label={marker.accessibleLabel}
      title={marker.accessibleLabel}
    >
      <MedicationIndicatorMark kind={kind} size={16.5} aria-hidden="true" />
      <span aria-hidden="true">{marker.label}</span>
    </span>
  );
}

export function MedicationClassBadges({
  medication,
  className,
}: {
  medication?: ClassificationFlags;
  className?: string;
}) {
  const classes = getMedicationIndicatorKinds(medication);
  if (!classes.length) return null;
  return (
    <span
      className={cn(
        "medication-class-badges inline-flex flex-wrap items-center gap-1",
        className,
      )}
    >
      {classes.map((kind) => (
        <MedicationClassBadge key={kind} kind={kind} />
      ))}
    </span>
  );
}

/** Compact classification glyph for intake cards; labels remain explicit. */
export function MedicationClassIcon({
  kind,
  className,
  ...props
}: {
  kind: MedicationIndicatorKind;
  className?: string;
} & Omit<ComponentProps<"span">, "children">) {
  const marker = MEDICATION_CLASS_MARKERS[kind];
  return (
    <span
      {...props}
      className={cn("medication-class-icon", className)}
      data-medication-class={kind}
      role="img"
      aria-label={marker.accessibleLabel}
      title={marker.accessibleLabel}
    >
      <MedicationIndicatorMark kind={kind} size={22} aria-hidden="true" />
    </span>
  );
}
