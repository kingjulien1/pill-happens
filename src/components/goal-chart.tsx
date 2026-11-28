"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDay, formatDose, shiftDayKey, type AppData } from "@/lib/domain";
import {
  goalLabels,
  goalStatus,
  goalWindow,
  goalWindowStats,
  shortGoalDate,
  type GoalChartDay,
} from "@/lib/goal-progress";
import styles from "./goals-page.module.css";

function targetPath(days: GoalChartDay[], ceiling: number) {
  let path = "";
  days.forEach(({ limitMg }, i) => {
    if (limitMg === null) return;
    const y = 100 - (100 * limitMg) / ceiling;
    path +=
      i === 0 || days[i - 1].limitMg === null ? ` M ${i},${y}` : ` V ${y}`;
    path += ` H ${i + 1}`;
  });
  return path;
}

export function GoalChart({
  data,
  medicationId,
  today,
  end,
  first,
  onEndChange,
}: {
  data: AppData;
  medicationId: string;
  today: string;
  end: string;
  first: string;
  onEndChange: (day: string) => void;
}) {
  const [length, setLength] = useState(14);
  const [picked, setPicked] = useState(end);
  const chartId = useId();
  const days = useMemo(
    () => goalWindow(data, medicationId, end, length),
    [data, medicationId, end, length],
  );
  const priorEnd =
    days[0].day === "0000-01-01" ? null : shiftDayKey(days[0].day, -1);
  const previous = useMemo(
    () => (priorEnd ? goalWindow(data, medicationId, priorEnd, length) : []),
    [data, medicationId, priorEnd, length],
  );
  const stats = goalWindowStats(days, today),
    preceding = goalWindowStats(previous, today);
  const delta =
    stats.averageMg !== null && preceding.averageMg !== null
      ? stats.averageMg - preceding.averageMg
      : null;
  const max = Math.max(
    ...days.map((d) => Math.max(d.totalMg ?? 0, d.limitMg ?? 0)),
  );
  const ceiling = max || 1;
  const selected = days.find((d) => d.day === picked) ?? days[days.length - 1];
  const noChartData = !days.some(
    (d) => d.totalMg !== null || d.limitMg !== null,
  );
  function arrowKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const destination = {
      ArrowLeft: i - 1,
      ArrowRight: i + 1,
      Home: 0,
      End: days.length - 1,
    }[e.key];
    if (destination === undefined) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(days.length - 1, destination));
    setPicked(days[next].day);
    e.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
  }
  function moveEnd(next: string) {
    const date = next > today ? today : next;
    onEndChange(date);
    setPicked(date);
  }
  return (
    <section
      id="goals-plot"
      className={styles.chartPanel}
      aria-labelledby={chartId}
      data-goal-chart
    >
      <header className={styles.chartHead}>
        <div>
          <span className={styles.eyebrow}>
            <ChartNoAxesColumn size={13} /> Intake history
          </span>
          <h3 id={chartId}>Your daily amounts</h3>
        </div>
        <div className={styles.ranges} role="group" aria-label="Chart range">
          {[7, 14, 28].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={n + " days"}
              aria-pressed={length === n}
              onClick={() => setLength(n)}
            >
              {n}d
            </button>
          ))}
        </div>
      </header>
      <div className={styles.legend}>
        <span>
          <i />
          Logged mg
        </span>
        <span>
          <i />
          Daily goal
        </span>
        <span>
          <i />
          No log
        </span>
      </div>
      <div className={styles.chartWindow}>
        <span>
          {shortGoalDate(days[0].day)} –{" "}
          {formatDay(end, {
            weekday: undefined,
            month: "short",
            year: "numeric",
          })}
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous chart period"
            disabled={!priorEnd || days[0].day <= first}
            onClick={() => priorEnd && moveEnd(priorEnd)}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Next chart period"
            disabled={end >= today}
            onClick={() => moveEnd(shiftDayKey(end, length))}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className={styles.plotWrap}>
        <div aria-hidden="true" className={styles.axis}>
          <span>{max > 0 ? formatDose(ceiling) : "—"}</span>
          <span>mg</span>
          <span>0</span>
        </div>
        <div className={styles.plot}>
          <div
            className={styles.bars}
            role="group"
            aria-label="Inspect a tracking day"
            style={{
              gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))`,
            }}
          >
            {days.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-pressed={selected.day === d.day}
                tabIndex={selected.day === d.day ? 0 : -1}
                aria-label={`${shortGoalDate(d.day)}, ${d.totalMg === null ? "no intake logged" : formatDose(d.totalMg) + " mg logged"}${d.limitMg === null ? "" : ", daily goal " + formatDose(d.limitMg) + " mg"}`}
                onKeyDown={(e) => arrowKey(e, i)}
                onClick={() => setPicked(d.day)}
                data-status={
                  d.limitMg === null ? "none" : goalStatus(d.totalMg, d.limitMg)
                }
              >
                <i
                  data-empty={d.totalMg === null || undefined}
                  style={{
                    height:
                      d.totalMg === null
                        ? undefined
                        : (100 * d.totalMg) / ceiling + "%",
                  }}
                />
              </button>
            ))}
          </div>
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${days.length} 100`}
            preserveAspectRatio="none"
          >
            <path
              d={targetPath(days, ceiling)}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className={styles.dayTicks} aria-hidden="true">
          {[
            days[0],
            days[Math.floor((days.length - 1) / 2)],
            days[days.length - 1],
          ]
            .filter((d, i, ticks) => ticks.indexOf(d) === i)
            .map((d) => (
              <span key={d.day}>{shortGoalDate(d.day)}</span>
            ))}
        </div>
      </div>
      <div className={styles.inspector} aria-live="polite">
        <div>
          <strong>
            {shortGoalDate(selected.day)}
            {selected.day === today ? " · Today" : ""}
          </strong>
          <span>
            {selected.totalMg === null
              ? "No intake logged"
              : formatDose(selected.totalMg) + " mg logged"}{" "}
            ·{" "}
            {selected.limitMg === null
              ? "No goal set"
              : `${formatDose(selected.limitMg)} mg goal`}
          </span>
        </div>
        <Link href={`/history/${selected.day}`}>
          Day log <ArrowUpRight size={13} />
        </Link>
      </div>
      {noChartData && (
        <p className={styles.tip}>
          There are no entries or goals for this period. Choose another date to
          explore your history.
        </p>
      )}
      <dl className={styles.stats}>
        <div>
          <dt>Days within goal</dt>
          <dd>
            {stats.assessed ? `${stats.within} / ${stats.assessed}` : "—"}
          </dd>
        </div>
        <div>
          <dt>Daily average</dt>
          <dd>
            {stats.averageMg === null ? (
              "—"
            ) : (
              <>
                {formatDose(Number(stats.averageMg.toFixed(2)))}{" "}
                <small>mg</small>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Logged days</dt>
          <dd>{stats.recorded}</dd>
        </div>
      </dl>
      <p className={styles.tip}>
        Figures use finished days with logs.{" "}
        {delta === null
          ? "Days within goal include days exactly at your maximum."
          : `The average is ${Math.abs(delta) < 0.005 ? "unchanged" : formatDose(Number(Math.abs(delta).toFixed(2))) + " mg " + (delta < 0 ? "lower" : "higher")} compared with ${preceding.recorded} logged ${preceding.recorded === 1 ? "day" : "days"} in the previous ${length}-day window.`}
      </p>
      <details className={styles.dataDetails}>
        <summary>Daily figures</summary>
        <table>
          <caption className="sr-only">
            Daily intake totals and goals in milligrams
          </caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Logged</th>
              <th>Goal</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day}>
                <th scope="row">{shortGoalDate(d.day)}</th>
                <td>{d.totalMg === null ? "—" : formatDose(d.totalMg)}</td>
                <td>{d.limitMg === null ? "—" : formatDose(d.limitMg)}</td>
                <td>
                  {d.limitMg === null
                    ? "No goal"
                    : goalLabels[goalStatus(d.totalMg, d.limitMg)]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
