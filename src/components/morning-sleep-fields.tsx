"use client";

import { SleepCycleImport } from "./sleep-cycle-import";
import { SleepScoreSummary } from "./sleep-score-summary";
import { CheckInSection } from "./check-in-section";
import { Input } from "@/components/ui/input";
import { CheckInRating } from "@/components/check-in-rating";
import { Label } from "@/components/ui/label";
import {
  withSleepStageTotals,
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
  { key: "sleepDepth", label: "Sleep depth", low: "Light", high: "Deep" },
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

type MinuteField =
  | "fallAsleepMinutes"
  | "awakeMinutes"
  | "lightMinutes"
  | "dreamMinutes"
  | "deepMinutes";

function DurationField({
  id,
  label,
  hours,
  minutes,
  disabled,
  readOnly,
  onHoursChange,
  onMinutesChange,
}: {
  id: string;
  label: string;
  hours: string;
  minutes: string;
  disabled: boolean;
  readOnly?: boolean;
  onHoursChange?: (next: string) => void;
  onMinutesChange?: (next: string) => void;
}) {
  return (
    <fieldset className={styles.durationField} disabled={disabled}>
      <legend className={styles.durationLegend}>{label}</legend>
      <div className={styles.durationInputs}>
        {(
          [
            ["hours", hours, "h", 24, onHoursChange],
            ["minutes", minutes, "min", 59, onMinutesChange],
          ] as const
        ).map(([unit, value, suffix, max, change]) => (
          <div className={styles.field} key={unit}>
            <Label htmlFor={`${id}-${unit}`}>
              {label}, {unit}
            </Label>
            <div className={styles.inputWithUnit}>
              <Input
                id={`${id}-${unit}`}
                name={`${id}-${unit}`}
                className={`${styles.input} ${styles.unitInput}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                step={1}
                value={value || "0"}
                readOnly={readOnly}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value;
                  if (/^\d*$/.test(next) && Number(next) <= max) change?.(next);
                }}
              />
              <span className={styles.inputUnit} aria-hidden="true">
                {suffix}
              </span>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function MinuteDuration({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const valid = !value || (/^\d+$/.test(value) && Number(value) <= 1440);
  const total = valid ? Number(value || 0) : 0;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return (
    <div>
      <DurationField
        id={id}
        label={label}
        hours={String(hours)}
        minutes={String(minutes)}
        disabled={disabled}
        onHoursChange={(next) =>
          onChange(String(Number(next || 0) * 60 + minutes))
        }
        onMinutesChange={(next) =>
          onChange(String(hours * 60 + Number(next || 0)))
        }
      />
      {!valid && (
        <p className={styles.hint}>
          Please re-enter this duration to finish the saved draft.
        </p>
      )}
    </div>
  );
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
  ) => {
    const updated = { ...value, [key]: next };
    if (["lightMinutes", "dreamMinutes", "deepMinutes"].includes(key)) {
      updated.lightMinutes ||= "0";
      updated.dreamMinutes ||= "0";
      updated.deepMinutes ||= "0";
    }
    onChange(withSleepStageTotals(updated));
  };
  const duration = (key: MinuteField, label: string, suffix = "") => (
    <MinuteDuration
      key={key}
      id={`${id}-${key}${suffix}`}
      label={label}
      value={value[key] ?? ""}
      disabled={disabled}
      onChange={(next) => setField(key, next)}
    />
  );

  return (
    <div className={styles.fields} data-morning-sleep-fields>
      <SleepCycleImport value={value} onChange={onChange} disabled={disabled} />
      <CheckInSection
        caption="The Night’s Timeline"
        context="Overnight"
        detail="24-hour clock"
        headingId={`${id}-timeline-heading`}
      >
        <section
          className={styles.section}
          aria-labelledby={`${id}-timeline-heading`}
        >
          <div
            className={styles.schedule}
            data-check-in-section="morning-schedule"
          >
            <div className={styles.pair}>
              {(
                [
                  ["lightsOut", "Went to Bed"],
                  ["gotUp", "Woke Up"],
                ] as const
              ).map(([key, label]) => (
                <div className={styles.field} key={key}>
                  <Label htmlFor={`${id}-${key}`}>{label}</Label>
                  <Input
                    id={`${id}-${key}`}
                    name={key}
                    data-sleep-field={key}
                    className={`${styles.input} ${styles.timeInput}`}
                    type="time"
                    step={60}
                    value={value[key]}
                    disabled={disabled}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
            {duration("fallAsleepMinutes", "Asleep After")}
            {duration("awakeMinutes", "Awake")}
          </div>
        </section>
      </CheckInSection>
      <CheckInSection
        caption="The Sleep Breakdown"
        detail="From your report"
        headingId={`${id}-duration-heading`}
      >
        <section
          className={styles.section}
          aria-labelledby={`${id}-duration-heading`}
          data-check-in-section="morning-duration"
        >
          <div className={styles.durations}>
            {duration("fallAsleepMinutes", "Asleep After", "-rest")}
            {duration("lightMinutes", "Light Sleep")}
            {duration("dreamMinutes", "Dream Sleep · REM")}
            {duration("deepMinutes", "Deep Sleep")}
            <DurationField
              id={`${id}-extra-sleep`}
              label="More Sleep You Wanted"
              hours={value.extraSleepHours}
              minutes={value.extraSleepMinutes}
              disabled={disabled}
              readOnly
            />
          </div>
          <p className={styles.hint}>
            10 h 30 min minus Light + Dream + Deep Sleep, with a minimum of 0 h
            0 min.
          </p>
        </section>
      </CheckInSection>
      <SleepScoreSummary
        ratingsHeadingId={`${id}-ratings-heading`}
        value={value}
        disabled={disabled}
        onChange={(next) => onChange(withSleepStageTotals(next))}
      />
      <CheckInSection
        caption="How the Night Felt"
        detail={
          <span title="Higher numbers mean more of each feeling, not necessarily better sleep.">
            More ≠ better
          </span>
        }
        headingId={`${id}-ratings-heading`}
      >
        <section
          className={styles.section}
          aria-labelledby={`${id}-ratings-heading`}
          data-check-in-section="morning-ratings"
        >
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
      </CheckInSection>
    </div>
  );
}
