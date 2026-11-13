"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  MedicationCardBackground,
  MedicationCardIcon,
} from "@/components/medication-card-base";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import {
  checkInForDay,
  DAILY_MOODS,
  getCheckInPeriod,
} from "@/lib/daily-check-in";
import {
  getCheckInCompletion,
  getMorningCheckInCompletion,
} from "@/lib/check-in-completion";
import {
  dayIntakes,
  formatDay,
  formatDose,
  type AppData,
  type Intake,
} from "@/lib/domain";
import { getMedicationColor } from "@/lib/medication-appearance";
import { countPills } from "@/lib/pill-counts";
import { reflectionStats } from "@/lib/reflection-writing";
import { cn } from "@/lib/utils";
import styles from "./history-day-card.module.css";

export function HistoryDayCard({
  data,
  day,
  entryAnimation = true,
}: {
  data: AppData;
  day: string;
  entryAnimation?: boolean;
}) {
  const entries = dayIntakes(data, day);
  // Keep artwork anchored to the first taken medication, never dose or catalog order.
  const chronological = [...entries].sort(
    (a, b) =>
      Date.parse(a.takenAt) - Date.parse(b.takenAt) || a.id.localeCompare(b.id),
  );
  const unique = new Map<string, Intake>();
  for (const entry of chronological) {
    if (!unique.has(entry.medicationId)) unique.set(entry.medicationId, entry);
  }
  const uniqueEntries = [...unique.values()];
  const medicationById = new Map(
    data.medications.map((medication) => [medication.id, medication]),
  );
  const medicationNames = uniqueEntries.map(
    (entry) =>
      medicationById.get(entry.medicationId)?.name ?? entry.medicationName,
  );
  const counts = countPills(entries, data.medications);
  const morning = checkInForDay(data.dailyCheckIns, day, "morning");
  const evening = checkInForDay(data.dailyCheckIns, day);
  // Retain Evening's accessible preview; Morning fills reflection-only mornings.
  const checkIn = evening ?? morning;
  const morningOnly = Boolean(morning && !evening);
  const checkInTitle = morningOnly ? "Morning Check-In" : "Evening Check-In";
  const completion =
    checkIn && getCheckInPeriod(checkIn) === "morning"
      ? getMorningCheckInCompletion(checkIn)
      : getCheckInCompletion(checkIn);
  const checkInSummary =
    morning && evening
      ? "Morning & evening saved"
      : checkIn
        ? `${morningOnly ? "Morning" : "Evening"} saved`
        : "No check-in saved";
  const excerpt = checkIn
    ? reflectionStats(checkIn.note).excerpt ||
      checkIn.moods
        .map((value) => DAILY_MOODS.find((mood) => mood.value === value)?.label)
        .filter(Boolean)
        .join(" · ") ||
      checkIn.helped ||
      `${checkInTitle} Saved`
    : "";
  const fullDate = formatDay(day, { year: "numeric" });
  const weekday = formatDay(day, {
    weekday: "long",
    month: undefined,
    day: undefined,
  });
  const shortWeekday = formatDay(day, {
    weekday: "short",
    month: undefined,
    day: undefined,
  });
  const shortDate = formatDay(day, {
    weekday: undefined,
    month: "short",
    day: "numeric",
  });
  const recordSummary = `${entries.length} ${entries.length === 1 ? "log" : "logs"} · ${uniqueEntries.length} ${uniqueEntries.length === 1 ? "medication" : "medications"}`;
  const pillSummary = `${formatDose(counts.pills)} ${counts.pills === 1 ? "pill" : "pills"} from recorded tablet and capsule quantities, including fractions; ${formatDose(counts.benzos)} of those pills marked as benzodiazepines`;
  const first = chronological[0];
  const last = chronological.at(-1);
  const firstMedication = first && medicationById.get(first.medicationId);
  const color = getMedicationColor(firstMedication?.color);
  const sameInstant = Boolean(
    first && last && Date.parse(first.takenAt) === Date.parse(last.takenAt),
  );
  const fullTime = (entry: Intake) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: data.settings.timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    }).format(new Date(entry.takenAt));
  const timeDescription =
    first && last
      ? `${fullTime(first)}${sameInstant ? "" : ` – ${fullTime(last)}`} (${data.settings.timezone}). +1 means the next calendar day within this journal day.`
      : "No intakes recorded.";
  const checkInDescription = checkIn
    ? `${checkInTitle}: ${completion.completedCount} of ${completion.totalCount} sections completed. ${excerpt}`
    : "No Morning or Evening Check-In saved.";
  const label = [
    `View Daily Log for ${fullDate}`,
    recordSummary,
    pillSummary,
    medicationNames.length
      ? `Medications: ${medicationNames.join(", ")}`
      : null,
    first ? timeDescription : null,
    checkInSummary,
    checkInDescription,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <article
      className={styles.card}
      style={
        {
          "--entry-color": color.hex,
          "--entry-icon-tint": `${color.hex}66`,
        } as CSSProperties
      }
      aria-label={fullDate}
      data-card-entry={entryAnimation || undefined}
      data-history-card={day}
      data-history-row
      data-first-taken={first?.takenAt}
      data-last-taken={last?.takenAt}
    >
      <Link
        href={`/history/${day}`}
        className={cn("intake-log-card", styles.dayLink)}
        aria-label={label}
        title={label}
        data-history-day-link
      >
        <MedicationCardBackground />
        <div
          className={cn(
            "medication-card-content intake-card-content",
            styles.content,
          )}
        >
          <MedicationCardIcon
            color={color.value}
            icon={first ? firstMedication?.icon : morningOnly ? "sun" : "moon"}
            iconRotation={firstMedication?.iconRotation}
            title={
              first
                ? (firstMedication?.name ?? first.medicationName)
                : checkInTitle
            }
            data-history-icon-entrance
            data-history-medication-stack
            data-unique-medications={uniqueEntries.length}
            data-history-medication-id={first?.medicationId}
            data-history-missing-medication={
              (first && !firstMedication) || undefined
            }
            data-history-empty-artwork={!first || undefined}
          />
          <div className="medication-card-details intake-card-details">
            <div
              className={cn(
                "medication-card-heading intake-card-heading",
                styles.heading,
              )}
              data-history-header
            >
              <div className={cn("intake-card-title-group", styles.date)}>
                <time
                  className={cn("intake-card-time", styles.calendarDate)}
                  dateTime={day}
                  aria-label={fullDate}
                  title={fullDate}
                  data-history-date
                >
                  {shortDate}
                </time>
                <span className={styles.dateSeparator} aria-hidden="true">
                  ·
                </span>
                <h3 className="intake-card-name" data-history-weekday>
                  <span className={styles.weekdayLong}>{weekday}</span>
                  <span className={styles.weekdayShort}>{shortWeekday}</span>
                </h3>
              </div>
              <span
                className={styles.counts}
                role="img"
                aria-label={pillSummary}
                title={pillSummary}
                data-pill-counts
                data-pills={counts.pills}
                data-benzos={counts.benzos}
              >
                {(
                  [
                    ["pills", counts.pills],
                    ["benzodiazepine", counts.benzos],
                  ] as const
                ).map(([kind, count]) => (
                  <span
                    className={styles.metric}
                    key={kind}
                    data-count-part={kind}
                  >
                    <MedicationIndicatorMark
                      kind={kind}
                      size={18}
                      aria-hidden="true"
                    />
                    <strong className={styles.number} title={formatDose(count)}>
                      {formatDose(count)}
                    </strong>
                  </span>
                ))}
              </span>
            </div>
            <div
              className="medication-card-bottom intake-card-bottom"
              data-history-summary
            >
              <span
                className={cn("intake-card-ingredient", styles.summary)}
                title={`${recordSummary} · ${checkInSummary}`}
              >
                <span data-history-records>
                  <strong data-history-log-count>{entries.length}</strong>{" "}
                  <span data-history-record-label="logs">Logs</span>
                  <span className={styles.recordSeparator} aria-hidden="true">
                    {" "}
                    ·{" "}
                  </span>
                  <strong data-history-medication-count>
                    {uniqueEntries.length}
                  </strong>{" "}
                  <span data-history-record-label="meds">Meds</span>
                </span>
                <span className={styles.recordSeparator} aria-hidden="true">
                  {" "}
                  ·{" "}
                </span>
                <span data-history-check-in-summary>{checkInSummary}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
