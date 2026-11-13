import { IntakeRouteIcon } from "@/components/intake-route-icon";
import { MedicationTypeIcon } from "@/components/medication-icon";
import { isIntakeRoute, type IntakeRoute } from "@/lib/intake-routes";
import {
  MEDICATION_TYPE_VALUES,
  type MedicationType,
} from "@/lib/medication-types";
import { cn } from "@/lib/utils";
import styles from "./medication-choice-icon.module.css";

type ChoiceTone =
  | "sky"
  | "cyan"
  | "violet"
  | "rose"
  | "amber"
  | "teal"
  | "emerald"
  | "orange"
  | "stone";

const routeTones = {
  unspecified: "stone",
  oral: "amber",
  nasal: "sky",
  sublingual: "violet",
  buccal: "rose",
  inhalation: "cyan",
  topical: "emerald",
  transdermal: "teal",
  rectal: "orange",
  injection: "rose",
  other: "stone",
} as const satisfies Record<IntakeRoute, ChoiceTone>;

const typeTones = {
  tablet: "sky",
  capsule: "rose",
  drops: "cyan",
  pump: "amber",
  "pump-bottle": "violet",
  "gel-dispenser": "teal",
  other: "stone",
} as const satisfies Record<MedicationType, ChoiceTone>;

/** Decorative choice artwork; the adjacent option owns its accessible label. */
export function MedicationChoiceIcon({
  kind,
  value,
  className,
}: {
  kind: "route" | "type";
  value: string;
  className?: string;
}) {
  const type =
    MEDICATION_TYPE_VALUES.find((candidate) => candidate === value) ?? "other";
  const route = isIntakeRoute(value) ? value : "unspecified";

  return (
    <span
      aria-hidden="true"
      className={cn(styles.tile, className)}
      data-medication-choice-icon={kind}
      data-choice-icon-value={value}
      data-choice-icon-tone={
        kind === "type" ? typeTones[type] : routeTones[route]
      }
    >
      {kind === "type" ? (
        <MedicationTypeIcon type={type} className={styles.glyph} />
      ) : (
        <IntakeRouteIcon route={route} className={styles.glyph} />
      )}
    </span>
  );
}
