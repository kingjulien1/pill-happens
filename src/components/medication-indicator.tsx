import type { SVGProps } from "react";
import { BatteryCharging, Brain, Skull } from "lucide-react";
import {
  getMedicationCategories,
  type MedicationCategoryMetadata,
} from "@/lib/medication-categories";
import { cn } from "@/lib/utils";
import styles from "./medication-indicator.module.css";

export const MEDICATION_INDICATORS = {
  benzodiazepine: {
    icon: Brain,
    label: "Benzo",
    accessibleLabel: "Benzodiazepine",
  },
  opioid: { icon: Skull, label: "Opioid", accessibleLabel: "Opioid" },
  stimulant: {
    icon: BatteryCharging,
    label: "Stimulant",
    accessibleLabel: "Stimulant",
  },
} as const;

export type MedicationIndicatorKind = keyof typeof MEDICATION_INDICATORS;

/** Manual categories, including explicit clearing, remain the source of truth. */
export function getMedicationIndicatorKinds(
  medication?: MedicationCategoryMetadata | null,
): MedicationIndicatorKind[] {
  const categories = getMedicationCategories(medication);
  return (["benzodiazepine", "opioid", "stimulant"] as const).filter((kind) =>
    categories.includes(kind),
  );
}

/** One glyph vocabulary shared by cards, selectors, badges and journal counts. */
export function MedicationIndicatorIcon({
  kind,
  size = 16,
  strokeWidth = 2.25,
  className,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height"> & {
  kind: MedicationIndicatorKind;
  size?: number;
}) {
  const indicator = MEDICATION_INDICATORS[kind];
  const Icon = indicator.icon;
  const decorative =
    props["aria-hidden"] === true || props["aria-hidden"] === "true";
  const label = props["aria-label"] ?? indicator.accessibleLabel;
  return (
    <Icon
      {...props}
      size={size}
      strokeWidth={strokeWidth}
      className={cn(styles.glyph, className)}
      role={decorative ? undefined : (props.role ?? "img")}
      aria-label={decorative ? undefined : label}
      focusable="false"
      data-medication-indicator={kind}
      data-medication-class-glyph={kind}
    >
      {!decorative && <title>{label}</title>}
    </Icon>
  );
}
