import { checkInForDay, getCheckInPeriod, journalDays } from "./daily-check-in";
import {
  getCheckInCompletion,
  getMorningCheckInCompletion,
} from "./check-in-completion";
import {
  dayIntakes,
  dayKey,
  formatDay,
  formatDose,
  isValidDayKey,
  type AppData,
} from "./domain";
import { getMedicationColor } from "./medication-appearance";
import { countPills } from "./pill-counts";

export const HISTORY_CARD_CACHE_VERSION = 1;
const namespace = `pill-happens:history-cards:v${HISTORY_CARD_CACHE_VERSION}`;

/** Only visible counts, artwork identities and accessible labels are cached.
 * Journal writing, passwords and authentication material never enter this record. */
export function historyCardSource(data: AppData, day: string) {
  const entries = dayIntakes(data, day).sort(
    (a, b) =>
      Date.parse(a.takenAt) - Date.parse(b.takenAt) || a.id.localeCompare(b.id),
  );
  const ids = new Set(entries.map((entry) => entry.medicationId));
  const medications = data.medications.filter((medication) =>
    ids.has(medication.id),
  );
  const morning = checkInForDay(data.dailyCheckIns, day, "morning");
  const evening = checkInForDay(data.dailyCheckIns, day);
  const checkIn = evening ?? morning;
  const completion =
    checkIn && getCheckInPeriod(checkIn) === "morning"
      ? getMorningCheckInCompletion(checkIn)
      : getCheckInCompletion(checkIn);
  return {
    entries,
    medications,
    morning: Boolean(morning),
    evening: Boolean(evening),
    completion: [completion.completedCount, completion.totalCount],
    fingerprint: JSON.stringify([
      data.settings.timezone,
      entries.map(
        ({
          id,
          medicationId,
          medicationName,
          medicationForm,
          strengthMg,
          quantity,
          route,
          takenAt,
        }) => [
          id,
          medicationId,
          medicationName,
          medicationForm,
          strengthMg,
          quantity,
          route,
          takenAt,
        ],
      ),
      medications.map(
        ({
          id,
          name,
          activeIngredient,
          strengthMg,
          form,
          color,
          icon,
          iconRotation,
          categories,
          isBenzodiazepine,
          isOpioid,
        }) => [
          id,
          name,
          activeIngredient,
          strengthMg,
          form,
          color,
          icon,
          iconRotation,
          categories,
          isBenzodiazepine,
          isOpioid,
        ],
      ),
      Boolean(morning),
      Boolean(evening),
      completion.completedCount,
      completion.totalCount,
    ]),
  };
}

export function buildHistoryCardSummary(
  data: AppData,
  day: string,
  source = historyCardSource(data, day),
) {
  const { entries, medications, morning, evening, completion } = source;
  const byId = new Map(
    medications.map((medication) => [medication.id, medication]),
  );
  const uniqueCount = new Set(entries.map((entry) => entry.medicationId)).size;
  const firstEntry = entries[0];
  const lastEntry = entries.at(-1);
  const medication = firstEntry && byId.get(firstEntry.medicationId);
  const first = firstEntry
    ? {
        medicationId: firstEntry.medicationId,
        medicationName: firstEntry.medicationName,
        takenAt: firstEntry.takenAt,
      }
    : null;
  const last = lastEntry ? { takenAt: lastEntry.takenAt } : null;
  const firstMedication = medication
    ? {
        name: medication.name,
        icon: medication.icon,
        iconRotation: medication.iconRotation,
      }
    : null;
  const color = getMedicationColor(medication?.color);
  const counts = countPills(entries, medications);
  const morningOnly = morning && !evening;
  const checkInTitle = morningOnly ? "Morning Check-In" : "Evening Check-In";
  const checkInSummary =
    morning && evening
      ? "Morning & evening saved"
      : morning || evening
        ? `${morningOnly ? "Morning" : "Evening"} saved`
        : "No check-in saved";
  const recordSummary = `${entries.length} ${entries.length === 1 ? "log" : "logs"} · ${uniqueCount} ${uniqueCount === 1 ? "medication" : "medications"}`;
  const fullDate = formatDay(day, { year: "numeric" });
  const pillSummary = `${formatDose(counts.pills)} ${counts.pills === 1 ? "pill" : "pills"} from recorded tablet and capsule quantities, including fractions; ${formatDose(counts.benzos)} of those pills marked as benzodiazepines`;
  const medicationNames = [
    ...new Map(
      entries.map((entry) => [
        entry.medicationId,
        byId.get(entry.medicationId)?.name ?? entry.medicationName,
      ]),
    ).values(),
  ];
  const fullTime = (takenAt: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: data.settings.timezone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "shortOffset",
    }).format(new Date(takenAt));
  const label = [
    `View Daily Log for ${fullDate}`,
    recordSummary,
    pillSummary,
    medicationNames.length
      ? `Medications: ${medicationNames.join(", ")}`
      : null,
    first
      ? `First intake ${fullTime(first.takenAt)}; last intake ${fullTime(last!.takenAt)} (${data.settings.timezone}). +1 means the next calendar day within this journal day.`
      : "No intakes recorded",
    checkInSummary,
    morning || evening
      ? `${checkInTitle}: ${completion[0]} of ${completion[1]} sections completed`
      : null,
  ]
    .filter(Boolean)
    .join(". ");
  return {
    fullDate,
    label,
    color,
    first,
    last,
    firstMedication,
    uniqueCount,
    entryCount: entries.length,
    morningOnly,
    checkInTitle,
    checkInSummary,
    counts,
    recordSummary,
    pillSummary,
    weekday: formatDay(day, {
      weekday: "long",
      month: undefined,
      day: undefined,
    }),
    shortWeekday: formatDay(day, {
      weekday: "short",
      month: undefined,
      day: undefined,
    }),
    shortDate: formatDay(day, {
      weekday: undefined,
      month: "short",
      day: "numeric",
    }),
  };
}

export type HistoryCardSummary = ReturnType<typeof buildHistoryCardSummary>;
export type HistoryCardStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function historyCardCacheKey(scope: string, day: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(scope) || !isValidDayKey(day))
    return null;
  return `${namespace}:${scope}:${day}`;
}

/** The three newest recorded past days always derive directly from live state. */
export function historyCardCacheable(
  data: AppData,
  day: string,
  now: Date | string,
) {
  // Hooks pass the stable tracking-day key, not a new Date on each clock tick.
  const today =
    typeof now === "string" ? now : dayKey(now, data.settings.timezone);
  if (!isValidDayKey(day) || !isValidDayKey(today)) return false;
  const past = journalDays(
    data.intakes,
    data.dailyCheckIns,
    data.settings.timezone,
  )
    .filter((value) => value < today)
    .sort((a, b) => b.localeCompare(a));
  return day < today && past.includes(day) && !past.slice(0, 3).includes(day);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const timestamp = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** A stale or incomplete device record must never supply broken artwork/time metadata. */
function validHistorySummary(
  value: unknown,
  day: string,
): value is HistoryCardSummary {
  if (!record(value) || !record(value.color) || !record(value.counts))
    return false;
  const first = value.first;
  const last = value.last;
  const medication = value.firstMedication;
  const color = getMedicationColor(
    typeof value.color.value === "string" ? value.color.value : undefined,
  );
  return (
    typeof value.fullDate === "string" &&
    value.fullDate === formatDay(day, { year: "numeric" }) &&
    typeof value.label === "string" &&
    Number.isInteger(value.entryCount) &&
    count(value.entryCount) &&
    Number.isInteger(value.uniqueCount) &&
    count(value.uniqueCount) &&
    value.uniqueCount <= value.entryCount &&
    typeof value.color.hex === "string" &&
    value.color.hex.toLowerCase() === color.hex.toLowerCase() &&
    value.color.value === color.value &&
    typeof value.color.label === "string" &&
    count(value.counts.pills) &&
    count(value.counts.benzos) &&
    value.counts.benzos <= value.counts.pills &&
    typeof value.morningOnly === "boolean" &&
    typeof value.checkInTitle === "string" &&
    typeof value.shortDate === "string" &&
    typeof value.weekday === "string" &&
    typeof value.shortWeekday === "string" &&
    typeof value.recordSummary === "string" &&
    typeof value.checkInSummary === "string" &&
    typeof value.pillSummary === "string" &&
    (value.entryCount === 0
      ? first === null && last === null && medication === null
      : record(first) &&
        typeof first.medicationId === "string" &&
        typeof first.medicationName === "string" &&
        timestamp(first.takenAt) &&
        record(last) &&
        timestamp(last.takenAt) &&
        Date.parse(first.takenAt) <= Date.parse(last.takenAt) &&
        (medication === null ||
          (record(medication) &&
            typeof medication.name === "string" &&
            (medication.icon === undefined ||
              typeof medication.icon === "string") &&
            (medication.iconRotation === undefined ||
              (typeof medication.iconRotation === "number" &&
                Number.isFinite(medication.iconRotation))))))
  );
}

export function readHistoryCardCache(
  storage: HistoryCardStorage | null,
  scope: string,
  day: string,
  fingerprint: string,
): HistoryCardSummary | null {
  const key = historyCardCacheKey(scope, day);
  if (!storage || !key) return null;
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
    if (
      !record(value) ||
      value.version !== HISTORY_CARD_CACHE_VERSION ||
      value.scope !== scope ||
      value.fingerprint !== fingerprint
    )
      return null;
    return validHistorySummary(value.summary, day) ? value.summary : null;
  } catch {
    return null;
  }
}

export function writeHistoryCardCache(
  storage: HistoryCardStorage | null,
  scope: string,
  day: string,
  fingerprint: string,
  summary: HistoryCardSummary,
) {
  const key = historyCardCacheKey(scope, day);
  if (!storage || !key) return;
  try {
    const serialized = JSON.stringify({
      version: HISTORY_CARD_CACHE_VERSION,
      scope,
      fingerprint,
      summary,
    });
    if (storage.getItem(key) !== serialized) storage.setItem(key, serialized);
  } catch {
    /* Cache failures never block a live card. */
  }
}

export function removeHistoryCardCache(
  storage: HistoryCardStorage | null,
  scope: string,
  day: string,
) {
  const key = historyCardCacheKey(scope, day);
  if (!storage || !key) return;
  try {
    storage.removeItem(key);
  } catch {
    /* Private browsing can deny storage. */
  }
}
