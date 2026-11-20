"use client";

import { useId, type CSSProperties } from "react";
import {
  BedDouble,
  ChartNoAxesCombined,
  MoonStar,
  Sparkles,
} from "lucide-react";
import { Input } from "./ui/input";
import {
  getMorningSleepSummary,
  parseMorningSleepDraft,
  type MorningSleepDraft,
} from "@/lib/morning-sleep";
import styles from "./sleep-score-summary.module.css";

function duration(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

const additionalMetrics = [
  { key: "regularity", label: "Regularity", unit: "%", max: 100, step: 1 },
  { key: "snoringMinutes", label: "Snoring", unit: "min", max: 1440, step: 1 },
  {
    key: "coughingRate",
    label: "Coughing",
    unit: "/ h",
    max: undefined,
    step: "any",
  },
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
  const parsed = parseMorningSleepDraft(value).value;
  const summary = getMorningSleepSummary(parsed);
  const rawScore = value.reportScore?.trim() ?? "";
  const score =
    /^\d+$/.test(rawScore) && Number(rawScore) <= 100 ? Number(rawScore) : null;
  const chartStyle = { "--score-offset": 100 - (score ?? 0) } as CSSProperties;

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <div>
          <Sparkles size={17} strokeWidth={2} aria-hidden="true" />
          <h3 id={`${id}-heading`}>The Night, In Numbers</h3>
        </div>
        <span>Sleep Cycle</span>
      </div>
      <section
        className={styles.section}
        aria-labelledby={`${id}-heading`}
        data-sleep-score-summary
      >
        <div className={styles.overview}>
          <div className={styles.dial} style={chartStyle}>
            <span className={styles.halo} aria-hidden="true" />
            <svg
              viewBox="0 0 240 240"
              className={styles.ring}
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id={`${id}-gradient`}
                  x1="0"
                  y1="1"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#f9a8d4" />
                  <stop offset="48%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <path
                className={styles.track}
                d="M55.65 184.35a91 91 0 1 1 128.7 0"
                pathLength="100"
              />
              <path
                key={score ?? "empty"}
                className={styles.progress}
                d="M55.65 184.35a91 91 0 1 1 128.7 0"
                pathLength="100"
                stroke={`url(#${id}-gradient)`}
              />
            </svg>
            <div className={styles.score}>
              <label htmlFor={`${id}-score`}>Sleep Score</label>
              <div className={styles.scoreNumber}>
                <input
                  id={`${id}-score`}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  placeholder="—"
                  value={value.reportScore ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ ...value, reportScore: event.target.value })
                  }
                />
                <span>%</span>
              </div>
              <span className={styles.scoreCaption}>
                {score === null
                  ? "Add or import a score"
                  : "Your tracker’s nightly score"}
              </span>
            </div>
            <span className={styles.ringFoot}>Out Of 100</span>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt>
                <MoonStar size={15} aria-hidden="true" />
                Total Asleep
              </dt>
              <dd>{duration(parsed?.totalSleepMinutes)}</dd>
            </div>
            <div>
              <dt>
                <BedDouble size={15} aria-hidden="true" />
                Time In Bed
              </dt>
              <dd>{duration(summary.timeInBedMinutes)}</dd>
            </div>
            <div>
              <dt>
                <ChartNoAxesCombined size={15} aria-hidden="true" />
                Sleep Efficiency
              </dt>
              <dd>
                {summary.sleepEfficiency === null
                  ? "—"
                  : `${Math.round(summary.sleepEfficiency)}%`}
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.metrics}>
          {additionalMetrics.map((metric) => (
            <label key={metric.key} htmlFor={`${id}-${metric.key}`}>
              <span>{metric.label}</span>
              <div>
                <Input
                  id={`${id}-${metric.key}`}
                  type="number"
                  min={0}
                  max={metric.max}
                  step={metric.step}
                  inputMode={
                    metric.key === "coughingRate" ? "decimal" : "numeric"
                  }
                  value={value[metric.key] ?? ""}
                  placeholder="—"
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ ...value, [metric.key]: event.target.value })
                  }
                />
                <span aria-hidden="true">{metric.unit}</span>
              </div>
            </label>
          ))}
        </div>
        <p className={styles.note}>
          The score comes from your report. Efficiency uses your sleep stages
          and the time between bed and waking.
        </p>
      </section>
    </div>
  );
}
