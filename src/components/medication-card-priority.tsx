import type { CSSProperties } from "react";
import type { Medication } from "@/lib/domain";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getMedicationClasses,
  getMedicationClassification,
} from "@/lib/medication-classification";

const benzo = {
  outline: getMedicationColor("tw-rose-400").hex,
  background: getMedicationColor("tw-rose-200").hex,
  overlay: getMedicationColor("tw-pink-700").hex,
  foreground: getMedicationColor("tw-fuchsia-800").hex,
  border: getMedicationColor("tw-rose-800").hex,
};

/** Priority belongs to the specialized cards, not the color-and-icon base. */
export function medicationCardPriority(medication?: Medication) {
  const classes = getMedicationClasses(medication);
  const color = getMedicationColor(medication?.color);
  return {
    classes,
    benzo: classes.includes("benzodiazepine"),
    opioid: classes.includes("opioid"),
    classification: getMedicationClassification(medication),
    style: {
      "--entry-benzo-soft": `${benzo.background}99`,
      "--entry-benzo-overlay": `${benzo.overlay}4d`,
      "--entry-benzo-ink": benzo.foreground,
      "--entry-benzo-edge": `${benzo.foreground}59`,
      "--entry-benzo-edge-overlay": `${benzo.border}66`,
      "--entry-class-border": `${color.hex}59`,
      "--entry-benzo-border": `${benzo.outline}99`,
      "--entry-opioid": getMedicationColor("tw-amber-500").hex,
      "--entry-opioid-soft": getMedicationColor("tw-amber-300").hex,
      "--entry-opioid-ink": getMedicationColor("tw-amber-700").hex,
    } as CSSProperties,
  };
}

export function MedicationCardPriorityRim({
  marked,
  benzo,
}: {
  marked: boolean;
  benzo: boolean;
}) {
  return marked ? (
    <span
      className="intake-card-class-rim"
      aria-hidden="true"
      data-intake-benzo-rim={benzo || undefined}
      data-intake-class-rim
    />
  ) : null;
}

export function MedicationCardOpioidDot({ present }: { present: boolean }) {
  return present ? (
    <span
      className="intake-card-opioid-dot"
      data-medication-class="opioid"
      data-intake-opioid-dot
    />
  ) : null;
}
