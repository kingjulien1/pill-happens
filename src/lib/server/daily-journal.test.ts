import assert from "node:assert/strict";
import test from "node:test";
import { emptyData } from "@/lib/domain";
import { checkInForDay } from "@/lib/daily-check-in";
import { dailyJournalForDay } from "@/lib/daily-journal";
import { dailyCheckInSchema } from "./validation";
import {
  dailyCheckInUndoTarget,
  saveDayCheckIn,
  saveDayWriting,
} from "./daily-journal";

const day = "2026-11-20";
const now = new Date(day + "T21:00:00Z");
const stateWithBoth = () => {
  const state = emptyData();
  state.dailyCheckIns = (["morning", "evening"] as const).map((period) => ({
    day,
    period,
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: period === "evening" ? "Walk" : "",
    note: period === "morning" ? "First thoughts." : "Last words.",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }));
  return state;
};
test("switching periods updates one page and keeps check-in answers separate", () => {
  const state = emptyData();
  const morning = {
    day,
    period: "morning" as const,
    note: "Start here",
    sharedJournal: true as const,
    expectedUpdatedAt: null,
  };
  saveDayWriting(state, morning, now);
  const original = dailyJournalForDay(state.dailyCheckIns, day)!;
  const evening = dailyCheckInSchema.parse({
    ...morning,
    period: "evening",
    moods: ["happy"],
    note: "Start here. Came back.",
    expectedUpdatedAt: original.updatedAt,
  });
  assert.equal(
    dailyCheckInUndoTarget(state, evening).kind,
    "daily-page-check-in",
  );
  saveDayCheckIn(state, evening, now);
  const saved = dailyJournalForDay(state.dailyCheckIns, day)!;
  assert.equal(saved.note, evening.note);
  assert.equal(state.dailyCheckIns!.filter((record) => record.note).length, 1);
  assert.deepEqual(checkInForDay(state.dailyCheckIns, day, "evening")?.moods, [
    "happy",
  ]);
  assert.deepEqual(
    checkInForDay(state.dailyCheckIns, day, "morning")?.moods,
    [],
  );
  const before = structuredClone(state);
  assert.throws(
    () =>
      saveDayWriting(
        state,
        { ...morning, expectedUpdatedAt: original.updatedAt, note: "Stale" },
        now,
      ),
    /changed elsewhere/,
  );
  assert.deepEqual(state, before);
});
test("reading a legacy pair is lossless and first edit folds both originals once", () => {
  for (const period of ["morning", "evening"] as const) {
    const state = stateWithBoth();
    const page = dailyJournalForDay(state.dailyCheckIns, day)!;
    assert.equal(page.note, "First thoughts.\n\n---\n\nLast words.");
    const input = dailyCheckInSchema.parse({
      day,
      period,
      note: page.note + "\nMore.",
      sharedJournal: true,
      expectedUpdatedAt: page.updatedAt,
      helped: period === "evening" ? "Walk" : "",
    });
    saveDayCheckIn(state, input, now);
    assert.equal(
      dailyJournalForDay(state.dailyCheckIns, day)?.note,
      input.note,
    );
    assert.equal(
      checkInForDay(state.dailyCheckIns, day, "evening")?.helped,
      "Walk",
    );
    assert.equal(state.dailyCheckIns!.length, 2);
    assert.equal(
      state.dailyCheckIns!.filter((record) => record.note).length,
      1,
    );
  }
});
test("older clients cannot replace unseen writing and retries acknowledge the same text", () => {
  const state = stateWithBoth();
  const before = structuredClone(state);
  assert.throws(
    () =>
      saveDayWriting(
        state,
        {
          day,
          period: "morning",
          note: "Partial overwrite",
          expectedUpdatedAt: now.toISOString(),
        },
        now,
      ),
    /changed elsewhere/,
  );
  assert.deepEqual(state, before);
  const page = dailyJournalForDay(state.dailyCheckIns, day)!;
  saveDayWriting(
    state,
    {
      day,
      period: "evening",
      note: page.note,
      sharedJournal: true,
      expectedUpdatedAt: null,
    },
    now,
  );
  assert.deepEqual(state, before);
});
