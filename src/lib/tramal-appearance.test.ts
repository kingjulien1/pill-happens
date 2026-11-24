import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, type Medication } from "./domain";
import type { PersistedNotificationDescriptor } from "./journal-notification-descriptor";
import { createPostgresJournalRepository } from "./server/journal-repository";
import { mutateJournalState, readJournalState } from "./server/journal-state";
import {
  TRAMAL_ICON,
  TRAMAL_ICON_CUTOFF,
  TRAMAL_ICON_UPDATE,
  isTramalMedicationName,
  updateTramalNotification,
} from "./tramal-appearance";

const medication = (id: string, name: string): Medication => ({
  id,
  name,
  form: "pump-bottle",
  strengthMg: 12.5,
  color: "green",
  icon: "pill",
  iconRotation: 90,
  archived: false,
  createdAt: "2020-01-01T10:00:00Z",
});

test("Tramal's saved artwork migrates once across active and archived medications, preserving the entire intake ledger", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const repository = createPostgresJournalRepository(
    async (sql, params = []) =>
      (await db.query(sql, params)).rows as Record<string, unknown>[],
  );
  const state = emptyData();
  state.appearanceUpdates = ["another-completed-update"];
  state.medications = [
    medication("current", "Tramal 100 mg/ml"),
    { ...medication("old", "TRAMAL Retard"), archived: true },
    medication("other", "Testavan"),
  ];
  state.intakes = state.medications.slice(0, 2).map((med, i) => ({
    id: `intake-${i}`,
    medicationId: med.id,
    medicationName: med.name,
    medicationForm: med.form,
    strengthMg: med.strengthMg,
    quantity: i + 1,
    route: "oral" as const,
    takenAt: i ? "2026-11-23T12:00:00Z" : "2020-01-01T12:00:00Z",
    createdAt: med.createdAt,
    note: `Original note ${i}`,
  }));
  await repository.mutateState("personal", (saved) =>
    Object.assign(saved, structuredClone(state)),
  );
  const loaded = await readJournalState(repository, "personal");
  for (const med of loaded.medications.slice(0, 2)) {
    assert.equal(med.icon, TRAMAL_ICON);
    assert.equal(med.iconRotation, 0);
    assert.equal(med.color, "green");
  }
  assert.deepEqual(loaded.medications[2], state.medications[2]);
  const persisted = await repository.readState("personal");
  assert.deepEqual(persisted.intakes, state.intakes);
  assert.deepEqual(persisted.settings, state.settings);
  assert.deepEqual(persisted.appearanceUpdates, [
    "another-completed-update",
    TRAMAL_ICON_UPDATE,
  ]);
  await readJournalState(
    {
      ...repository,
      mutateState: async () => {
        throw Error("Migration repeated");
      },
    },
    "personal",
  );
  await mutateJournalState(repository, "personal", (saved) => {
    saved.medications[0].icon = "svg:tramal";
    saved.medications[0].iconRotation = 15;
  });
  const later = await readJournalState(repository, "personal");
  assert.equal(later.medications[0].icon, "svg:tramal");
  assert.equal(later.medications[0].iconRotation, 15);
});

test("brand matching includes strength suffixes and excludes unrelated names", () => {
  for (const name of [
    "Tramal",
    "TRAMAL 100 mg/ml",
    "Tramal100mg",
    "Tramadol (Tramal)",
    "Ｔｒａｍａｌ",
  ])
    assert.equal(isTramalMedicationName(name), true, name);
  for (const name of ["Testavan", "Nottramal", "Tramaline", "Tramadol"])
    assert.equal(isTramalMedicationName(name), false, name);
});

test("old intake, medication and goal notice snapshots update both sides without changing source objects, saved values or Undo receipts", () => {
  const med = {
    ...medication("tramal", "Tramal"),
    defaultQuantity: 1,
    categories: [],
  };
  const intake = {
    kind: "intake" as const,
    name: med.name,
    medication: med,
    form: med.form,
    quantity: 2,
    strengthMg: med.strengthMg,
    takenAt: "2020-01-01T12:00:00Z",
    timeZone: "Europe/Vienna",
    route: "oral" as const,
  };
  for (const record of [
    intake,
    { kind: "medication" as const, medication: med },
    {
      kind: "goal" as const,
      medication: med,
      dailyLimitMg: 50,
      startsOn: "2020-01-01",
      endsOn: null,
    },
  ]) {
    const descriptor: PersistedNotificationDescriptor = {
      version: 1,
      kind: "success",
      heading: "Saved",
      message: "Synthetic notice",
      dismissible: true,
      undo: {
        receipt: {
          token: "original-signed-receipt",
          expiresAt: "2026-11-24T05:00:00Z",
        },
      },
      details: { preview: { before: record, after: record } },
    };
    const original = structuredClone(descriptor);
    const result = updateTramalNotification(descriptor, TRAMAL_ICON_CUTOFF);
    for (const side of [
      result.details!.preview!.before!,
      result.details!.preview!.after!,
    ]) {
      assert.ok("medication" in side && side.medication);
      assert.equal(side.medication.icon, TRAMAL_ICON);
      assert.equal(side.medication.iconRotation, 0);
      assert.deepEqual({ ...side, medication: med }, record);
    }
    assert.deepEqual(result.undo, descriptor.undo);
    assert.deepEqual(descriptor, original);
    assert.equal(
      updateTramalNotification(descriptor, TRAMAL_ICON_CUTOFF + 1),
      descriptor,
    );
    assert.equal(updateTramalNotification(result, TRAMAL_ICON_CUTOFF), result);
  }
});
