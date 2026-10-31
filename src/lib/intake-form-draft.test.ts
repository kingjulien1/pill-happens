import assert from "node:assert/strict";
import test from "node:test";
import { emptyData } from "./domain";
import {
  intakeDraftDisplayTime,
  intakeDraftTimestamp,
  isIntakeFormDraft,
  newIntakeFormDraft,
} from "./intake-form-draft";

test("an unfinished intake keeps its original instant and repeated DST-hour offset", () => {
  const draft = newIntakeFormDraft({
    medications: emptyData().medications,
    timezone: "Europe/Vienna",
    now: new Date("2026-10-25T01:30:42.123Z"),
  });
  assert.equal(draft.takenAt, "2026-10-25T02:30");
  assert.equal(intakeDraftTimestamp(draft), "2026-10-25T01:30:42.123Z");
  assert.equal(
    intakeDraftDisplayTime(draft, "Europe/London"),
    "2026-10-25T01:30",
  );
  assert.equal(intakeDraftTimestamp(draft), "2026-10-25T01:30:42.123Z");
});

test("changed draft times use their stored zone after refresh or preference changes", () => {
  const draft = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:15.000Z"),
  });
  draft.takenAt = "2026-10-31T10:15";
  assert.equal(intakeDraftTimestamp(draft), "2026-10-31T09:15:00.000Z");
  assert.equal(intakeDraftDisplayTime(draft, "Asia/Tokyo"), "2026-10-31T18:15");
  assert.equal(intakeDraftTimestamp(draft), "2026-10-31T09:15:00.000Z");
  draft.takenAt = "";
  assert.equal(intakeDraftDisplayTime(draft, "Asia/Tokyo"), "");
  assert.throws(() => intakeDraftTimestamp(draft));
});

test("draft validation preserves raw blank/invalid controls but rejects malformed stored metadata", () => {
  const draft = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
  });
  draft.quantity = "";
  draft.takenAt = "not finished";
  assert.equal(isIntakeFormDraft(draft), true);
  assert.equal(isIntakeFormDraft({ ...draft, initialTimestamp: "bad" }), false);
  assert.equal(isIntakeFormDraft({ ...draft, timezone: "Not/A_Zone" }), false);
  assert.equal(isIntakeFormDraft({ ...draft, quantity: 1 }), false);
  assert.equal(isIntakeFormDraft({ ...draft, note: "x".repeat(1001) }), false);
});

test("resetting new and past-day drafts creates fresh defaults without retaining stale controls", () => {
  const first = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:00.000Z"),
  });
  first.quantity = "0.25";
  first.note = "An unfinished note";
  const next = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-11-01T07:00:00.000Z"),
  });
  assert.equal(next.initialTimestamp, "2026-11-01T07:00:00.000Z");
  assert.equal(next.quantity, "1");
  assert.equal(next.note, "");
  const past = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    initialDay: "2026-10-20",
    now: new Date("2026-10-31T12:00:00.000Z"),
  });
  assert.equal(past.takenAt, "2026-10-20T12:00");
});
