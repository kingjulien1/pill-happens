import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleDashed,
  ChevronDown,
  Equal,
  FlagTriangleRight,
  Orbit,
  Sprout,
} from "lucide-react";
import { formatDose, type AppData } from "@/lib/domain";
import {
  goalDayReadings,
  goalLabels,
  goalStatus,
  type GoalStatus,
} from "@/lib/goal-progress";
import { CheckInSection } from "./check-in-section";
import styles from "./goal-progress.module.css";

const signs = {
  within: Check,
  at: Equal,
  above: FlagTriangleRight,
  unlogged: CircleDashed,
};

export function GoalBadge({ status }: { status: GoalStatus }) {
  const Sign = signs[status];
  return (
    <span className={styles.badge} data-status={status}>
      <Sign aria-hidden="true" />
      {goalLabels[status]}
    </span>
  );
}

export function GoalReading({
  name,
  totalMg,
  limitMg,
  projected = false,
  href,
}: {
  name: string;
  totalMg: number | null;
  limitMg: number;
  projected?: boolean;
  href?: string;
}) {
  const status = goalStatus(totalMg, limitMg);
  const fill =
    limitMg > 0
      ? Math.min(100, ((totalMg ?? 0) / limitMg) * 100)
      : totalMg
        ? 100
        : 0;
  return (
    <div className={styles.reading} data-status={status} data-goal-reading>
      <div className={styles.top}>
        <strong>
          {href ? (
            <Link href={href}>
              {name}
              <ArrowUpRight size={12} />
            </Link>
          ) : (
            name
          )}
        </strong>
        <GoalBadge status={status} />
      </div>
      <div className={styles.figures}>
        <span>
          <b>{totalMg === null ? "—" : formatDose(totalMg)}</b> mg{" "}
          {projected ? "if saved" : "logged"}
        </span>
        <span>
          Goal <b>{formatDose(limitMg)}</b> mg
        </span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <i style={{ width: fill + "%" }} />
      </div>
    </div>
  );
}

export function DayGoals({
  data,
  day,
  evening = false,
}: {
  data: AppData;
  day: string;
  evening?: boolean;
}) {
  const rows = goalDayReadings(data, day);
  if (!rows.length && !evening) return null;
  const within = rows.filter(
    (row) => row.status === "within" || row.status === "at",
  ).length;
  const above = rows.filter((row) => row.status === "above").length;
  const unlogged = rows.length - within - above;
  const counts = [
    within && within + " within goal",
    above && above + " above",
    unlogged && unlogged + " unlogged",
  ]
    .filter(Boolean)
    .join(" · ");
  const content = (
    <div className={styles.list}>
      {rows.map(({ goal, name, totalMg }) => (
        <GoalReading
          key={goal.id}
          name={name}
          totalMg={totalMg}
          limitMg={goal.dailyLimitMg}
          href={`/goals?medication=${encodeURIComponent(goal.medicationId)}&day=${day}`}
        />
      ))}
      <div className={styles.foot}>
        <span>
          {!rows.length
            ? "No medication goals were in effect on this day."
            : above
              ? "One day is one point in a longer story."
              : "Based on the intakes you’ve recorded."}
        </span>
        <Link href="/goals">
          View goals <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
  if (evening)
    return (
      <CheckInSection
        headingId="evening-goal-check-in"
        caption={
          <>
            <Sprout />
            Your Goal Check-In
          </>
        }
        context="Day in review"
        description="Here’s where each medication landed against the goal you set for this day."
      >
        {content}
      </CheckInSection>
    );
  return (
    <details className={styles.digest}>
      <summary>
        <Orbit aria-hidden="true" />
        <strong>Goal check-in</strong>
        <span>{counts}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      {content}
    </details>
  );
}
