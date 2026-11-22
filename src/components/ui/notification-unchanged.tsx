import { CircleEqual } from "lucide-react";
import styles from "./notification-unchanged.module.css";

/** A confirmed no-op has no comparison cards, invented changes or Undo. */
export function NotificationUnchanged() {
  return (
    <section
      className={styles.panel}
      aria-label="No changes to save"
      data-notification-unchanged
    >
      <div className={styles.emblem} aria-hidden="true">
        <span />
        <CircleEqual />
      </div>
      <span className={styles.eyebrow}>Already saved</span>
      <h3>Nothing changed.</h3>
      <p>Everything is just as you left it.</p>
      <span className={styles.seal} aria-hidden="true">
        0 edits
      </span>
    </section>
  );
}
