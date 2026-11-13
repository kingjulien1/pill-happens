import {
  dayIntakes,
  goalForDay,
  totalsForDay,
  type AppData,
  type Goal,
  type Medication,
} from "./domain";

export type DailyOverviewRow = {
  medicationId: string;
  name: string;
  medication?: Medication;
  totalMg: number;
  intakeCount: number;
  lastTakenAt: string | null;
  goal?: Goal;
};

export type DailyOverviewData = {
  intakeCount: number;
  medicationCount: number;
  lastTakenAt: string | null;
  rows: DailyOverviewRow[];
};

/** Actual records and applicable goals, with each medication's amount kept separate. */
export function dailyOverview(data: AppData, day: string): DailyOverviewData {
  const entries = dayIntakes(data, day);
  const totals = totalsForDay({ ...data, intakes: entries }, day);
  const totalsById = new Map(
    totals.map((total) => [total.medicationId, total]),
  );
  const medicationById = new Map<string, Medication>();
  for (const medication of data.medications) {
    if (!medicationById.has(medication.id))
      medicationById.set(medication.id, medication);
  }
  const lastById = new Map<string, string>();
  let lastTakenAt: string | null = null;
  for (const entry of entries) {
    const previous = lastById.get(entry.medicationId);
    if (!previous || Date.parse(entry.takenAt) > Date.parse(previous))
      lastById.set(entry.medicationId, entry.takenAt);
    if (
      lastTakenAt === null ||
      Date.parse(entry.takenAt) > Date.parse(lastTakenAt)
    )
      lastTakenAt = entry.takenAt;
  }

  const goalsById = new Map<string, Goal | undefined>();
  const applicableGoal = (medicationId: string) => {
    if (!goalsById.has(medicationId))
      goalsById.set(medicationId, goalForDay(data, medicationId, day));
    return goalsById.get(medicationId);
  };
  // Preserve the existing totals order, followed by effective goal-only rows.
  const ids = new Set(totals.map((total) => total.medicationId));
  for (const goal of data.goals) {
    if (applicableGoal(goal.medicationId)?.id === goal.id)
      ids.add(goal.medicationId);
  }
  return {
    intakeCount: entries.length,
    medicationCount: totals.length,
    lastTakenAt,
    rows: [...ids].map((medicationId) => {
      const total = totalsById.get(medicationId);
      const medication = medicationById.get(medicationId);
      return {
        medicationId,
        name: medication?.name || total?.medicationName || "Medication",
        medication,
        totalMg: total?.totalMg ?? 0,
        intakeCount: total?.count ?? 0,
        lastTakenAt: lastById.get(medicationId) ?? null,
        goal: applicableGoal(medicationId),
      };
    }),
  };
}
