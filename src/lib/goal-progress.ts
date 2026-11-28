import {
  compareGoalsNewestFirst,
  formatDay,
  goalForDay,
  shiftDayKey,
  recordedIntakeDays,
  totalsForDay,
  type AppData,
  type Goal,
} from "./domain";

export type GoalStatus = "within" | "at" | "above" | "unlogged";

export function goalStatus(
  totalMg: number | null,
  limitMg: number,
): GoalStatus {
  if (totalMg === null) return "unlogged";
  if (totalMg > limitMg) return "above";
  return totalMg === limitMg ? "at" : "within";
}

export const goalLabels: Record<GoalStatus, string> = {
  within: "Within goal",
  at: "At goal",
  above: "Above goal",
  unlogged: "No log yet",
};

export const shortGoalDate = (day: string) =>
  formatDay(day, { weekday: undefined, month: "short", day: "numeric" });

export function goalDayReadings(data: AppData, day: string) {
  if (data.goals.length === 0) return [];
  const totals = new Map(
    totalsForDay(data, day).map((row) => [row.medicationId, row]),
  );
  const meds = new Map(data.medications.map((med) => [med.id, med]));
  return Array.from(new Set(data.goals.map((goal) => goal.medicationId)))
    .flatMap((id) => {
      const goal = goalForDay(data, id, day);
      if (!goal) return [];
      const total = totals.get(id);
      return [
        {
          goal,
          name: meds.get(id)?.name ?? total?.medicationName ?? "Medication",
          totalMg: total?.totalMg ?? null,
          status: goalStatus(total?.totalMg ?? null, goal.dailyLimitMg),
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type GoalChartDay = {
  day: string;
  totalMg: number | null;
  limitMg: number | null;
  count: number;
};

// Chart windows are bounded. Both lookups reuse the journal's dated indexes.
export function goalWindow(
  data: AppData,
  medicationId: string,
  end: string,
  length: number,
): GoalChartDay[] {
  const window: GoalChartDay[] = [];
  let day = end;
  while (window.length < length) {
    const total = totalsForDay(data, day).find(
      (row) => row.medicationId === medicationId,
    );
    window.push({
      day,
      totalMg: total?.totalMg ?? null,
      count: total?.count ?? 0,
      limitMg: goalForDay(data, medicationId, day)?.dailyLimitMg ?? null,
    });
    if (day === "0000-01-01") break;
    day = shiftDayKey(day, -1);
  }
  return window.reverse();
}

export function goalWindowStats(days: GoalChartDay[], today: string) {
  let within = 0,
    assessed = 0,
    recorded = 0,
    sum = 0;
  for (const { day, totalMg, limitMg } of days) {
    if (day >= today || totalMg === null) continue;
    recorded++;
    sum += totalMg;
    if (limitMg !== null) {
      assessed++;
      if (goalStatus(totalMg, limitMg) !== "above") within++;
    }
  }
  return {
    within,
    assessed,
    recorded,
    averageMg: recorded ? sum / recorded : null,
  };
}

export function goalHistory(goals: readonly Goal[]) {
  return [...goals].sort(compareGoalsNewestFirst);
}

/** Two equal, disjoint samples of finished days while a goal was in effect. */
export function medicationGoalTrend(
  data: AppData,
  medicationId: string,
  today: string,
) {
  const records: { day: string; mg: number }[] = [];
  let firstLog: string | null = null;
  for (const day of recordedIntakeDays(data)) {
    if (day > today) break;
    const total = totalsForDay(data, day).find(
      (row) => row.medicationId === medicationId,
    );
    if (!total) continue;
    firstLog ??= day;
    if (day < today && goalForDay(data, medicationId, day))
      records.push({ day, mg: total.totalMg });
  }
  const count = Math.min(7, Math.floor(records.length / 2));
  function sample(group: typeof records) {
    return {
      start: group[0].day,
      end: group[group.length - 1].day,
      average: group.reduce((sum, row) => sum + row.mg, 0) / group.length,
    };
  }
  return {
    firstLog,
    recorded: records.length,
    comparison:
      count < 3
        ? null
        : {
            count,
            first: sample(records.slice(0, count)),
            recent: sample(records.slice(-count)),
          },
  };
}
