import assert from "node:assert/strict";
import { test } from "node:test";
import { getDayBoundaryTimes } from "./day-boundary-times";
import { checkInDefaults } from "./check-in-draft";
import type { DailyCheckIn } from "./daily-check-in";
import { emptyMorningSleep } from "./morning-sleep";

const checkIn = (period: "morning" | "evening"): DailyCheckIn => ({
  day: "2026-11-07",
  period,
  note: "",
  moods: [],
  energy: null,
  stress: null,
  sleepHours: null,
  helped: "",
  createdAt: "2026-11-07T12:00:00Z",
  updatedAt: "2026-11-07T12:00:00Z",
});

test("unanswered and legacy days use display-only defaults without changing their answers", () => {
  const morning = Object.freeze(checkIn("morning"));
  const evening = Object.freeze(checkIn("evening"));
  assert.deepEqual(getDayBoundaryTimes({ morning, evening }), {
    wakeUp: { time: "12:30", source: "default" },
    bedtime: { time: "23:30", source: "default" },
  });
  assert.equal(morning.morningSleep, undefined);
  assert.equal(evening.bedtime, undefined);
  assert.equal(checkInDefaults(evening).bedtime, "");
});

test("wake-up uses getting-up time, never the previous night's lights-out or logging timestamp", () => {
  const morning = {
    ...checkIn("morning"),
    morningSleep: {
      ...emptyMorningSleep(),
      gotUp: "09:20",
      lightsOut: "01:45",
    },
  };
  const result = getDayBoundaryTimes({ morning });
  assert.deepEqual(result.wakeUp, { time: "09:20", source: "saved" });
  assert.deepEqual(result.bedtime, { time: "23:30", source: "default" });
});

test("midnight is a real evening clock and unrelated invalid sleep input cannot hide a valid wake-up draft", () => {
  const morning = checkIn("morning");
  const draft = checkInDefaults(morning);
  draft.morningSleep!.gotUp = "11:10";
  draft.morningSleep!.fallAsleepMinutes = "still typing";
  assert.deepEqual(
    getDayBoundaryTimes({
      morning,
      evening: { ...checkIn("evening"), bedtime: "00:00" },
      morningDraft: draft,
    }),
    {
      wakeUp: { time: "11:10", source: "draft" },
      bedtime: { time: "00:00", source: "saved" },
    },
  );
});

test("valid unsaved clocks replace saved clocks, while partial clocks retain the saved values", () => {
  const morning = {
    ...checkIn("morning"),
    morningSleep: { ...emptyMorningSleep(), gotUp: "08:00" },
  };
  const evening = { ...checkIn("evening"), bedtime: "22:45" };
  const morningDraft = checkInDefaults(morning);
  const eveningDraft = checkInDefaults(evening);
  morningDraft.morningSleep!.gotUp = "09:30";
  eveningDraft.bedtime = "00:15";
  assert.deepEqual(
    getDayBoundaryTimes({ morning, evening, morningDraft, eveningDraft }),
    {
      wakeUp: { time: "09:30", source: "draft" },
      bedtime: { time: "00:15", source: "draft" },
    },
  );
  morningDraft.morningSleep!.gotUp = "09:";
  eveningDraft.bedtime = "24:00";
  assert.deepEqual(
    getDayBoundaryTimes({ morning, evening, morningDraft, eveningDraft }),
    {
      wakeUp: { time: "08:00", source: "saved" },
      bedtime: { time: "22:45", source: "saved" },
    },
  );
});

test("explicitly clearing a draft clock restores its display fallback; legacy missing properties retain saved clocks", () => {
  const evening = { ...checkIn("evening"), bedtime: "22:45" };
  const draft = checkInDefaults(evening);
  draft.bedtime = "";
  assert.deepEqual(
    getDayBoundaryTimes({ evening, eveningDraft: draft }).bedtime,
    { time: "23:30", source: "default" },
  );
  delete draft.bedtime;
  assert.deepEqual(
    getDayBoundaryTimes({ evening, eveningDraft: draft }).bedtime,
    { time: "22:45", source: "saved" },
  );
});

test("malformed storage and invalid saved clocks safely fall back without publishing defaults", () => {
  const evening = { ...checkIn("evening"), bedtime: "25:99" };
  assert.deepEqual(
    getDayBoundaryTimes({ evening, eveningDraft: { bedtime: "00:00" } })
      .bedtime,
    { time: "23:30", source: "default" },
  );
});

test("editing another response never calls an unchanged saved clock unsaved", () => {
  const evening = { ...checkIn("evening"), bedtime: "22:45" };
  const draft = checkInDefaults(evening);
  draft.helped = "A walk";
  assert.deepEqual(
    getDayBoundaryTimes({ evening, eveningDraft: draft }).bedtime,
    {
      time: "22:45",
      source: "saved",
    },
  );
});

test("whitespace-wrapped clocks cannot preview a value rejected by the form and API", () => {
  const evening = { ...checkIn("evening"), bedtime: "22:45" };
  const draft = checkInDefaults(evening);
  draft.bedtime = " 23:30 ";
  assert.deepEqual(
    getDayBoundaryTimes({ evening, eveningDraft: draft }).bedtime,
    {
      time: "22:45",
      source: "saved",
    },
  );
});
