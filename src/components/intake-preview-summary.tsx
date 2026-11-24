import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import styles from "./intake-form.module.css";

const ordinalSuffix = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  return (
    ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[count % 10] ??
    "th"
  );
};

/** The draft's projected log number, local timestamp and resulting day total. */
export function IntakePreviewSummary({
  medicationName,
  count,
  totalMg,
  takenAt,
  timeZone,
}: {
  medicationName: string;
  count: number | null;
  totalMg: number | null;
  takenAt: string;
  timeZone: string;
}) {
  const local = toLocalInput(takenAt, timeZone);
  const weekday = formatDay(local.slice(0, 10), {
    weekday: "long",
    month: undefined,
    day: undefined,
  });
  const total = totalMg === null ? "—" : formatDose(totalMg);
  return (
    <header className={styles.previewSummary} data-intake-preview-summary>
      <h3 className={styles.previewSummaryHeading}>
        This is{" "}
        {count === null ? (
          "your"
        ) : (
          <>
            the{" "}
            <strong data-preview-log-number>
              {formatDose(count)}
              {ordinalSuffix(count)}
            </strong>
          </>
        )}{" "}
        Log for{" "}
        <span className={styles.previewMedicationName}>{medicationName}</span>{" "}
        Today{" "}
        <time className={styles.previewSummaryWhen} dateTime={takenAt}>
          ({weekday},{" "}
          <span className={styles.previewSummaryClock}>
            {local.slice(11, 16)}
          </span>
          )
        </time>{" "}
        with{" "}
        <span className={styles.previewSummaryDose} title={`${total} mg`}>
          <strong>{total}</strong> mg
        </span>{" "}
        total.
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
