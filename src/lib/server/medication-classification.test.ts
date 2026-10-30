import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { emptyData, totalsForDay, type AppData } from "@/lib/domain";
import {
  getMedicationClasses,
  getMedicationClassification,
} from "@/lib/medication-classification";
import {
  createPostgresJournalRepository,
  type JournalRepository,
} from "./journal-repository";
import { createJournalService } from "./journal-service";
import { mutateJournalState, readJournalState } from "./journal-state";
import { createLocalJournalRepository } from "./local-journal-repository";
import { medicationPatchSchema, medicationSchema } from "./validation";

type RepositoryFixture = {
  repository: JournalRepository;
  reopen: () => JournalRepository;
};

const repositories: {
  name: string;
  create: (t: TestContext) => Promise<RepositoryFixture>;
}[] = [
  {
    name: "local JSON",
    async create(t) {
      const directory = await mkdtemp(
        path.join(os.tmpdir(), "pill-happens-classification-test-"),
      );
      t.after(() => rm(directory, { recursive: true, force: true }));
      const reopen = () => createLocalJournalRepository(directory);
      return { repository: reopen(), reopen };
    },
  },
  {
    name: "Postgres JSONB",
    async create(t) {
      // Embedded Postgres only: no database URL, network, or app credentials.
      const db = new PGlite();
      t.after(() => db.close());
      const query = async (sql: string, params: unknown[] = []) =>
        (await db.query<Record<string, unknown>>(sql, params)).rows;
      const reopen = () => createPostgresJournalRepository(query);
      return { repository: reopen(), reopen };
    },
  },
];

function classificationState(): AppData {
  const medication = {
    ...medicationSchema.parse({
      name: "Synthetic medication",
      activeIngredient: "Optional ingredient",
      isBenzodiazepine: true,
      isOpioid: true,
      strengthMg: 2,
      defaultQuantity: 3,
      form: "tablet",
      color: "rose",
      icon: "🌙",
      iconRotation: 45,
    }),
    id: "6cfa88e7-8474-4b17-a148-545fb825785b",
    archived: false,
    createdAt: "2026-10-01T10:00:00Z",
  };
  const legacy = { ...medication };
  delete legacy.isBenzodiazepine;
  delete legacy.isOpioid;
  return {
    ...emptyData(),
    medications: [
      medication,
      {
        ...medication,
        id: "explicit-false",
        isBenzodiazepine: false,
        isOpioid: false,
      },
      { ...legacy, id: "legacy", name: "Diazepam" },
      {
        ...medication,
        id: "opioid-only",
        name: "Another marked medication",
        isBenzodiazepine: false,
      },
      {
        ...legacy,
        id: "legacy-benzo",
        name: "Already marked medication",
        isBenzodiazepine: true,
      },
    ],
    intakes: [
      {
        id: "past-intake",
        medicationId: medication.id,
        medicationName: medication.name,
        medicationForm: medication.form,
        strengthMg: medication.strengthMg,
        quantity: 0.25,
        takenAt: "2026-10-02T10:00:29Z",
        createdAt: "2026-10-02T10:01:37Z",
        note: "Keep this recorded amount and note.",
      },
    ],
    goals: [
      {
        id: "synthetic-goal",
        medicationId: medication.id,
        dailyLimitMg: 1,
        startsOn: "2026-10-01",
        endsOn: null,
        note: "My existing target.",
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
  };
}

function intakeFacts(data: AppData) {
  return data.intakes.map(({ id, quantity, takenAt, createdAt, note }) => ({
    id,
    quantity,
    takenAt,
    createdAt,
    note,
  }));
}

for (const fixture of repositories) {
  test(`${fixture.name} preserves manual classification across saves, reads, exports and journals`, async (t) => {
    const { repository, reopen } = await fixture.create(t);
    const original = classificationState();
    const otherJournal = await createJournalService(
      repository,
      "synthetic-classification-owner",
    ).create("synthetic-other-classification-journal");
    await repository.mutateState("personal", (state) => {
      Object.assign(state, original);
    });
    await repository.mutateState(otherJournal, (state) => {
      state.medications.push({
        ...original.medications[0],
        name: "Unrelated journal medication with the same ID",
        isBenzodiazepine: false,
        isOpioid: false,
      });
    });
    const otherBefore = await readJournalState(repository, otherJournal);

    const restored = await readJournalState(reopen(), "personal");
    assert.deepEqual(restored, original);
    assert.equal(restored.medications[0].isBenzodiazepine, true);
    assert.equal(restored.medications[0].isOpioid, true);
    assert.equal(restored.medications[1].isBenzodiazepine, false);
    assert.equal(restored.medications[1].isOpioid, false);
    assert.equal(
      Object.hasOwn(restored.medications[2], "isBenzodiazepine"),
      false,
      "legacy medication names must not cause classification",
    );
    assert.equal(Object.hasOwn(restored.medications[2], "isOpioid"), false);
    assert.equal(
      getMedicationClassification(restored.medications[3]),
      "opioid",
    );
    assert.equal(
      Object.hasOwn(restored.medications[4], "isOpioid"),
      false,
      "a pre-existing benzo label must not acquire an opioid flag",
    );
    assert.equal(
      getMedicationClassification(restored.medications[4]),
      "benzodiazepine",
    );
    const exported = JSON.parse(
      JSON.stringify({ schemaVersion: 1, data: restored }),
    );
    assert.deepEqual(exported.data, restored);

    await mutateJournalState(reopen(), "personal", (state) => {
      Object.assign(
        state.medications[0],
        medicationPatchSchema.parse({ name: "Renamed", archived: true }),
      );
    });
    const archived = await readJournalState(reopen(), "personal");
    assert.equal(archived.medications[0].isBenzodiazepine, true);
    assert.equal(archived.medications[0].isOpioid, true);
    assert.deepEqual(
      getMedicationClasses(
        archived.medications.find(
          (item) => item.id === archived.intakes[0].medicationId,
        ),
      ),
      ["benzodiazepine", "opioid"],
      "past-log labels follow the current linked medication",
    );
    assert.equal(archived.medications[0].archived, true);
    assert.equal(archived.intakes[0].medicationName, "Renamed");
    assert.deepEqual(intakeFacts(archived), intakeFacts(original));
    assert.deepEqual(archived.goals, original.goals);
    assert.equal(totalsForDay(archived, "2026-10-02")[0].totalMg, 0.5);

    await mutateJournalState(reopen(), "personal", (state) => {
      Object.assign(
        state.medications[0],
        medicationPatchSchema.parse({ isBenzodiazepine: false }),
      );
    });
    const opioidOnly = await readJournalState(reopen(), "personal");
    assert.equal(
      getMedicationClassification(opioidOnly.medications[0]),
      "opioid",
    );
    assert.deepEqual(
      getMedicationClasses(
        opioidOnly.medications.find(
          (item) => item.id === opioidOnly.intakes[0].medicationId,
        ),
      ),
      ["opioid"],
    );
    assert.deepEqual(intakeFacts(opioidOnly), intakeFacts(original));
    await mutateJournalState(reopen(), "personal", (state) => {
      Object.assign(
        state.medications[0],
        medicationPatchSchema.parse({ isOpioid: false }),
      );
    });
    await mutateJournalState(reopen(), "personal", (state) => {
      Object.assign(
        state.medications[0],
        medicationPatchSchema.parse({ activeIngredient: "Corrected" }),
      );
    });
    const unmarked = await readJournalState(reopen(), "personal");
    assert.equal(unmarked.medications[0].isBenzodiazepine, false);
    assert.equal(unmarked.medications[0].isOpioid, false);
    assert.equal(
      getMedicationClassification(unmarked.medications[0]),
      "unmarked",
    );
    assert.deepEqual(
      getMedicationClasses(
        unmarked.medications.find(
          (item) => item.id === unmarked.intakes[0].medicationId,
        ),
      ),
      [],
    );
    assert.equal(unmarked.medications[0].activeIngredient, "Corrected");
    assert.deepEqual(intakeFacts(unmarked), intakeFacts(original));
    assert.deepEqual(unmarked.goals, original.goals);
    assert.equal(totalsForDay(unmarked, "2026-10-02")[0].totalMg, 0.5);
    assert.deepEqual(await repository.readState("personal"), unmarked);
    assert.deepEqual(
      await readJournalState(reopen(), otherJournal),
      otherBefore,
      "classification edits cannot affect another journal",
    );
    // Current medication metadata is the source for old and new log highlights;
    // intake snapshots never acquire a second flag that can fall out of sync.
    assert.equal(Object.hasOwn(unmarked.intakes[0], "isBenzodiazepine"), false);
    assert.equal(Object.hasOwn(unmarked.intakes[0], "isOpioid"), false);
    assert.equal(Object.hasOwn(unmarked.goals[0], "isOpioid"), false);
    assert.deepEqual(
      JSON.parse(JSON.stringify({ schemaVersion: 1, data: unmarked })).data,
      unmarked,
    );
  });
}
