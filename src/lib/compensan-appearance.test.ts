import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, type Medication } from "./domain";
import {
  COMPENSAN_ICON,
  COMPENSAN_ICON_CUTOFF,
  COMPENSAN_ICON_UPDATE,
  isCompensanMedicationName,
  updateCompensanNotification,
} from "./compensan-appearance";
import { createPostgresJournalRepository } from "./server/journal-repository";
import { readJournalState, mutateJournalState } from "./server/journal-state";
import type { PersistedNotificationDescriptor } from "./journal-notification-descriptor";

const medication = (id: string, name: string): Medication => ({
  id,
  name,
  form: "capsule",
  strengthMg: 100,
  color: "orange",
  icon: "pill",
  iconRotation: 90,
  archived: false,
  createdAt: "2026-01-01T00:00:00Z",
});

test("the authenticated journal update persists once, includes archived records, and preserves the full intake ledger and later choices", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const repository = createPostgresJournalRepository(
    async (sql, params = []) =>
      (await db.query(sql, params)).rows as Record<string, unknown>[],
  );
  const state = emptyData();
  const current = medication("compensan", "Compensan 100mg");
  const archived = { ...medication("old", "COMPENSAN Retard"), archived: true };
  const iserlohn = medication("iserlohn", "Iserlohn");
  const future = {
    ...medication("future", "Compensan 200mg"),
    createdAt: new Date(COMPENSAN_ICON_CUTOFF + 1).toISOString(),
  };
  state.medications = [current, archived, iserlohn, future];
  state.intakes = ["2020-01-01T10:00:00Z", "2026-11-23T10:00:00Z"].map(
    (time, i) => ({
      id: `entry-${i}`,
      medicationId: current.id,
      medicationName: current.name,
      medicationForm: current.form,
      strengthMg: current.strengthMg,
      quantity: i + 1,
      route: "oral" as const,
      takenAt: time,
      createdAt: time,
      note: `Original note ${i}`,
    }),
  );
  await repository.mutateState("personal", (saved) =>
    Object.assign(saved, structuredClone(state)),
  );
  const loaded = await readJournalState(repository, "personal");
  for (const item of loaded.medications.slice(0, 2)) {
    assert.equal(item.icon, COMPENSAN_ICON);
    assert.equal(item.iconRotation, 0);
  }
  assert.deepEqual(loaded.medications[2], iserlohn);
  assert.deepEqual(loaded.medications[3], future);
  const persisted = await repository.readState("personal");
  assert.deepEqual(persisted.intakes, state.intakes);
  assert.deepEqual(persisted.goals, state.goals);
  assert.deepEqual(persisted.settings, state.settings);
  assert.deepEqual(persisted.appearanceUpdates, [COMPENSAN_ICON_UPDATE]);
  await mutateJournalState(repository, "personal", (saved) => {
    saved.medications[0].icon = "svg:iserlohn";
    saved.medications[0].iconRotation = 15;
  });
  const later = await readJournalState(repository, "personal");
  assert.equal(later.medications[0].icon, "svg:iserlohn");
  assert.equal(later.medications[0].iconRotation, 15);
  assert.deepEqual(later.appearanceUpdates, [COMPENSAN_ICON_UPDATE]);
});

test("brand matching supports strengths without matching unrelated names", () => {
  for (const name of [
    "Compensan",
    "COMPENSAN 200 mg",
    "Compensan100mg",
    "Morphin (Compensan)",
  ])
    assert.equal(isCompensanMedicationName(name), true, name);
  for (const name of ["Iserlohn", "Compensanol", "Notcompensan"])
    assert.equal(isCompensanMedicationName(name), false, name);
});

test("old notice snapshots use the new artwork without changing undo commands, values, input objects or later choices", () => {
  const descriptor: PersistedNotificationDescriptor = {
    version: 1,
    kind: "success",
    heading: "Medication updated",
    message: "Synthetic saved notice",
    dismissible: true,
    undo: {
      receipt: {
        token: "signed-command-kept-as-issued",
        expiresAt: "2026-11-23T17:00:00Z",
      },
    },
    details: {
      preview: {
        after: {
          kind: "medication",
          medication: {
            ...medication("compensan", "Compensan"),
            defaultQuantity: 1,
            categories: [],
          },
        },
      },
    },
  };
  const result = updateCompensanNotification(descriptor, COMPENSAN_ICON_CUTOFF);
  const record = result.details!.preview!.after!;
  assert.equal(record.kind, "medication");
  if (record.kind !== "medication") throw Error("Unexpected snapshot");
  assert.equal(record.medication.icon, COMPENSAN_ICON);
  assert.equal(record.medication.iconRotation, 0);
  assert.equal(record.medication.strengthMg, 100);
  assert.deepEqual(result.undo, descriptor.undo);
  assert.equal(
    (descriptor.details!.preview!.after! as typeof record).medication.icon,
    "pill",
  );
  assert.equal(
    updateCompensanNotification(descriptor, COMPENSAN_ICON_CUTOFF + 1),
    descriptor,
  );
});
