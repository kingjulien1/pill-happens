import type { ComponentProps } from "react";
import { CrosshairSimpleIcon } from "@phosphor-icons/react/dist/ssr/CrosshairSimple";
import { PillIcon } from "@phosphor-icons/react/dist/ssr/Pill";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import {
  getMedicationClasses,
  type MedicationClass,
} from "@/lib/medication-classification";
import { cn } from "@/lib/utils";

type ClassificationFlags = {
  isBenzodiazepine?: boolean;
  isOpioid?: boolean;
};

export type { MedicationClass } from "@/lib/medication-classification";

export const MEDICATION_CLASS_MARKERS = {
  benzodiazepine: { label: "Benzo", accessibleLabel: "Benzodiazepine" },
  opioid: { label: "Opioid", accessibleLabel: "Opioid" },
} as const;

/** Keep the established rose marker and add an independent amber opioid marker. */
export function medicationClassHighlights(medication?: ClassificationFlags) {
  return cn(
    medication?.isBenzodiazepine === true && "benzodiazepine-highlight",
    medication?.isOpioid === true && "opioid-highlight",
  );
}

export function MedicationClassBadge({
  kind,
  className,
}: {
  kind: MedicationClass;
  className?: string;
}) {
  const marker = MEDICATION_CLASS_MARKERS[kind];
  const Icon = kind === "benzodiazepine" ? CrosshairSimpleIcon : TagIcon;
  return (
    <span
      className={cn("benzodiazepine-badge medication-class-badge", className)}
      data-medication-class={kind}
      role="img"
      aria-label={marker.accessibleLabel}
      title={marker.accessibleLabel}
    >
      <Icon weight="bold" aria-hidden="true" focusable="false" />
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
  const classes = getMedicationClasses(medication);
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
  kind: MedicationClass;
  className?: string;
} & Omit<ComponentProps<"span">, "children">) {
  const marker = MEDICATION_CLASS_MARKERS[kind];
  const Icon = kind === "benzodiazepine" ? PillIcon : TagIcon;
  return (
    <span
      {...props}
      className={cn("medication-class-icon", className)}
      data-medication-class={kind}
      role="img"
      aria-label={marker.accessibleLabel}
      title={marker.accessibleLabel}
    >
      <Icon weight="duotone" size={12} aria-hidden="true" focusable="false" />
    </span>
  );
}
