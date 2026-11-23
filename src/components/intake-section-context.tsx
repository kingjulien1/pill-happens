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

/** Compact, read-only checks beside the controls they help explain. */
export function IntakeSectionContext({
  kind,
  previous,
  takenAt,
  timeZone,
  trackingDay,
  hasMedication,
}: {
  kind: "medication" | "timing";
  previous?: Intake;
  takenAt: string;
  timeZone: string;
  trackingDay: string;
  hasMedication: boolean;
}) {
  const Icon = kind === "medication" ? History : Clock3;
  let label: ReactNode;
  let value: ReactNode;
  let description: string | undefined;
  if (kind === "medication") {
    label = "Prior log";
    if (!hasMedication) value = "Select a medication";
    else if (!takenAt) value = "Set a valid time";
    else if (!previous) value = "No earlier logs";
    else {
      const local = toLocalInput(previous.takenAt, timeZone);
      const selected = toLocalInput(takenAt, timeZone);
      const date = formatDay(local.slice(0, 10), {
        weekday: undefined,
        month: "short",
        year:
          local.slice(0, 4) === selected.slice(0, 4) ? undefined : "numeric",
      });
      const dose = doseMg(previous);
      const amount = Number.isFinite(dose)
        ? `${formatDose(dose)} mg`
        : "Amount not set";
      label = (
        <>
          Prior · <strong>{amount}</strong>
        </>
      );
      value = (
        <time dateTime={previous.takenAt}>
          {date} · {local.slice(11, 16)}
        </time>
      );
      description = `Previous recorded intake: ${amount}, ${formatDay(local.slice(0, 10), { year: "numeric" })} at ${local.slice(11, 16)} (${timeZone}).`;
    }
  } else if (hasMedication && previous && takenAt) {
    label = "Since prior log";
    value = <strong>{formatIntakeGap(previous.takenAt, takenAt)}</strong>;
  } else {
    label = "Tracking day";
    value = trackingDay ? (
      <strong>
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
      <span className={styles.value}>{value}</span>
    </span>
  );
}
