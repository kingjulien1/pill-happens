import { Clock3, History } from "lucide-react";
import type { ReactNode } from "react";
import {
  doseMg,
  formatDay,
  formatDose,
  toLocalInput,
  type Intake,
} from "@/lib/domain";
import { formatIntakeGap } from "@/lib/intake-context";
import styles from "./intake-section-context.module.css";

export function MedicationSectionDescription({
  previous,
  takenAt,
  timeZone,
}: {
  previous?: Intake;
  takenAt: string;
  timeZone: string;
}) {
  if (!previous) {
    return (
      <>
        Choose how you took it, then enter the quantity in the units shown. The
        dose in milligrams updates as you type.
      </>
    );
  }
  const local = toLocalInput(previous.takenAt, timeZone);
  const date = formatDay(local.slice(0, 10), {
    weekday: undefined,
    month: "short",
    year:
      local.slice(0, 4) === toLocalInput(takenAt, timeZone).slice(0, 4)
        ? undefined
        : "numeric",
  });
  return (
    <>
      Your previous log for this medication was{" "}
      <time dateTime={previous.takenAt}>
        {date} at {local.slice(11, 16)}
      </time>
      . Enter the quantity you took this time to see the dose in milligrams.
    </>
  );
}

/** Compact, read-only checks beside the controls they help explain. */
export function IntakeSectionContext({
  kind,
  previous,
  takenAt,
  trackingDay,
  hasMedication,
}: {
  kind: "medication" | "timing";
  previous?: Intake;
  takenAt: string;
  trackingDay: string;
  hasMedication: boolean;
}) {
  const Icon = kind === "medication" ? History : Clock3;
  let label: ReactNode;
  let value: ReactNode;
  let description: string | undefined;
  if (kind === "medication") {
    if (!hasMedication) label = "No selection";
    else if (!takenAt) label = "Time needed";
    else if (!previous) label = "No earlier logs";
    else {
      label = "Prior log";
      const dose = doseMg(previous);
      value = Number.isFinite(dose) ? (
        <strong>{formatDose(dose)} mg</strong>
      ) : (
        "Amount not set"
      );
    }
  } else if (hasMedication && previous && takenAt) {
    label = "Since prior log";
    const elapsed = formatIntakeGap(previous.takenAt, takenAt);
    value = <strong key={elapsed}>{elapsed}</strong>;
  } else {
    label = "Tracking day";
    value = trackingDay ? (
      <strong key={trackingDay}>
        {formatDay(trackingDay, { weekday: "short", month: "short" })}
      </strong>
    ) : (
      "Set a valid time"
    );
    description = trackingDay
      ? "This entry is saved to this tracking day. Days begin at 06:00 in your journal timezone."
      : undefined;
  }
  return (
    <span
      className={styles.context}
      data-intake-section-context={kind}
      title={description}
    >
      <span className={styles.label}>
        <Icon strokeWidth={2.25} aria-hidden="true" />
        <span>{label}</span>
      </span>
      {value != null && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.value}>{value}</span>
        </>
      )}
    </span>
  );
}
