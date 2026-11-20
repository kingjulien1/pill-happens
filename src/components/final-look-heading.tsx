import { Eye } from "lucide-react";
import { getMedicationColor } from "@/lib/medication-appearance";
import styles from "./medication-appearance-fields.module.css";

export function FinalLookHeading({ id, showIcon = false, color }: {
  id: string;
  showIcon?: boolean;
  color?: ReturnType<typeof getMedicationColor>;
}) {
  return (
    <div className={styles.titlePill} data-preview-title-pill>
      <h3 id={id}>
        {showIcon && <Eye aria-hidden="true" size="1.05em" strokeWidth={2.5} />}
        Final Look
      </h3>
      <span aria-hidden="true" className={styles.titleSeparator} />
      <span className={styles.liveLabel}>
        {color && <span
          className={styles.liveDot}
          style={{ backgroundColor: color.hex }}
          role="img"
          aria-label={color.label}
          title={color.label}
        />}
        Live Preview
      </span>
    </div>
  );
}
