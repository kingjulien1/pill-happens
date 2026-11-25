"use client";

import { useId, type ReactNode } from "react";
import { formatDay, formatDose, type Medication } from "@/lib/domain";
import { InlineMedicationMark } from "./medication-card-icon";
import { useVisibleMotion } from "./use-visible-motion";
import styles from "./intake-form.module.css";
import slate from "./intake-preview-slate.module.css";
import change from "./intake-preview-change.module.css";

const ordinalSuffix = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  return (
    ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[count % 10] ??
    "th"
  );
};

function PreviewSlate() {
  return (
    <svg
      className={slate.art}
      width="58"
      height="42"
      viewBox="0 0 58 42"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g className={slate.board}>
        <path d="M15 20h28v12a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3Z" />
        <g className={slate.hinge}>
          <path d="M15 20v-5a1.5 1.5 0 0 1 1.5-1.5h25A1.5 1.5 0 0 1 43 15v5ZM20 13.5l4.5 6.5m4-6.5L33 20m4-6.5 4.5 6.5" />
        </g>
        <g className={slate.capsule}>
          <g transform="rotate(-24 29 27.5)">
            <rect x="24" y="25" width="10" height="5" rx="2.5" />
            <path d="M29 25v5" />
          </g>
        </g>
      </g>
      <path className={slate.clickLeft} d="m9 20-3-2m3 7-4 1" />
      <path className={slate.clickRight} d="m48 19 3-3m-3 8 5 .5" />
    </svg>
  );
}

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
  { d: "M2 15.3l.8-.02", width: 1.15 },
  { d: "M5.1 15.14q.63-.04 1.25-.11", width: 1.45 },
  { d: "M9 14.62q.9-.18 1.75-.43", width: 1.8 },
  { d: "M13.85 13.12q1.1-.46 2.2-1.01", width: 2.15 },
  { d: "M19.43 10.38q1.4-.73 2.8-1.39", width: 2.55 },
  { d: "M26.07 7.43q1.72-.54 3.48-.8", width: 2.95 },
  { d: "M33.85 6.23q2.05-.06 4.15-.06", width: 3.35 },
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
        d="m41.8 1.95 4.8 4.22-4.8 4.48"
        stroke="var(--projected-ink)"
        strokeWidth="3.8"
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
      {(!dosage || projected) && (
        <>
          {" "}
          <span className={change.label}>
            {dosage ? "Dosage" : value === 1 ? "Intake" : "Intakes"}
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
    { label: "Dosage", before: savedMg, after: projectedMg, dosage: true },
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
  const header = useVisibleMotion<HTMLElement>(true);
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
    <header
      ref={header}
      className={`${styles.previewSummary} ${slate.scene}`}
      data-intake-preview-summary
    >
      <PreviewSlate />
      <div className={styles.summaryText}>
        <h3 className={styles.previewSummaryHeading}>{heading}</h3>
        {detail && <p className={styles.summaryDetail}>{detail}</p>}
      </div>
    </header>
  );
}
