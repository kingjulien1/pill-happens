import { Eye } from "lucide-react";
import styles from "./medication-appearance-fields.module.css";

export function FinalLookHeading({ id, showIcon = false }: { id: string; showIcon?: boolean }) {
  return (
    <div className={styles.titlePill} data-preview-title-pill>
      <h3 id={id}>
        {showIcon && <Eye aria-hidden="true" size="0.875em" strokeWidth={2.5} />}
        Final Look
      </h3>
      <span aria-hidden="true" className={styles.titleSeparator} />
      <span>Live Preview</span>
    </div>
  );
}
