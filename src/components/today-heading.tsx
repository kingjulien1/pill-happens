import { formatDay } from "@/lib/domain";
import styles from "./today-heading.module.css";

/** The tracking-day date and current local clock share one journal-timezone source. */
export function TodayDateTime({
  day,
  now,
  timeZone,
  showDate = true,
}: {
  day: string;
  now: Date;
  timeZone: string;
  showDate?: boolean;
}) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);

  return (
    <span
      className={styles.timestamp}
      data-today-date-time
      data-clock-only={!showDate || undefined}
    >
      {showDate && (
        <time
          className={styles.date}
          dateTime={day}
          aria-label={formatDay(day, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        >
          {formatDay(day, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </time>
      )}
      <span className={styles.clock}>
        {showDate && (
          <span aria-hidden="true" className={styles.dot}>
            ·
          </span>
        )}
        <time
          dateTime={now.toISOString()}
          aria-label={`Current time: ${clock} (${timeZone})`}
          data-current-time
        >
          {clock}
        </time>
      </span>
    </span>
  );
}
