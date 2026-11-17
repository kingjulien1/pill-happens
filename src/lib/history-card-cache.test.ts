import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, type AppData } from "./domain";
import {
  buildHistoryCardSummary,
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
    { strengthMg: 5 },
    { color: "tw-violet-500" },
    { isBenzodiazepine: false },
  ]) {
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
