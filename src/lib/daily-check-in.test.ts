import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "./domain";
import {
  DAILY_MOODS,
  DAILY_MOOD_CHOICES,
  DAILY_MOOD_VALUES,
  DAILY_MOOD_FAMILIES,
  matchesDailyMood,
  rankDailyMoods,
  canCheckIn,
  checkInForDay,
  getCheckInPeriod,
  journalDays,
  type DailyCheckIn,
} from "./daily-check-in";

function reflection(day: string): DailyCheckIn {
  return {
    day,
    note: "A gentler evening.",
    moods: ["calm"],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    createdAt: "2026-10-30T21:00:00.000Z",
    updatedAt: "2026-10-30T21:00:00.000Z",
  };
}

test("the current day's prompt opens exactly at 17:00 in the journal timezone", () => {
  const zone = "Europe/Vienna";
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T15:59:59Z"), zone),
    false,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T16:00:00Z"), zone),
    true,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-30T22:59:59Z"), zone),
    true,
  );
});

test("the 17:00 evening cutoff follows both winter and summer journal offsets", () => {
  for (const [day, before, ready] of [
    ["2026-11-09", "2026-11-09T15:59:59Z", "2026-11-09T16:00:00Z"],
    ["2026-07-09", "2026-07-09T14:59:59Z", "2026-07-09T15:00:00Z"],
  ]) {
    assert.equal(canCheckIn(day, new Date(before), "Europe/Vienna"), false);
    assert.equal(canCheckIn(day, new Date(ready), "Europe/Vienna"), true);
    assert.equal(
      canCheckIn(day, new Date(before), "Europe/Vienna", "morning"),
      true,
    );
    assert.equal(
      canCheckIn(day, new Date(ready), "Europe/Vienna", "morning"),
      true,
    );
  }
});

test("the evening stays attached to its tracking day until 06:00", () => {
  const zone = "Europe/Vienna";
  const afterMidnight = new Date("2026-10-30T23:15:00Z");
  const beforeReset = new Date("2026-10-31T04:59:59Z");
  const reset = new Date("2026-10-31T05:00:00Z");
  assert.equal(dayKey(afterMidnight, zone), "2026-10-30");
  assert.equal(
    canCheckIn(dayKey(afterMidnight, zone), afterMidnight, zone),
    true,
  );
  assert.equal(canCheckIn(dayKey(beforeReset, zone), beforeReset, zone), true);
  assert.equal(dayKey(reset, zone), "2026-10-31");
  assert.equal(canCheckIn(dayKey(reset, zone), reset, zone), false);
  assert.equal(
    canCheckIn("2026-10-30", reset, zone),
    true,
    "missed reflections remain available in history",
  );
});

test("reflection timing follows the journal zone rather than the device or UTC clock", () => {
  const now = new Date("2026-10-30T11:30:00Z");
  assert.equal(canCheckIn("2026-10-30", now, "Asia/Tokyo"), true);
  assert.equal(canCheckIn("2026-10-30", now, "Europe/Vienna"), false);
  assert.equal(canCheckIn("2026-10-30", now, "America/New_York"), false);
  assert.equal(canCheckIn("2026-10-31", now, "Asia/Tokyo"), false);
});

test("both occurrences of the repeated autumn hour belong to the same evening", () => {
  for (const instant of ["2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]) {
    const now = new Date(instant);
    assert.equal(dayKey(now, "Europe/Vienna"), "2026-10-24");
    assert.equal(canCheckIn("2026-10-24", now, "Europe/Vienna"), true);
  }
  const springReset = new Date("2026-03-29T04:00:00Z");
  assert.equal(
    canCheckIn(
      dayKey(springReset, "Europe/Vienna"),
      springReset,
      "Europe/Vienna",
    ),
    false,
  );
});

test("invalid and future day keys cannot expose a check-in prompt", () => {
  const now = new Date("2026-10-30T21:00:00Z");
  for (const day of [
    "",
    "2026-02-30",
    "2026-10-31",
    "2026-99-01",
    "tomorrow",
  ]) {
    assert.equal(canCheckIn(day, now, "Europe/Vienna"), false);
  }
});

test("legacy journals and lookup keep check-ins scoped to their exact day", () => {
  const saved = reflection("2026-10-29");
  assert.equal(checkInForDay(undefined, "2026-10-29"), undefined);
  assert.equal(checkInForDay([saved], "2026-10-30"), undefined);
  assert.equal(checkInForDay([saved], "2026-10-29"), saved);
});

test("Morning and Evening lookups remain independent while legacy records stay Evening", () => {
  const evening = reflection("2026-10-29");
  const morning: DailyCheckIn = {
    ...reflection("2026-10-29"),
    period: "morning",
    note: "A separate start to the day.",
  };
  assert.equal(getCheckInPeriod(evening), "evening");
  assert.equal(getCheckInPeriod(morning), "morning");
  assert.equal(checkInForDay([morning, evening], evening.day), evening);
  assert.equal(
    checkInForDay([morning, evening], morning.day, "morning"),
    morning,
  );
  assert.equal(checkInForDay([morning], morning.day), undefined);
  assert.equal(checkInForDay([evening], evening.day, "morning"), undefined);
});

test("Morning opens at the journal's 06:00 tracking boundary and remains available after midnight", () => {
  const zone = "Europe/Vienna";
  const beforeReset = new Date("2026-10-30T04:59:59Z");
  const reset = new Date("2026-10-30T05:00:00Z");
  assert.equal(canCheckIn("2026-10-30", beforeReset, zone, "morning"), false);
  assert.equal(canCheckIn("2026-10-30", reset, zone, "morning"), true);
  assert.equal(canCheckIn("2026-10-30", reset, zone, "evening"), false);
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-31T03:00:00Z"), zone, "morning"),
    true,
  );
  assert.equal(
    canCheckIn("2026-10-30", new Date("2026-10-31T05:00:00Z"), zone, "morning"),
    true,
    "the previous Morning remains editable in history after reset",
  );
  assert.equal(
    canCheckIn("2026-10-31", new Date("2026-10-31T05:00:00Z"), zone, "morning"),
    true,
  );
  assert.equal(canCheckIn("2026-02-30", reset, zone, "morning"), false);
  assert.equal(canCheckIn("2026-10-31", reset, zone, "morning"), false);
});

test("Morning availability follows the journal zone and both daylight-saving boundaries", () => {
  const now = new Date("2026-10-30T02:00:00Z");
  assert.equal(canCheckIn("2026-10-30", now, "Asia/Tokyo", "morning"), true);
  assert.equal(
    canCheckIn("2026-10-30", now, "Europe/Vienna", "morning"),
    false,
  );
  for (const [before, reset, day] of [
    ["2026-03-29T03:59:59Z", "2026-03-29T04:00:00Z", "2026-03-29"],
    ["2026-10-25T04:59:59Z", "2026-10-25T05:00:00Z", "2026-10-25"],
  ]) {
    assert.equal(
      canCheckIn(day, new Date(before), "Europe/Vienna", "morning"),
      false,
    );
    assert.equal(
      canCheckIn(day, new Date(reset), "Europe/Vienna", "morning"),
      true,
    );
  }
});

test("history includes reflection-only days and deduplicates intake days in descending order", () => {
  const intakes = [
    { takenAt: "2026-10-29T22:00:00Z" },
    { takenAt: "2026-10-29T23:30:00Z" },
    { takenAt: "2026-10-28T10:00:00Z" },
  ];
  const checkIns = [reflection("2026-10-29"), reflection("2026-10-27")];
  const before = structuredClone({ intakes, checkIns });
  assert.deepEqual(journalDays(intakes, checkIns, "Europe/Vienna"), [
    "2026-10-29",
    "2026-10-28",
    "2026-10-27",
  ]);
  assert.deepEqual({ intakes, checkIns }, before);
  assert.deepEqual(journalDays([], undefined, "Europe/Vienna"), []);
  assert.deepEqual(
    journalDays([], [reflection("not a day")], "Europe/Vienna"),
    [],
  );
  assert.deepEqual(
    journalDays(
      [],
      [
        reflection("2026-10-29"),
        { ...reflection("2026-10-29"), period: "morning" },
        { ...reflection("2026-10-28"), period: "morning" },
      ],
      "Europe/Vienna",
    ),
    ["2026-10-29", "2026-10-28"],
    "two periods on one day count as one historical day, including Morning-only days",
  );
});

test("the mood library preserves every original saved ID and adds unique searchable icon options", () => {
  const oldIds = [
    "calm",
    "okay",
    "hopeful",
    "happy",
    "tired",
    "anxious",
    "low",
    "restless",
    "irritable",
    "overwhelmed",
  ];
  assert.ok(DAILY_MOODS.length >= 200);
  assert.equal(new Set(DAILY_MOOD_VALUES).size, DAILY_MOODS.length);
  for (const id of oldIds)
    assert.ok(DAILY_MOODS.some((mood) => mood.value === id));
  for (const mood of DAILY_MOODS) {
    assert.ok(mood.icon.length > 0);
    assert.ok(matchesDailyMood(mood, mood.label));
    assert.ok(matchesDailyMood(mood, mood.value));
  }
  const tired = DAILY_MOODS.find((mood) => mood.value === "tired")!;
  assert.equal(matchesDailyMood(tired, "FATIGUE"), true);
  assert.equal(matchesDailyMood(tired, "sleepy exhausted"), true);
  assert.equal(matchesDailyMood(tired, "sleepy happy"), false);
});

test("moods rank by usage then a stable shuffle without rewriting old check-ins", () => {
  const entries = [
    { moods: ["okay", "calm"] },
    { moods: ["calm", "calm", "tired"] },
  ] satisfies { moods: import("./daily-check-in").DailyMood[] }[];
  const source = structuredClone(entries);
  const ranked = rankDailyMoods(entries, "2026-11-17");
  assert.equal(ranked[0].value, "calm");
  assert.deepEqual(
    new Set(ranked.slice(1, 3).map((mood) => mood.value)),
    new Set(["okay", "tired"]),
  );
  assert.deepEqual(rankDailyMoods(entries, "2026-11-17"), ranked);
  assert.notDeepEqual(
    rankDailyMoods(entries, "2026-11-18").slice(3),
    ranked.slice(3),
  );
  assert.deepEqual(entries, source);
  assert.equal(
    new Set(ranked.map((mood) => mood.value)).size,
    DAILY_MOODS.length,
  );
  // Duplicate mood IDs in old records count once per entry rather than inflating use.
  const duplicate = rankDailyMoods([
    { moods: ["okay", "okay", "okay"] },
    { moods: ["calm"] },
    { moods: ["calm"] },
  ]);
  assert.equal(duplicate[0].value, "calm");
});

test("the larger library retains every previously selectable mood ID and its original legacy labels", () => {
  // These 105 IDs have shipped in saved check-ins; they must remain selectable.
  const existingIds = `
    calm okay hopeful happy tired anxious low restless irritable overwhelmed peaceful steady
    safe present relieved patient balanced clear-headed comfortable accepting rested
    unhurried content joyful excited playful proud grateful inspired optimistic curious
    amused lighthearted encouraged refreshed connected loved supported understood close
    compassionate social included tender lonely homesick withdrawn sad flat empty heavy
    tearful foggy sluggish drained unmotivated bored disappointed wistful vulnerable fragile
    energized motivated focused productive creative determined confident adventurous awake
    ready restored resilient tense worried uneasy on-edge frustrated angry impatient
    scattered uncertain stuck pressured rushed self-conscious regretful ashamed guilty
    conflicted sensitive wired shaky spaced-out disconnected numb pensive nostalgic quiet
    mixed surprised fulfilled warm brave hopeful-but-tired
  `
    .trim()
    .split(/\s+/);
  assert.equal(existingIds.length, 105);
  for (const value of existingIds)
    assert.ok(
      DAILY_MOOD_VALUES.includes(value as (typeof DAILY_MOOD_VALUES)[number]),
      value,
    );
  const originalLabels = {
    calm: "Calm",
    okay: "Okay",
    hopeful: "Hopeful",
    happy: "Happy",
    tired: "Tired",
    anxious: "Anxious",
    low: "Low",
    restless: "Restless",
    irritable: "Irritable",
    overwhelmed: "Overwhelmed",
  };
  for (const [value, label] of Object.entries(originalLabels)) {
    const mood = DAILY_MOODS.find((entry) => entry.value === value);
    assert.equal(mood?.label, label);
    assert.ok(
      mood?.emoji,
      "legacy aliases remain available without changing saved IDs",
    );
  }
});

test("expanded choices cover each family with searchable ordinary and compound feeling names", () => {
  assert.equal(
    new Set(DAILY_MOODS.map((mood) => mood.label.toLowerCase())).size,
    DAILY_MOODS.length,
  );
  for (const family of DAILY_MOOD_FAMILIES)
    assert.ok(
      DAILY_MOODS.filter((mood) => mood.family === family.value).length >= 30,
      family.value,
    );
  for (const [value, query] of [
    ["self-compassionate", "kind myself"],
    ["in-the-flow", "immersed rhythm"],
    ["pleasantly-surprised", "unexpected good"],
    ["reconnected", "together again"],
    ["grieving", "missing someone"],
    ["panicky", "intense worry"],
    ["stressed", "overloaded demanding"],
  ]) {
    const option = DAILY_MOODS.find((mood) => mood.value === value);
    assert.ok(option, value);
    assert.equal(matchesDailyMood(option, query), true, `${value}: ${query}`);
    assert.equal(
      matchesDailyMood(option, option.label.toUpperCase()),
      true,
      value,
    );
  }
});

test("new and original moods share frequency ranking across Morning and Evening records", () => {
  const entries: DailyCheckIn[] = [
    {
      ...reflection("2026-11-17"),
      period: "morning",
      moods: ["panicky", "grounded"],
    },
    {
      ...reflection("2026-11-17"),
      period: "evening",
      moods: ["panicky", "reconnected"],
    },
    {
      ...reflection("2026-11-18"),
      period: "morning",
      moods: ["calm", "reconnected"],
    },
    {
      ...reflection("2026-11-18"),
      period: "evening",
      moods: ["panicky", "calm", "committed"],
    },
  ];
  const unchanged = structuredClone(entries);
  const first = rankDailyMoods(entries, "opening-one");
  const second = rankDailyMoods(entries, "opening-two");
  assert.equal(first[0].value, "panicky");
  assert.equal(second[0].value, "panicky");
  assert.deepEqual(
    new Set(first.slice(1, 3).map((mood) => mood.value)),
    new Set(["calm", "reconnected"]),
  );
  assert.deepEqual(
    new Set(second.slice(1, 3).map((mood) => mood.value)),
    new Set(["calm", "reconnected"]),
  );
  assert.deepEqual(
    new Set(first.slice(3, 5).map((mood) => mood.value)),
    new Set(["grounded", "committed"]),
  );
  assert.notDeepEqual(
    first.slice(5).map((mood) => mood.value),
    second.slice(5).map((mood) => mood.value),
  );
  assert.deepEqual(entries, unchanged);
  assert.equal(
    new Set(first.map((mood) => mood.value)).size,
    DAILY_MOODS.length,
  );
});

test("the concise feeling picker removes overlapping alternatives while every saved ID stays readable", () => {
  const choices = new Set(DAILY_MOOD_CHOICES.map((mood) => mood.value));
  assert.equal(choices.size, DAILY_MOOD_CHOICES.length);
  assert.ok(choices.size <= Math.floor((DAILY_MOODS.length * 2) / 3));
  for (const mood of DAILY_MOOD_CHOICES)
    assert.ok(DAILY_MOOD_VALUES.includes(mood.value));
  for (const value of [
    "calm",
    "okay",
    "hopeful",
    "happy",
    "tired",
    "anxious",
    "low",
    "restless",
    "irritable",
    "overwhelmed",
  ] as const)
    assert.ok(choices.has(value));
  for (const family of DAILY_MOOD_FAMILIES)
    assert.ok(DAILY_MOOD_CHOICES.some((mood) => mood.family === family.value));
  for (const mood of DAILY_MOODS.filter((mood) => !choices.has(mood.value))) {
    assert.ok(DAILY_MOOD_VALUES.includes(mood.value));
    assert.ok(mood.label && mood.icon);
    assert.ok(
      DAILY_MOOD_CHOICES.some((choice) => matchesDailyMood(choice, mood.label)),
      mood.label,
    );
  }
});

test("searching a retired near-synonym finds a retained feeling without rewriting the original selection", () => {
  for (const [query, target] of [
    ["peaceful", "calm"],
    ["optimistic", "hopeful"],
    ["kind", "compassionate"],
    ["self-assured", "confident"],
    ["worn out", "tired"],
    ["let down", "disappointed"],
  ]) {
    const choice = DAILY_MOOD_CHOICES.find((mood) => mood.value === target);
    assert.ok(choice, target);
    assert.equal(matchesDailyMood(choice, query), true, query);
    const original = DAILY_MOODS.find(
      (mood) => mood.value === query || mood.label.toLowerCase() === query,
    );
    if (original) assert.equal(matchesDailyMood(original, query), true);
  }
});
