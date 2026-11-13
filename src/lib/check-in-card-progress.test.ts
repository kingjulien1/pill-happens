import assert from "node:assert/strict";
import test from "node:test";
import {
  getCheckInCardHint,
  getCheckInCardProgress,
} from "./check-in-card-progress";
import { checkInDefaults } from "./check-in-draft";
import {
  getCheckInCompletion,
  getMorningCheckInCompletion,
} from "./check-in-completion";
import type { DailyCheckIn } from "./daily-check-in";
import { emptyMorningSleep } from "./morning-sleep";

const evening: DailyCheckIn = {
  day: "2026-11-07",
  period: "evening",
  note: "A few words.",
  moods: ["calm"],
  energy: 3,
  stress: 2,
  sleepHours: 0,
  helped: "A conversation.",
  createdAt: "2026-11-07T18:00:00Z",
  updatedAt: "2026-11-07T19:00:00Z",
};
const morning: DailyCheckIn = {
  ...evening,
  period: "morning",
  morningSleep: {
    ...emptyMorningSleep(),
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
};

test("untouched prompts and navigation-only drafts stay hidden for both periods", () => {
  for (const period of ["morning", "evening"] as const) {
    const draft = checkInDefaults(undefined, period);
    for (const value of [
      undefined,
      { malformed: true },
      draft,
      {
        ...draft,
        writingOpen: true,
        reflectionBaseUpdatedAt: "2026-11-07T20:00:00Z",
      },
    ]) {
      const result = getCheckInCardProgress({ period, draft: value });
      assert.equal(result.visible, false);
      assert.equal(result.percent, 0);
      assert.equal(result.completion.completedCount, 0);
    }
  }
});

test("saved records retain authoritative completion even with invalid or unchanged drafts", () => {
  for (const record of [evening, morning]) {
    const period = record.period!;
    const expected =
      period === "morning"
        ? getMorningCheckInCompletion(record)
        : getCheckInCompletion(record);
    for (const draft of [undefined, {}, checkInDefaults(record, period)]) {
      const result = getCheckInCardProgress({ period, checkIn: record, draft });
      assert.equal(result.visible, true);
      assert.equal(result.percent, 100);
      assert.deepEqual(result.completion, expected);
    }
  }
});

test("first additions show live drafts with each period's independent denominator", () => {
  for (const period of ["morning", "evening"] as const) {
    const draft = {
      ...checkInDefaults(undefined, period),
      note: "First words.",
    };
    const result = getCheckInCardProgress({ period, draft });
    assert.equal(result.visible, true);
    assert.equal(result.completion.completedCount, 1);
    assert.equal(result.completion.totalCount, period === "morning" ? 5 : 6);
    assert.equal(result.percent, period === "morning" ? 20 : 17);
  }
});

test("Evening drafts use valid current answers, including clears, zero sleep and invalid text", () => {
  const defaults = checkInDefaults(evening, "evening");
  const cleared = getCheckInCardProgress({
    period: "evening",
    checkIn: evening,
    draft: { ...defaults, note: "", energy: null },
  });
  assert.equal(cleared.percent, 67);
  assert.deepEqual(
    cleared.completion.missing.map(({ id }) => id),
    ["energy", "notes"],
  );
  for (const sleepHours of ["", " ", "25", "not a number"]) {
    const result = getCheckInCardProgress({
      period: "evening",
      draft: { ...checkInDefaults(undefined, "evening"), sleepHours },
    });
    assert.equal(result.completion.completedCount, 0);
    assert.equal(result.percent, 0);
    assert.equal(result.visible, sleepHours !== "");
  }
  const zero = getCheckInCardProgress({
    period: "evening",
    draft: { ...checkInDefaults(undefined, "evening"), sleepHours: "0" },
  });
  assert.equal(zero.percent, 17);
  assert.equal(
    zero.completion.sections.find(({ id }) => id === "sleep")?.complete,
    true,
  );
});

test("clearing every saved answer remains visible at zero without changing the saved record", () => {
  for (const record of [evening, morning]) {
    const period = record.period!;
    const result = getCheckInCardProgress({
      period,
      checkIn: record,
      draft: checkInDefaults(undefined, period),
    });
    assert.equal(result.visible, true);
    assert.equal(result.percent, 0);
    assert.equal(result.completion.complete, false);
  }
  assert.equal(getCheckInCompletion(evening).complete, true);
  assert.equal(getMorningCheckInCompletion(morning).complete, true);
});

test("a partial Morning rating is a real change without claiming its whole group is complete", () => {
  const draft = checkInDefaults(undefined, "morning");
  const result = getCheckInCardProgress({
    period: "morning",
    draft: {
      ...draft,
      morningSleep: { ...draft.morningSleep!, dreamRecall: 4 },
    },
  });
  assert.equal(result.visible, true);
  assert.equal(result.percent, 0);
  assert.equal(result.completion.completedCount, 0);
});

test("invalid Morning groups do not erase independent valid groups", () => {
  const draft = checkInDefaults(morning, "morning");
  for (const [field, value, missing] of [
    ["awakeMinutes", "unfinished", "morning-interruptions"],
    ["lightsOut", "25:00", "morning-schedule"],
    ["extraSleepHours", "25", "morning-duration"],
  ] as const) {
    const result = getCheckInCardProgress({
      period: "morning",
      checkIn: morning,
      draft: {
        ...draft,
        morningSleep: { ...draft.morningSleep!, [field]: value },
      },
    });
    assert.equal(result.percent, 80, field);
    assert.deepEqual(
      result.completion.missing.map(({ id }) => id),
      [missing],
    );
  }
});

test("Morning duration still respects a valid schedule and explicit zeros complete all groups", () => {
  const draft = checkInDefaults(morning, "morning");
  const impossible = getCheckInCardProgress({
    period: "morning",
    checkIn: morning,
    draft: {
      ...draft,
      morningSleep: { ...draft.morningSleep!, lightsOut: "06:00" },
    },
  });
  assert.equal(impossible.percent, 80);
  assert.deepEqual(
    impossible.completion.missing.map(({ id }) => id),
    ["morning-duration"],
  );
  const zero = getCheckInCardProgress({
    period: "morning",
    draft: {
      ...draft,
      morningSleep: {
        ...draft.morningSleep!,
        sleepHours: "0",
        sleepMinutes: "0",
      },
    },
  });
  assert.equal(zero.percent, 100);
  assert.equal(zero.completion.complete, true);
});

test("legacy Morning duration survives unrelated edits but not clearing or conflicting new clocks", () => {
  const legacy: DailyCheckIn = {
    ...evening,
    period: "morning",
    sleepHours: 7.5,
  };
  const draft = checkInDefaults(legacy, "morning");
  const unrelated = getCheckInCardProgress({
    period: "morning",
    checkIn: legacy,
    draft: { ...draft, note: "Changed note." },
  });
  assert.equal(unrelated.percent, 40);
  assert.deepEqual(unrelated.completion, getMorningCheckInCompletion(legacy));
  const cleared = getCheckInCardProgress({
    period: "morning",
    checkIn: legacy,
    draft: {
      ...draft,
      morningSleep: {
        ...draft.morningSleep!,
        sleepHours: "",
        sleepMinutes: "",
      },
    },
  });
  assert.equal(cleared.percent, 20);
  const conflicting = getCheckInCardProgress({
    period: "morning",
    checkIn: legacy,
    draft: {
      ...draft,
      morningSleep: {
        ...draft.morningSleep!,
        lightsOut: "06:00",
        gotUp: "07:00",
      },
    },
  });
  assert.equal(
    conflicting.completion.sections.find(({ id }) => id === "morning-duration")
      ?.complete,
    false,
  );
  assert.equal(
    conflicting.completion.sections.find(({ id }) => id === "morning-schedule")
      ?.complete,
    true,
  );
});

test("live projections never mutate saved answers, raw drafts, timestamps or navigation metadata", () => {
  const record = structuredClone(morning);
  const draft = {
    ...checkInDefaults(record, "morning"),
    note: "New draft words.",
    writingOpen: true,
  };
  const before = structuredClone({ record, draft });
  Object.freeze(record.morningSleep);
  Object.freeze(record.moods);
  Object.freeze(record);
  Object.freeze(draft.morningSleep);
  Object.freeze(draft.moods);
  Object.freeze(draft);
  const result = getCheckInCardProgress({
    period: "morning",
    checkIn: record,
    draft,
  });
  assert.equal(result.percent, 100);
  assert.deepEqual({ record, draft }, before);
});

test("card hints introduce untouched prompts and acknowledge completion for each period", () => {
  for (const record of [morning, evening]) {
    const period = record.period!;
    assert.equal(
      getCheckInCardHint(period, getCheckInCardProgress({ period })),
      period === "morning" ? "How did you sleep?" : "How did today feel?",
    );
    assert.equal(
      getCheckInCardHint(
        period,
        getCheckInCardProgress({ period, checkIn: record }),
      ),
      period === "morning" ? "Revisit your morning" : "Revisit your day",
    );
  }
});

test("Evening hints identify the first unfinished section from current draft answers", () => {
  const defaults = checkInDefaults(evening, "evening");
  for (const [change, section, hint] of [
    [{ moods: [] }, "mood", "Next · Your mood"],
    [{ energy: null }, "energy", "Next · Energy"],
    [{ stress: null }, "stress", "Next · Stress"],
    [{ sleepHours: "" }, "sleep", "Next · Sleep hours"],
    [{ note: "" }, "notes", "Next · Your words"],
    [{ helped: "" }, "helped", "Next · What helped"],
  ] as const) {
    const progress = getCheckInCardProgress({
      period: "evening",
      checkIn: evening,
      draft: { ...defaults, ...change },
    });
    assert.equal(progress.completion.missing[0]?.id, section);
    assert.equal(getCheckInCardHint("evening", progress), hint);
  }

  const draft: ReturnType<typeof checkInDefaults> = {
    ...defaults,
    moods: [],
    energy: null,
  };
  assert.equal(
    getCheckInCardHint(
      "evening",
      getCheckInCardProgress({ period: "evening", checkIn: evening, draft }),
    ),
    "Next · Your mood",
  );
  draft.moods = [...evening.moods];
  assert.equal(
    getCheckInCardHint(
      "evening",
      getCheckInCardProgress({ period: "evening", checkIn: evening, draft }),
    ),
    "Next · Energy",
  );
});

test("Morning hints use the sleep diary's section order and current raw edits", () => {
  const defaults = checkInDefaults(morning, "morning");
  for (const [change, section, hint] of [
    [{ dreamRecall: null }, "morning-ratings", "Next · Sleep ratings"],
    [{ gotUp: "" }, "morning-schedule", "Next · Sleep times"],
    [{ awakeMinutes: "" }, "morning-interruptions", "Next · Night details"],
    [
      { sleepHours: "", sleepMinutes: "" },
      "morning-duration",
      "Next · Sleep length",
    ],
  ] as const) {
    const progress = getCheckInCardProgress({
      period: "morning",
      checkIn: morning,
      draft: {
        ...defaults,
        morningSleep: { ...defaults.morningSleep!, ...change },
      },
    });
    assert.equal(progress.completion.missing[0]?.id, section);
    assert.equal(getCheckInCardHint("morning", progress), hint);
  }

  const draft = {
    ...defaults,
    note: "",
    morningSleep: { ...defaults.morningSleep!, awakeMinutes: "unfinished" },
  };
  assert.equal(
    getCheckInCardHint(
      "morning",
      getCheckInCardProgress({ period: "morning", checkIn: morning, draft }),
    ),
    "Next · Your words",
  );
  draft.note = "A private detail that belongs only in the editor.";
  assert.equal(
    getCheckInCardHint(
      "morning",
      getCheckInCardProgress({ period: "morning", checkIn: morning, draft }),
    ),
    "Next · Night details",
  );
});

test("card hints tolerate an empty completion catalog without inventing a next section", () => {
  const progress = {
    visible: true,
    percent: 0,
    completion: {
      sections: [],
      missing: [],
      completedCount: 0,
      totalCount: 0,
      complete: false,
    },
  };
  assert.equal(getCheckInCardHint("morning", progress), "Choose a section");
  assert.equal(getCheckInCardHint("evening", progress), "Choose a section");
});

test("card hints never mutate live progress or repeat private answers, counts or save claims", () => {
  const progress = getCheckInCardProgress({
    period: "evening",
    checkIn: evening,
    draft: {
      ...checkInDefaults(evening, "evening"),
      energy: null,
      note: "A private journal excerpt must stay in its editor.",
    },
  });
  const before = structuredClone(progress);
  for (const section of progress.completion.sections) Object.freeze(section);
  Object.freeze(progress.completion.sections);
  Object.freeze(progress.completion.missing);
  Object.freeze(progress.completion);
  Object.freeze(progress);
  const hint = getCheckInCardHint("evening", progress);
  assert.equal(hint, "Next · Energy");
  assert.doesNotMatch(hint, /private|journal excerpt|\d|%|saved|draft/i);
  assert.deepEqual(progress, before);
});

test("live ten-point draft ratings retain explicit scales in completion projections", () => {
  const draft = {
    ...checkInDefaults(),
    energy: 10,
    energyScale: 10 as const,
    stress: 6,
    stressScale: 10 as const,
  };
  const result = getCheckInCardProgress({ period: "evening", draft });
  assert.equal(
    result.completion.sections.find(({ id }) => id === "energy")?.complete,
    true,
  );
  assert.equal(
    result.completion.sections.find(({ id }) => id === "stress")?.complete,
    true,
  );
  assert.equal(result.completion.completedCount, 2);
  assert.equal(result.percent, 33);
});
