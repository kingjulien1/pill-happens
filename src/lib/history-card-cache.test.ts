import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, type AppData, type Medication } from "./domain";
import {
  buildHistoryCardSummary,
  createHistoryCardIndex,
  historyCardCacheable,
  historyCardCacheKey,
  historyCardSource,
  readHistoryCardCache,
  removeHistoryCardCache,
  writeHistoryCardCache,
  type HistoryCardStorage,
} from "./history-card-cache";

function journal(): AppData {
  const data = emptyData();
  data.medications = [
    {
      id: "med-a",
      name: "Saved medication",
      form: "tablet",
      strengthMg: 2,
      color: "tw-pink-400",
      archived: false,
      isBenzodiazepine: true,
      createdAt: "2026-11-01T12:00:00Z",
    },
  ];
  data.intakes = [13, 14, 15, 16, 17].map((day) => ({
    id: `intake-${day}`,
    medicationId: "med-a",
    medicationName: "Saved medication",
    strengthMg: 2,
    medicationForm: "tablet",
    quantity: 1.5,
    takenAt: `2026-11-${day}T12:00:00Z`,
    createdAt: `2026-11-${day}T12:00:00Z`,
    note: "private intake writing",
  }));
  data.dailyCheckIns = [
    {
      day: "2026-11-13",
      note: "private journal writing",
      moods: ["calm"],
      energy: null,
      stress: null,
      sleepHours: null,
      helped: "private support writing",
      createdAt: "2026-11-13T20:00:00Z",
      updatedAt: "2026-11-13T20:00:00Z",
    },
  ];
  return data;
}

function memory() {
  const records = new Map<string, string>();
  const storage: HistoryCardStorage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => {
      records.set(key, value);
    },
    removeItem: (key) => {
      records.delete(key);
    },
  };
  return { records, storage };
}

test("shared history indexes preserve tracking boundaries, intake ordering and first check-in precedence", () => {
  const data = journal();
  data.intakes.push(
    {
      ...data.intakes[0],
      id: "day-before-reset",
      takenAt: "2026-10-25T04:30:00Z",
      createdAt: "2026-10-26T12:00:00Z",
    },
    {
      ...data.intakes[0],
      id: "day-after-reset",
      takenAt: "2026-10-25T05:30:00Z",
      createdAt: "2026-10-24T12:00:00Z",
    },
  );
  data.dailyCheckIns!.push(
    { ...data.dailyCheckIns![0], period: "morning", day: "2026-11-12" },
    { ...data.dailyCheckIns![0], energy: 5 },
  );
  const originalOrder = data.intakes.map((intake) => intake.id);
  const index = createHistoryCardIndex(data);
  for (const day of [...index.days, "2026-11-11"]) {
    assert.deepEqual(
      historyCardSource(data, day, index),
      historyCardSource(data, day),
    );
    assert.deepEqual(
      buildHistoryCardSummary(data, day, historyCardSource(data, day, index)),
      buildHistoryCardSummary(data, day),
    );
  }
  assert.deepEqual(
    data.intakes.map((intake) => intake.id),
    originalOrder,
  );
  assert.equal(index.entries.get("2026-10-24")![0].id, "day-before-reset");
  assert.equal(index.entries.get("2026-10-25")![0].id, "day-after-reset");
  assert.equal(index.evening.get("2026-11-13"), data.dailyCheckIns![0]);
});

test("indexed cache policy keeps exactly the same newest-three protection across rollover and changed membership", () => {
  const data = journal();
  data.dailyCheckIns!.push({ ...data.dailyCheckIns![0], day: "2026-11-12" });
  const changed = structuredClone(data);
  changed.intakes = changed.intakes.filter(
    (intake) => intake.id !== "intake-16",
  );
  for (const snapshot of [data, changed]) {
    const index = createHistoryCardIndex(snapshot);
    for (const now of [
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      new Date("2026-11-17T04:30:00Z"),
      new Date("2026-11-17T06:00:00Z"),
    ]) {
      for (const day of [...index.days, "2026-11-11", "invalid"]) {
        assert.equal(
          historyCardCacheable(snapshot, day, now, index),
          historyCardCacheable(snapshot, day, now),
          `${day} at ${now}`,
        );
      }
    }
  }
});

test("a history index cannot supply another server snapshot's stale amounts or cache policy", () => {
  const data = journal();
  const index = createHistoryCardIndex(data);
  const changed = structuredClone(data);
  changed.intakes[0].quantity = 2;
  changed.intakes = changed.intakes.filter(
    (intake) => intake.id !== "intake-16",
  );
  assert.deepEqual(
    historyCardSource(changed, "2026-11-13", index),
    historyCardSource(changed, "2026-11-13"),
  );
  assert.equal(
    historyCardCacheable(changed, "2026-11-13", "2026-11-17", index),
    historyCardCacheable(changed, "2026-11-13", "2026-11-17"),
  );
});

test("the newest three recorded past days and today's day never use snapshots", () => {
  const data = journal();
  const now = new Date("2026-11-17T16:00:00Z");
  for (const day of ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"])
    assert.equal(historyCardCacheable(data, day, now), false, day);
  assert.equal(historyCardCacheable(data, "2026-11-13", now), true);
  assert.equal(
    historyCardCacheable(data, "2026-11-12", now),
    false,
    "empty days are not cached",
  );
});

test("history snapshots survive a device read and never cross journal scopes", () => {
  const { storage } = memory();
  const data = journal();
  const source = historyCardSource(data, "2026-11-13");
  const summary = buildHistoryCardSummary(data, "2026-11-13", source);
  writeHistoryCardCache(
    storage,
    "journal-a",
    "2026-11-13",
    source.fingerprint,
    summary,
  );
  assert.deepEqual(
    readHistoryCardCache(
      storage,
      "journal-a",
      "2026-11-13",
      source.fingerprint,
    ),
    JSON.parse(JSON.stringify(summary)),
  );
  assert.equal(
    readHistoryCardCache(
      storage,
      "journal-b",
      "2026-11-13",
      source.fingerprint,
    ),
    null,
  );
  removeHistoryCardCache(storage, "journal-a", "2026-11-13");
  assert.equal(
    readHistoryCardCache(
      storage,
      "journal-a",
      "2026-11-13",
      source.fingerprint,
    ),
    null,
  );
});

test("live-day protection follows changed history membership and the 06:00 boundary", () => {
  const data = journal();
  const beforeReset = new Date("2026-11-17T04:30:00Z");
  assert.equal(
    historyCardCacheable(data, "2026-11-13", beforeReset),
    false,
    "before 06:00 Vienna, Nov 16 is still today and Nov 13 remains among the latest three past days",
  );
  const afterReset = new Date("2026-11-17T06:00:00Z");
  assert.equal(historyCardCacheable(data, "2026-11-13", afterReset), true);
  const fewerDays = structuredClone(data);
  fewerDays.intakes = fewerDays.intakes.filter(
    (entry) => entry.id !== "intake-16",
  );
  assert.equal(
    historyCardCacheable(fewerDays, "2026-11-13", afterReset),
    false,
    "deleting a newer day immediately promotes an old cached day to the live three",
  );
});

test("medication identity, strength and classification edits invalidate past snapshots", () => {
  const { storage } = memory();
  const data = journal();
  const day = "2026-11-13";
  const original = historyCardSource(data, day);
  writeHistoryCardCache(
    storage,
    "journal-a",
    day,
    original.fingerprint,
    buildHistoryCardSummary(data, day, original),
  );
  for (const change of [
    { name: "New name" },
    { activeIngredient: "Updated ingredient" },
    { strengthMg: 5 },
    { form: "capsule" },
    { color: "tw-violet-500" },
    { icon: "sparkles" },
    { iconRotation: 90 },
    { categories: [] },
    { categories: ["benzodiazepine", "opioid"] },
    { isBenzodiazepine: false },
    { isOpioid: true },
  ] satisfies Partial<Medication>[]) {
    const changed = structuredClone(data);
    Object.assign(changed.medications[0], change);
    assert.equal(
      readHistoryCardCache(
        storage,
        "journal-a",
        day,
        historyCardSource(changed, day).fingerprint,
      ),
      null,
    );
  }
});

test("intake time, quantity, route and check-in completion edits invalidate the right day", () => {
  const data = journal();
  const original = historyCardSource(data, "2026-11-13").fingerprint;
  for (const change of [
    { quantity: 0.5 },
    { route: "nasal" },
    { takenAt: "2026-11-13T15:00:00Z" },
    { takenAt: "2026-11-14T15:00:00Z" },
    { medicationName: "Updated fallback" },
    { medicationForm: "capsule" },
    { strengthMg: 10 },
  ]) {
    const changed = structuredClone(data);
    Object.assign(changed.intakes[0], change);
    assert.notEqual(
      historyCardSource(changed, "2026-11-13").fingerprint,
      original,
    );
  }
  const changed = structuredClone(data);
  changed.dailyCheckIns![0].energy = 3;
  assert.notEqual(
    historyCardSource(changed, "2026-11-13").fingerprint,
    original,
  );
});

test("cache records exclude reflection and intake writing, while retaining fractional counts", () => {
  const { storage, records } = memory();
  const data = journal();
  const source = historyCardSource(data, "2026-11-13");
  const summary = buildHistoryCardSummary(data, "2026-11-13", source);
  assert.equal(summary.counts.pills, 1.5);
  assert.equal(summary.counts.benzos, 1.5);
  writeHistoryCardCache(
    storage,
    "journal-a",
    "2026-11-13",
    source.fingerprint,
    summary,
  );
  assert.doesNotMatch(
    [...records.values()].join(""),
    /private (intake|journal|support) writing/,
  );
});

test("invalid, obsolete and unavailable device storage always fall back to live state", () => {
  const { storage, records } = memory();
  const key = historyCardCacheKey("journal-a", "2026-11-13")!;
  records.set(key, "broken json");
  assert.equal(
    readHistoryCardCache(storage, "journal-a", "2026-11-13", "source"),
    null,
  );
  records.set(
    key,
    JSON.stringify({
      version: 0,
      scope: "journal-a",
      fingerprint: "source",
      summary: {},
    }),
  );
  assert.equal(
    readHistoryCardCache(storage, "journal-a", "2026-11-13", "source"),
    null,
  );
  const denied: HistoryCardStorage = {
    getItem() {
      throw Error("Denied");
    },
    setItem() {
      throw Error("Quota");
    },
    removeItem() {
      throw Error("Denied");
    },
  };
  assert.equal(
    readHistoryCardCache(denied, "journal-a", "2026-11-13", "source"),
    null,
  );
  assert.doesNotThrow(() =>
    writeHistoryCardCache(
      denied,
      "journal-a",
      "2026-11-13",
      "source",
      buildHistoryCardSummary(journal(), "2026-11-13"),
    ),
  );
  assert.equal(historyCardCacheKey("../another journal", "2026-11-13"), null);
});

test("sparse and check-in-only history protects actual newest past rows, not calendar gaps", () => {
  const data = journal();
  data.intakes = data.intakes.filter((entry) =>
    ["intake-13", "intake-17"].includes(entry.id),
  );
  data.dailyCheckIns = [14, 15, 16, 18].map((day) => ({
    ...data.dailyCheckIns![0],
    day: `2026-11-${day}`,
    period: "morning",
  }));
  const now = new Date("2026-11-17T12:00:00Z");
  for (const day of ["2026-11-14", "2026-11-15", "2026-11-16"])
    assert.equal(historyCardCacheable(data, day, now), false, day);
  assert.equal(historyCardCacheable(data, "2026-11-13", now), true);
  for (const day of ["2026-11-12", "2026-11-17", "2026-11-18"])
    assert.equal(historyCardCacheable(data, day, now), false, day);
  assert.equal(
    historyCardCacheable(data, "2026-11-13", "2026-11-17"),
    true,
    "the hook's stable tracking-day key has the same policy as the live clock",
  );
  assert.equal(historyCardCacheable(data, "2026-02-30", "2026-11-17"), false);
  assert.equal(historyCardCacheable(data, "2026-11-13", "invalid"), false);
  assert.equal(historyCardCacheKey("journal-a", "2026-02-30"), null);
});

test("unrelated history and writing retain a summary, while membership and completion changes invalidate it", () => {
  const data = journal();
  const original = historyCardSource(data, "2026-11-13").fingerprint;
  const unchanged = structuredClone(data);
  unchanged.intakes[1].quantity = 20;
  unchanged.intakes[0].note = "different private intake writing";
  unchanged.dailyCheckIns![0].note =
    "different nonempty private journal writing";
  unchanged.medications.push({
    ...unchanged.medications[0],
    id: "unrelated-medication",
    name: "Unrelated catalog item",
  });
  assert.equal(
    historyCardSource(unchanged, "2026-11-13").fingerprint,
    original,
  );

  const withoutIntake = structuredClone(data);
  withoutIntake.intakes = withoutIntake.intakes.slice(1);
  assert.notEqual(
    historyCardSource(withoutIntake, "2026-11-13").fingerprint,
    original,
  );
  const emptyWriting = structuredClone(data);
  emptyWriting.dailyCheckIns![0].note = "";
  assert.notEqual(
    historyCardSource(emptyWriting, "2026-11-13").fingerprint,
    original,
  );
  const otherPeriod = structuredClone(data);
  otherPeriod.dailyCheckIns!.push({
    ...data.dailyCheckIns![0],
    period: "morning",
  });
  assert.notEqual(
    historyCardSource(otherPeriod, "2026-11-13").fingerprint,
    original,
  );
  const anotherZone = structuredClone(data);
  anotherZone.settings.timezone = "UTC";
  assert.notEqual(
    historyCardSource(anotherZone, "2026-11-13").fingerprint,
    original,
  );
});

test("changed and missing catalog artwork cannot reuse an older selected-medication snapshot", () => {
  const { storage } = memory();
  const data = journal();
  const day = "2026-11-13";
  const source = historyCardSource(data, day);
  writeHistoryCardCache(
    storage,
    "journal-a",
    day,
    source.fingerprint,
    buildHistoryCardSummary(data, day, source),
  );
  const changed = structuredClone(data);
  Object.assign(changed.medications[0], {
    name: "Changed medication",
    color: "tw-blue-400",
    icon: "heart",
    iconRotation: 180,
  });
  const nextSource = historyCardSource(changed, day);
  assert.equal(
    readHistoryCardCache(storage, "journal-a", day, nextSource.fingerprint),
    null,
  );
  const fresh = buildHistoryCardSummary(changed, day, nextSource);
  assert.deepEqual(fresh.firstMedication, {
    name: "Changed medication",
    icon: "heart",
    iconRotation: 180,
  });
  assert.equal(fresh.color.value, "tw-blue-400");
  writeHistoryCardCache(
    storage,
    "journal-a",
    day,
    nextSource.fingerprint,
    fresh,
  );
  assert.deepEqual(
    readHistoryCardCache(storage, "journal-a", day, nextSource.fingerprint),
    JSON.parse(JSON.stringify(fresh)),
  );

  changed.medications = [];
  const missingSource = historyCardSource(changed, day);
  assert.equal(
    readHistoryCardCache(storage, "journal-a", day, missingSource.fingerprint),
    null,
  );
  const missing = buildHistoryCardSummary(changed, day, missingSource);
  assert.equal(missing.firstMedication, null);
  writeHistoryCardCache(
    storage,
    "journal-a",
    day,
    missingSource.fingerprint,
    missing,
  );
  assert.deepEqual(
    readHistoryCardCache(storage, "journal-a", day, missingSource.fingerprint),
    JSON.parse(JSON.stringify(missing)),
  );
});

test("unchanged persistent summaries write only once, while changed values replace them", () => {
  const { storage } = memory();
  let writes = 0;
  const observed: HistoryCardStorage = {
    ...storage,
    setItem(key, value) {
      writes += 1;
      storage.setItem(key, value);
    },
  };
  const data = journal();
  const day = "2026-11-13";
  const source = historyCardSource(data, day);
  const summary = buildHistoryCardSummary(data, day, source);
  writeHistoryCardCache(
    observed,
    "journal-a",
    day,
    source.fingerprint,
    summary,
  );
  writeHistoryCardCache(
    observed,
    "journal-a",
    day,
    source.fingerprint,
    structuredClone(summary),
  );
  assert.equal(writes, 1);
  data.intakes[0].quantity = 2;
  const next = historyCardSource(data, day);
  writeHistoryCardCache(
    observed,
    "journal-a",
    day,
    next.fingerprint,
    buildHistoryCardSummary(data, day, next),
  );
  assert.equal(writes, 2);
});

test("malformed nested times, artwork and counts fall back instead of breaking a card", () => {
  const { storage, records } = memory();
  const data = journal();
  const day = "2026-11-13";
  const source = historyCardSource(data, day);
  const summary = buildHistoryCardSummary(data, day, source);
  const key = historyCardCacheKey("journal-a", day)!;
  const invalid = [
    { first: { ...summary.first, takenAt: "not a date" } },
    { first: { takenAt: summary.first!.takenAt } },
    { last: null },
    { last: { takenAt: "2026-11-12T12:00:00Z" } },
    { firstMedication: { name: "Medication", icon: {} } },
    { firstMedication: { name: "Medication", iconRotation: "90" } },
    { firstMedication: { icon: "pill" } },
    { firstMedication: undefined },
    { color: { ...summary.color, hex: "invalid" } },
    { color: { ...summary.color, value: "unknown-color" } },
    { counts: { pills: -1, benzos: 0 } },
    { counts: { pills: 1, benzos: 2 } },
    { entryCount: -1 },
    { uniqueCount: summary.entryCount + 1 },
    { morningOnly: "false" },
  ];
  for (const change of invalid) {
    records.set(
      key,
      JSON.stringify({
        version: 1,
        scope: "journal-a",
        fingerprint: source.fingerprint,
        summary: { ...summary, ...change },
      }),
    );
    assert.equal(
      readHistoryCardCache(storage, "journal-a", day, source.fingerprint),
      null,
      JSON.stringify(change),
    );
  }
});

test("reflection-only cached dates stay bound to their own day even with identical fingerprints", () => {
  const { storage, records } = memory();
  const data = journal();
  data.intakes = [];
  data.dailyCheckIns = ["2026-11-12", "2026-11-13"].map((day) => ({
    ...data.dailyCheckIns![0],
    day,
  }));
  const first = historyCardSource(data, "2026-11-12");
  const next = historyCardSource(data, "2026-11-13");
  assert.equal(first.fingerprint, next.fingerprint);
  const summary = buildHistoryCardSummary(data, "2026-11-12", first);
  writeHistoryCardCache(
    storage,
    "journal-a",
    "2026-11-12",
    first.fingerprint,
    summary,
  );
  const from = historyCardCacheKey("journal-a", "2026-11-12")!;
  const to = historyCardCacheKey("journal-a", "2026-11-13")!;
  records.set(to, records.get(from)!);
  assert.equal(
    readHistoryCardCache(storage, "journal-a", "2026-11-13", next.fingerprint),
    null,
  );
  assert.deepEqual(
    readHistoryCardCache(storage, "journal-a", "2026-11-12", first.fingerprint),
    JSON.parse(JSON.stringify(summary)),
  );
});
