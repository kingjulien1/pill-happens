import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import styles from "./intake-form.module.css";

/** Recorded weekday, time and medication-log count above the preview. */
export function IntakePreviewSummary({
  medicationName,
  count,
  takenAt,
  timeZone,
}: {
  medicationName: string;
  count: number;
  takenAt: string;
  timeZone: string;
}) {
  const local = toLocalInput(takenAt, timeZone);
  const weekday = formatDay(local.slice(0, 10), {
    weekday: "long",
    month: undefined,
    day: undefined,
  });
  return (
    <div className={styles.previewSummary} data-intake-preview-summary>
      <time className={styles.previewSummaryWhen} dateTime={takenAt}>
        <span>{weekday}</span>{" "}
        <span className={styles.previewSummaryClock}>
          {local.slice(11, 16)}
        </span>
      </time>
      <div className={styles.previewSummaryCopy}>
        <p className={styles.previewSummaryHeading}>
          <strong>{formatDose(count)}</strong>{" "}
          <span className={styles.previewMedicationName} title={medicationName}>
            {medicationName}
          </span>{" "}
          <span>{count === 1 ? "log" : "logs"} today</span>
        </p>
      </div>
    </div>
  );
}

/** Equal-width lanes keep saved and projected totals mirrored above the preview rails. */
export function IntakePreviewTotals({
  totalMg,
  includingDraftMg,
}: {
  totalMg: number;
  includingDraftMg: number | null;
}) {
  return (
    <dl
      className={styles.previewSummaryTotals}
      aria-label="Medication totals for this tracking day"
      data-intake-preview-totals
    >
      {[
        { label: "Right Now", value: formatDose(totalMg) },
        {
          label: "After",
          value: includingDraftMg === null ? "—" : formatDose(includingDraftMg),
        },
      ].map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            <strong title={`${value} mg`}>{value}</strong>
            <span>mg</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
