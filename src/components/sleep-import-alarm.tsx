import { AlarmClock } from "lucide-react";
import styles from "./sleep-import-alarm.module.css";

/** Static decoration keeps the report importer idle while the person writes. */
export function SleepImportAlarm() {
  return (
    <span className={styles.stage} aria-hidden="true">
      <AlarmClock className={styles.clock} size={38} strokeWidth={1.8} />
    </span>
  );
}
