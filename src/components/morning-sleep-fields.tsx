"use client";

import { Input } from "@/components/ui/input";
import { CheckInRating } from "@/components/check-in-rating";
import { Label } from "@/components/ui/label";
import {
  getMorningSleepSummary,
  parseMorningSleepDraft,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import styles from "./morning-sleep-fields.module.css";

const RATINGS = [
  {
    key: "dreamRecall",
    label: "Dream recall",
    low: "None recalled",
    high: "Many dreams",
  },
  {
    key: "sleepiness",
    label: "Sleepiness now",
    low: "Wide awake",
    high: "Very sleepy",
  },
  {
    key: "sleepDepth",
    label: "Sleep depth",
    low: "Light",
    high: "Deep",
  },
  {
    key: "restfulness",
    label: "Restfulness",
    low: "Not restful",
    high: "Very restful",
  },
  {
    key: "sleepQuality",
    label: "Overall sleep quality",
    low: "Very poor",
    high: "Excellent",
  },
] as const;

function NumberField({
  id,
  name,
  label,
  value,
  unit,
  max,
  disabled,
  onChange,
  describedBy,
}: {
  id: string;
  name: keyof MorningSleepDraft;
  label: string;
  value: string;
  unit?: string;
  max: number;
  disabled: boolean;
  onChange: (next: string) => void;
  describedBy?: string;
}) {
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles.inputWithUnit}>
        <Input
          id={id}
          name={name}
          data-sleep-field={name}
          className={`${styles.input} ${unit ? styles.unitInput : ""}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={value}
          placeholder="—"
          disabled={disabled}
          aria-label={
            unit === "min" && !label.endsWith(", minutes")
              ? `${label}, minutes`
              : undefined
          }
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit && (
          <span className={styles.inputUnit} aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SleepDuration({
  id,
  hoursName,
  minutesName,
  label,
  hours,
  minutes,
  disabled,
  onHoursChange,
  onMinutesChange,
}: {
  id: string;
  hoursName: "sleepHours" | "extraSleepHours";
  minutesName: "sleepMinutes" | "extraSleepMinutes";
  label: string;
  hours: string;
  minutes: string;
  disabled: boolean;
  onHoursChange: (next: string) => void;
  onMinutesChange: (next: string) => void;
}) {
  return (
    <fieldset className={styles.durationField} disabled={disabled}>
      <legend className={styles.durationLegend}>{label}</legend>
      <div className={styles.durationInputs}>
        <NumberField
          id={`${id}-hours`}
          name={hoursName}
          label={`${label}, hours`}
          value={hours}
          unit="h"
          max={24}
          disabled={disabled}
          onChange={onHoursChange}
        />
        <NumberField
          id={`${id}-minutes`}
          name={minutesName}
          label={`${label}, minutes`}
          value={minutes}
          unit="min"
          max={59}
          disabled={disabled}
          onChange={onMinutesChange}
        />
      </div>
    </fieldset>
  );
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export function MorningSleepFields({
  value,
  onChange,
  disabled,
  id,
}: {
  value: MorningSleepDraft;
  onChange: (next: MorningSleepDraft) => void;
  disabled: boolean;
  id: string;
}) {
  const setField = <K extends keyof MorningSleepDraft>(
    key: K,
    next: MorningSleepDraft[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <div className={styles.fields} data-morning-sleep-fields>
      <section
        className={styles.section}
        aria-labelledby={`${id}-ratings-heading`}
        data-check-in-section="morning-ratings"
      >
        <div className={styles.sectionHeading}>
          <h3 id={`${id}-ratings-heading`}>How the night felt</h3>
          <span>1–10 · Optional</span>
        </div>
        <p className={styles.hint}>
          Slide or tap to rate. Leave anything blank.
        </p>
        <div className={styles.ratings}>
          {RATINGS.map((rating) => (
            <CheckInRating
              key={rating.key}
              id={`${id}-${rating.key}`}
              name={rating.key}
              label={rating.label}
              low={rating.low}
              high={rating.high}
              morning
              value={value[rating.key]}
              disabled={disabled}
              onChange={(next) => setField(rating.key, next)}
            />
          ))}
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby={`${id}-timeline-heading`}
      >
        <div className={styles.sectionHeading}>
          <h3 id={`${id}-timeline-heading`}>The night’s timeline</h3>
          <span>Optional</span>
        </div>
        <div
          className={styles.schedule}
          data-check-in-section="morning-schedule"
        >
          <div className={styles.pair}>
            <div className={styles.field}>
              <Label htmlFor={`${id}-lights-out`}>Lights out</Label>
              <Input
                id={`${id}-lights-out`}
                name="lightsOut"
                data-sleep-field="lightsOut"
                className={`${styles.input} ${styles.timeInput}`}
                type="time"
                step={60}
                value={value.lightsOut}
                disabled={disabled}
                onChange={(event) => setField("lightsOut", event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor={`${id}-got-up`}>Got up</Label>
              <Input
                id={`${id}-got-up`}
                name="gotUp"
                data-sleep-field="gotUp"
                className={`${styles.input} ${styles.timeInput}`}
                type="time"
                step={60}
                value={value.gotUp}
                disabled={disabled}
                onChange={(event) => setField("gotUp", event.target.value)}
              />
            </div>
          </div>
          <NumberField
            id={`${id}-fall-asleep`}
            name="fallAsleepMinutes"
            label="Time to fall asleep"
            value={value.fallAsleepMinutes}
            unit="min"
            max={1440}
            disabled={disabled}
            onChange={(next) => setField("fallAsleepMinutes", next)}
          />
        </div>

        <div
          className={styles.interruptions}
          data-check-in-section="morning-interruptions"
        >
          <div className={styles.pair}>
            <NumberField
              id={`${id}-awakenings`}
              name="awakenings"
              label="Night awakenings"
              value={value.awakenings}
              max={100}
              disabled={disabled}
              describedBy={`${id}-awakenings-hint`}
              onChange={(next) => setField("awakenings", next)}
            />
            <NumberField
              id={`${id}-awake-minutes`}
              name="awakeMinutes"
              label="Total time awake"
              value={value.awakeMinutes}
              unit="min"
              max={1440}
              disabled={disabled}
              describedBy={`${id}-awakenings-hint`}
              onChange={(next) => setField("awakeMinutes", next)}
            />
          </div>
          <p id={`${id}-awakenings-hint`} className={styles.hint}>
            During the night, excluding your final wake-up. Enter 0 for none.
          </p>
        </div>
      </section>

      <section
        className={styles.section}
        aria-labelledby={`${id}-duration-heading`}
        data-check-in-section="morning-duration"
      >
        <div className={styles.sectionHeading}>
          <h3 id={`${id}-duration-heading`}>Sleep &amp; the morning ahead</h3>
          <span>Optional</span>
        </div>
        <div className={styles.durations}>
          <SleepDuration
            id={`${id}-total-sleep`}
            hoursName="sleepHours"
            minutesName="sleepMinutes"
            label="Time actually asleep"
            hours={value.sleepHours}
            minutes={value.sleepMinutes}
            disabled={disabled}
            onHoursChange={(next) => setField("sleepHours", next)}
            onMinutesChange={(next) => setField("sleepMinutes", next)}
          />
          <SleepDuration
            id={`${id}-extra-sleep`}
            hoursName="extraSleepHours"
            minutesName="extraSleepMinutes"
            label="More sleep you wanted"
            hours={value.extraSleepHours}
            minutes={value.extraSleepMinutes}
            disabled={disabled}
            onHoursChange={(next) => setField("extraSleepHours", next)}
            onMinutesChange={(next) => setField("extraSleepMinutes", next)}
          />
        </div>
        <p className={styles.hint}>
          Your best estimate is enough. Enter 0 if you wanted no more sleep.
        </p>
      </section>
    </div>
  );
}

/** A compact estimate beside the save action, never a required response. */
export function MorningSleepSummary({ value }: { value: MorningSleepDraft }) {
  const parsed = parseMorningSleepDraft(value);
  const summary = parsed.value
    ? getMorningSleepSummary(parsed.value)
    : { timeInBedMinutes: null, sleepEfficiency: null };
  return (
    <dl
      className={styles.summary}
      data-morning-sleep-summary
      aria-label="Sleep estimates from your current answers"
      title="Sleep efficiency is the estimated share of time in bed spent asleep."
    >
      <div>
        <dt>Time in bed</dt>
        <dd>{formatDuration(summary.timeInBedMinutes)}</dd>
      </div>
      <div>
        <dt>Sleep efficiency</dt>
        <dd>
          {summary.sleepEfficiency === null
            ? "—"
            : `${Math.round(summary.sleepEfficiency)}%`}
        </dd>
      </div>
    </dl>
  );
}
