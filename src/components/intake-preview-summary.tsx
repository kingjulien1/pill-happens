import { formatDose } from "@/lib/domain";
import sectionStyles from "./check-in-section.module.css";
import styles from "./intake-form.module.css";

/** The same unframed heading rail as the form's Medication and Timing sections. */
export function IntakePreviewSummary({
  medicationName,
  count,
  totalMg,
  includingDraftMg,
}: {
  medicationName: string;
  count: number;
  totalMg: number;
  includingDraftMg: number | null;
}) {
  return (
    <div
      className={`${sectionStyles.header} ${styles.previewSummary}`}
      data-intake-preview-summary
    >
      <div className={sectionStyles.caption}>
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
