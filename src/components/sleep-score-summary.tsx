"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import {
  getMorningSleepSummary,
  parseMorningSleepDraft,
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
  report = false,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  detail: ReactNode;
  report?: boolean;
}) {
  return (
    <div
      data-sleep-metric={label.toLowerCase().replaceAll(" ", "-")}
      data-sleep-report-reading={report ? label.toLowerCase() : undefined}
    >
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
  // Calculate stage totals independently of the imported tracker readings.
  const parsed = parseMorningSleepDraft({
    ...value,
    reportScore: undefined,
    regularity: undefined,
    snoringMinutes: undefined,
    coughingRate: undefined,
  }).value;
  const summary = getMorningSleepSummary(parsed);
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
  const snoringShare =
    snoring !== null &&
    summary.timeInBedMinutes !== null &&
    summary.timeInBedMinutes > 0 &&
    snoring <= summary.timeInBedMinutes
      ? Number(((snoring / summary.timeInBedMinutes) * 100).toFixed(1))
      : null;
  const outsideSleep =
    summary.sleepEfficiency !== null && parsed?.totalSleepMinutes != null
      ? summary.timeInBedMinutes! - parsed.totalSleepMinutes
      : null;
  const readings = [
    {
      label: "Regularity",
      value: regularity,
      unit: "%",
      detail: regularity === null ? "Not recorded" : "Tracker score · 0–100",
    },
    {
      label: "Snoring",
      value: snoring,
      unit: "min",
      detail:
        snoring === null ? (
          "Not recorded"
        ) : snoring === 0 ? (
          "No snoring reported"
        ) : snoringShare !== null ? (
          <>
            <strong>{snoringShare}%</strong> of time in bed
          </>
        ) : (
          "Recorded snoring duration"
        ),
    },
    {
      label: "Coughing",
      value: coughing,
      unit: "/ h",
      detail: coughing === null ? "Not recorded" : "Events per hour",
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
            <p className={styles.groupLabel}>Tracker readings</p>
            <dl className={styles.stats}>
              {readings.map((reading) => (
                <SleepMetric key={reading.label} {...reading} report />
              ))}
            </dl>
          </div>
          <div className={styles.totals}>
            <p className={styles.groupLabel}>Time-based totals</p>
            <dl className={styles.stats}>
              <SleepMetric
                label="Total asleep"
                value={duration(parsed?.totalSleepMinutes)}
                detail={
                  parsed?.totalSleepMinutes == null
                    ? "Add sleep stages above"
                    : validStageTotal
                      ? "Light + Dream + Deep"
                      : "Saved sleep duration"
                }
              />
              <SleepMetric
                label="Time in bed"
                value={duration(summary.timeInBedMinutes)}
                detail={
                  summary.timeInBedMinutes !== null
                    ? `${parsed!.lightsOut} → ${parsed!.gotUp}`
                    : "Add bed & wake times"
                }
              />
              <SleepMetric
                label="Sleep efficiency"
                value={
                  summary.sleepEfficiency === null
                    ? null
                    : Math.round(summary.sleepEfficiency)
                }
                unit="%"
                detail={
                  outsideSleep === null ? (
                    "Needs a sleep window"
                  ) : (
                    <>
                      <strong>{duration(outsideSleep)}</strong> outside sleep
                    </>
                  )
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
            <strong>Efficiency</strong> uses{" "}
            <span className={styles.formula}>asleep ÷ time in bed × 100</span>.
            The asleep total comes from Light, Dream and Deep; it excludes
            Asleep After and Awake.
          </p>
          <p>
            The sleep score is a separate report value; your ratings above
            capture how the night felt. <strong>Blank</strong> means unknown;{" "}
            <strong>0</strong> means a recorded zero.
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
