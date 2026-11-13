import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, emptyData, shiftDayKey, type Intake } from "./domain";
import { loggingStreak, streakMilestone } from "./logging-streak";
import { getStreakNavigationState } from "./streak-navigation";

function run(length: number, end = "2026-11-09") {
  const data = emptyData();
  data.settings.timezone = "Europe/Vienna";
  data.intakes = Array.from({ length }, (_, index): Intake => {
    const takenAt = `${shiftDayKey(end, index - length + 1)}T12:00:00Z`;
    return {
      id: `intake-${index}`,
      medicationId: "medication",
      medicationName: "Example",
      strengthMg: 1,
      quantity: 1,
      takenAt,
      createdAt: takenAt,
      note: "",
    };
  });
  return data;
}

function state(data: ReturnType<typeof run>, instant = "2026-11-09T18:00:00Z") {
  const now = new Date(instant);
  return getStreakNavigationState(
    loggingStreak(data, dayKey(now, data.settings.timezone), now),
  );
}

test("loading, empty and broken historical runs keep navigation ordinary", () => {
  const idle = {
    kind: "idle",
    current: 0,
    target: null,
    next: 2,
    remaining: 2,
  };
  assert.deepEqual(getStreakNavigationState(null), idle);
  assert.deepEqual(state(run(0)), idle);
  const old = run(13, "2026-11-06");
  assert.equal(loggingStreak(old, "2026-11-09").best, 13);
  assert.deepEqual(state(old), idle);
});

test("the first logged day has an active invitation to the first real milestone", () => {
  assert.deepEqual(state(run(1)), {
    kind: "active",
    current: 1,
    target: 2,
    next: 2,
    remaining: 1,
  });
});

test("ordinary active days distinguish the reached step from the next target", () => {
  assert.deepEqual(state(run(6)), {
    kind: "active",
    current: 6,
    target: 5,
    next: 7,
    remaining: 1,
  });
  assert.equal(state(run(8)).kind, "active");
  assert.equal(state(run(8)).target, 7);
});

test("a milestone reached in today's current run gets the stronger celebration", () => {
  assert.deepEqual(state(run(7)), {
    kind: "milestone",
    current: 7,
    target: 7,
    next: 10,
    remaining: 3,
  });
  assert.equal(state(run(40)).kind, "milestone");
  assert.equal(state(run(40)).target, 40);
});

test("yesterday's valid grace run stays active without claiming a milestone today", () => {
  const data = run(7, "2026-11-08");
  assert.deepEqual(state(data), {
    kind: "active",
    current: 7,
    target: 7,
    next: 10,
    remaining: 3,
  });
  assert.equal(state(data, "2026-11-10T18:00:00Z").kind, "idle");
});

test("the stronger state ends at the 06:00 journal reset, not midnight", () => {
  const data = run(2, "2026-11-08");
  assert.equal(state(data, "2026-11-09T04:59:59Z").kind, "milestone");
  const afterReset = state(data, "2026-11-09T05:00:00Z");
  assert.equal(afterReset.current, 2);
  assert.equal(afterReset.kind, "active");
});

test("future and malformed records cannot light the navigation notification", () => {
  const data = run(1);
  data.intakes[0].takenAt = "2026-11-09T19:00:00Z";
  assert.equal(state(data).kind, "idle");
  data.intakes[0].takenAt = "not-a-timestamp";
  assert.equal(state(data).kind, "idle");
});

test("record edits recompute the state without persisted notification flags", () => {
  const data = run(7);
  assert.equal(state(data).kind, "milestone");
  data.intakes.pop();
  assert.equal(state(data).kind, "active");
  data.intakes = [];
  assert.equal(state(data).kind, "idle");
});

test("invalid or invented steps never become a milestone celebration", () => {
  for (const current of [-1, 0.5, NaN, Infinity]) {
    assert.equal(
      getStreakNavigationState({
        current,
        loggedToday: true,
        milestone: current,
        nextMilestone: 7,
      }).kind,
      "idle",
    );
  }
  const input = Object.freeze({
    current: 6,
    loggedToday: true,
    milestone: 6,
    nextMilestone: 7,
  });
  assert.equal(getStreakNavigationState(input).kind, "active");
  assert.equal(streakMilestone(input.current).reached, 5);
  assert.equal(input.milestone, 6);
});
