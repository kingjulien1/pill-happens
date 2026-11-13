"use client";

import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { CSSProperties } from "react";
import { BookOpenText, Clock3, Layers3 } from "lucide-react";
import { MedicationIcon } from "@/components/medication-icon";
import {
  getMedicationIndicatorKinds,
  MEDICATION_INDICATORS,
} from "@/components/medication-indicator";
import { getMedicationClassification } from "@/lib/medication-classification";
import { getMedicationColor } from "@/lib/medication-appearance";
import { dailyOverview, type DailyOverviewRow } from "@/lib/daily-overview";
import { formatDay, formatDose, type AppData } from "@/lib/domain";
import styles from "./daily-log-overview.module.css";

const numbers = new Intl.NumberFormat("en");

function MedicationTotal({
  row,
  clock,
  timestamp,
}: {
  row: DailyOverviewRow;
  clock: Intl.DateTimeFormat;
  timestamp: Intl.DateTimeFormat;
}) {
  const classes = getMedicationIndicatorKinds(row.medication);
  const amount = formatDose(row.totalMg);
  const maximum = row.goal?.dailyLimitMg;
  const overMaximum = maximum !== undefined && row.totalMg > maximum;
  const percent =
    maximum === undefined
      ? 0
      : maximum > 0
        ? Math.min(100, Math.max(0, (row.totalMg / maximum) * 100))
        : row.totalMg > 0
          ? 100
          : 0;
  const lastTime = row.lastTakenAt
    ? clock.format(new Date(row.lastTakenAt))
    : null;

  return (
    <li
      className={styles.card}
      style={
        {
          "--medication-accent": getMedicationColor(row.medication?.color).hex,
        } as CSSProperties
      }
      data-card-entry
      data-daily-total={row.medicationId}
      data-medication-classification={getMedicationClassification(
        row.medication,
      )}
      data-benzodiazepine={classes.includes("benzodiazepine") || undefined}
      data-opioid={classes.includes("opioid") || undefined}
    >
      <div className={styles.cardTop}>
        <MedicationIcon
          small
          color={row.medication?.color}
          icon={row.medication?.icon}
          rotation={row.medication?.iconRotation}
          className="size-9 rounded-xl"
        />
        {classes.length > 0 && (
          <span className={styles.classifications}>
            {classes.map((kind) => (
              <span
                key={kind}
                className={styles.classification}
                data-medication-class={kind}
                role="img"
                aria-label={MEDICATION_INDICATORS[kind].accessibleLabel}
                title={MEDICATION_INDICATORS[kind].accessibleLabel}
              >
                <MedicationIndicatorMark
                  kind={kind}
                  size={16.5}
                  aria-hidden="true"
                />
                <span aria-hidden="true">
                  {MEDICATION_INDICATORS[kind].label}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>
      <h3 className={styles.medicationName}>{row.name}</h3>
      <p className={styles.rowMeta}>
        {row.intakeCount
          ? `${numbers.format(row.intakeCount)} logged ${row.intakeCount === 1 ? "intake" : "intakes"}`
          : "No intakes logged"}
      </p>
      <p
        className={styles.amount}
        aria-label={`${amount} milligrams recorded for ${row.name}`}
      >
        <span
          className={styles.amountNumber}
          data-long={amount.length > 9 || undefined}
          data-very-long={amount.length > 15 || undefined}
        >
          {amount}
        </span>
        <span className={styles.amountUnit}>mg</span>
      </p>
      <div className={styles.cardFooter}>
        {row.goal && maximum !== undefined ? (
          <div className={styles.goal} data-over-limit={overMaximum}>
            <div className={styles.goalLabels}>
              <span>Daily maximum</span>
              <span>{formatDose(maximum)} mg</span>
            </div>
            <div
              className={styles.goalTrack}
              role="progressbar"
              aria-label={`${row.name}: recorded amount against daily maximum`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`${amount} mg recorded; maximum ${formatDose(maximum)} mg${overMaximum ? "; above daily maximum" : ""}`}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            {overMaximum && (
              <p className={styles.goalNote}>Above daily maximum</p>
            )}
          </div>
        ) : (
          <p className={styles.lastTaken}>
            <Clock3 size={11} aria-hidden="true" />
            {row.lastTakenAt && lastTime ? (
              <>
                Latest at{" "}
                <time
                  dateTime={row.lastTakenAt}
                  title={timestamp.format(new Date(row.lastTakenAt))}
                  aria-label={timestamp.format(new Date(row.lastTakenAt))}
                >
                  {lastTime}
                </time>
              </>
            ) : (
              "No intake time recorded"
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/** A view of recorded doses; medication totals are always kept separate. */
export function DailyLogOverview({
  data,
  day,
}: {
  data: AppData;
  day: string;
}) {
  const overview = dailyOverview(data, day);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const timestamp = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.settings.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });
  const fullDate = formatDay(day, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div
      className={styles.overview}
      data-daily-log-overview
      data-overview-day={day}
    >
      <header className={styles.heading}>
        <div className={styles.headingTop}>
          <div>
            <p className={styles.eyebrow}>Daily Log</p>
            <h1
              className={styles.dayTitle}
              aria-label={`Daily Log, ${fullDate}`}
            >
              <time dateTime={day}>
                {formatDay(day, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </h1>
          </div>
          <span className={styles.year}>
            <BookOpenText size={19} strokeWidth={1.75} aria-hidden="true" />
            {day.slice(0, 4)}
          </span>
        </div>
        <p className={styles.trackingWindow}>
          <span className={styles.windowTime}>
            <Clock3 size={12} aria-hidden="true" />
            06:00 <span aria-hidden="true">→</span>
            <span className="sr-only">to</span> 06:00 next day
          </span>
          <span className={styles.timezone}>
            {data.settings.timezone.replaceAll("_", " ")}
          </span>
        </p>
      </header>
      <section aria-label="Daily overview">
        <dl className={styles.stats} data-card-entry>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Logged intakes</dt>
            <dd className={styles.statValue} data-overview-intakes>
              {numbers.format(overview.intakeCount)}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Medications logged</dt>
            <dd className={styles.statValue} data-overview-medications>
              {numbers.format(overview.medicationCount)}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>Latest intake</dt>
            <dd className={`${styles.statValue} ${styles.latestValue}`}>
              {overview.lastTakenAt ? (
                <time
                  dateTime={overview.lastTakenAt}
                  title={timestamp.format(new Date(overview.lastTakenAt))}
                  aria-label={timestamp.format(new Date(overview.lastTakenAt))}
                >
                  {clock.format(new Date(overview.lastTakenAt))}
                </time>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <div className={styles.sectionHeading}>
          <h2>Medication Totals</h2>
          <span>Recorded amounts</span>
        </div>
        {overview.rows.length ? (
          <ul className={styles.grid}>
            {overview.rows.map((row) => (
              <MedicationTotal
                key={row.medicationId}
                row={row}
                clock={clock}
                timestamp={timestamp}
              />
            ))}
          </ul>
        ) : (
          <div className={styles.empty} data-card-entry>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Layers3 size={22} strokeWidth={1.5} />
            </span>
            <div>
              <h3>No Intakes Logged</h3>
              <p>
                Medication totals will appear here when an intake is recorded
                for this day.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
