"use client";

import { formatDay, formatDose } from "@/lib/domain";
import { useVisibleMotion } from "./use-visible-motion";
import styles from "./intake-form.module.css";
import slate from "./intake-preview-slate.module.css";

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

/** The draft's projected log number and resulting tracking-day total. */
export function IntakePreviewSummary({
  medicationName,
  count,
  totalMg,
  trackingDay,
  isToday,
}: {
  medicationName: string;
  count: number | null;
  totalMg: number | null;
  trackingDay: string;
  isToday: boolean;
}) {
  const header = useVisibleMotion<HTMLElement>(true);
  const name = (
    <span className={styles.previewMedicationName}>{medicationName}</span>
  );
  return (
    <header
      ref={header}
      className={`${styles.previewSummary} ${slate.scene}`}
      data-intake-preview-summary
    >
      <PreviewSlate />
      <h3 className={styles.previewSummaryHeading}>
        {count !== null && totalMg !== null ? (
          <>
            This{" "}
            <strong data-preview-log-number>
              {formatDose(count)}
              {ordinalSuffix(count)}
            </strong>{" "}
            intake for {name} logs a total intake of{" "}
            <span className={styles.previewSummaryDose}>
              <strong>{formatDose(totalMg)}</strong> mg
            </span>{" "}
            <time dateTime={trackingDay}>
              {isToday
                ? "today"
                : `on ${formatDay(trackingDay, { weekday: "short", month: "short" })}`}
            </time>
            .
          </>
        ) : (
          <>Enter an amount to preview the daily total for {name}.</>
        )}
      </h3>
    </header>
  );
}

/** Equal-width lanes keep saved and projected totals mirrored above the preview rails. */
export function IntakePreviewTotals({
  count,
  includingDraftCount,
  totalMg,
  includingDraftMg,
}: {
  count: number;
  includingDraftCount: number | null;
  totalMg: number;
  includingDraftMg: number | null;
}) {
  const totals = [
    { label: "Right Now", value: formatDose(totalMg), count },
    {
      label: "After",
      value: includingDraftMg === null ? "—" : formatDose(includingDraftMg),
      count: includingDraftCount,
    },
  ];
  return (
    <div className={styles.previewTotals}>
      <dl
        className={styles.previewSummaryTotals}
        aria-label="Medication totals for this tracking day"
        data-intake-preview-totals
      >
        {totals.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <strong title={`${value} mg`}>{value}</strong>
              <span>mg</span>
            </dd>
          </div>
        ))}
      </dl>
      <dl
        className={`${styles.previewSummaryTotals} ${styles.previewSummaryLogs}`}
        aria-label="Medication log counts for this tracking day"
        data-intake-preview-log-counts
      >
        {totals.map(({ label, count: logs }) => (
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd>
              <strong>{logs === null ? "—" : formatDose(logs)}</strong>
              <span>{logs === 1 ? "log" : "logs"}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
