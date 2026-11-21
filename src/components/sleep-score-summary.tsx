"use client";

import { useId, type CSSProperties } from "react";
import {
  getMorningSleepSummary,
  parseMorningSleepDraft,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import { SleepScoreRing } from "./sleep-score-ring";
import styles from "./sleep-score-summary.module.css";

function duration(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function reportNumber(
  raw: string | undefined,
  maximum: number,
  decimal = false,
) {
  const text = raw?.trim();
  if (!text || !(decimal ? /^\d+(?:\.\d+)?$/ : /^\d+$/).test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && number <= maximum ? number : null;
}

const stages = [
  { key: "lightMinutes", label: "Light", tone: "light" },
  { key: "dreamMinutes", label: "Dream", tone: "dream" },
  { key: "deepMinutes", label: "Deep", tone: "deep" },
] as const;

export function SleepScoreSummary({
  value,
  disabled,
  onChange,
  ratingsHeadingId,
}: {
  value: MorningSleepDraft;
  disabled: boolean;
  onChange: (next: MorningSleepDraft) => void;
  ratingsHeadingId?: string;
}) {
  const id = useId();
  // Editing a score must not temporarily erase otherwise valid time/stage math.
  const parsed = parseMorningSleepDraft({
    ...value,
    reportScore: undefined,
    regularity: undefined,
    snoringMinutes: undefined,
    coughingRate: undefined,
  }).value;
  const summary = getMorningSleepSummary(parsed);
  const score = reportNumber(value.reportScore, 100);
  const readings = [
    {
      label: "Regularity",
      value: reportNumber(value.regularity, 100),
      unit: "%",
    },
    {
      label: "Snoring",
      value: reportNumber(value.snoringMinutes, 1440),
      unit: "min",
    },
    {
      label: "Coughing",
      value: reportNumber(value.coughingRate, Infinity, true),
      unit: "/ h",
    },
  ];
  const presentReadings =
    readings.filter((reading) => reading.value !== null).length +
    Number(score !== null);
  const sleepStages = stages.map((stage) => ({
    ...stage,
    minutes: reportNumber(value[stage.key], 1440),
  }));
  const stageTotal = sleepStages.every((stage) => stage.minutes !== null)
    ? sleepStages.reduce((sum, stage) => sum + stage.minutes!, 0)
    : null;
  const validStageTotal = stageTotal !== null && stageTotal <= 1440;
  const windowLabel =
    parsed?.lightsOut && parsed?.gotUp
      ? `${parsed.lightsOut} → ${parsed.gotUp}`
      : "Add bed & wake times";

  const revisitFeelings = () => {
    const target = ratingsHeadingId
      ? document.getElementById(ratingsHeadingId)
      : null;
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <h3 id={`${id}-heading`}>The Overnight Evidence</h3>
        <span>
          Tracker <span aria-hidden="true">·</span> Your context
        </span>
      </div>
      <section
        className={styles.section}
        aria-labelledby={`${id}-heading`}
        data-sleep-score-summary
      >
        <div className={styles.topline}>
          <div>
            <span>Bedtime → waking</span>
            <strong>{windowLabel}</strong>
          </div>
          <div>
            <span>Readings entered</span>
            <strong>
              {presentReadings}
              <span> / 4</span>
            </strong>
          </div>
        </div>

        <div className={styles.overview}>
          <div className={styles.ringSlot}>
            <SleepScoreRing
              id={id}
              score={score}
              rawScore={value.reportScore ?? ""}
              disabled={disabled}
              onScoreChange={(reportScore) =>
                onChange({ ...value, reportScore })
              }
            />
          </div>
          <div className={styles.readings}>
            <p className={styles.groupLabel}>Tracker readings</p>
            <dl className={styles.stats}>
              {readings.map((reading) => (
                <div
                  key={reading.label}
                  data-sleep-report-reading={reading.label.toLowerCase()}
                >
                  <dt>{reading.label}</dt>
                  <dd>
                    {reading.value ?? "—"}
                    {reading.value !== null && <span>{reading.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={styles.totals}>
            <p className={styles.groupLabel}>Time-based totals</p>
            <dl className={styles.stats}>
              <div>
                <dt>Total asleep</dt>
                <dd>{duration(parsed?.totalSleepMinutes)}</dd>
              </div>
              <div>
                <dt>Time in bed</dt>
                <dd>{duration(summary.timeInBedMinutes)}</dd>
              </div>
              <div>
                <dt>Sleep efficiency</dt>
                <dd>
                  {summary.sleepEfficiency === null
                    ? "—"
                    : Math.round(summary.sleepEfficiency)}
                  {summary.sleepEfficiency !== null && <span>%</span>}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className={styles.stageSummary}>
          <div className={styles.stageHeading}>
            <strong>How Your Sleep Adds Up</strong>
            <span>Asleep time only</span>
          </div>
          <div
            className={styles.stageBar}
            role="img"
            aria-label={
              validStageTotal
                ? sleepStages
                    .map(
                      (stage) => `${stage.label}: ${duration(stage.minutes)}`,
                    )
                    .join("; ")
                : "Sleep-stage breakdown awaiting complete readings"
            }
          >
            {validStageTotal &&
              sleepStages.map((stage) => (
                <span
                  key={stage.key}
                  data-stage-tone={stage.tone}
                  style={{ "--stage-share": stage.minutes } as CSSProperties}
                />
              ))}
          </div>
          <dl className={styles.stageLegend}>
            {sleepStages.map((stage) => (
              <div key={stage.key}>
                <dt>
                  <i data-stage-tone={stage.tone} aria-hidden="true" />
                  {stage.label}
                </dt>
                <dd>{duration(stage.minutes)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <footer className={styles.footer}>
          <p>
            Efficiency is time asleep ÷ time in bed. The score comes from your
            tracker; your ratings below capture what the numbers miss.
          </p>
          {ratingsHeadingId && (
            <button
              type="button"
              className={styles.feelingsLink}
              onClick={revisitFeelings}
            >
              Add your verdict <span aria-hidden="true">↗</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
