import { emptyMorningSleep } from "./morning-sleep";
import assert from "node:assert/strict";
import test from "node:test";
import {
  CHECK_IN_SECTIONS,
  MORNING_CHECK_IN_SECTIONS,
  getMorningCheckInCompletion,
  getCheckInCompletion,
  getCheckInCardFeedback,
  isCheckInSection,
} from "./check-in-completion";
import type { DailyCheckIn, DailyMood } from "./daily-check-in";

const allSections = CHECK_IN_SECTIONS.map(({ id }) => id);
function saved(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
  return {
    day: "2026-11-03",
    note: "",
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    createdAt: "2026-11-03T20:30:00.000Z",
    updatedAt: "2026-11-03T20:30:00.000Z",
    ...overrides,
  };
}

test("no saved check-in leaves all six optional sections open by default", () => {
  const result = getCheckInCompletion();
  assert.deepEqual(result.sections, [
    { id: "mood", label: "Mood", complete: false },
    { id: "energy", label: "Energy", complete: false },
    { id: "stress", label: "Stress", complete: false },
    { id: "sleep", label: "Sleep", complete: false },
    { id: "notes", label: "Notes", complete: false },
    { id: "helped", label: "What Helped", complete: false },
  ]);
  assert.equal(result.completedCount, 0);
  assert.equal(result.totalCount, 6);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, result.sections);
  assert.equal(result.missing[0], result.sections[0]);
  assert.equal(getCheckInCompletion(undefined, allSections).completedCount, 0);
});

test("zero sleep is a saved response while null remains missing", () => {
  const partial = getCheckInCompletion(
    saved({ moods: ["okay"], sleepHours: 0 }),
  );
  assert.equal(partial.completedCount, 2);
  assert.deepEqual(
    partial.missing.map(({ id }) => id),
    ["energy", "stress", "notes", "helped"],
  );
  assert.equal(partial.complete, false);
  for (const hours of [0, 0.5, 7.25, 24])
    assert.equal(
      getCheckInCompletion(saved({ sleepHours: hours }), ["sleep"]).complete,
      true,
    );
  for (const hours of [null, -0.1, 24.1, NaN, Infinity])
    assert.equal(
      getCheckInCompletion(saved({ sleepHours: hours }), ["sleep"]).complete,
      false,
    );
});

test("notes and helped count trimmed text without stripping Markdown or changing content", () => {
  for (const text of ["", "   ", "\t\n  "])
    assert.equal(
      getCheckInCompletion(saved({ note: text, helped: text }), [
        "notes",
        "helped",
      ]).completedCount,
      0,
    );
  for (const text of ["---", "#", "  A useful moment.\n", "0"])
    assert.equal(
      getCheckInCompletion(saved({ note: text, helped: text }), [
        "notes",
        "helped",
      ]).complete,
      true,
    );
});

test("only valid whole ratings and known moods complete their sections", () => {
  for (const value of [1, 2, 3, 4, 5]) {
    assert.equal(
      getCheckInCompletion(saved({ energy: value, stress: value }), [
        "energy",
        "stress",
      ]).complete,
      true,
    );
  }
  for (const value of [null, 0, 6, -1, 1.5, NaN, Infinity]) {
    assert.equal(
      getCheckInCompletion(saved({ energy: value, stress: value }), [
        "energy",
        "stress",
      ]).completedCount,
      0,
    );
  }
  assert.equal(
    getCheckInCompletion(saved({ moods: ["unknown" as DailyMood] }), ["mood"])
      .complete,
    false,
  );
  assert.equal(
    getCheckInCompletion(saved({ moods: ["calm", "hopeful"] }), ["mood"])
      .complete,
    true,
  );
});

test("the default needs all six responses while an explicit core-three override stays supported", () => {
  const checkIn = saved({ moods: ["okay"], sleepHours: 0, note: "---" });
  const core = getCheckInCompletion(checkIn, ["mood", "sleep", "notes"]);
  assert.equal(core.complete, true);
  assert.equal(core.completedCount, 3);
  assert.equal(core.totalCount, 3);
  assert.deepEqual(core.missing, []);
  const all = getCheckInCompletion(checkIn);
  assert.equal(all.complete, false);
  assert.equal(all.completedCount, 3);
  assert.equal(all.totalCount, 6);
  assert.deepEqual(
    all.missing.map(({ id }) => id),
    ["energy", "stress", "helped"],
  );
  assert.equal(
    getCheckInCompletion({
      ...checkIn,
      energy: 1,
      stress: 5,
      helped: "A walk.",
    }).complete,
    true,
  );
});

test("custom tracked sections are unique and allowlisted without counting an empty selection done", () => {
  const checkIn = saved({ note: "An entry." });
  const result = getCheckInCompletion(checkIn, ["notes", "mood", "notes"]);
  assert.equal(result.totalCount, 2);
  assert.equal(result.completedCount, 1);
  assert.deepEqual(
    result.sections.map(({ id }) => id),
    ["mood", "notes"],
  );
  assert.equal(getCheckInCompletion(checkIn, []).complete, false);
  for (const { id } of CHECK_IN_SECTIONS)
    assert.equal(isCheckInSection(id), true);
  for (const value of [undefined, null, "writing", "", "__proto__", 0, {}, []])
    assert.equal(isCheckInSection(value), false);
});

test("completion never mutates the saved response or tracked section list", () => {
  const checkIn = saved({
    moods: ["calm"],
    note: "  # Keep this spacing\n",
    sleepHours: 7.25,
  });
  const original = structuredClone(checkIn);
  Object.freeze(checkIn.moods);
  Object.freeze(checkIn);
  const tracked = Object.freeze([...allSections]);
  const result = getCheckInCompletion(checkIn, tracked);
  assert.deepEqual(getCheckInCompletion(checkIn, tracked), result);
  assert.deepEqual(checkIn, original);
  assert.deepEqual(tracked, allSections);
});

test("Morning has five independent groups without changing the six Evening defaults", () => {
  const morning = getMorningCheckInCompletion();
  assert.deepEqual(
    morning.sections.map(({ id }) => id),
    [
      "notes",
      "morning-ratings",
      "morning-schedule",
      "morning-interruptions",
      "morning-duration",
    ],
  );
  assert.equal(morning.totalCount, 5);
  assert.equal(morning.completedCount, 0);
  assert.equal(getCheckInCompletion().totalCount, 6);
  for (const { id } of MORNING_CHECK_IN_SECTIONS)
    assert.equal(isCheckInSection(id), true);
});

test("Morning groups require their full saved answers, with explicit zeros counting and partial ratings staying open", () => {
  const partial = saved({
    period: "morning",
    note: "A morning note.",
    morningSleep: { ...emptyMorningSleep(), sleepQuality: 8 },
  });
  assert.equal(getMorningCheckInCompletion(partial).completedCount, 1);
  const all = saved({
    period: "morning",
    note: "A morning note.",
    morningSleep: {
      dreamRecall: 1,
      sleepiness: 10,
      sleepDepth: 4,
      restfulness: 7,
      sleepQuality: 8,
      lightsOut: "23:00",
      gotUp: "07:00",
      fallAsleepMinutes: 0,
      awakenings: 0,
      awakeMinutes: 0,
      totalSleepMinutes: 420,
      extraSleepMinutes: 0,
    },
  });
  assert.equal(getMorningCheckInCompletion(all).complete, true);
  assert.equal(getMorningCheckInCompletion(all).completedCount, 5);
  assert.equal(
    getCheckInCompletion(all).totalCount,
    6,
    "Evening helper retains its own catalog even for a Morning record",
  );
  const missingExtra = {
    ...all,
    morningSleep: { ...all.morningSleep!, extraSleepMinutes: null },
  };
  assert.equal(
    getMorningCheckInCompletion(missingExtra).missing.some(
      ({ id }) => id === "morning-duration",
    ),
    true,
  );
});

test("legacy Morning notes and sleep retain completion without inventing sleep ratings", () => {
  const legacy = saved({
    period: "morning",
    note: "Existing note.",
    sleepHours: 0,
    energy: 4,
    stress: 2,
    moods: ["calm"],
  });
  const completion = getMorningCheckInCompletion(legacy);
  assert.equal(completion.completedCount, 2);
  assert.deepEqual(
    completion.sections.filter(({ complete }) => complete).map(({ id }) => id),
    ["notes", "morning-duration"],
  );
  assert.equal(
    getMorningCheckInCompletion(saved({ period: "morning", sleepHours: 7.5 }))
      .completedCount,
    1,
  );
  assert.equal(
    getMorningCheckInCompletion(saved({ period: "morning", sleepHours: NaN }))
      .completedCount,
    0,
  );
});

test("Morning completion rejects invalid saved details, deduplicates tracked groups and never mutates records", () => {
  const record = saved({
    period: "morning",
    morningSleep: {
      ...emptyMorningSleep(),
      lightsOut: "00:00",
      gotUp: "01:00",
      totalSleepMinutes: 120,
      extraSleepMinutes: 0,
      dreamRecall: 0,
    },
  });
  const original = structuredClone(record);
  const result = getMorningCheckInCompletion(record, [
    "morning-duration",
    "morning-duration",
    "notes",
  ]);
  assert.equal(result.totalCount, 2);
  assert.equal(result.completedCount, 0);
  assert.equal(getMorningCheckInCompletion(record, []).complete, false);
  assert.deepEqual(record, original);
});

test("both card periods use the same save states and never present local changes as journal saves", () => {
  for (const period of ["morning", "evening"] as const) {
    const completion =
      period === "morning"
        ? getMorningCheckInCompletion()
        : getCheckInCompletion();
    for (const saved of [false, true]) {
      const base = { period, saved, completion };
      const unchanged = getCheckInCardFeedback({
        ...base,
        hasChanges: false,
        deviceSaved: true,
      });
      assert.equal(unchanged.label, saved ? "Saved" : "* Optional");
      assert.equal(unchanged.showSavedMark, saved);
      const durable = getCheckInCardFeedback({
        ...base,
        hasChanges: true,
        deviceSaved: true,
      });
      assert.equal(durable.state, "draft");
      assert.equal(durable.label, "Draft saved");
      assert.equal(durable.showSavedMark, true);
      assert.match(durable.description, /kept on this device/);
      const memory = getCheckInCardFeedback({
        ...base,
        hasChanges: true,
        deviceSaved: false,
      });
      assert.equal(memory.state, "draft");
      assert.equal(memory.label, "Unsent draft");
      assert.equal(memory.showSavedMark, false);
      assert.match(memory.description, /device storage is unavailable/);
    }
  }
});

test("both card periods format progress as sections complete and keep Saved after completion", () => {
  for (const period of ["morning", "evening"] as const) {
    const completion =
      period === "morning"
        ? getMorningCheckInCompletion(saved({ note: "Words" }))
        : getCheckInCompletion(saved({ note: "Words" }));
    const base = { period, saved: true, hasChanges: false, deviceSaved: true };
    const partial = getCheckInCardFeedback({ ...base, completion });
    assert.equal(
      partial.preview,
      `1 of ${period === "morning" ? 5 : 6} sections complete · All optional`,
    );
    assert.match(partial.description, /Still to finish:/);
    const finished = getCheckInCardFeedback({
      ...base,
      completion: {
        ...completion,
        complete: true,
        completedCount: completion.totalCount,
        missing: [],
      },
    });
    assert.equal(finished.preview, "Your check-in is complete");
    assert.equal(finished.label, "Saved");
    assert.equal(finished.showSavedMark, true);
  }
});

test("explicit ten-point energy and stress count while untagged out-of-range scores do not", () => {
  for (const value of [1, 5, 6, 10])
    assert.equal(
      getCheckInCompletion(
        saved({
          energy: value,
          energyScale: 10,
          stress: value,
          stressScale: 10,
        }),
        ["energy", "stress"],
      ).complete,
      true,
    );
  for (const value of [0, 11, 1.5, NaN, Infinity])
    assert.equal(
      getCheckInCompletion(saved({ energy: value, energyScale: 10 }), [
        "energy",
      ]).complete,
      false,
    );
  assert.equal(
    getCheckInCompletion(saved({ energy: 10 }), ["energy"]).complete,
    false,
  );
});
