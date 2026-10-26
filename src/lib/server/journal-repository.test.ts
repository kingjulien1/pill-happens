import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import type { AppData } from "@/lib/domain";
import {
  createPostgresJournalRepository,
  JOURNAL_SCHEMA,
} from "./journal-repository";
import { createJournalService, JournalCreationError } from "./journal-service";
import { hashPassword } from "./passwords";

test("Postgres journals preserve legacy records and isolate concurrent creation, saves, and quotas", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const query = async (text: string, params: unknown[] = []) =>
    (await db.query<Record<string, unknown>>(text, params)).rows;
  // Reproduce the existing table with synthetic data. No network connection or
  // deployment credentials are used by this regression test.
  await db.exec(`CREATE TABLE pill_happens_state (
   id TEXT PRIMARY KEY, data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
   CREATE TABLE pill_happens_login_attempts (
   id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start TIMESTAMPTZ NOT NULL);`);
  const owner: AppData = {
    medications: [
      {
        id: randomUUID(),
        name: "Synthetic preserved medication",
        strengthMg: 1,
        form: "tablet",
        color: "rose",
        archived: false,
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
    intakes: [],
    goals: [],
    settings: { timezone: "Europe/Vienna" },
  };
  await query(
    `INSERT INTO pill_happens_state (id,data,version,updated_at) VALUES ('personal',$1::jsonb,73,'2026-10-01T10:00:00Z')`,
    [JSON.stringify(owner)],
  );
  const before = JSON.stringify(
    await query(`SELECT * FROM pill_happens_state WHERE id='personal'`),
  );
  const repo = createPostgresJournalRepository(query);
  const service = createJournalService(repo, "synthetic-owner-4826");
  assert.deepEqual(await repo.credentialSnapshot(), {
    version: 0,
    credentials: [],
  });
  assert.equal(await service.signIn("synthetic-owner-4826"), "personal");
  assert.equal(await service.signIn("new-synthetic-journal"), null);
  assert.equal(
    (await query("SELECT COUNT(*) AS count FROM pill_happens_state"))[0].count,
    1,
  );
  assert.equal((await repo.credentialSnapshot()).credentials.length, 0);
  const a = await service.create("synthetic-journal-a");
  const b = await service.create("  synthetic 🌱 journal  ");
  assert.notEqual(a, b);
  assert.equal(await service.signIn("  synthetic 🌱 journal  "), b);
  assert.equal(await service.signIn("synthetic 🌱 journal"), null);
  await repo.mutateState(a, (state) => {
    state.settings.timezone = "Europe/London";
  });
  assert.equal((await repo.readState(b)).settings.timezone, "Europe/Vienna");
  assert.equal((await repo.readState(a)).settings.timezone, "Europe/London");
  await assert.rejects(
    service.create("synthetic-journal-a"),
    (e: unknown) => e instanceof JournalCreationError && e.status === 409,
  );
  assert.equal((await repo.readState(a)).settings.timezone, "Europe/London");
  const concurrent = await Promise.allSettled([
    service.create("synthetic-race"),
    service.create("synthetic-race"),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(concurrent.filter((r) => r.status === "rejected").length, 1);
  assert.equal((await repo.credentialSnapshot()).credentials.length, 3);
  const different = await Promise.all([
    service.create("different-one"),
    service.create("different-two"),
  ]);
  assert.notEqual(different[0], different[1]);
  // A constraint failure after the registry UPDATE must roll the entire CTE back.
  const snapshot = await repo.credentialSnapshot();
  await assert.rejects(
    repo.createJournal(snapshot.version, {
      id: randomUUID(),
      ...(await hashPassword("synthetic-bad-row")),
      salt: "invalid",
    }),
  );
  assert.deepEqual(await repo.credentialSnapshot(), snapshot);
  assert.equal(
    (await query("SELECT COUNT(*) AS count FROM pill_happens_state"))[0].count,
    6,
  );
  await assert.rejects(repo.readState(randomUUID()));
  await assert.rejects(repo.mutateState(randomUUID(), () => {}));
  // Two simultaneous saves in one journal must retain both changes.
  await Promise.all([
    repo.mutateState(a, (state) =>
      state.medications.push({
        ...owner.medications[0],
        id: randomUUID(),
        name: "Synthetic concurrent A",
      }),
    ),
    repo.mutateState(a, (state) =>
      state.medications.push({
        ...owner.medications[0],
        id: randomUUID(),
        name: "Synthetic concurrent B",
      }),
    ),
  ]);
  assert.equal((await repo.readState(a)).medications.length, 2);
  assert.equal((await repo.readState(b)).medications.length, 0);
  for (let n = 0; n < 10; n++)
    assert.equal(await repo.consumeAuthAttempt("creation"), true);
  assert.equal(await repo.consumeAuthAttempt("creation"), false);
  for (let n = 0; n < 10; n++)
    assert.equal(await repo.consumeAuthAttempt("signin"), true);
  assert.equal(await repo.consumeAuthAttempt("signin"), false);
  const reopened = createPostgresJournalRepository(query);
  assert.equal(await reopened.consumeAuthAttempt("signin"), false);
  assert.equal(await reopened.consumeAuthAttempt("creation"), false);
  await query(`UPDATE pill_happens_login_attempts
    SET window_start = NOW() - INTERVAL '16 minutes'`);
  assert.equal(await repo.consumeAuthAttempt("signin"), true);
  assert.equal(await repo.consumeAuthAttempt("creation"), true);
  await reopened.credentialSnapshot();
  for (const statement of JOURNAL_SCHEMA) await query(statement);
  assert.equal(
    JSON.stringify(
      await query(`SELECT * FROM pill_happens_state WHERE id='personal'`),
    ),
    before,
  );
  assert.equal((await repo.credentialSnapshot()).credentials.length, 5);
});
