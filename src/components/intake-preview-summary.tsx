"use client";

import { useId } from "react";
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

/** A scored tablet follows the rise between the saved and projected readings. */
function DoseTransferIcon() {
  const paint = useId();
  return (
    <svg
      className={change.transfer}
      viewBox="0 0 36 16"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={paint}
          x1="3"
          x2="32"
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--prior-ink)" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <path
        d="M3 11h8c6 0 7-6 13-6h8m-4-3.5L32 5l-4 3.5"
        stroke={`url(#${paint})`}
      />
      <g transform="translate(5 11)">
        <g className={change.tablet}>
          <rect
            x="-3.7"
            y="-2.1"
            width="7.4"
            height="4.2"
            rx="2.1"
            fill="var(--popover)"
            stroke="currentColor"
          />
          <path d="M0-1.7v3.4" stroke="currentColor" strokeWidth="1.2" />
        </g>
      </g>
      <circle
        className={change.arrival}
        cx="24"
        cy="5"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
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
    { label: "Intakes", before: savedCount, after: projectedCount, unit: "" },
    { label: "Dosage", before: savedMg, after: projectedMg, unit: "\u202fmg" },
  ];
  return (
    <dl
      ref={row}
      className={change.row}
      aria-label="Tracking-day totals if you save this intake"
    >
      {readings.map(({ label, before, after, unit }) => (
        <div
          key={label}
          className={change.metric}
          data-dosage={unit ? "" : undefined}
        >
          <dt>{label}</dt>
          <dd>
            <span className="sr-only">From </span>
            <span className={change.prior}>
              {formatDose(before)}
              {unit}
            </span>
            <DoseTransferIcon key={`${before}-${after}`} />
            <span className="sr-only"> to </span>
            <strong className={change.projected}>
              {formatDose(after)}
              {unit}
            </strong>
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
  let summary = <>Enter an amount to preview the daily total for {name}.</>;
  if (count !== null && totalMg !== null) {
    const ordinal = (
      <strong data-preview-log-number>
        {formatDose(count)}
        <span className={newIntake ? styles.amountSuffix : undefined}>
          {ordinalSuffix(count)}
        </span>
      </strong>
    );
    summary = newIntake ? (
      <>
        This would be the {ordinal} logged intake for {name} {day}, bringing the
        total from <DraftTotal mg={newIntake.savedTotalMg} /> to{" "}
        <DraftTotal mg={totalMg} /> if you save this draft.
      </>
    ) : (
      <>
        This {ordinal} intake for {name} logs a total intake of{" "}
        <span className={styles.previewSummaryDose}>
          <strong>{formatDose(totalMg)}</strong> mg
        </span>{" "}
        {day}.
      </>
    );
  }
  return (
    <header
      ref={header}
      className={`${styles.previewSummary} ${slate.scene}`}
      data-intake-preview-summary
    >
      <PreviewSlate />
      <h3 className={styles.previewSummaryHeading}>{summary}</h3>
    </header>
  );
}
