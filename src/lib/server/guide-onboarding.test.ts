import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, type AppData } from "@/lib/domain";
import { newJournalData } from "@/lib/guide-onboarding";
import {
  createPostgresJournalRepository,
  type Query,
} from "./journal-repository";
import { createLocalJournalRepository } from "./local-journal-repository";
import { createJournalService } from "./journal-service";
import {
  acknowledgeGettingStarted,
  journalNeedsGettingStarted,
} from "./guide-onboarding";

test("legacy guide reads and acknowledgement never write or opt existing data into onboarding", async () => {
  const legacy = emptyData();
  let reads = 0;
  let writes = 0;
  const repository = {
    async readState() {
      reads++;
      return structuredClone(legacy);
    },
    async mutateState() {
      writes++;
      return structuredClone(legacy);
    },
  };
  assert.equal(await journalNeedsGettingStarted(repository, "personal"), false);
  assert.equal(await journalNeedsGettingStarted(repository, "personal"), false);
  await acknowledgeGettingStarted(repository, "personal");
  assert.equal(reads, 3);
  assert.equal(writes, 0);
  assert.deepEqual(legacy, emptyData());
});

test("Postgres first-guide acknowledgement survives contention and failed saves without losing journal data", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  let writes = 0;
  let rejectWrite = false;
  let competingSave: (() => Promise<void>) | undefined;
  const query: Query = async (sql, params = []) => {
    if (sql.startsWith("UPDATE pill_happens_state SET data")) {
      writes++;
      if (rejectWrite) throw new Error("Synthetic onboarding save failure");
      if (competingSave) {
        const save = competingSave;
        competingSave = undefined;
        await save();
      }
    }
    return (await db.query<Record<string, unknown>>(sql, params)).rows;
  };
  const repository = createPostgresJournalRepository(query);
  const otherRepository = createPostgresJournalRepository(
    async (sql, params = []) =>
      (await db.query<Record<string, unknown>>(sql, params)).rows,
  );
  const service = createJournalService(repository, "synthetic-owner");
  const first = await service.create("synthetic-first-journal");
  const second = await service.create("synthetic-second-journal");
  assert.equal(await journalNeedsGettingStarted(repository, first), true);
  assert.equal(await journalNeedsGettingStarted(repository, first), true);
  assert.equal(
    writes,
    0,
    "route reads and prefetches must not consume the guide",
  );
  assert.deepEqual(await repository.readState(second), newJournalData());
  const entry = {
    id: randomUUID(),
    medicationId: randomUUID(),
    medicationName: "Synthetic recorded name",
    strengthMg: 2,
    quantity: 0.5,
    takenAt: "2026-10-31T12:00:00.000Z",
    createdAt: "2026-10-31T12:01:00.000Z",
    note: "Keep every original intake field.",
  };
  await repository.mutateState(first, (state) => {
    state.intakes.push(entry);
    state.settings.timezone = "Europe/London";
  });
  const before = await repository.readState(first);
  rejectWrite = true;
  await assert.rejects(
    acknowledgeGettingStarted(repository, first),
    /Synthetic onboarding save failure/,
  );
  rejectWrite = false;
  assert.deepEqual(await repository.readState(first), before);
  assert.equal(await journalNeedsGettingStarted(repository, first), true);

  competingSave = () =>
    otherRepository
      .mutateState(first, (state) => {
        state.intakes.push({
          ...entry,
          id: randomUUID(),
          note: "Saved concurrently.",
        });
      })
      .then(() => undefined);
  const writesBeforeAck = writes;
  await acknowledgeGettingStarted(repository, first);
  assert.equal(writes - writesBeforeAck, 2, "the failed CAS must retry safely");
  const saved = await repository.readState(first);
  assert.equal(await journalNeedsGettingStarted(repository, first), false);
  assert.equal(saved.settings.timezone, before.settings.timezone);
  assert.deepEqual(saved.intakes[0], entry);
  assert.deepEqual(saved.intakes[1], {
    ...entry,
    id: saved.intakes[1].id,
    note: "Saved concurrently.",
  });
  assert.deepEqual(saved.medications, before.medications);
  assert.deepEqual(saved.goals, before.goals);
  assert.deepEqual(saved.dailyCheckIns, before.dailyCheckIns);
  assert.deepEqual(await repository.readState(second), newJournalData());
  const afterAckWrites = writes;
  await acknowledgeGettingStarted(repository, first);
  await acknowledgeGettingStarted(repository, first);
  assert.equal(
    writes,
    afterAckWrites,
    "repeated visits must be read-only after acknowledgement",
  );
  assert.equal(await journalNeedsGettingStarted(otherRepository, first), false);
  assert.deepEqual(await repository.readState("personal"), emptyData());
});

test("local first-guide state stays per journal and remains introduced after reopening or clearing records", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "pill-guide-onboarding-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repository = createLocalJournalRepository(directory);
  const service = createJournalService(repository, "synthetic-local-owner");
  const first = await service.create("synthetic-local-first");
  const second = await service.create("synthetic-local-second");
  assert.equal(await journalNeedsGettingStarted(repository, first), true);
  await acknowledgeGettingStarted(repository, first);
  const reopened = createLocalJournalRepository(directory);
  assert.equal(await journalNeedsGettingStarted(reopened, first), false);
  assert.equal(await journalNeedsGettingStarted(reopened, second), true);
  await reopened.mutateState(first, (state: AppData) => {
    state.medications = [];
    state.intakes = [];
    state.goals = [];
    state.dailyCheckIns = [];
  });
  assert.equal(await journalNeedsGettingStarted(reopened, first), false);
  assert.equal(await journalNeedsGettingStarted(reopened, "personal"), false);
  await assert.rejects(acknowledgeGettingStarted(reopened, randomUUID()));
  assert.equal(await journalNeedsGettingStarted(reopened, second), true);
});
