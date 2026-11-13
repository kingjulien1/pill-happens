import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, type Intake, type Medication } from "./domain";
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
});

test("resetting new and past-day drafts creates fresh defaults without retaining stale controls", () => {
  const first = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:00.000Z"),
  });
  first.quantity = "0.25";
  const next = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-11-01T07:00:00.000Z"),
  });
  assert.equal(next.initialTimestamp, "2026-11-01T07:00:00.000Z");
  assert.equal(next.quantity, "1");
  assert.equal(next.route, "oral");
  assert.equal(Object.hasOwn(next, "note"), false);
  const past = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    initialDay: "2026-10-20",
    now: new Date("2026-10-31T12:00:00.000Z"),
  });
  assert.equal(past.takenAt, "2026-10-20T12:00");
  assert.equal(past.route, "oral");
});

// Removed controls must not invalidate the amount/time in an older saved draft.
test("note-free drafts work and older context drafts retain their current controls", () => {
  const draft = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:15.000Z"),
  });
  assert.equal(isIntakeFormDraft(draft), true);
  assert.equal(Object.hasOwn(draft, "note"), false);
  const older = { ...draft, quantity: "2.5", note: "An old unfinished note" };
  assert.equal(isIntakeFormDraft(older), true);
  assert.equal(older.quantity, "2.5");
  assert.equal(intakeDraftTimestamp(older), draft.initialTimestamp);
});

test("new intake drafts default to oral independently of medication form", () => {
  const medication: Medication = {
    id: "sample",
    name: "Sample tablet",
    form: "tablet",
    strengthMg: 10,
    defaultQuantity: 2.5,
    color: "blue",
    archived: false,
    createdAt: "2026-01-01T12:00:00.000Z",
  };
  const draft = newIntakeFormDraft({
    medications: [medication],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:15.000Z"),
  });
  assert.equal(draft.route, "oral");
  assert.equal(draft.quantity, "2.5");
  assert.equal(draft.medicationId, medication.id);
});

test("fresh and reset drafts use the first medication's recorded route preference", () => {
  const medication: Medication = {
    id: "sample",
    name: "Sample medication",
    form: "pump",
    strengthMg: 10,
    defaultQuantity: 0.5,
    color: "blue",
    archived: false,
    createdAt: "2026-01-01T12:00:00.000Z",
  };
  const recorded: Intake = {
    id: "recorded",
    medicationId: medication.id,
    medicationName: medication.name,
    strengthMg: medication.strengthMg,
    quantity: 1,
    route: "nasal",
    takenAt: "2026-11-01T12:00:00.000Z",
    createdAt: "2026-11-01T12:00:00.000Z",
    note: "",
  };
  const options = {
    medications: [medication],
    intakes: [
      recorded,
      {
        ...recorded,
        id: "another",
        medicationId: "other",
        route: "topical" as const,
      },
    ],
    timezone: "Europe/Vienna",
    now: new Date("2026-11-04T12:00:00.000Z"),
  };
  const draft = newIntakeFormDraft(options);
  assert.equal(draft.route, "nasal");
  assert.equal(draft.quantity, "0.5");
  draft.route = "unspecified";
  draft.quantity = ",";
  assert.equal(isIntakeFormDraft(draft), true);
  assert.equal(isIntakeFormDraft(JSON.parse(JSON.stringify(draft))), true);
  assert.equal(newIntakeFormDraft(options).route, "nasal");
  assert.equal(recorded.route, "nasal");
});

test("editing retains the recorded or unspecified route despite a different history preference", () => {
  const intake: Intake = {
    id: "editing",
    medicationId: "sample",
    medicationName: "Sample medication",
    strengthMg: 10,
    quantity: 0.5,
    takenAt: "2026-10-25T01:30:42.123Z",
    createdAt: "2026-10-25T03:00:00.000Z",
    note: "",
    route: "oral",
  };
  const options = {
    medications: [],
    intakes: [{ ...intake, id: "history", route: "nasal" as const }],
    timezone: "Europe/Vienna",
  };
  for (const route of ["oral", "unspecified", undefined] as const) {
    const draft = newIntakeFormDraft({
      ...options,
      intake: { ...intake, route },
    });
    assert.equal(draft.route, route ?? "unspecified");
    assert.equal(draft.quantity, "0.5");
    assert.equal(intakeDraftTimestamp(draft), intake.takenAt);
  }
});

test("route drafts round-trip and can be cleared without changing the dose or original instant", () => {
  const intake: Intake = {
    id: "sample-intake",
    medicationId: "sample",
    medicationName: "Sample medication",
    strengthMg: 10,
    quantity: 0.5,
    takenAt: "2026-10-25T01:30:42.123Z",
    createdAt: "2026-10-25T03:00:00.000Z",
    note: "A historical note",
    route: "nasal",
  };
  const draft = newIntakeFormDraft({
    intake,
    medications: [],
    timezone: "Europe/Vienna",
  });
  assert.equal(draft.route, "nasal");
  assert.equal(
    newIntakeFormDraft({
      intake: { ...intake, route: undefined },
      medications: [],
      timezone: "Europe/Vienna",
    }).route,
    "unspecified",
  );
  const restored = JSON.parse(JSON.stringify({ ...draft, route: "oral" }));
  assert.equal(isIntakeFormDraft(restored), true);
  assert.equal(restored.route, "oral");
  assert.equal(restored.medicationId, intake.medicationId);
  assert.equal(restored.quantity, "0.5");
  assert.equal(intakeDraftTimestamp(restored), intake.takenAt);
  restored.route = "unspecified";
  assert.equal(isIntakeFormDraft(restored), true);
  assert.equal(intakeDraftTimestamp(restored), intake.takenAt);
});

test("legacy route-free drafts remain valid while malformed route values are rejected", () => {
  const draft = newIntakeFormDraft({
    medications: [],
    timezone: "Europe/Vienna",
    now: new Date("2026-10-31T12:00:15.000Z"),
  });
  const legacy = { ...draft };
  delete legacy.route;
  assert.equal(isIntakeFormDraft(legacy), true);
  assert.equal(intakeDraftTimestamp(legacy), draft.initialTimestamp);
  for (const route of [null, 3, "", "not-a-route", {}, []])
    assert.equal(isIntakeFormDraft({ ...draft, route }), false);
});
