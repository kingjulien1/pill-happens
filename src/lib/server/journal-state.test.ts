import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, totalsForDay, type AppData } from "@/lib/domain";
import {
  createPostgresJournalRepository,
  type Query,
} from "./journal-repository";
import { mutateJournalState, readJournalState } from "./journal-state";

function legacyState(): AppData {
  return {
    ...emptyData(),
    medications: [
      {
        id: "medication-a",
        name: "Current Name",
        strengthMg: 2,
        defaultQuantity: 1,
        form: "tablet",
        color: "rose",
        archived: false,
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
    intakes: [
      {
        id: "intake-a",
        medicationId: "medication-a",
        medicationName: "Old Name",
        strengthMg: 0.5,
        quantity: 0.5,
        takenAt: "2026-10-25T10:00:29Z",
        createdAt: "2026-10-26T10:00:37Z",
        note: "Preserve this note.",
      },
    ],
  };
}

test("state reads and exports reconcile legacy details; medication edits save all history atomically", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  let stateWrites = 0;
  let rejectWrite = false;
  let competingSave: (() => Promise<void>) | undefined;
  const query: Query = async (sql, params = []) => {
    if (sql.startsWith("UPDATE pill_happens_state SET data")) {
      stateWrites++;
      if (rejectWrite) throw new Error("Synthetic save failure");
      if (competingSave) {
        const save = competingSave;
        competingSave = undefined;
        await save();
      }
    }
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  };
  const repository = createPostgresJournalRepository(query);
  const original = legacyState();
  await repository.mutateState("personal", (state) => {
    Object.assign(state, original);
  });
  const version = async () =>
    (
      await db.query<{ version: number }>(
        "SELECT version FROM pill_happens_state WHERE id = 'personal'",
      )
    ).rows[0].version;

  const writesBeforeRead = stateWrites;
  const projected = await readJournalState(repository, "personal");
  assert.equal(projected.intakes[0].medicationName, "Current Name");
  assert.equal(projected.intakes[0].strengthMg, 2);
  assert.equal(projected.intakes[0].medicationForm, "tablet");
  // Export uses this same read, including all resolved fields in its JSON payload.
  const backup = JSON.parse(
    JSON.stringify({ schemaVersion: 1, data: projected }),
  );
  assert.deepEqual(backup.data, projected);
  assert.equal(
    stateWrites,
    writesBeforeRead,
    "GET must not write to the journal",
  );
  assert.deepEqual(await repository.readState("personal"), original);

  const versionBeforeEdit = await version();
  const writesBeforeEdit = stateWrites;
  const saved = await mutateJournalState(repository, "personal", (state) => {
    assert.equal(
      state.intakes[0].strengthMg,
      2,
      "callbacks see resolved history",
    );
    Object.assign(state.medications[0], {
      name: "Corrected Name",
      strengthMg: 4,
      form: "pump-bottle",
      defaultQuantity: 6,
      archived: true,
    });
  });
  assert.equal(stateWrites - writesBeforeEdit, 1);
  assert.equal((await version()) - versionBeforeEdit, 1);
  assert.deepEqual(saved.intakes[0], {
    ...original.intakes[0],
    medicationName: "Corrected Name",
    strengthMg: 4,
    medicationForm: "pump-bottle",
  });
  assert.equal(totalsForDay(saved, "2026-10-25")[0].totalMg, 2);
  assert.deepEqual(await repository.readState("personal"), saved);
  assert.deepEqual(await readJournalState(repository, "personal"), saved);

  const beforeFailure = await repository.readState("personal");
  const versionBeforeFailure = await version();
  rejectWrite = true;
  await assert.rejects(
    mutateJournalState(repository, "personal", (state) => {
      state.medications[0].name = "Never Saved";
      state.medications[0].strengthMg = 100;
    }),
    /Synthetic save failure/,
  );
  rejectWrite = false;
  assert.equal(await version(), versionBeforeFailure);
  assert.deepEqual(await repository.readState("personal"), beforeFailure);

  const writesBeforeRejection = stateWrites;
  await assert.rejects(
    mutateJournalState(repository, "personal", (state) => {
      state.medications[0].name = "Rejected Change";
      throw new Error("Synthetic validation rejection");
    }),
    /Synthetic validation rejection/,
  );
  assert.equal(stateWrites, writesBeforeRejection);
  assert.deepEqual(await repository.readState("personal"), beforeFailure);

  // Force a version conflict between reading the journal and saving the edit.
  // The retry must retain and reconcile an intake inserted by the other request.
  const otherRepository = createPostgresJournalRepository(
    async (sql, params) =>
      (await db.query<Record<string, unknown>>(sql, params)).rows,
  );
  competingSave = async () => {
    await otherRepository.mutateState("personal", (state) => {
      state.intakes.push({
        ...state.intakes[0],
        id: "concurrent-intake",
        quantity: 2,
        note: "Created while the medication was being edited.",
      });
    });
  };
  let attempts = 0;
  const retried = await mutateJournalState(repository, "personal", (state) => {
    attempts++;
    state.medications[0].name = "Concurrent Correction";
    state.medications[0].strengthMg = 8;
  });
  assert.equal(attempts, 2);
  assert.deepEqual(
    retried.intakes.map((item) => item.quantity),
    [0.5, 2],
  );
  assert.ok(
    retried.intakes.every(
      (item) => item.medicationName === "Concurrent Correction",
    ),
  );
  assert.ok(retried.intakes.every((item) => item.strengthMg === 8));
  assert.equal(totalsForDay(retried, "2026-10-25")[0].totalMg, 20);
  assert.deepEqual(await repository.readState("personal"), retried);
});
