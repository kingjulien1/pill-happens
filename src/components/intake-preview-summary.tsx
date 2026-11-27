"use client";

import type { ReactNode } from "react";
import { ChevronRight, ChevronsRight } from "lucide-react";
import { formatDay, formatDose, type Medication } from "@/lib/domain";
import { InlineMedicationMark } from "./medication-card-icon";
import { useVisibleMotion } from "./use-visible-motion";
import styles from "./intake-form.module.css";
import change from "./intake-preview-change.module.css";

const ordinalSuffix = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  return (
    ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[count % 10] ??
    "th"
  );
};

function DraftTotal({ mg }: { mg: number }) {
  return (
    <strong className={styles.draftTotal}>
      {formatDose(mg)}
      <span className={styles.amountSuffix}>{"\u00a0"}mg</span>
    </strong>
  );
}

function ChangeReading({
  value,
  dosage,
  projected = false,
}: {
  value: number;
  dosage: boolean;
  projected?: boolean;
}) {
  return (
    <span className={projected ? change.projected : change.prior}>
      <span className={change.amount}>{formatDose(value)}</span>
      {" "}
      <span>{dosage ? "mg" : value === 1 ? "Intake" : "Intakes"}</span>
    </span>
  );
}

export function IntakePreviewChangeRow({
  priorCount,
  projectedCount,
  priorMg,
  projectedMg,
}: {
  priorCount: number;
  projectedCount: number;
  priorMg: number;
  projectedMg: number;
}) {
  const row = useVisibleMotion<HTMLDListElement>(true);
  const readings = [
    {
      label: "Intakes",
      before: priorCount,
      after: projectedCount,
      dosage: false,
    },
    { label: "Dose total", before: priorMg, after: projectedMg, dosage: true },
  ];
  return (
    <dl
      ref={row}
      className={change.row}
      aria-label="Tracking-day totals if you save this intake"
    >
      {readings.map(({ label, before, after, dosage }) => (
        <div key={label} className={change.metric}>
          <dt className="sr-only">{label}</dt>
          <dd>
            <span className="sr-only">From </span>
            <ChangeReading value={before} dosage={dosage} />
            <span className={change.destination}>
              <span className={change.transfer} aria-hidden="true">
                <ChevronRight />
                <ChevronsRight />
              </span>
              <span className="sr-only"> to </span>
              <ChangeReading value={after} dosage={dosage} projected />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The draft's projected log number and resulting tracking-day total. */
export function IntakePreviewSummary({
  medicationName,
  newIntake,
  count,
  totalMg,
  trackingDay,
  isToday,
}: {
  medicationName: string;
  newIntake?: { medication: Medication; savedTotalMg: number };
  count: number | null;
  totalMg: number | null;
  trackingDay: string;
  isToday: boolean;
}) {
  const name = newIntake ? (
    <strong className={styles.draftMedicationName}>
      <InlineMedicationMark
        color={newIntake.medication.color}
        icon={newIntake.medication.icon}
        iconRotation={newIntake.medication.iconRotation}
      />
      {"\u2060"}
      {medicationName}
    </strong>
  ) : (
    <span className={styles.previewMedicationName}>{medicationName}</span>
  );
  const day = (
    <time dateTime={trackingDay}>
      {isToday
        ? "today"
        : `on ${formatDay(trackingDay, { weekday: "short", month: "short" })}`}
    </time>
  );
  let heading = <>Enter an amount to preview the daily total for {name}.</>;
  let detail: ReactNode = null;
  if (count !== null && totalMg !== null) {
    const ordinal = (
      <strong data-preview-log-number>
        {formatDose(count)}
        <span className={newIntake ? styles.amountSuffix : undefined}>
          {ordinalSuffix(count)}
        </span>
      </strong>
    );
    if (newIntake) {
      heading = (
        <>
          This would be the {ordinal} logged intake for {name} {day}.
        </>
      );
      detail = (
        <>
          That brings the total from <DraftTotal mg={newIntake.savedTotalMg} />{" "}
          as of currently, to <DraftTotal mg={totalMg} /> should you log this
          Intake.
        </>
      );
    } else {
      heading = (
        <>
          This {ordinal} intake for {name} logs a total intake of{" "}
          <span className={styles.previewSummaryDose}>
            <strong>{formatDose(totalMg)}</strong> mg
          </span>{" "}
          {day}.
        </>
      );
    }
  }
  return (
    <header className={styles.previewSummary} data-intake-preview-summary>
      <div className={styles.summaryText}>
        <h3 className={styles.previewSummaryHeading}>{heading}</h3>
        {detail && <p className={styles.summaryDetail}>{detail}</p>}
      </div>
    </header>
  );
}
