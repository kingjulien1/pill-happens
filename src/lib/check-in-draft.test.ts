import {
  emptyMorningSleep,
  morningSleepDefaults,
  parseMorningSleepDraft,
} from "./morning-sleep";
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInDefaults,
  checkInDraftKey,
  hasCheckInDraftChanges,
  isCheckInDraft,
  morningSleepForDraft,
} from "./check-in-draft";
import {
  DAILY_REFLECTION_MAX_LENGTH,
  type DailyCheckIn,
} from "./daily-check-in";
import { createDraftWorkspace } from "./journal-drafts";

test("Morning has its own draft identity while default Evening keeps the legacy key", () => {
  assert.equal(checkInDraftKey("2026-10-30"), "checkin:2026-10-30");
  assert.equal(checkInDraftKey("2026-10-30", "evening"), "checkin:2026-10-30");
  assert.equal(
    checkInDraftKey("2026-10-30", "morning"),
    "checkin:2026-10-30:morning",
  );
});

test("new check-in drafts have concise defaults and no obsolete inspiration fields", () => {
  assert.deepEqual(checkInDefaults(), {
    note: "",
    moods: [],
    energy: null,
    stress: null,
    energyScale: 10,
    stressScale: 10,
    sleepHours: "",
    bedtime: "",
    helped: "",
    writingOpen: false,
    reflectionBaseUpdatedAt: null,
  });
  const saved: DailyCheckIn = {
    day: "2026-10-30",
    note: "\n    An existing Markdown code block.\n",
    moods: ["calm"],
    energy: 2,
    stress: 3,
    sleepHours: 7.5,
    helped: "A walk.",
    createdAt: "2026-10-30T21:00:00Z",
    updatedAt: "2026-10-30T21:00:00Z",
  };
  const draft = checkInDefaults(saved);
  assert.equal(draft.note, saved.note);
  assert.equal(draft.sleepHours, "7.5");
  draft.moods.push("happy");
  assert.deepEqual(saved.moods, ["calm"]);
});

test("legacy prompt selections, missing prompt fields and absent writing state preserve valid notes", () => {
  const legacy = { ...checkInDefaults(), note: "Keep my existing words." };
  delete legacy.writingOpen;
  for (const prompt of [
    undefined,
    null,
    "moment",
    "feeling",
    "win",
    "retired-selection",
    12,
  ])
    assert.equal(isCheckInDraft({ ...legacy, prompt }), true);
  assert.equal(isCheckInDraft(legacy), true);
  assert.equal(isCheckInDraft({ ...legacy, writingOpen: true }), true);
  assert.equal(isCheckInDraft({ ...legacy, writingOpen: "yes" }), false);
});

test("reflection base versions are optional for legacy drafts and persist without changing raw fields", () => {
  const legacy = {
    ...checkInDefaults(),
    note: "Local",
    sleepHours: "unfinished",
    writingOpen: true,
  };
  delete legacy.reflectionBaseUpdatedAt;
  assert.equal(isCheckInDraft(legacy), true);
  assert.equal(
    isCheckInDraft({ ...legacy, reflectionBaseUpdatedAt: null }),
    true,
  );
  assert.equal(
    isCheckInDraft({
      ...legacy,
      reflectionBaseUpdatedAt: "2026-11-06T12:00:00Z",
    }),
    true,
  );
  assert.equal(
    isCheckInDraft({ ...legacy, reflectionBaseUpdatedAt: "invalid" }),
    false,
  );
  const workspace = createDraftWorkspace("reflection_version_test");
  workspace.hydrate(null);
  workspace.setDraft("checkin:2026-11-06:morning", legacy);
  const saved =
    workspace.getSnapshot().drafts["checkin:2026-11-06:morning"].value;
  assert.deepEqual(saved, legacy);
});

test("draft validation shares the long reflection cap without relaxing other raw form bounds", () => {
  const draft = checkInDefaults();
  assert.equal(
    isCheckInDraft({
      ...draft,
      note: "静".repeat(DAILY_REFLECTION_MAX_LENGTH),
    }),
    true,
  );
  assert.equal(
    isCheckInDraft({
      ...draft,
      note: "x".repeat(DAILY_REFLECTION_MAX_LENGTH + 1),
    }),
    false,
  );
  for (const fields of [
    { helped: "x".repeat(161) },
    { sleepHours: "x".repeat(257) },
    { bedtime: "x".repeat(257) },
    { bedtime: null },
    { bedtime: 2330 },
    { energy: 0 },
    { stress: 1.5 },
    { moods: ["unknown"] },
    { moods: ["calm", "okay", "happy", "low", "tired"] },
  ])
    assert.equal(isCheckInDraft({ ...draft, ...fields }), false);
  assert.equal(isCheckInDraft(null), false);
  assert.equal(isCheckInDraft([]), false);
});

test("an open writing draft keeps its explicit tracking day across midnight and the 06:00 rollover", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const before = createDraftWorkspace("synthetic_journal");
  before.hydrate(storage);
  before.setDraft("checkin:2026-10-30", {
    ...checkInDefaults(),
    note: "A thought that continues after midnight.",
    writingOpen: true,
  });
  before.openDialog("/", { kind: "check-in", day: "2026-10-30" });
  const after = createDraftWorkspace("synthetic_journal");
  after.hydrate(storage);
  const restored = after.getSnapshot();
  assert.deepEqual(restored.screens["/"].dialog, {
    kind: "check-in",
    day: "2026-10-30",
  });
  assert.equal(
    isCheckInDraft(restored.drafts["checkin:2026-10-30"].value),
    true,
  );
  assert.equal(
    (restored.drafts["checkin:2026-10-30"].value as { writingOpen: boolean })
      .writingOpen,
    true,
  );
  assert.equal(restored.drafts["checkin:2026-10-31"], undefined);
});

test("Morning defaults add nullable sleep details while Evening adds only its optional bedtime", () => {
  const original = checkInDefaults();
  const morning = checkInDefaults(undefined, "morning");
  assert.deepEqual(morning.morningSleep, morningSleepDefaults());
  assert.equal("bedtime" in morning, false);
  assert.deepEqual(checkInDefaults(undefined, "evening"), original);
  assert.equal("morningSleep" in original, false);
  const saved: DailyCheckIn = {
    day: "2026-11-05",
    period: "morning",
    note: "Old words.",
    moods: ["calm"],
    energy: 4,
    stress: 2,
    sleepHours: 7.5,
    helped: "A walk.",
    createdAt: "2026-11-05T07:00:00Z",
    updatedAt: "2026-11-05T07:00:00Z",
  };
  const restored = checkInDefaults(saved);
  assert.equal(restored.morningSleep?.sleepHours, "7");
  assert.equal(restored.morningSleep?.sleepMinutes, "30");
  assert.equal(restored.morningSleep?.dreamRecall, null);
  assert.equal(restored.energy, 4);
  assert.deepEqual(restored.moods, ["calm"]);
  assert.equal(restored.helped, "A walk.");
  assert.equal("morningSleep" in checkInDefaults(saved, "evening"), false);
  const canonical = checkInDefaults({
    ...saved,
    morningSleep: {
      ...emptyMorningSleep(),
      sleepQuality: 9,
      totalSleepMinutes: 390,
    },
  });
  assert.equal(canonical.morningSleep?.sleepHours, "6");
  assert.equal(canonical.morningSleep?.sleepMinutes, "30");
});

test("legacy raw drafts remain valid and optional Morning sleep drafts validate without coercing unfinished text", () => {
  const legacy = checkInDefaults();
  assert.equal(isCheckInDraft(legacy), true);
  const raw = {
    ...morningSleepDefaults(),
    lightsOut: "23:",
    sleepHours: "-",
    sleepMinutes: "00",
    awakenings: "0",
  };
  assert.equal(isCheckInDraft({ ...legacy, morningSleep: raw }), true);
  for (const morningSleep of [
    null,
    [],
    {},
    { ...raw, sleepQuality: 11 },
    { ...raw, sleepHours: 7 },
  ])
    assert.equal(isCheckInDraft({ ...legacy, morningSleep }), false);
});

test("Morning raw sleep drafts survive workspace reload without changing zeros, incomplete values or Evening", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const before = createDraftWorkspace("synthetic_sleep_journal");
  before.hydrate(storage);
  const morning = {
    ...checkInDefaults(undefined, "morning"),
    morningSleep: {
      ...morningSleepDefaults(),
      dreamRecall: 1,
      awakenings: "0",
      awakeMinutes: "00",
      sleepHours: " 7",
      sleepMinutes: "-",
      lightsOut: "23:",
    },
  };
  const evening = {
    ...checkInDefaults(),
    note: "Separate evening words.",
    sleepHours: "8.25",
    bedtime: "23:",
  };
  before.setDraft(checkInDraftKey("2026-11-05", "morning"), morning);
  before.setDraft(checkInDraftKey("2026-11-05", "evening"), evening);
  const after = createDraftWorkspace("synthetic_sleep_journal");
  after.hydrate(storage);
  assert.deepEqual(
    after.getSnapshot().drafts[checkInDraftKey("2026-11-05", "morning")].value,
    morning,
  );
  assert.deepEqual(
    after.getSnapshot().drafts[checkInDraftKey("2026-11-05", "evening")].value,
    evening,
  );
});

test("an old raw duration overrides a newer saved total while preserving all other sleep details and draft words", () => {
  const saved: DailyCheckIn = {
    day: "2026-11-05",
    period: "morning",
    note: "Saved words.",
    moods: [],
    energy: null,
    stress: null,
    sleepHours: 7,
    helped: "",
    morningSleep: {
      ...emptyMorningSleep(),
      sleepQuality: 9,
      dreamRecall: 3,
      lightsOut: "23:00",
      gotUp: "08:00",
      totalSleepMinutes: 420,
      extraSleepMinutes: 30,
    },
    createdAt: "2026-11-05T07:00:00Z",
    updatedAt: "2026-11-05T07:00:00Z",
  };
  const draft = Object.freeze({
    ...checkInDefaults(),
    note: "My unsaved draft words.",
    sleepHours: "8",
  });
  const original = structuredClone(saved);
  const resolved = morningSleepForDraft(draft, saved);
  assert.equal(resolved.sleepHours, "8");
  assert.equal(resolved.sleepMinutes, "0");
  assert.equal(resolved.sleepQuality, 9);
  assert.equal(resolved.dreamRecall, 3);
  assert.equal(resolved.lightsOut, "23:00");
  assert.equal(resolved.extraSleepMinutes, "30");
  assert.equal(parseMorningSleepDraft(resolved).value?.totalSleepMinutes, 480);
  assert.equal(draft.note, "My unsaved draft words.");
  assert.deepEqual(saved, original);
  const cleared = morningSleepForDraft({ ...draft, sleepHours: "" }, saved);
  assert.equal(cleared.sleepHours, "");
  assert.equal(cleared.sleepMinutes, "");
  assert.equal(cleared.sleepQuality, 9);
  assert.equal(parseMorningSleepDraft(cleared).value?.totalSleepMinutes, null);
});

test("old fractional and zero-hour drafts convert to minutes without guessing other answers", () => {
  const draft = { ...checkInDefaults(), sleepHours: "7.5" };
  const resolved = morningSleepForDraft(draft);
  assert.equal(resolved.sleepHours, "7");
  assert.equal(resolved.sleepMinutes, "30");
  assert.equal(resolved.sleepQuality, null);
  assert.equal(parseMorningSleepDraft(resolved).value?.totalSleepMinutes, 450);
  const zero = morningSleepForDraft({ ...draft, sleepHours: "0" });
  assert.equal(zero.sleepHours, "0");
  assert.equal(zero.sleepMinutes, "0");
  assert.equal(parseMorningSleepDraft(zero).value?.totalSleepMinutes, 0);
});

test("invalid old raw hours remain recoverable and fail save parsing instead of becoming blank", () => {
  for (const raw of ["-", "NaN", "Infinity", "-1", "24.5", "unfinished"]) {
    const draft = { ...checkInDefaults(), sleepHours: raw };
    const resolved = morningSleepForDraft(draft);
    assert.equal(resolved.sleepHours, raw);
    assert.equal(resolved.sleepMinutes, "");
    assert.notEqual(parseMorningSleepDraft(resolved).error, null);
    assert.equal(draft.sleepHours, raw);
  }
});

test("an existing nested sleep draft always takes priority over its hidden legacy hours", () => {
  const nested = {
    ...morningSleepDefaults(),
    sleepHours: "6",
    sleepMinutes: "15",
  };
  const draft = {
    ...checkInDefaults(),
    sleepHours: "24",
    morningSleep: nested,
  };
  assert.equal(morningSleepForDraft(draft), nested);
  assert.equal(
    parseMorningSleepDraft(morningSleepForDraft(draft)).value
      ?.totalSleepMinutes,
    375,
  );
});

const changeRecord: DailyCheckIn = {
  day: "2026-11-06",
  period: "evening",
  note: "Existing words.",
  moods: ["calm", "happy"],
  energy: 2,
  stress: 3,
  sleepHours: 7,
  helped: "A walk.",
  createdAt: "2026-11-06T19:00:00Z",
  updatedAt: "2026-11-06T20:00:00Z",
};

test("Evening bedtime restores midnight, keeps unfinished drafts and detects explicit changes without affecting Morning", () => {
  const legacy = checkInDefaults(changeRecord);
  delete legacy.bedtime;
  assert.equal(isCheckInDraft(legacy), true);
  assert.equal(hasCheckInDraftChanges(legacy, changeRecord), false);
  assert.equal(
    hasCheckInDraftChanges({ ...legacy, bedtime: "" }, changeRecord),
    false,
  );
  const saved = { ...changeRecord, bedtime: "00:00" };
  const draft = checkInDefaults(saved);
  assert.equal(draft.bedtime, "00:00");
  assert.equal(hasCheckInDraftChanges(draft, saved), false);
  for (const bedtime of ["", "23:", "23:30"])
    assert.equal(hasCheckInDraftChanges({ ...draft, bedtime }, saved), true);
  for (const bedtime of ["", "23:", "00:00", "x".repeat(256)])
    assert.equal(isCheckInDraft({ ...legacy, bedtime }), true);
  assert.equal(checkInDefaults({ ...changeRecord, bedtime: null }).bedtime, "");
  const morning = { ...changeRecord, period: "morning" as const };
  assert.equal(
    hasCheckInDraftChanges(
      { ...checkInDefaults(morning), bedtime: "23:30" },
      morning,
      "morning",
    ),
    false,
    "Evening-only draft text does not change Morning progress or feedback",
  );
});

test("every Evening content field detects both first additions and clearing saved answers", () => {
  const first = checkInDefaults(undefined, "evening");
  for (const edit of [
    { note: "First words." },
    { moods: ["okay"] },
    { energy: 1 },
    { stress: 1 },
    { sleepHours: "0" },
    { bedtime: "00:00" },
    { helped: "A chat." },
  ])
    assert.equal(
      hasCheckInDraftChanges({ ...first, ...edit }, undefined, "evening"),
      true,
    );

  const existing = checkInDefaults(changeRecord, "evening");
  for (const edit of [
    { note: "" },
    { moods: [] },
    { energy: null },
    { stress: null },
    { sleepHours: "" },
    { helped: "" },
  ]) {
    assert.equal(
      hasCheckInDraftChanges({ ...existing, ...edit }, changeRecord, "evening"),
      true,
    );
    assert.equal(
      hasCheckInDraftChanges(existing, changeRecord, "evening"),
      false,
    );
  }
});

test("both periods ignore editor navigation, save-version metadata and mood ordering", () => {
  for (const period of ["morning", "evening"] as const) {
    const record = { ...changeRecord, period };
    const draft = checkInDefaults(record, period);
    assert.equal(
      hasCheckInDraftChanges(
        {
          ...draft,
          writingOpen: true,
          reflectionBaseUpdatedAt: "2026-11-06T21:00:00Z",
          moods: [...draft.moods].reverse(),
        },
        record,
        period,
      ),
      false,
    );
    assert.equal(
      hasCheckInDraftChanges({ ...draft, note: "Changed" }, record, period),
      true,
    );
    assert.equal(hasCheckInDraftChanges(undefined, record, period), false);
    assert.equal(
      hasCheckInDraftChanges({ invalid: true }, record, period),
      false,
    );
  }
});

test("Morning compares sleep answers rather than restored object property order", () => {
  const record = { ...changeRecord, period: "morning" as const };
  const draft = checkInDefaults(record, "morning");
  const reordered = Object.fromEntries(
    Object.entries(draft.morningSleep!).reverse(),
  ) as NonNullable<typeof draft.morningSleep>;
  assert.equal(
    hasCheckInDraftChanges(
      { ...draft, morningSleep: reordered },
      record,
      "morning",
    ),
    false,
  );
  for (const [field, current] of Object.entries(reordered)) {
    const value =
      typeof current === "string" ? (current === "1" ? "2" : "1") : 1;
    assert.equal(
      hasCheckInDraftChanges(
        { ...draft, morningSleep: { ...reordered, [field]: value } },
        record,
        "morning",
      ),
      true,
      field,
    );
  }
});

test("old raw rating drafts remain five-point while new entries record explicit scales", () => {
  const legacy = { ...checkInDefaults(), energy: 3, stress: 5 };
  delete legacy.energyScale;
  delete legacy.stressScale;
  assert.ok(isCheckInDraft(legacy));
  assert.equal(legacy.energy, 3);
  assert.equal(legacy.stress, 5);
  assert.equal(isCheckInDraft({ ...legacy, energy: 6 }), false);
  assert.ok(isCheckInDraft({ ...legacy, energy: 6, energyScale: 10 }));
  assert.equal(
    isCheckInDraft({ ...legacy, stress: 10, stressScale: 5 }),
    false,
  );
  assert.equal(isCheckInDraft({ ...legacy, energyScale: 7 }), false);
  const saved = {
    day: "2026-11-09",
    note: "",
    moods: [],
    energy: 3,
    stress: 5,
    sleepHours: null,
    helped: "",
    createdAt: "2026-11-09T21:00:00Z",
    updatedAt: "2026-11-09T21:00:00Z",
  } satisfies DailyCheckIn;
  const defaults = checkInDefaults(saved);
  assert.equal(defaults.energy, 3);
  assert.equal(defaults.energyScale, 5);
  assert.equal(
    hasCheckInDraftChanges({ ...defaults, energyScale: undefined }, saved),
    false,
  );
  assert.equal(
    hasCheckInDraftChanges({ ...defaults, energyScale: 10 }, saved),
    true,
  );
  assert.equal(
    hasCheckInDraftChanges({
      ...checkInDefaults(),
      energyScale: undefined,
      stressScale: undefined,
    }),
    false,
  );
});
