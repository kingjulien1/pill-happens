"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import {
  getMorningSleepSummary,
  recordedStageMinutes,
  nightFeelingPercent,
  sleepTargetMinutes,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import { SleepScoreRing } from "./sleep-score-ring";
import { CheckInSection } from "./check-in-section";
import { useVisibleMotion } from "./use-visible-motion";
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

function SleepMetric({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail: ReactNode;
}) {
  return (
    <div data-sleep-metric={label.toLowerCase().replaceAll(" ", "-")}>
      <dt>{label}</dt>
      <dd className={styles.metricValue}>
        {value ?? "—"}
        {value != null && unit && <span>{unit}</span>}
      </dd>
      <dd className={styles.metricNote}>{detail}</dd>
    </div>
  );
}

export function SleepScoreSummary({
  value,
  disabled,
}: {
  value: MorningSleepDraft;
  disabled: boolean;
}) {
  const id = useId();
  const stageTotal = recordedStageMinutes(value);
  const savedHours = reportNumber(value.sleepHours, 24);
  const savedMinutes = reportNumber(value.sleepMinutes, 59);
  const legacyTotal =
    savedHours === null && savedMinutes === null
      ? null
      : (savedHours ?? 0) * 60 + (savedMinutes ?? 0);
  const total =
    stageTotal === null
      ? legacyTotal
      : Number.isFinite(stageTotal)
        ? stageTotal
        : null;
  const summary = getMorningSleepSummary({
    lightsOut: value.lightsOut,
    gotUp: value.gotUp,
    totalSleepMinutes: total,
  });
  const score = reportNumber(value.reportScore, 100);
  const regularity = reportNumber(value.regularity, 100);
  const snoring = reportNumber(value.snoringMinutes, 1440);
  const coughing = reportNumber(value.coughingRate, Infinity, true);
  const overnightTiming = [
    {
      label: "Time to fall asleep",
      minutes: reportNumber(value.fallAsleepMinutes, 1440),
    },
    { label: "Time awake", minutes: reportNumber(value.awakeMinutes, 1440) },
  ];
  const felt = nightFeelingPercent(value);
  const timeShare =
    summary.sleepEfficiency === null
      ? null
      : Math.round(summary.sleepEfficiency);
  const sleepStages = stages.map((stage) => ({
    ...stage,
    minutes: reportNumber(value[stage.key], 1440),
  }));
  const recordedStages = sleepStages.filter((stage) => stage.minutes !== null);
  const hasStageBreakdown =
    stageTotal !== null && Number.isFinite(stageTotal) && stageTotal > 0;
  const visibleStages = hasStageBreakdown
    ? recordedStages.filter((stage) => stage.minutes! > 0)
    : [];
  const tightStageLabels = visibleStages.some(
    (stage) => stage.minutes! / stageTotal! < 0.1,
  );
  const stageMotion = useVisibleMotion(hasStageBreakdown && !disabled);
  return (
    <CheckInSection
      recap
      caption="The Night, In Numbers"
      context="Sleep Cycle"
      detail="Night recap"
      headingId={`${id}-heading`}
      description="Your Sleep Cycle report supplies the score. The stages and bedtimes above show how much of the night you spent asleep."
    >
      <section
        className={styles.section}
        aria-labelledby={`${id}-heading`}
        data-sleep-score-summary
      >
        <dl className={styles.overnightTiming} aria-label="Overnight timing">
          {overnightTiming.map(({ label, minutes }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {minutes === null ? (
                  <span>Not recorded</span>
                ) : minutes < 60 ? (
                  `${minutes} min`
                ) : (
                  duration(minutes)
                )}
              </dd>
            </div>
          ))}
        </dl>
        <div className={styles.overview}>
          <div className={styles.ringSlot}>
            <SleepScoreRing id={id} score={score} disabled={disabled} />
          </div>
          <div className={styles.readings}>
            <p className={styles.groupLabel}>Night details</p>
            <dl className={styles.stats}>
              <SleepMetric
                label="Sleep target gap"
                value={
                  total === null
                    ? null
                    : duration(Math.max(0, sleepTargetMinutes - total))
                }
                detail="To your 10h 30m target"
              />
              <div data-sleep-metric="night-sounds">
                <dt className={styles.soundHeading}>Night sounds</dt>
                <dd className={styles.soundReadings}>
                  <span>
                    Snoring{" "}
                    <strong>{snoring === null ? "—" : `${snoring} min`}</strong>
                  </span>
                  <span>
                    Coughing{" "}
                    <strong>{coughing === null ? "—" : `${coughing}/h`}</strong>
                  </span>
                </dd>
              </div>
              <SleepMetric
                label="How the night felt"
                value={felt}
                unit="%"
                detail={
                  felt === null
                    ? "Rate your sleep above"
                    : "From your check-in ratings"
                }
              />
            </dl>
          </div>
          <div className={styles.totals}>
            <p className={styles.groupLabel}>Sleep totals</p>
            <dl className={styles.stats}>
              <SleepMetric
                label="Total asleep"
                value={duration(total)}
                detail={
                  total === null
                    ? "Add sleep stages above"
                    : recordedStages.length > 0
                      ? recordedStages.map((stage) => stage.label).join(" + ")
                      : "Saved sleep duration"
                }
              />
              <SleepMetric
                label="Time in bed"
                value={duration(summary.timeInBedMinutes)}
                detail={
                  summary.timeInBedMinutes !== null
                    ? `${value.lightsOut} → ${value.gotUp}`
                    : "Add bed & wake times"
                }
              />
              <SleepMetric
                label="Sleep efficiency"
                value={regularity ?? timeShare}
                unit="%"
                detail={
                  regularity !== null
                    ? timeShare === null
                      ? "Sleep Cycle · Regularity"
                      : `Report regularity · ${timeShare}% of bed time asleep`
                    : timeShare !== null
                      ? "Recorded sleep ÷ time in bed"
                      : "Add a report or sleep times"
                }
              />
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
            <span>Recorded stages only</span>
          </div>
          <div
            className={styles.stageChart}
            data-tight-labels={tightStageLabels}
            role="img"
            aria-label={
              hasStageBreakdown
                ? recordedStages
                    .map(
                      (stage) => `${stage.label}: ${duration(stage.minutes)}`,
                    )
                    .join("; ")
                : stageTotal === 0
                  ? "Recorded stages total zero minutes"
                  : "Add a sleep stage to see its share"
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
            {recordedStages.map((stage) => (
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
        <footer
          className={styles.footer}
          aria-labelledby={`${id}-footer-heading`}
          data-sleep-summary-footer
        >
          <div className={styles.footerFade} aria-hidden="true" />
          <h4 id={`${id}-footer-heading`}>
            <Info size={14} strokeWidth={2} aria-hidden="true" />
            How this recap works
            <Info size={14} strokeWidth={2} aria-hidden="true" />
          </h4>
          <p>
            <strong>Sleep efficiency</strong> shows Regularity when your report
            includes it. The time-based percentage divides recorded sleep by
            time in bed. Stage bars share only the minutes you have entered. A
            blank stage is unknown, and 0 is a recorded zero.
          </p>
          <p>
            <strong>How the night felt</strong> averages your answered
            restfulness, sleep quality, depth and wakefulness ratings on a 0–100
            scale. Lower sleepiness means more wakefulness. Dream recall
            describes what you remember and stays separate.
          </p>
          <nav className={styles.footerLinks} aria-label="Sleep recap help">
            <a
              href="/guide#check-in"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Check-in guide (opens in a new tab)"
            >
              Check-in guide
              <ArrowUpRight size={11} aria-hidden="true" />
            </a>
            <a
              href="https://support.sleepcycle.com/hc/en-us/articles/206704659-How-does-the-app-calculate-Sleep-Quality"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Sleep Cycle score explanation (opens in a new tab)"
            >
              Sleep Cycle score
              <ArrowUpRight size={11} aria-hidden="true" />
            </a>
          </nav>
        </footer>
      </section>
    </CheckInSection>
  );
}
