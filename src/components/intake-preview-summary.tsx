import { formatDay, formatDose, toLocalInput } from "@/lib/domain";
import sectionStyles from "./check-in-section.module.css";
import styles from "./intake-form.module.css";

/** The same unframed heading rail as the form's Medication and Timing sections. */
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
    <div
      className={`${sectionStyles.header} ${styles.previewSummary}`}
      data-intake-preview-summary
    >
      <div className={sectionStyles.caption}>
        <time className={styles.previewSummaryWhen} dateTime={takenAt}>
          <span>{weekday}</span>{" "}
          <span className={styles.previewSummaryClock}>
            {local.slice(11, 16)}
          </span>
        </time>
        <div className={styles.previewSummaryCopy}>
          <div className={styles.previewSummaryHeading}>
            <strong>{formatDose(count)}</strong>{" "}
            <span
              className={styles.previewMedicationName}
              title={medicationName}
            >
              {medicationName}
            </span>{" "}
            <span>{count === 1 ? "log" : "logs"} today</span>
          </div>
          <p
            className={`${sectionStyles.detail} ${styles.previewSummaryTotals}`}
          >
            total <strong>{formatDose(totalMg)}</strong> mg –{" "}
            <strong>
              {includingDraftMg === null ? "—" : formatDose(includingDraftMg)}
            </strong>{" "}
            mg including this log
          </p>
        </div>
      </div>
    </div>
  );
}
