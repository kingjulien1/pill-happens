"use client";

import { useId, type ReactNode } from "react";
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

// Rounded dashes lengthen and widen along a gentle rise into the arrowhead.
const transferDashes = [
  { d: "M2 11.8h.8", width: 1.35 },
  { d: "M5.1 11.75q.63-.01 1.25-.03", width: 1.7 },
  { d: "M9 11.6q.9-.05 1.75-.13", width: 2.1 },
  { d: "M13.85 11.15q1.1-.14 2.2-.3", width: 2.55 },
  { d: "M19.43 10.35q1.4-.22 2.8-.41", width: 3 },
  { d: "M26.07 9.48q1.72-.16 3.48-.24", width: 3.5 },
  { d: "M33.85 9.12q2.05-.02 4.15-.02", width: 3.95 },
];

function DoseTransferIcon() {
  const paint = useId();
  return (
    <svg
      className={change.transfer}
      viewBox="0 0 50 19"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={paint}
          x1="2"
          x2="46"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--prior-ink)" />
          <stop offset="1" stopColor="var(--projected-ink)" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${paint})`}>
        {transferDashes.map(({ d, width }, index) => (
          <path
            key={d}
            className={change.dash}
            d={d}
            strokeWidth={width}
            style={{ animationDelay: `${index * 45}ms` }}
          />
        ))}
      </g>
      <path
        className={change.arrowhead}
        d="M41.8 3.85l4.8 5.25-4.8 5.25"
        stroke="var(--projected-ink)"
        strokeWidth="4.5"
      />
    </svg>
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
      <span className={change.amount}>
        {formatDose(value)}
        {dosage && <small className={change.unit}>{"\u00a0"}mg</small>}
      </span>
      {!dosage && (
        <>
          {" "}
          <span className={change.label}>
            {value === 1 ? "Intake" : "Intakes"}
          </span>
        </>
      )}
    </span>
  );
}

export function IntakePreviewChangeRow({
  savedCount,
  projectedCount,
  savedMg,
  projectedMg,
}: {
  savedCount: number;
  projectedCount: number;
  savedMg: number;
  projectedMg: number;
}) {
  const row = useVisibleMotion<HTMLDListElement>(true);
  const readings = [
    {
      label: "Intakes",
      before: savedCount,
      after: projectedCount,
      dosage: false,
    },
    { label: "Dose total", before: savedMg, after: projectedMg, dosage: true },
  ];
  return (
    <dl
      ref={row}
      className={change.row}
      aria-label="Tracking-day totals if you save this intake"
    >
      {readings.map(({ label, before, after, dosage }) => (
        <div
          key={label}
          className={change.metric}
          data-dosage={dosage ? "" : undefined}
        >
          <dt className="sr-only">{label}</dt>
          <dd>
            <span className="sr-only">From </span>
            <ChangeReading value={before} dosage={dosage} />
            <DoseTransferIcon key={`${before}-${after}`} />
            <span className="sr-only"> to </span>
            <ChangeReading value={after} dosage={dosage} projected />
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
