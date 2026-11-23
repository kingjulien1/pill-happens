import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import styles from "./intake-form.module.css";

/** Saved and projected day totals, kept separate from the card preview. */
export function IntakePreviewSummary({
  medicationName,
  count,
  totalMg,
  includingDraftMg,
  takenAt,
  timeZone,
}: {
  medicationName: string;
  count: number;
  totalMg: number;
  includingDraftMg: number | null;
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
        <dl
          className={styles.previewSummaryTotals}
          aria-label="Medication totals for this tracking day"
        >
          <div>
            <dt>Saved total</dt>
            <dd>
              <strong>{formatDose(totalMg)}</strong> <span>mg</span>
            </dd>
          </div>
          <div>
            <dt>With this log</dt>
            <dd>
              <strong>
                {includingDraftMg === null ? "—" : formatDose(includingDraftMg)}
              </strong>{" "}
              <span>mg</span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
