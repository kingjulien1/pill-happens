import test from "node:test";
import assert from "node:assert/strict";
import {
  checkInNotificationSnapshot,
  intakeNotificationSnapshot,
  medicationNotificationSnapshot,
  savedNotificationRecord,
  notificationChangeSummary,
} from "./notification-change-preview";
import type { Medication, Intake } from "./domain";
import type { DailyCheckIn } from "./daily-check-in";

const medication: Medication = {
  id: "med",
  name: "Example",
  strengthMg: 5,
  defaultQuantity: 0.5,
  form: "tablet",
  color: "rose",
  icon: "pill",
  iconRotation: 45,
  archived: false,
  createdAt: "2026-11-15T08:00:00Z",
  categories: ["benzodiazepine", "supplement"],
};
const intake: Intake = {
  id: "intake",
  medicationId: "med",
  medicationName: "Recorded Name",
  quantity: 0.25,
  strengthMg: 2.5,
  medicationForm: "capsule",
  route: "sublingual",
  takenAt: "2026-11-15T04:30:00Z",
  createdAt: "2026-11-15T08:00:00Z",
  note: "Private legacy note",
};

test("intake previews preserve recorded dose/form/route and exact instant independently of current defaults", () => {
  const snapshot = intakeNotificationSnapshot(
    intake,
    medication,
    "Europe/Vienna",
  );
  assert.equal(snapshot.kind, "intake");
  if (snapshot.kind !== "intake") return;
  assert.equal(snapshot.name, "Recorded Name");
  assert.equal(snapshot.quantity, 0.25);
  assert.equal(snapshot.strengthMg, 2.5);
  assert.equal(snapshot.form, "capsule");
  assert.equal(snapshot.route, "sublingual");
  assert.equal(snapshot.takenAt, intake.takenAt);
  assert.equal(snapshot.timeZone, "Europe/Vienna");
  assert.equal("id" in snapshot, false);
  assert.equal(JSON.stringify(snapshot).includes("Private legacy note"), false);
});

test("medication preview metadata is detached from later category edits and honors explicit categories", () => {
  const source = {
    ...medication,
    categories: [...medication.categories!],
    isOpioid: true,
  };
  const snapshot = medicationNotificationSnapshot(source);
  source.categories.length = 0;
  source.name = "Later name";
  assert.equal(snapshot.name, "Example");
  assert.deepEqual(snapshot.categories, ["benzodiazepine", "supplement"]);
  assert.equal(snapshot.defaultQuantity, 0.5);
  assert.equal(snapshot.iconRotation, 45);
});

test("check-in previews keep zero ratings, legacy scales and independent moods without copying prose", () => {
  const source: DailyCheckIn = {
    day: "2026-11-14",
    note: "Private words about today",
    moods: ["calm"],
    energy: 0,
    stress: null,
    sleepHours: 0,
    bedtime: "00:00",
    helped: "Private support",
    createdAt: "2026-11-15T03:00:00Z",
    updatedAt: "2026-11-15T03:00:00Z",
  };
  const snapshot = checkInNotificationSnapshot(source);
  source.moods.push("happy");
  assert.equal(snapshot.kind, "check-in");
  if (snapshot.kind !== "check-in") return;
  assert.equal(snapshot.energy, 0);
  assert.equal(snapshot.energyScale, 5);
  assert.equal(snapshot.stress, null);
  assert.equal(snapshot.sleepHours, 0);
  assert.equal(snapshot.bedtime, "00:00");
  assert.equal(snapshot.period, "evening");
  assert.equal(snapshot.words, 4);
  assert.deepEqual(snapshot.moods, ["calm"]);
  assert.equal(JSON.stringify(snapshot).includes("Private"), false);
});

test("saved record selection uses actual server IDs and refuses ambiguous or missing records", () => {
  const before = [{ id: "old", value: 1 }];
  const after = [
    { id: "old", value: 2 },
    { id: "new", value: 3 },
  ];
  assert.equal(savedNotificationRecord(before, after, "old"), after[0]);
  assert.equal(savedNotificationRecord(before, after), after[1]);
  assert.equal(savedNotificationRecord(before, after, "missing"), undefined);
  assert.equal(
    savedNotificationRecord(before, [...after, { id: "other", value: 4 }]),
    undefined,
  );
  assert.equal(savedNotificationRecord(before, [after[0]]), undefined);
});

test("change summaries report actual dose changes without suggesting a target or copying notes", () => {
  const before = intakeNotificationSnapshot(
    intake,
    medication,
    "Europe/Vienna",
  );
  if (before.kind !== "intake") return;
  assert.equal(
    notificationChangeSummary({ before, after: { ...before, quantity: 1 } }),
    "Dose changed from 0.625 to 2.5 mg.",
  );
  assert.equal(
    notificationChangeSummary({ after: before }),
    "0.625 mg recorded for Recorded Name.",
  );
  assert.equal(
    notificationChangeSummary({ before }),
    "Intake removed from your journal.",
  );
  assert.equal(
    notificationChangeSummary({
      before,
      after: { ...before, quantity: 1, route: "oral" },
    }),
    "Quantity and intake method updated.",
  );
});

test("summary comparisons normalize equivalent instants and unordered categories", () => {
  const before = intakeNotificationSnapshot(
    intake,
    medication,
    "Europe/Vienna",
  );
  if (before.kind !== "intake") return;
  assert.equal(
    notificationChangeSummary({
      before,
      after: { ...before, takenAt: "2026-11-15T05:30:00+01:00" },
    }),
    "Intake saved.",
  );
  const med = medicationNotificationSnapshot(medication);
  assert.equal(
    notificationChangeSummary({
      before: { kind: "medication", medication: med },
      after: {
        kind: "medication",
        medication: { ...med, categories: [...med.categories].reverse() },
      },
    }),
    "Medication saved.",
  );
  assert.equal(
    notificationChangeSummary({
      before: { kind: "medication", medication: med },
      after: {
        kind: "medication",
        medication: { ...med, name: "Renamed", archived: true },
      },
    }),
    "Name and archive status updated.",
  );
});
