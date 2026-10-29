import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { emptyData } from "@/lib/domain";
import { createJournalService, JournalCreationError } from "./journal-service";
import { createLocalJournalRepository } from "./local-journal-repository";

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "pill-happens-journal-test-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repository = createLocalJournalRepository(directory);
  return {
    directory,
    repository,
    service: createJournalService(repository, "legacy-fixture-only"),
  };
}

test("unknown password lookup creates no local files and owner sign-in preserves legacy data", async (t) => {
  const { directory, repository, service } = await fixture(t);
  const personal = emptyData();
  personal.settings.timezone = "America/New_York";
  const original = JSON.stringify(personal, null, 2);
  await writeFile(path.join(directory, "state.json"), original);
  assert.equal(await service.signIn("unknown-fixture-password"), null);
  assert.equal(await service.signIn("legacy-fixture-only"), "personal");
  assert.deepEqual(await readdir(directory), ["state.json"]);
  assert.equal(
    await readFile(path.join(directory, "state.json"), "utf8"),
    original,
  );
  assert.deepEqual(await repository.readState("personal"), personal);
  await assert.rejects(
    service.create("legacy-fixture-only"),
    (error) => error instanceof JournalCreationError && error.status === 409,
  );
  assert.equal((await repository.credentialSnapshot()).credentials.length, 0);
});

test("new local journals persist isolated state and salted credentials across repository instances", async (t) => {
  const { directory, repository, service } = await fixture(t);
  const password = "  synthetic-🧡-password  ";
  const first = await service.create(password);
  const second = await service.create("different-fixture-password");
  assert.notEqual(first, second);
  assert.deepEqual(await repository.readState(first), emptyData());
  await repository.mutateState(first, (data) => {
    data.settings.timezone = "Pacific/Auckland";
  });
  assert.equal(
    (await repository.readState(second)).settings.timezone,
    "Europe/Vienna",
  );
  assert.equal(
    (await repository.readState("personal")).settings.timezone,
    "Europe/Vienna",
  );
  const reopened = createLocalJournalRepository(directory);
  assert.equal(
    await createJournalService(reopened, "legacy-fixture-only").signIn(
      password,
    ),
    first,
  );
  assert.equal(await service.signIn(password.trim()), null);
  assert.equal(
    (await reopened.readState(first)).settings.timezone,
    "Pacific/Auckland",
  );
  const serialized = await readFile(
    path.join(directory, "journals.json"),
    "utf8",
  );
  assert.equal(serialized.includes(password), false);
  assert.equal(serialized.includes("scrypt-v1"), true);
  assert.equal(
    (await stat(path.join(directory, "journals.json"))).mode & 0o777,
    0o600,
  );
  await assert.rejects(
    service.create(password),
    (error) => error instanceof JournalCreationError && error.status === 409,
  );
  assert.equal(
    (await repository.readState(first)).settings.timezone,
    "Pacific/Auckland",
  );
});

test("concurrent same-password creation has one winner while different passwords both survive", async (t) => {
  const { directory, repository, service } = await fixture(t);
  const otherInstance = createJournalService(
    createLocalJournalRepository(directory),
    "legacy-fixture-only",
  );
  const same = await Promise.allSettled([
    service.create("same-fixture-password"),
    otherInstance.create("same-fixture-password"),
  ]);
  assert.equal(
    same.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const failure = same.find((result) => result.status === "rejected");
  assert.ok(
    failure?.status === "rejected" &&
      failure.reason instanceof JournalCreationError &&
      failure.reason.status === 409,
  );
  assert.equal((await repository.credentialSnapshot()).credentials.length, 1);
  const different = await Promise.all([
    service.create("first-different-fixture"),
    otherInstance.create("second-different-fixture"),
  ]);
  assert.notEqual(different[0], different[1]);
  assert.equal((await repository.credentialSnapshot()).credentials.length, 3);
  for (const id of different)
    assert.deepEqual(await repository.readState(id), emptyData());
});

test("metered-pump records and intake units survive reopening and later medication type edits", async (t) => {
  const { directory, repository } = await fixture(t);
  const medication = {
    id: "6cfa88e7-8474-4b17-a148-545fb825785b",
    name: "Synthetic pump",
    strengthMg: 2.5,
    defaultQuantity: 3,
    form: "pump" as const,
    color: "rose" as const,
    archived: false,
    createdAt: "2026-10-01T12:00:00Z",
  };
  await repository.mutateState("personal", (data) => {
    data.medications.push(medication);
    data.intakes.push({
      id: "synthetic-pump-intake",
      medicationId: medication.id,
      medicationName: medication.name,
      medicationForm: medication.form,
      strengthMg: medication.strengthMg,
      quantity: 3,
      takenAt: "2026-10-01T12:00:00Z",
      createdAt: "2026-10-01T12:01:00Z",
      note: "",
    });
  });
  const reopened = createLocalJournalRepository(directory);
  const before = await reopened.readState("personal");
  assert.deepEqual(before.medications[0], medication);
  assert.equal(before.intakes[0].medicationForm, "pump");
  await reopened.mutateState("personal", (data) => {
    data.medications[0].form = "tablet";
    data.medications[0].strengthMg = 10;
  });
  const after = await repository.readState("personal");
  assert.equal(after.medications[0].form, "tablet");
  assert.equal(after.intakes[0].medicationForm, "pump");
  assert.equal(after.intakes[0].strengthMg, 2.5);
  assert.equal(after.intakes[0].quantity, 3);
});

test("missing or malformed local journal scope cannot open or create personal state", async (t) => {
  const { directory, repository } = await fixture(t);
  for (const id of [
    "",
    "../state.json",
    "PERSONAL",
    "3f7fcba5-c0ac-4c07-91e8-6af3809b0eec",
  ]) {
    await assert.rejects(repository.readState(id));
    await assert.rejects(
      repository.mutateState(id, (data) => {
        data.settings.timezone = "UTC";
      }),
    );
  }
  assert.deepEqual(await readdir(directory), []);
});

test("local mutations serialize across instances without dropping updates or crossing journals", async (t) => {
  const { directory, repository, service } = await fixture(t);
  const first = await service.create("concurrency-fixture-password");
  const second = await service.create("untouched-fixture-password");
  const other = createLocalJournalRepository(directory);
  await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      (index % 2 ? repository : other).mutateState(first, (data) => {
        data.settings.timezone += `:${index}`;
      }),
    ),
  );
  assert.equal(
    (await repository.readState(first)).settings.timezone.split(":").length,
    11,
  );
  assert.equal(
    (await repository.readState(second)).settings.timezone,
    "Europe/Vienna",
  );
  assert.deepEqual(
    (await readdir(directory)).filter((file) => file.endsWith(".tmp")),
    [],
  );
});

test("sign-in and creation quotas are independent and successes cannot reset either window", async (t) => {
  const { repository, service } = await fixture(t);
  for (let index = 0; index < 10; index++) {
    assert.equal(await repository.consumeAuthAttempt("signin"), true);
    assert.equal(await service.signIn("legacy-fixture-only"), "personal");
  }
  assert.equal(await repository.consumeAuthAttempt("signin"), false);
  for (let index = 0; index < 10; index++)
    assert.equal(await repository.consumeAuthAttempt("creation"), true);
  assert.equal(await repository.consumeAuthAttempt("creation"), false);
  assert.equal(await service.signIn("legacy-fixture-only"), "personal");
  assert.equal(await repository.consumeAuthAttempt("signin"), false);
  assert.equal(await repository.consumeAuthAttempt("creation"), false);
});
