import { PillBottle } from "lucide-react";
import styles from "./medication-heading-bottle.module.css";

/** The heading stays visible without a document observer or shake timer. */
export function MedicationHeadingBottle(props: { paused?: boolean }) {
  void props;
  return (
    <span className={styles.stage} aria-hidden="true">
      <span className={styles.glyph} data-medication-bottle-glyph>
        <PillBottle strokeWidth={2.25} />
      </span>
    </span>
  );
}
