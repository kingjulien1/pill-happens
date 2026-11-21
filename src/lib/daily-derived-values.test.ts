import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyData,
  dayIntakes,
  totalsForDay,
  type AppData,
  type Intake,
  type Medication,
} from "./domain";
import { emptyMorningSleep } from "./morning-sleep";
import type { DailyCheckIn } from "./daily-check-in";
import {
  createDailyDerivedCache,
  derivedValuesWindow,
  recordedSleepAverage,
} from "./daily-derived-values";
import { getCheckInCardMetric } from "./check-in-card-metric";
import { sortMedicationsByUsage } from "./medication-usage";
import { preferredIntakeRoute, sortIntakeRoutesByUsage } from "./intake-routes";
import { intakeQuantityShortcuts } from "./intake-quantity";
const now = new Date("2026-11-21T05:59:00Z");
const medication: Medication = {
  id: "m",
  name: "Private medication name",
  strengthMg: 10,
  defaultQuantity: 1,
  form: "tablet",
  color: "tw-rose-400",
  archived: false,
  createdAt: "2026-01-01T12:00:00Z",
};
const intake: Intake = {
  id: "i",
  medicationId: "m",
  medicationName: medication.name,
  strengthMg: 10,
  quantity: 1,
  route: "nasal",
  takenAt: "2026-11-20T12:00:00Z",
  createdAt: "2026-11-20T12:00:00Z",
  note: "Private intake note",
};
function check(
  day: string,
  minutes: number | null,
  period: "morning" | "evening" = "morning",
): DailyCheckIn {
  return {
    day,
    period,
    moods: ["calm"],
    energy: null,
    stress: null,
    sleepHours: null,
    bedtime: null,
    note: "Private journal writing",
    helped: "",
    createdAt: day + "T12:00:00Z",
    updatedAt: day + "T12:00:00Z",
    morningSleep: { ...emptyMorningSleep(), totalSleepMinutes: minutes },
  };
}
function data(): AppData {
  return {
    ...emptyData(),
    medications: [medication],
    intakes: [intake],
    dailyCheckIns: [check("2026-11-20", 420)],
    settings: { timezone: "UTC" },
  };
}
function storage() {
  const map = new Map<string, string>();
  let reads = 0,
    writes = 0;
  return {
    map,
    get reads() {
      return reads;
    },
    get writes() {
      return writes;
    },
    getItem(key: string) {
      reads++;
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes++;
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}
test("daily aggregates are reused until exactly the next 06:00, then rebuilt from fresh records", () => {
  const disk = storage(),
    cache = createDailyDerivedCache("a", disk),
    source = data();
  const first = cache.get(source, now);
  assert.equal(first.sleepAverage.minutes, 420);
  assert.equal(first.medicationUsage.m, 1);
  const changed = {
    ...source,
    intakes: [
      ...source.intakes,
      { ...intake, id: "new", quantity: 2, route: "oral" as const },
    ],
    dailyCheckIns: [...source.dailyCheckIns!, check("2026-11-21", 540)],
  };
  assert.equal(cache.get(changed, new Date("2026-11-21T05:59:59Z")), first);
  assert.equal(disk.writes, 1);
  assert.equal(disk.reads, 1);
  const next = cache.get(changed, new Date("2026-11-21T06:00:00Z"));
  assert.notEqual(next, first);
  assert.equal(next.medicationUsage.m, 2);
  assert.equal(next.sleepAverage.minutes, 480);
  assert.equal(disk.writes, 2);
});
test("refresh restores the scoped cache without copying names, notes or raw records", () => {
  const disk = storage(),
    source = data(),
    one = createDailyDerivedCache("a", disk),
    first = one.get(source, now);
  const raw = disk.map.get(one.storageKey)!;
  assert.ok(!raw.includes("Private"));
  assert.ok(!raw.includes("takenAt"));
  const restored = createDailyDerivedCache("a", disk).get(
    { ...source, dailyCheckIns: [] },
    now,
  );
  assert.deepEqual(restored, JSON.parse(JSON.stringify(first)));
  assert.equal(disk.writes, 1);
  const other = createDailyDerivedCache("b", disk);
  disk.map.set(other.storageKey, raw);
  assert.equal(
    other.get({ ...source, dailyCheckIns: [check("2026-11-20", 600)] }, now)
      .sleepAverage.minutes,
    600,
  );
  one.clear();
  assert.equal(disk.map.has(one.storageKey), false);
  assert.equal(disk.map.has(other.storageKey), true);
});
test("timezone and DST boundaries use local 06:00 rather than 24 elapsed hours", () => {
  assert.equal(
    derivedValuesWindow(new Date("2026-11-21T04:59:59Z"), "Europe/Vienna").day,
    "2026-11-20",
  );
  assert.equal(
    derivedValuesWindow(new Date("2026-11-21T05:00:00Z"), "Europe/Vienna").day,
    "2026-11-21",
  );
  const spring = new Date("2026-03-28T05:00:00Z"),
    autumn = new Date("2026-10-24T04:00:00Z");
  assert.equal(
    derivedValuesWindow(spring, "Europe/Vienna").expiresAt - spring.getTime(),
    23 * 3600000,
  );
  assert.equal(
    derivedValuesWindow(autumn, "Europe/Vienna").expiresAt - autumn.getTime(),
    25 * 3600000,
  );
  const cache = createDailyDerivedCache("a", storage()),
    first = cache.get(data(), now);
  assert.notEqual(
    cache.get({ ...data(), settings: { timezone: "Europe/Vienna" } }, now),
    first,
  );
});
test("invalid or unavailable storage safely falls back to a stable memory cache", () => {
  for (const raw of [
    "bad JSON",
    JSON.stringify({ version: 1, scope: "a" }),
    JSON.stringify({ sleepAverage: { minutes: 9999, nights: 1 } }),
  ]) {
    const disk = storage(),
      cache = createDailyDerivedCache("a", disk);
    disk.map.set(cache.storageKey, raw);
    assert.equal(cache.get(data(), now).sleepAverage.minutes, 420);
  }
  const cache = createDailyDerivedCache("a", {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("full");
    },
    removeItem() {
      throw Error("blocked");
    },
  });
  const first = cache.get(data(), now);
  assert.equal(cache.get(data(), now), first);
  assert.doesNotThrow(() => cache.clear());
});
test("sleep averages count one recorded night, prefer Morning, support legacy hours and retain real zeroes", () => {
  const morning = check("2026-11-20", 420),
    evening = check("2026-11-20", 600, "evening");
  const legacy = {
    ...check("2026-11-19", null, "evening"),
    morningSleep: undefined,
    sleepHours: 8,
  };
  assert.deepEqual(
    recordedSleepAverage([
      evening,
      morning,
      legacy,
      check("2026-11-18", null),
      check("2026-11-17", 2000),
    ]),
    { minutes: 450, nights: 2 },
  );
  assert.deepEqual(recordedSleepAverage([check("2026-11-20", 0)]), {
    minutes: 0,
    nights: 1,
  });
  assert.deepEqual(recordedSleepAverage([]), { minutes: null, nights: 0 });
  assert.deepEqual(
    recordedSleepAverage([
      {
        ...check("2026-11-20", null),
        morningSleep: undefined,
        sleepHours: "7",
      } as unknown as DailyCheckIn,
    ]),
    { minutes: null, nights: 0 },
  );
  const metric = getCheckInCardMetric("morning", undefined, undefined, {
    minutes: 450,
    nights: 2,
  });
  assert.equal(metric.unit, "7h 30m avg");
  assert.ok("sample" in metric && metric.sample);
  assert.ok(metric.description.includes("not saved"));
  const actual = getCheckInCardMetric("morning", morning, undefined, {
    minutes: 999,
    nights: 10,
  });
  assert.equal(actual.value, "7");
  assert.ok(!("sample" in actual));
  assert.ok(!getCheckInCardMetric("morning").unit.includes("Add sleep"));
});
test("one history scan serves usage ordering, route preference, route ordering and amount suggestions", () => {
  let scans = 0;
  const rows = new Proxy([intake, { ...intake, id: "2", quantity: 2 }], {
    get(target, key, receiver) {
      if (key === Symbol.iterator) scans++;
      return Reflect.get(target, key, receiver);
    },
  });
  assert.equal(sortMedicationsByUsage([medication], rows)[0].id, "m");
  assert.equal(preferredIntakeRoute("m", rows), "nasal");
  assert.equal(sortIntakeRoutesByUsage("m", rows)[0].value, "nasal");
  assert.ok(
    intakeQuantityShortcuts("m", rows, 1, [0.25, 0.5, 1, 2, 3]).includes(2),
  );
  assert.equal(scans, 1);
  assert.equal(
    sortMedicationsByUsage(
      [{ ...medication, id: "toString" }, medication],
      rows,
      { m: 2 },
    )[0].id,
    "m",
  );
  const renamed = { ...medication, name: "Updated name", strengthMg: 20 },
    counts = { m: 2 };
  sortMedicationsByUsage([medication], rows, counts);
  assert.equal(sortMedicationsByUsage([renamed], rows, counts)[0], renamed);
});
test("live day totals invalidate on saved data changes and returned arrays cannot corrupt the index", () => {
  const source = data(),
    key = "2026-11-20";
  assert.equal(totalsForDay(source, key)[0].totalMg, 10);
  totalsForDay(source, key)[0].totalMg = 999;
  dayIntakes(source, key).pop();
  assert.equal(totalsForDay(source, key)[0].totalMg, 10);
  assert.equal(dayIntakes(source, key).length, 1);
  const changed = {
    ...source,
    intakes: [...source.intakes, { ...intake, id: "2", quantity: 2 }],
  };
  assert.equal(totalsForDay(changed, key)[0].totalMg, 30);
  assert.equal(dayIntakes(changed, key).length, 2);
});

test("shared daily values cannot be mutated by a consumer", () => {
  const cache = createDailyDerivedCache("a", storage());
  const values = cache.get(data(), now);
  assert.equal(Object.isFrozen(values), true);
  assert.equal(Reflect.set(values.sleepAverage, "minutes", 999), false);
  assert.equal(Reflect.set(values.medicationUsage, "m", 999), false);
  assert.equal(Object.isFrozen(values.intakePreferences.m.quantities), true);
  assert.equal(cache.get(data(), now).sleepAverage.minutes, 420);
});
