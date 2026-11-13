import { journalDays } from "./daily-check-in";
import {
  dayKey,
  doseMg,
  isValidDayKey,
  shiftDayKey,
  type AppData,
  type Intake,
} from "./domain";
import { groupHistoryWeeks } from "./history-weeks";
import { isIntakeRoute, type IntakeRoute } from "./intake-routes";
import { normalizeJournalMentionText } from "./journal-mentions";
import {
  getMedicationCategories,
  type MedicationCategory,
} from "./medication-categories";
import { sortMedicationsByUsage } from "./medication-usage";
import { getMedicationType, type MedicationType } from "./medication-types";

const clean = (value: number) => Number(value.toFixed(8));
const validIntakes = (intakes: readonly Intake[]) =>
  intakes.filter((intake) => Number.isFinite(Date.parse(intake.takenAt)));

function byMedication(entries: readonly Intake[]) {
  const grouped = new Map<string, Intake[]>();
  for (const entry of entries) {
    const previous = grouped.get(entry.medicationId);
    if (previous) previous.push(entry);
    else grouped.set(entry.medicationId, [entry]);
  }
  return grouped;
}

/** One medicine's historical amounts; no cross-medicine milligram total exists. */
export function medicationRecordStats(
  data: AppData,
  medicationId: string,
  entries: readonly Intake[] = data.intakes,
) {
  const medication = data.medications.find((item) => item.id === medicationId);
  const intakes = validIntakes(entries)
    .filter((item) => item.medicationId === medicationId)
    .sort(
      (a, b) =>
        Date.parse(a.takenAt) - Date.parse(b.takenAt) ||
        a.id.localeCompare(b.id),
    );
  const quantities = new Map<MedicationType, number>();
  const routes = new Map<IntakeRoute, number>();
  let totalMg = 0;
  for (const intake of intakes) {
    const form = intake.medicationForm ?? medication?.form ?? "other";
    quantities.set(form, clean((quantities.get(form) ?? 0) + intake.quantity));
    const route = isIntakeRoute(intake.route) ? intake.route : "unspecified";
    routes.set(route, (routes.get(route) ?? 0) + 1);
    totalMg = clean(totalMg + doseMg(intake));
  }
  const days = [
    ...new Set(
      intakes.map((intake) => dayKey(intake.takenAt, data.settings.timezone)),
    ),
  ]
    .sort()
    .reverse();
  return {
    medicationId,
    medication,
    name:
      medication?.name ??
      intakes.at(-1)?.medicationName ??
      "Unavailable medication",
    intakes,
    count: intakes.length,
    days,
    totalMg,
    quantities: [...quantities].map(([form, quantity]) => ({
      form,
      quantity,
      ...getMedicationType(form),
    })),
    routes: [...routes]
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count),
    first: intakes[0],
    last: intakes.at(-1),
  };
}

export type MedicationRecordStats = ReturnType<typeof medicationRecordStats>;

/** Saved ingredient text is a label match, never a clinical identity inference. */
export function sameIngredientMedications(data: AppData, ingredient: string) {
  const key = normalizeJournalMentionText(ingredient);
  if (!key) return [];
  return sortMedicationsByUsage(
    data.medications.filter(
      (medication) =>
        normalizeJournalMentionText(medication.activeIngredient ?? "") === key,
    ),
    data.intakes,
  );
}

/** Overlapping labels share records, while archived definitions remain visible. */
export function categoryRecordDetails(
  data: AppData,
  category: MedicationCategory,
) {
  const medications = sortMedicationsByUsage(
    data.medications.filter((medication) =>
      getMedicationCategories(medication).includes(category),
    ),
    data.intakes,
  );
  const entries = byMedication(data.intakes);
  const records = medications.map((medication) =>
    medicationRecordStats(
      data,
      medication.id,
      entries.get(medication.id) ?? [],
    ),
  );
  const ingredients = new Map<
    string,
    { name: string; medicationIds: string[] }
  >();
  for (const medication of medications) {
    const name = medication.activeIngredient?.trim();
    if (!name) continue;
    const key = normalizeJournalMentionText(name);
    const previous = ingredients.get(key);
    if (previous) previous.medicationIds.push(medication.id);
    else ingredients.set(key, { name, medicationIds: [medication.id] });
  }
  return {
    medications,
    records,
    count: records.reduce((sum, record) => sum + record.count, 0),
    days: [...new Set(records.flatMap((record) => record.days))]
      .sort()
      .reverse(),
    ingredients: [...ingredients.values()],
  };
}

/** Monday calendar labels are validated without applying the 06:00 offset twice. */
export function isIsoWeekStart(start: string) {
  if (!isValidDayKey(start) || new Date(`${start}T12:00:00Z`).getUTCDay() !== 1)
    return false;
  try {
    return isValidDayKey(shiftDayKey(start, 6));
  } catch {
    return false;
  }
}

export function weekRecordDetails(data: AppData, start: string) {
  if (!isIsoWeekStart(start))
    throw new RangeError("Use an ISO week's Monday date.");
  const boundary = groupHistoryWeeks([start])[0];
  const entries = validIntakes(data.intakes).filter((intake) => {
    const day = dayKey(intake.takenAt, data.settings.timezone);
    return day >= boundary.start && day <= boundary.end;
  });
  const days = journalDays(
    entries,
    data.dailyCheckIns,
    data.settings.timezone,
  ).filter((day) => day >= boundary.start && day <= boundary.end);
  const grouped = byMedication(entries);
  const records = [...grouped]
    .map(([id, intakes]) => medicationRecordStats(data, id, intakes))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { ...boundary, days, count: entries.length, records };
}
