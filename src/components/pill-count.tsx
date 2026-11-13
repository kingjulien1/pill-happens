import { formatDose } from "@/lib/domain";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { PillCounts } from "@/lib/pill-counts";
import styles from "./pill-count.module.css";

/** Recorded tablet/capsule units, with benzodiazepines as a subset of that total. */
export function PillCount({
  counts,
  compact = false,
  appearance,
}: {
  counts: PillCounts;
  compact?: boolean;
  appearance?: "history" | "summary" | "dock";
}) {
  const pills = formatDose(counts.pills);
  const benzos = formatDose(counts.benzos);
  const summary = appearance === "summary" || appearance === "dock";
  const description = `${pills} recorded ${counts.pills === 1 ? "pill" : "pills"} from tablet and capsule quantities, including fractions. ${benzos} of those pills ${counts.benzos === 1 ? "is" : "are"} marked as ${counts.benzos === 1 ? "a benzodiazepine" : "benzodiazepines"}.`;

  return (
    <span
      className={styles.counts}
      role="img"
      aria-label={description}
      title={description}
      data-pill-counts
      data-compact={compact || undefined}
      data-appearance={appearance}
      data-long-counts={
        ((compact || appearance === "history") &&
          (pills.length > 7 ||
            benzos.length > 7 ||
            (appearance === "history" && pills.length + benzos.length > 9))) ||
        undefined
      }
      data-pills={counts.pills}
      data-benzos={counts.benzos}
    >
      <span className={styles.part} aria-hidden="true" data-count-part="pills">
        <MedicationIndicatorMark
          kind="pills"
          className={styles.mark}
          aria-hidden="true"
        />
        {summary ? (
          <SummaryCountValue value={pills} label="meds" />
        ) : (
          <>
            <strong
              className={styles.number}
              title={
                appearance === "history" ? `${pills} recorded pills` : undefined
              }
            >
              {pills}
            </strong>
            <span className={styles.label}>
              {counts.pills === 1 ? "pill" : "pills"}
            </span>
          </>
        )}
      </span>
      <span
        className={styles.part}
        aria-hidden="true"
        data-count-part="benzodiazepine"
      >
        <span className={styles.separator}>
          {appearance === "history" ? "" : summary ? "·" : "/"}
        </span>
        <MedicationIndicatorMark
          kind="benzodiazepine"
          className={styles.mark}
          aria-hidden="true"
        />
        {summary ? (
          <SummaryCountValue
            value={benzos}
            label={counts.benzos === 1 ? "benzo" : "benzos"}
          />
        ) : (
          <>
            <strong
              className={styles.number}
              title={
                appearance === "history"
                  ? `${benzos} benzodiazepine pills`
                  : undefined
              }
            >
              {benzos}
            </strong>
            <span className={styles.label}>
              {counts.benzos === 1 ? "benzo" : "benzos"}
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/** Summary labels use one style in both rows and beside the intake record count. */
export function SummaryCountValue({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <span className={styles.summaryValue} data-count-value>
      <strong className={styles.summaryNumber} data-count-number>
        {value}
      </strong>
      <span className={styles.summaryLabel} data-count-label>
        {label}
      </span>
    </span>
  );
}
