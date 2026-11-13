import { PageHeading } from "@/components/page-heading";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { formatDay } from "@/lib/domain";
import styles from "./history-heading.module.css";

/** A single page opening, with coverage rather than a second list heading. */
export function HistoryHeading({
  days,
  logCount,
  timezone,
}: {
  days: readonly string[];
  logCount: number;
  timezone: string;
}) {
  const latest = days[0];
  const earliest = days.at(-1);
  const range = latest
    ? `${earliest ? formatDay(earliest, { year: "numeric" }) : ""}${earliest !== latest ? ` – ${formatDay(latest, { year: "numeric" })}` : ""}`
    : "No past days recorded yet";
  const description = `${days.length} recorded past ${days.length === 1 ? "day" : "days"}, ${logCount} intake ${logCount === 1 ? "log" : "logs"}. ${range}. Journal timezone: ${timezone}.`;
  return (
    <PageHeading
      title="History"
      context="Past days"
      icon={<ActionIcon name="navHistory" weight="duotone" />}
      data-history-heading
      data-history-title-row
      actions={
        <span
          className={styles.coverage}
          role="img"
          aria-label={description}
          title={description}
          data-history-coverage
          data-history-day-count={days.length}
          data-history-log-count={logCount}
        >
          <span className={styles.days} aria-hidden="true">
            <strong>{days.length.toLocaleString("en")}</strong>
            <span>{days.length === 1 ? "Day" : "Days"}</span>
          </span>
          <span className={styles.logs} aria-hidden="true">
            <strong>{logCount.toLocaleString("en")}</strong>
            <span>{logCount === 1 ? "Log" : "Logs"}</span>
          </span>
        </span>
      }
    >
      Your days, kept together. Revisit the details whenever you like.
    </PageHeading>
  );
}

/** A quiet date-led opening for one daily timeline, without repeating its cards. */
export function HistoryDayHeading({
  day,
  intakeCount,
  medicationCount,
}: {
  day: string;
  intakeCount: number;
  medicationCount: number;
}) {
  const weekday = formatDay(day, {
    weekday: "long",
    month: undefined,
    day: undefined,
  });
  const date = formatDay(day, {
    weekday: undefined,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const context = `${intakeCount.toLocaleString("en")} ${intakeCount === 1 ? "intake" : "intakes"} · ${medicationCount.toLocaleString("en")} ${medicationCount === 1 ? "medication" : "medications"}`;
  return (
    <header className={styles.dayHeader} data-history-day-heading>
      <Link href="/history" className={styles.dayBack} data-history-day-back>
        Past Days
      </Link>
      <h1 className={styles.dayTitle} data-history-day-title>
        {weekday}
      </h1>
      <p className={styles.dayDate}>
        <time dateTime={day} data-history-day-date>
          {date}
        </time>
      </p>
      <p
        className={styles.dayCounts}
        title={context}
        data-history-day-context
        data-intake-count={intakeCount}
        data-medication-count={medicationCount}
      >
        {context}
      </p>
    </header>
  );
}
