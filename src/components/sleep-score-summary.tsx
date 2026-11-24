"use client";

import { useId, type CSSProperties } from "react";
import {
  getMorningSleepSummary,
  parseMorningSleepDraft,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import { SleepScoreRing } from "./sleep-score-ring";
import { CheckInSectionHeader } from "./check-in-section";
import { useSleepScoreMotion } from "./use-sleep-score-motion";
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
}: {
  value: MorningSleepDraft;
  disabled: boolean;
  onChange: (next: MorningSleepDraft) => void;
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
  const sleepStages = stages.map((stage) => ({
    ...stage,
    minutes: reportNumber(value[stage.key], 1440),
  }));
  const stageTotal = sleepStages.every((stage) => stage.minutes !== null)
    ? sleepStages.reduce((sum, stage) => sum + stage.minutes!, 0)
    : null;
  const validStageTotal = stageTotal !== null && stageTotal <= 1440;
  const hasStageBreakdown = validStageTotal && stageTotal > 0;
  const visibleStages = hasStageBreakdown
    ? sleepStages.filter((stage) => stage.minutes! > 0)
    : [];
  const tightStageLabels = visibleStages.some(
    (stage) => stage.minutes! / stageTotal! < 0.1,
  );
  const stageMotion = useSleepScoreMotion(hasStageBreakdown && !disabled);
  return (
    <div className={styles.wrapper}>
      <CheckInSectionHeader
        caption="The Night, In Numbers"
        context="Sleep Cycle"
        detail="Night recap"
        headingId={`${id}-heading`}
        description="Compare your tracker’s score with time asleep and time in bed. Edit the score in the ring; the sleep stages above update your totals automatically."
      />
      <section
        className={styles.section}
        aria-labelledby={`${id}-heading`}
        data-sleep-score-summary
      >
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

        <div
          ref={stageMotion}
          className={styles.stageSummary}
          data-sleep-stage-summary
          data-active="false"
        >
          <div className={styles.stageHeading}>
            <strong>How Your Sleep Adds Up</strong>
            <span>Asleep time only</span>
          </div>
          <div
            className={styles.stageChart}
            data-tight-labels={tightStageLabels}
            role="img"
            aria-label={
              hasStageBreakdown
                ? sleepStages
                    .map(
                      (stage) => `${stage.label}: ${duration(stage.minutes)}`,
                    )
                    .join("; ")
                : validStageTotal
                  ? "No sleep time recorded"
                  : "Sleep-stage breakdown awaiting complete readings"
            }
          >
            <div className={styles.stageBar} aria-hidden="true">
              {visibleStages.map((stage) => (
                <span
                  className={styles.stageSegment}
                  key={stage.key}
                  data-stage-tone={stage.tone}
                  style={{ "--stage-share": stage.minutes } as CSSProperties}
                >
                  <span className={styles.stagePercent}>
                    {Math.round((stage.minutes! / stageTotal!) * 100) || "<1"}
                    <small>%</small>
                  </span>
                </span>
              ))}
            </div>
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
            tracker; your ratings above capture what the numbers miss.
          </p>
        </footer>
      </section>
    </div>
  );
}
