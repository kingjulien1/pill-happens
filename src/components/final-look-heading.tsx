import styles from "./medication-appearance-fields.module.css";

export function FinalLookHeading({ id, large = false }: { id: string; large?: boolean }) {
  return (
    <div className={styles.titlePill} data-preview-title-pill data-large={large || undefined}>
      <h3 id={id}>Final Look</h3>
      <span aria-hidden="true" className={styles.titleSeparator} />
      <span>Live Preview</span>
    </div>
  );
}
