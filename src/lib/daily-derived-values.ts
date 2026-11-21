import { dayKey, fromLocalInput, shiftDayKey, type AppData } from "./domain";
import {
  dailyMoodUsage,
  getCheckInPeriod,
  type DailyCheckIn,
} from "./daily-check-in";
import { intakeHistoryIndex } from "./intake-history-index";
import {
  preferredIntakeRoute,
  sortIntakeRoutesByUsage,
  INTAKE_ROUTE_VALUES,
  isIntakeRoute,
  type IntakeRoute,
} from "./intake-routes";
import {
  rankedIntakeQuantities,
  MIN_EDITABLE_INTAKE_QUANTITY,
  MAX_INTAKE_QUANTITY,
} from "./intake-quantity";

export type SleepAverage = Readonly<{ minutes: number | null; nights: number }>;
export type DailyDerivedValues = {
  version: 1;
  scope: string;
  day: string;
  timezone: string;
  createdAt: number;
  expiresAt: number;
  medicationUsage: Readonly<Record<string, number>>;
  intakePreferences: Readonly<
    Record<
      string,
      {
        route: IntakeRoute;
        routes: readonly IntakeRoute[];
        quantities: readonly number[];
      }
    >
  >;
  routes: readonly IntakeRoute[];
  moodUsage: Readonly<Record<string, number>>;
  sleepAverage: SleepAverage;
};

const sleepAverages = new WeakMap<readonly DailyCheckIn[], SleepAverage>();

/** Count each night once. A Morning report wins over an older Evening sleep field. */
export function recordedSleepAverage(
  checkIns: readonly DailyCheckIn[] = [],
): SleepAverage {
  const cached = sleepAverages.get(checkIns);
  if (cached) return cached;
  const nights = new Map<
    string,
    { minutes: number; morning: boolean; updated: number }
  >();
  for (const checkIn of checkIns) {
    const raw = checkIn.morningSleep
      ? checkIn.morningSleep.totalSleepMinutes
      : typeof checkIn.sleepHours === "number" &&
          Number.isFinite(checkIn.sleepHours) &&
          checkIn.sleepHours >= 0 &&
          checkIn.sleepHours <= 24
        ? Math.round(checkIn.sleepHours * 60)
        : null;
    if (raw == null || !Number.isInteger(raw) || raw < 0 || raw > 1440)
      continue;
    const morning = getCheckInPeriod(checkIn) === "morning";
    const updated = Date.parse(checkIn.updatedAt) || 0;
    const previous = nights.get(checkIn.day);
    if (
      !previous ||
      (morning && !previous.morning) ||
      (morning === previous.morning && updated > previous.updated)
    )
      nights.set(checkIn.day, { minutes: raw, morning, updated });
  }
  let sum = 0;
  for (const night of nights.values()) sum += night.minutes;
  const result = {
    minutes: nights.size ? Math.round(sum / nights.size) : null,
    nights: nights.size,
  };
  sleepAverages.set(checkIns, result);
  return result;
}

function immutable(value: DailyDerivedValues): DailyDerivedValues {
  Object.freeze(value.medicationUsage);
  Object.freeze(value.moodUsage);
  Object.freeze(value.sleepAverage);
  Object.freeze(value.routes);
  for (const preference of Object.values(value.intakePreferences)) {
    Object.freeze(preference.routes);
    Object.freeze(preference.quantities);
    Object.freeze(preference);
  }
  Object.freeze(value.intakePreferences);
  return Object.freeze(value);
}

/** Local calendar arithmetic gives 23/25-hour cache windows across DST. */
export function derivedValuesWindow(now: Date, timezone: string) {
  const day = dayKey(now, timezone);
  return {
    day,
    expiresAt: Date.parse(
      fromLocalInput(`${shiftDayKey(day, 1)}T06:00`, timezone),
    ),
  };
}

export function buildDailyDerivedValues(
  scope: string,
  data: AppData,
  now: Date,
): DailyDerivedValues {
  const window = derivedValuesWindow(now, data.settings.timezone);
  const index = intakeHistoryIndex(data.intakes);
  const medicationUsage = Object.fromEntries(index.counts);
  const intakePreferences = Object.create(null) as Record<
    string,
    { route: IntakeRoute; routes: IntakeRoute[]; quantities: number[] }
  >;
  for (const id of index.counts.keys()) {
    intakePreferences[id] = {
      route: preferredIntakeRoute(id, data.intakes),
      routes: sortIntakeRoutesByUsage(id, data.intakes).map(
        (route) => route.value,
      ),
      quantities: [...rankedIntakeQuantities(id, data.intakes).slice(0, 5)],
    };
  }
  return immutable({
    version: 1,
    scope,
    ...window,
    timezone: data.settings.timezone,
    createdAt: now.getTime(),
    medicationUsage,
    intakePreferences,
    routes: sortIntakeRoutesByUsage("", data.intakes).map(
      (route) => route.value,
    ),
    moodUsage: dailyMoodUsage(data.dailyCheckIns ?? []),
    sleepAverage: recordedSleepAverage(data.dailyCheckIns),
  });
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const counts = (value: unknown) =>
  object(value) &&
  Object.keys(value).length <= 20_000 &&
  Object.entries(value).every(
    ([key, value]) => key.length <= 150 && count(value),
  );
const routes = (value: unknown): value is IntakeRoute[] =>
  Array.isArray(value) &&
  value.length === INTAKE_ROUTE_VALUES.length &&
  new Set(value).size === value.length &&
  value.every(isIntakeRoute);
function valid(
  value: unknown,
  scope: string,
  data: AppData,
  now: Date,
): value is DailyDerivedValues {
  if (!object(value)) return false;
  const window = derivedValuesWindow(now, data.settings.timezone);
  if (
    value.version !== 1 ||
    value.scope !== scope ||
    value.timezone !== data.settings.timezone ||
    value.day !== window.day ||
    value.expiresAt !== window.expiresAt ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    value.createdAt > now.getTime() ||
    value.createdAt <
      Date.parse(
        fromLocalInput(`${window.day}T06:00`, data.settings.timezone),
      ) ||
    value.createdAt >= window.expiresAt ||
    !counts(value.medicationUsage) ||
    !counts(value.moodUsage) ||
    !routes(value.routes) ||
    !object(value.intakePreferences) ||
    Object.keys(value.intakePreferences).length > 20_000 ||
    !object(value.sleepAverage)
  )
    return false;
  const sleep = value.sleepAverage;
  if (
    !count(sleep.nights) ||
    (sleep.minutes !== null &&
      (!count(sleep.minutes) || sleep.minutes > 1440)) ||
    (sleep.minutes === null) !== (sleep.nights === 0)
  )
    return false;
  return Object.entries(value.intakePreferences).every(
    ([id, preference]) =>
      id.length <= 150 &&
      object(preference) &&
      isIntakeRoute(preference.route) &&
      routes(preference.routes) &&
      Array.isArray(preference.quantities) &&
      preference.quantities.length <= 5 &&
      preference.quantities.every(
        (n) =>
          typeof n === "number" &&
          Number.isFinite(n) &&
          n >= MIN_EDITABLE_INTAKE_QUANTITY &&
          n <= MAX_INTAKE_QUANTITY &&
          Number(n.toFixed(2)) === n,
      ),
  );
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
/** Journal-scoped, aggregate-only persistence. No names, journal text or raw records. */
export function createDailyDerivedCache(
  scope: string,
  suppliedStorage?: Storage | null,
) {
  const storageKey = `pill-happens:derived:v1:${encodeURIComponent(scope)}`;
  let current: DailyDerivedValues | undefined;
  let loaded = false;
  const storage = () => {
    if (suppliedStorage !== undefined) return suppliedStorage;
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    storageKey,
    get(data: AppData, now = new Date()): DailyDerivedValues {
      if (
        current &&
        current.timezone === data.settings.timezone &&
        current.day === dayKey(now, data.settings.timezone) &&
        current.createdAt <= now.getTime() &&
        current.expiresAt > now.getTime()
      )
        return current;
      if (!loaded) {
        loaded = true;
        try {
          const raw = storage()?.getItem(storageKey);
          if (raw && raw.length <= 2_000_000) {
            const parsed: unknown = JSON.parse(raw);
            if (valid(parsed, scope, data, now))
              return (current = immutable(parsed));
          }
        } catch {
          /* A malformed/blocked cache is rebuilt from loaded records. */
        }
      }
      current = buildDailyDerivedValues(scope, data, now);
      try {
        const encoded = JSON.stringify(current);
        if (encoded.length <= 2_000_000)
          storage()?.setItem(storageKey, encoded);
      } catch {
        /* Storage failure keeps the same one-day memory cache. */
      }
      return current;
    },
    clear() {
      current = undefined;
      loaded = true;
      try {
        storage()?.removeItem(storageKey);
      } catch {
        /* Memory-only session. */
      }
    },
  };
}
