import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Intake, Medication } from "@/lib/domain";
import { createLocalJournalRepository } from "./local-journal-repository";
import { mutateJournalState, readJournalState } from "./journal-state";
import { intakeSchema } from "./validation";

test("intake routes survive creation, edits, reopening and export without inferring legacy routes", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "pill-intake-route-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repository = createLocalJournalRepository(directory);
  const medication: Medication = {
    id: "6cfa88e7-8474-4b17-a148-545fb825785b",
    name: "Synthetic medication",
    strengthMg: 10,
    form: "tablet",
    color: "blue",
    archived: false,
    createdAt: "2026-10-01T12:00:00Z",
  };
  const legacy: Intake = {
    id: "legacy-entry",
    medicationId: medication.id,
    medicationName: medication.name,
    medicationForm: medication.form,
    strengthMg: medication.strengthMg,
    quantity: 1,
    takenAt: "2026-10-01T12:00:00Z",
    createdAt: "2026-10-01T12:01:00Z",
    note: "A saved legacy note",
  };
  const input = {
    medicationId: medication.id,
    quantity: 0.5,
    takenAt: "2026-10-02T12:00:00Z",
    note: "",
  };
  const creation = intakeSchema.parse({ ...input, route: "nasal" });
  await mutateJournalState(repository, "personal", (state) => {
    state.medications.push(medication);
    state.intakes.push(legacy, {
      ...creation,
      id: "routed-entry",
      medicationName: medication.name,
      medicationForm: medication.form,
      strengthMg: medication.strengthMg,
      createdAt: "2026-10-02T12:01:00Z",
    });
  });

  const reopened = createLocalJournalRepository(directory);
  const persisted = await readJournalState(reopened, "personal");
  assert.equal(persisted.intakes[1].route, "nasal");
  assert.equal(Object.hasOwn(persisted.intakes[0], "route"), false);

  // PATCH merges parsed input: older clients must not clear a recorded route.
  const omittedRoute = intakeSchema.parse({ ...input, quantity: 2 });
  await mutateJournalState(reopened, "personal", (state) => {
    Object.assign(state.intakes[1], omittedRoute);
  });
  assert.equal(
    (await repository.readState("personal")).intakes[1].route,
    "nasal",
  );

  await mutateJournalState(reopened, "personal", (state) => {
    Object.assign(
      state.intakes[1],
      intakeSchema.parse({ ...input, route: "oral" }),
    );
    state.medications[0].name = "Corrected medication name";
    state.medications[0].form = "pump-bottle";
    state.medications[0].strengthMg = 2.5;
  });
  const updated = await readJournalState(repository, "personal");
  assert.equal(updated.intakes[1].route, "oral");
  assert.equal(updated.intakes[1].medicationForm, "pump-bottle");
  assert.equal(updated.intakes[1].strengthMg, 2.5);
  assert.equal(updated.intakes[1].quantity, 0.5);
  assert.equal(updated.intakes[0].note, legacy.note);
  assert.equal(Object.hasOwn(updated.intakes[0], "route"), false);

  // The backup endpoint serializes this same read, including the per-entry route.
  const backup = JSON.parse(
    JSON.stringify({ schemaVersion: 1, data: updated }),
  );
  assert.equal(backup.data.intakes[1].route, "oral");
  assert.equal(Object.hasOwn(backup.data.intakes[0], "route"), false);

  await mutateJournalState(repository, "personal", (state) => {
    Object.assign(
      state.intakes[1],
      intakeSchema.parse({ ...input, route: "unspecified" }),
    );
  });
  const cleared = await readJournalState(
    createLocalJournalRepository(directory),
    "personal",
  );
  assert.equal(cleared.intakes[1].route, "unspecified");
  assert.equal(Object.hasOwn(cleared.intakes[0], "route"), false);

  // Validation happens before repository mutation, leaving the persisted file intact.
  const file = path.join(directory, "state.json");
  const beforeInvalid = await readFile(file, "utf8");
  await assert.rejects(async () => {
    const invalid = intakeSchema.parse({ ...input, route: "invalid-route" });
    await mutateJournalState(repository, "personal", (state) => {
      Object.assign(state.intakes[1], invalid);
    });
  });
  assert.equal(await readFile(file, "utf8"), beforeInvalid);
});
