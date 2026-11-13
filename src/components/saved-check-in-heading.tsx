import type { ReactNode } from "react";
import {
  getCheckInOpenedTime,
  getCheckInUpdatedTime,
} from "@/lib/check-in-logged-time";
import styles from "./daily-check-in.module.css";

/** Opening history is device-local; journal updates remain successful save times. */
export function SavedCheckInHeading({
  period,
  openedAt,
  createdAt,
  updatedAt,
  timeZone,
  trailing,
}: {
  period: "morning" | "evening";
  openedAt?: number;
  createdAt?: string;
  updatedAt?: string;
  timeZone: string;
  trailing?: ReactNode;
}) {
  const opened = getCheckInOpenedTime(openedAt, timeZone);
  const updated = getCheckInUpdatedTime({ createdAt, updatedAt }, timeZone);
  const title = `${period === "morning" ? "Morning" : "Evening"} Check-In`;
  const unavailable = "First opening not yet recorded on this device";

  return (
    <div
      className="medication-card-heading intake-card-heading"
      data-check-in-heading
      data-check-in-saved-heading={Boolean(updated) || undefined}
      data-check-in-period={period}
      data-has-leading="true"
      data-has-indicators={Boolean(trailing)}
    >
      <span className={styles.timeColumn} data-check-in-time-column>
        {opened ? (
          <time
            className="intake-card-time"
            dateTime={opened.dateTime}
            title={opened.label}
            aria-label={opened.label}
            data-check-in-time
            data-check-in-opened-time
          >
            {opened.time}
          </time>
        ) : (
          <span
            className="intake-card-time"
            title={unavailable}
            aria-label={unavailable}
            data-check-in-time
            data-check-in-opened-time
            data-check-in-time-unavailable
          >
            —
          </span>
        )}
        {updated && (
          <time
            className={styles.updatedTime}
            dateTime={updated.dateTime}
            title={updated.label}
            aria-label={updated.label}
            data-check-in-updated-time
          >
            {updated.time}
          </time>
        )}
      </span>
      <div className="intake-card-title-group">
        <h3 className="intake-card-name" title={title} data-check-in-title>
          {title}
        </h3>
      </div>
      {trailing}
    </div>
  );
}
