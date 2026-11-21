import { SquareDashed } from "lucide-react";
import { MedicationCardBase } from "./medication-card-base";
import { MedicationCardIconFrame } from "./medication-card-icon";
import styles from "./intake-form.module.css";

/** Real card geometry, with no invented medication or dose in the empty draft. */
export function IntakePreviewSkeleton() {
  return (
    <MedicationCardBase
      readOnly
      color="tw-neutral-400"
      data-intake-card=""
      data-intake-preview-skeleton
      aria-label="Intake preview. Choose a medication to see your entry."
      className={styles.previewSkeleton}
      leadingArtwork={
        <span
          className="medication-card-focus intake-card-focus"
          aria-hidden="true"
        >
          <MedicationCardIconFrame color="tw-neutral-400">
            <SquareDashed className={styles.skeletonIcon} />
          </MedicationCardIconFrame>
        </span>
      }
    >
      <div
        className="medication-card-details intake-card-details"
        aria-hidden="true"
      >
        <div className={styles.skeletonHeading}>
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLine} />
        </div>
        <div className={styles.skeletonBottom}>
          <span className={styles.skeletonLine} />
        </div>
      </div>
    </MedicationCardBase>
  );
}
