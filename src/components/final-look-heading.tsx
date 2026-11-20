import styles from "./medication-appearance-fields.module.css";

export function FinalLookHeading({ id }: { id: string }) {
  return (
    <div className={styles.titlePill} data-preview-title-pill>
      <h3 id={id}>Final Look</h3>
      <span aria-hidden="true" className={styles.titleSeparator} />
      <span>Live Preview</span>
    </div>
  );
}
