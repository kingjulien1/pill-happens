"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Flag,
  Flower2,
  Footprints,
  Infinity as InfinityIcon,
  Plus,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";
import { PageHeading, PageEmptyState } from "./page-heading";
import { MedicationIcon } from "./medication-icon";
import { MedicationClassBadges } from "./medication-class-badge";
import { DialogPrimaryButton } from "./dialog-primary-button";
import { GoalChart } from "./goal-chart";
import { GoalReading } from "./goal-progress";
import {
  goalHistory,
  medicationGoalTrend,
  shortGoalDate,
} from "@/lib/goal-progress";
import {
  formatDay,
  formatDose,
  goalForDay,
  isValidDayKey,
  shiftDayKey,
  totalsForDay,
  type AppData,
  type Goal,
} from "@/lib/domain";
import styles from "./goals-page.module.css";

const dated = (day: string) =>
  formatDay(day, { weekday: undefined, month: "short", year: "numeric" });

function MedicationJourney({
  data,
  medicationId,
  today,
  focusDay,
  history,
  onAdd,
  onRemove,
}: {
  data: AppData;
  medicationId: string;
  today: string;
  focusDay: string | null;
  history: Goal[];
  onAdd: (id?: string) => void;
  onRemove: (id: string) => void;
}) {
  const med = data.medications.find((m) => m.id === medicationId);
  const active = goalForDay(data, medicationId, today);
  const latestStarted = history.find((g) => g.startsOn <= today);
  const upcoming = history
    .filter(
      (g) =>
        g.startsOn > today &&
        goalForDay(data, medicationId, g.startsOn)?.id === g.id,
    )
    .at(-1);
  const featured = active ?? upcoming ?? latestStarted ?? history[0];
  const end =
    focusDay ??
    (!active && !upcoming && latestStarted?.endsOn
      ? latestStarted.endsOn
      : today);
  const [chartEnd, setChartEnd] = useState<string | null>(null);
  const trend = useMemo(
    () => medicationGoalTrend(data, medicationId, today),
    [data, medicationId, today],
  );
  const start = history[history.length - 1].startsOn;
  const first =
    trend.firstLog && trend.firstLog < start ? trend.firstLog : start;
  const { comparison } = trend;
  const change = comparison
    ? Number((comparison.recent.average - comparison.first.average).toFixed(2))
    : null;
  const priorCheckpoint = history
    .slice(history.indexOf(featured) + 1)
    .find((goal) => goal.startsOn < featured.startsOn);
  const targetDifference = priorCheckpoint
    ? Number((featured.dailyLimitMg - priorCheckpoint.dailyLimitMg).toFixed(8))
    : 0;
  const taken =
    totalsForDay(data, today).find((t) => t.medicationId === medicationId)
      ?.totalMg ?? null;
  return (
    <div className={styles.journey}>
      <section className={styles.hero}>
        <div className={styles.medRow}>
          <MedicationIcon
            small
            color={med?.color}
            icon={med?.icon}
            rotation={med?.iconRotation}
          />
          <div className={styles.identity}>
            <span className={styles.eyebrow}>
              {active
                ? "Current checkpoint"
                : upcoming
                  ? "Next checkpoint"
                  : "Previous checkpoint"}
            </span>
            <h2>
              {med ? (
                <Link href={`/medications/${encodeURIComponent(medicationId)}`}>
                  {med.name}
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                "Medication"
              )}
            </h2>
          </div>
          <MedicationClassBadges medication={med} />
        </div>
        <div className={styles.heroNumbers}>
          <div>
            <strong>{formatDose(featured.dailyLimitMg)}</strong>
            <span>mg daily goal</span>
          </div>
          <span className={styles.pace}>
            {featured.endsOn ? <CalendarDays /> : <InfinityIcon />}
            {featured.endsOn ? "Date range" : "At my pace"}
          </span>
        </div>
        <p className={styles.date}>
          {dated(featured.startsOn)}{" "}
          {featured.endsOn ? "— " + dated(featured.endsOn) : "onward"}
        </p>
        {priorCheckpoint && (
          <p className={styles.targetChange}>
            Previous checkpoint{" "}
            <b>{formatDose(priorCheckpoint.dailyLimitMg)} mg</b>
            <span>·</span>
            {targetDifference === 0
              ? "Same daily goal"
              : `${formatDose(Math.abs(targetDifference))} mg ${targetDifference < 0 ? "lower" : "higher"}`}
          </p>
        )}
        {active && (
          <GoalReading
            name="Today so far"
            totalMg={taken}
            limitMg={active.dailyLimitMg}
          />
        )}
        {featured.note && (
          <blockquote className={styles.note}>
            <Flower2 size={15} />
            <div>
              <strong>Your words</strong>
              <p>{featured.note}</p>
            </div>
          </blockquote>
        )}
      </section>
      <GoalChart
        data={data}
        medicationId={medicationId}
        today={today}
        end={chartEnd ?? end}
        first={first}
        onEndChange={setChartEnd}
      />
      <section className={styles.trend} aria-label="Long-term intake trend">
        <header>
          <span className={styles.eyebrow}>
            <Sprout size={14} /> Since you started
          </span>
          <h3>Your longer view</h3>
        </header>
        {comparison && change !== null ? (
          <>
            <p className={styles.trendLead}>
              {change === 0 ? (
                "Your recorded daily average held steady."
              ) : (
                <>
                  Your recorded daily average is{" "}
                  <strong>
                    {formatDose(Math.abs(change))} mg{" "}
                    {change < 0 ? "lower" : "higher"}
                  </strong>
                  .
                </>
              )}
            </p>
            <dl className={styles.samples}>
              {[
                { period: comparison.first, label: "First" },
                { period: comparison.recent, label: "Latest" },
              ].map(({ period, label }) => (
                <div key={label}>
                  <dt>
                    {label} {comparison.count} logged days
                  </dt>
                  <dd>{formatDose(Number(period.average.toFixed(2)))} mg</dd>
                  <small>
                    {shortGoalDate(period.start)} – {dated(period.end)}
                  </small>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className={styles.tip}>
            {trend.recorded} of 6 logged, finished days available for a first
            comparison. Once there are enough, you’ll see your earlier and more
            recent averages side by side.
          </p>
        )}
      </section>
      <section className={styles.steps}>
        <header>
          <span className={styles.eyebrow}>
            <Footprints size={14} /> Your checkpoints
          </span>
          <h3>How your goal has changed</h3>
        </header>
        <ol>
          {history.map((g, i) => {
            const replacement = history[i - 1];
            const superseded =
              !!replacement &&
              replacement.startsOn <= today &&
              (!g.endsOn || replacement.startsOn <= g.endsOn);
            const visibleEnd =
              replacement &&
              replacement.startsOn > g.startsOn &&
              (!g.endsOn || replacement.startsOn <= g.endsOn)
                ? shiftDayKey(replacement.startsOn, -1)
                : g.endsOn;
            const replacedSameDay = replacement?.startsOn === g.startsOn;
            const label = replacedSameDay
              ? "Replaced"
              : g.id === active?.id
                ? "Current"
                : g.startsOn > today
                  ? "Upcoming"
                  : superseded
                    ? "Replaced"
                    : "Ended";
            return (
              <li key={g.id}>
                <i aria-hidden="true" />
                <div>
                  <div className={styles.stepAmount}>
                    <b>{formatDose(g.dailyLimitMg)} mg</b>
                    <span>{label}</span>
                  </div>
                  <p>
                    {dated(g.startsOn)}
                    {visibleEnd && !replacedSameDay
                      ? " — " + dated(visibleEnd)
                      : ""}
                  </p>
                  {g.note && g.id !== featured.id && (
                    <p className={styles.pastNote}>{g.note}</p>
                  )}
                  {g.startsOn <= today && !replacedSameDay && (
                    <button
                      type="button"
                      className={styles.inline}
                      onClick={() => {
                        setChartEnd(
                          visibleEnd && visibleEnd < today ? visibleEnd : today,
                        );
                        document
                          .getElementById("goals-plot")
                          ?.scrollIntoView({ block: "nearest" });
                      }}
                    >
                      View period <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.delete}
                  aria-label={`Remove ${formatDose(g.dailyLimitMg)} mg goal starting ${dated(g.startsOn)}`}
                  onClick={() => onRemove(g.id)}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ol>
        {med && !med.archived && (
          <DialogPrimaryButton
            type="button"
            className="w-full"
            leadingIcon={<Flag />}
            onClick={() => onAdd(medicationId)}
          >
            Add a checkpoint
          </DialogPrimaryButton>
        )}
        <p className={styles.tip}>
          Keep a checkpoint as long as it fits. A new one takes effect on the
          day you choose.
        </p>
      </section>
    </div>
  );
}

export function GoalDashboard({
  data,
  today,
  onAdd,
  onRemove,
}: {
  data: AppData;
  today: string;
  onAdd: (id?: string) => void;
  onRemove: (id: string) => void;
}) {
  const search = useSearchParams(),
    router = useRouter();
  const plans = useMemo(() => {
    const groups = new Map<string, Goal[]>();
    for (const goal of goalHistory(data.goals)) {
      const group = groups.get(goal.medicationId);
      if (group) group.push(goal);
      else groups.set(goal.medicationId, [goal]);
    }
    const names = new Map(data.medications.map((m) => [m.id, m.name]));
    return Array.from(groups, ([id, history]) => ({
      id,
      history,
      name: names.get(id) ?? "Medication",
      current: !!goalForDay(data, id, today),
    })).sort(
      (a, b) =>
        Number(b.current) - Number(a.current) || a.name.localeCompare(b.name),
    );
  }, [data, today]);
  const canCreate = data.medications.some((medication) => !medication.archived);
  const selected =
    plans.find((p) => p.id === search.get("medication")) ?? plans[0];
  const day = search.get("day");
  const focusDay = day && isValidDayKey(day) && day <= today ? day : null;
  return (
    <div className={styles.page}>
      <PageHeading
        title="Goals"
        context="At your pace"
        icon={<Sprout />}
        actions={
          selected && canCreate ? (
            <button
              type="button"
              className={styles.newGoal}
              onClick={() => onAdd()}
            >
              <Plus size={15} /> New goal
            </button>
          ) : undefined
        }
      >
        See how your intake changes over time. You choose the next checkpoint
        and when it starts.
      </PageHeading>
      {selected ? (
        <>
          {plans.length > 1 && (
            <div className={styles.picker}>
              <label htmlFor="goal-medication">Medication</label>
              <select
                id="goal-medication"
                value={selected.id}
                onChange={(e) =>
                  router.replace(
                    `/goals?medication=${encodeURIComponent(e.target.value)}`,
                    { scroll: false },
                  )
                }
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <MedicationJourney
            key={selected.id + ":" + focusDay}
            data={data}
            medicationId={selected.id}
            today={today}
            focusDay={focusDay}
            history={selected.history}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </>
      ) : (
        <PageEmptyState icon={<Sparkles />} title="Start where you are.">
          <p>
            Choose one medication and a daily amount you’ve agreed with your
            prescriber. Your logs will fill in the chart from there.
          </p>
          <DialogPrimaryButton
            type="button"
            className="mt-4 w-full"
            leadingIcon={<Sprout />}
            onClick={() => (canCreate ? onAdd() : router.push("/medications"))}
          >
            {canCreate ? "Set your first goal" : "Choose a medication first"}
          </DialogPrimaryButton>
        </PageEmptyState>
      )}
    </div>
  );
}
