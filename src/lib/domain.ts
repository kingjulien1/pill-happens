import type { MedicationColor } from "@/lib/medication-appearance";
import type { MedicationType } from "@/lib/medication-types";
import type { DailyCheckIn } from "@/lib/daily-check-in";
import type { MedicationCategory } from "@/lib/medication-categories";
import type { IntakeRoute } from "@/lib/intake-routes";
import type { ReflectionInsightCacheEntry } from "@/lib/reflection-insights";
import type { JournalEditingState } from "@/lib/journal-editing";

/** Shared data and calendar rules. All stored timestamps are UTC ISO strings. */
export type Medication = {
  id: string;
  name: string;
  /** Optional, user-entered active ingredient; blank means intentionally cleared. */
  activeIngredient?: string;
  /** Manually marked; missing on older medications means unmarked. */
  isBenzodiazepine?: boolean;
  /** Manually marked independently; missing on older medications is unmarked. */
  isOpioid?: boolean;
  /** Manual labels; an explicit array is authoritative over the legacy flags. */
  categories?: MedicationCategory[];
  strengthMg: number;
  /** Prefills new intakes; older medications use one unit. */
  defaultQuantity?: number;
  form: MedicationType;
  color: MedicationColor;
  /** Missing on older records; the interface renders the default pill icon. */
  icon?: string;
  /** Clockwise degrees; missing on older records means an upright glyph. */
  iconRotation?: number;
  archived: boolean;
  createdAt: string;
};

export type Intake = {
  id: string;
  medicationId: string;
  /** Follows the linked medication; retained as a fallback if it is missing. */
  medicationName: string;
  /** Follows the linked medication's type; optional on legacy fallback records. */
  medicationForm?: MedicationType;
  strengthMg: number;
  /** The actual amount taken, independent of a medication's default quantity. */
  quantity: number;
  /** Optional per-entry route; missing legacy values stay unrecorded. */
  route?: IntakeRoute;
  takenAt: string;
  createdAt: string;
  note: string;
};

export type Goal = {
  id: string;
  medicationId: string;
  dailyLimitMg: number;
  startsOn: string;
  endsOn: string | null;
  note: string;
  createdAt: string;
};

export type Settings = { timezone: string };

export type AppData = {
  medications: Medication[];
  intakes: Intake[];
  goals: Goal[];
  /** Missing in older journals; one personal reflection per tracking day. */
  dailyCheckIns?: DailyCheckIn[];
  /** Derived AI reflections; never advance the source check-in's updatedAt. */
  reflectionInsights?: ReflectionInsightCacheEntry[];
  /** Conservative journal edits retain the exact original and edited Markdown. */
  journalEditing?: JournalEditingState;
  /** @deprecated Backup-only metadata from the removed automatic intake templates. */
  preparedIntakeCompletions?: {
    groupId: "morning" | "evening";
    day: string;
    confirmedAt: string;
    intakeIds: string[];
  }[];
  /** Only new journals opt in; missing on existing journals means introduced. */
  onboarding?: { guidePending: boolean };
  settings: Settings;
};

export type DailyTotal = {
  medicationId: string;
  medicationName: string;
  totalMg: number;
  count: number;
};

export function emptyData(): AppData {
  return {
    medications: [],
    intakes: [],
    goals: [],
    dailyCheckIns: [],
    settings: { timezone: "Europe/Vienna" },
  };
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const dayFormatters = new Map<string, Intl.DateTimeFormat>();
const doseFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 8 });

function localParts(input: Date | string, timeZone: string) {
  const date = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid date.");
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    if (formatters.size >= 32)
      formatters.delete(formatters.keys().next().value!);
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: parts.year.padStart(4, "0"),
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** A real Gregorian calendar date, not a permissively normalized JS date. */
export function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const value = new Date(`${key}T12:00:00.000Z`);
  return (
    Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) === key
  );
}

export function shiftDayKey(key: string, offset: number): string {
  if (!isValidDayKey(key) || !Number.isInteger(offset)) {
    throw new RangeError("Use a valid day and a whole number of days.");
  }
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  const result = date.toISOString().slice(0, 10);
  if (!isValidDayKey(result)) throw new RangeError("Date is out of range.");
  return result;
}

/**
 * A tracking day is 06:00 until the next local 06:00. Calendar subtraction is
 * deliberate: subtracting six elapsed hours gives the wrong answer near DST.
 */
export function dayKey(input: Date | string, timeZone: string): string {
  const parts = localParts(input, timeZone);
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  return Number(parts.hour) < 6 ? shiftDayKey(key, -1) : key;
}

type DayIntakeIndex = {
  days: Map<string, Intake[]>;
  totals: Map<string, DailyTotal[]>;
};
const dayIndexes = new WeakMap<
  readonly Intake[],
  Map<string, DayIntakeIndex>
>();
/** Live values follow immutable server snapshots, never a time-based cache. */
function dayIntakeIndex(data: AppData): DayIntakeIndex {
  let byZone = dayIndexes.get(data.intakes);
  if (!byZone) dayIndexes.set(data.intakes, (byZone = new Map()));
  const cached = byZone.get(data.settings.timezone);
  if (cached) return cached;
  const result: DayIntakeIndex = { days: new Map(), totals: new Map() };
  for (const entry of data.intakes) {
    const day = dayKey(entry.takenAt, data.settings.timezone);
    let records = result.days.get(day);
    if (!records) result.days.set(day, (records = []));
    records.push(entry);
  }
  for (const records of result.days.values())
    records.sort(
      (a, b) =>
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
  if (byZone.size >= 2) byZone.delete(byZone.keys().next().value!);
  byZone.set(data.settings.timezone, result);
  return result;
}
export function dayIntakes(data: AppData, key: string): Intake[] {
  return [...(dayIntakeIndex(data).days.get(key) ?? [])];
}

function cleanDecimal(value: number): number {
  return Number(value.toFixed(8));
}

export function doseMg(
  intake: Pick<Intake, "strengthMg" | "quantity">,
): number {
  return cleanDecimal(intake.strengthMg * intake.quantity);
}

/** Medication totals remain separate; there is no dose equivalence conversion. */
export function totalsForDay(data: AppData, key: string): DailyTotal[] {
  const index = dayIntakeIndex(data);
  if (!index.days.has(key)) return [];
  const cached = index.totals.get(key);
  if (cached) return cached.map((total) => ({ ...total }));
  const totals = new Map<string, DailyTotal>();
  for (const intake of dayIntakes(data, key)) {
    const current = totals.get(intake.medicationId) ?? {
      medicationId: intake.medicationId,
      medicationName: intake.medicationName,
      totalMg: 0,
      count: 0,
    };
    current.totalMg = cleanDecimal(current.totalMg + doseMg(intake));
    current.count += 1;
    totals.set(intake.medicationId, current);
  }
  const result = [...totals.values()];
  index.totals.set(key, result);
  return result.map((total) => ({ ...total }));
}

const goalIndexes = new WeakMap<readonly Goal[], Map<string, Goal[]>>();
function indexedGoals(goals: readonly Goal[]) {
  const cached = goalIndexes.get(goals);
  if (cached) return cached;
  const index = new Map<string, Goal[]>();
  for (const goal of goals) {
    let records = index.get(goal.medicationId);
    if (!records) index.set(goal.medicationId, (records = []));
    records.push(goal);
  }
  for (const records of index.values())
    records.sort(
      (a, b) =>
        b.startsOn.localeCompare(a.startsOn) ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
  goalIndexes.set(goals, index);
  return index;
}

/** Newer effective dates supersede older goals without rewriting history. */
export function goalForDay(
  data: AppData,
  medicationId: string,
  key: string,
): Goal | undefined {
  const latest = indexedGoals(data.goals)
    .get(medicationId)
    ?.find((goal) => goal.startsOn <= key);
  // Once superseded, an older goal never silently becomes active again.
  // An expired newest goal leaves no active maximum until another is added.
  return latest && (!latest.endsOn || latest.endsOn >= key)
    ? latest
    : undefined;
}

export function formatDose(value: number): string {
  return doseFormatter.format(value);
}

/** A date key has no timezone: render it as the same calendar day everywhere. */
export function formatDay(
  key: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!isValidDayKey(key)) throw new RangeError("Invalid day.");
  const resolved: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...options,
    timeZone: "UTC",
  };
  const signature = JSON.stringify(resolved);
  let formatter = dayFormatters.get(signature);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en", resolved);
    if (dayFormatters.size >= 32)
      dayFormatters.delete(dayFormatters.keys().next().value!);
    dayFormatters.set(signature, formatter);
  }
  return formatter.format(new Date(`${key}T12:00:00.000Z`));
}

export function toLocalInput(input: Date | string, timeZone: string): string {
  const parts = localParts(input, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Interpret a datetime-local value in the configured timezone, not the device
 * timezone. A repeated DST time selects its earlier occurrence. A skipped
 * local time is rejected rather than silently moved to another intake time.
 */
export function fromLocalInput(value: string, timeZone: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (
    !match ||
    !isValidDayKey(match[1]) ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4] ?? "0") > 59
  ) {
    throw new RangeError("Choose a valid date and time.");
  }
  const desired = `${match[1]}T${match[2]}:${match[3]}:${match[4] ?? "00"}`;
  const wallClock = Date.parse(`${desired}.000Z`);
  const offsets = new Set<number>();

  // Sample either side of transitions, including non-hour and date-line shifts.
  for (let hours = -48; hours <= 48; hours += 6) {
    const instant = wallClock + hours * 3_600_000;
    const parts = localParts(new Date(instant), timeZone);
    const localClock = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000Z`,
    );
    offsets.add(localClock - instant);
  }

  const candidates: number[] = [];
  for (const offset of offsets) {
    const instant = wallClock - offset;
    const parts = localParts(new Date(instant), timeZone);
    const actual = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    if (actual === desired) candidates.push(instant);
  }
  if (candidates.length === 0) {
    throw new RangeError(
      "This local time does not exist because the clocks change. Choose another time.",
    );
  }
  return new Date(Math.min(...candidates)).toISOString();
}
