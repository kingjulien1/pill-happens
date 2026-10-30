import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  emptyData,
  totalsForDay,
  type AppData,
  type Medication,
} from "@/lib/domain";
import {
  getMedicationCategories,
  MEDICATION_CATEGORY_VALUES,
  type MedicationCategory,
} from "@/lib/medication-categories";
import { getMedicationClasses } from "@/lib/medication-classification";
import { resolveMedicationCategoryPatch } from "./medication-category-patch";
import { medicationPatchSchema, medicationSchema } from "./validation";
import {
  createPostgresJournalRepository,
  type JournalRepository,
} from "./journal-repository";
import { createLocalJournalRepository } from "./local-journal-repository";
import { createJournalService } from "./journal-service";
import { mutateJournalState, readJournalState } from "./journal-state";

const basicMedication = {
  name: "Synthetic medication",
  activeIngredient: "A manually supplied ingredient",
  strengthMg: 2,
  form: "tablet",
  color: "rose",
};

test("medication categories accept every registered ID and preserve omission on legacy inputs", () => {
  for (const category of MEDICATION_CATEGORY_VALUES) {
    const created = medicationSchema.parse({
      ...basicMedication,
      categories: [category],
    });
    assert.deepEqual(created.categories, [category]);
    assert.deepEqual(
      medicationPatchSchema.parse({ categories: [category] }).categories,
      [category],
    );
  }
  for (const flags of [
    {},
    { isBenzodiazepine: true },
    { isOpioid: true },
    { isBenzodiazepine: false, isOpioid: false },
  ]) {
    const created = medicationSchema.parse({ ...basicMedication, ...flags });
    assert.equal(Object.hasOwn(created, "categories"), false);
    assert.deepEqual(medicationPatchSchema.parse(flags), flags);
  }
  for (const patch of [
    {},
    { name: "Renamed" },
    { archived: true },
    { activeIngredient: "Changed" },
  ]) {
    const parsed = medicationPatchSchema.parse(patch);
    assert.equal(Object.hasOwn(parsed, "categories"), false);
    assert.equal(Object.hasOwn(parsed, "isBenzodiazepine"), false);
    assert.equal(Object.hasOwn(parsed, "isOpioid"), false);
  }
});

test("category input rejects unknown, duplicate and malformed values without coercion", () => {
  for (const categories of [
    ["not-registered"],
    ["Benzo"],
    ["benzodiazepine", "benzodiazepine"],
    ["sleep-aid", "other", "sleep-aid"],
    [" opioid"],
    ["opioid "],
    [null],
    [1],
    [{}],
    [["opioid"]],
    "opioid",
    null,
    false,
    {},
    [...MEDICATION_CATEGORY_VALUES, "other"],
  ]) {
    assert.equal(
      medicationSchema.safeParse({ ...basicMedication, categories }).success,
      false,
    );
    assert.equal(
      medicationPatchSchema.safeParse({ categories }).success,
      false,
    );
  }
});

test("explicit category selections are canonical and override contradictory legacy flags", () => {
  const categories: MedicationCategory[] = [
    "sleep-aid",
    "benzodiazepine",
    "antidepressant",
  ];
  const before = [...categories];
  for (const parse of [
    (input: Record<string, unknown>) =>
      medicationSchema.parse({ ...basicMedication, ...input }),
    (input: Record<string, unknown>) => medicationPatchSchema.parse(input),
  ]) {
    const selected = parse({
      categories,
      isBenzodiazepine: false,
      isOpioid: true,
    });
    assert.deepEqual(selected.categories, [
      "benzodiazepine",
      "antidepressant",
      "sleep-aid",
    ]);
    assert.equal(selected.isBenzodiazepine, true);
    assert.equal(selected.isOpioid, false);
    assert.notEqual(selected.categories, categories);
    assert.deepEqual(
      parse({ categories: [], isBenzodiazepine: true, isOpioid: true })
        .categories,
      [],
    );
    const cleared = parse({
      categories: [],
      isBenzodiazepine: true,
      isOpioid: true,
    });
    assert.equal(cleared.isBenzodiazepine, false);
    assert.equal(cleared.isOpioid, false);
  }
  assert.deepEqual(categories, before);
});

test("legacy flag-only patches update their own category and retain unrelated manual labels", () => {
  const current = {
    categories: [
      "benzodiazepine",
      "antidepressant",
      "sleep-aid",
    ] as MedicationCategory[],
    isBenzodiazepine: true,
    isOpioid: false,
  };
  const before = structuredClone(current);
  const patch = { isBenzodiazepine: false, isOpioid: true };
  const resolved = resolveMedicationCategoryPatch(current, patch);
  assert.deepEqual(resolved, {
    categories: ["opioid", "antidepressant", "sleep-aid"],
    isBenzodiazepine: false,
    isOpioid: true,
  });
  assert.deepEqual(current, before);
  assert.deepEqual(patch, { isBenzodiazepine: false, isOpioid: true });
  assert.notEqual(resolved.categories, current.categories);
  assert.deepEqual(resolveMedicationCategoryPatch(current, {}), {});
  assert.deepEqual(
    resolveMedicationCategoryPatch(
      { isBenzodiazepine: true },
      { isOpioid: true },
    ),
    {},
  );
  assert.deepEqual(
    resolveMedicationCategoryPatch(current, {
      categories: [],
      isBenzodiazepine: true,
    }),
    {
      categories: [],
      isBenzodiazepine: false,
      isOpioid: false,
    },
  );
});

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
        path.join(os.tmpdir(), "pill-happens-categories-test-"),
      );
      t.after(() => rm(directory, { recursive: true, force: true }));
      const reopen = () => createLocalJournalRepository(directory);
      return { repository: reopen(), reopen };
    },
  },
  {
    name: "Postgres JSONB",
    async create(t) {
      // Embedded synthetic Postgres only: no URL, network or journal credentials.
      const db = new PGlite();
      t.after(() => db.close());
      const reopen = () =>
        createPostgresJournalRepository(
          async (sql, params = []) =>
            (await db.query<Record<string, unknown>>(sql, params)).rows,
        );
      return { repository: reopen(), reopen };
    },
  },
];

function applyPatch(medication: Medication, patch: unknown) {
  const input = medicationPatchSchema.parse(patch);
  // The same merge order as the medication PATCH route; resolution sees the
  // current medication before Object.assign applies the input.
  Object.assign(
    medication,
    input,
    resolveMedicationCategoryPatch(medication, input),
  );
}

function categoryState(): AppData {
  const medication: Medication = {
    ...medicationSchema.parse({
      ...basicMedication,
      categories: ["sleep-aid", "benzodiazepine", "antidepressant"],
    }),
    id: "synthetic-categorized",
    archived: false,
    createdAt: "2026-10-01T10:00:00Z",
  };
  const legacy = { ...medication };
  delete legacy.categories;
  delete legacy.isBenzodiazepine;
  delete legacy.isOpioid;
  return {
    ...emptyData(),
    medications: [
      medication,
      { ...legacy, id: "legacy-benzo", isBenzodiazepine: true },
      { ...legacy, id: "legacy-opioid", isOpioid: true },
      {
        ...legacy,
        id: "legacy-unmarked",
        name: "Diazepam",
        activeIngredient: "Tramadol",
      },
    ],
    intakes: [
      {
        id: "past-intake",
        medicationId: medication.id,
        medicationName: medication.name,
        medicationForm: medication.form,
        strengthMg: medication.strengthMg,
        quantity: 0.5,
        takenAt: "2026-10-02T10:00:00Z",
        createdAt: "2026-10-02T10:01:00Z",
        note: "Preserve intake facts.",
      },
    ],
    goals: [
      {
        id: "goal",
        medicationId: medication.id,
        dailyLimitMg: 2,
        startsOn: "2026-10-01",
        endsOn: null,
        note: "Keep the existing target.",
        createdAt: "2026-10-01T10:00:00Z",
      },
    ],
  };
}

for (const fixture of repositories) {
  test(`${fixture.name} preserves manual categories, legacy flags and historical facts across edits and exports`, async (t) => {
    const { repository, reopen } = await fixture.create(t);
    const original = categoryState();
    const otherJournal = await createJournalService(
      repository,
      "synthetic-categories-owner",
    ).create("synthetic-other-categories-journal");
    await repository.mutateState("personal", (state) =>
      Object.assign(state, original),
    );
    const otherBefore = await readJournalState(repository, otherJournal);
    const restored = await readJournalState(reopen(), "personal");
    assert.deepEqual(restored, original);
    assert.deepEqual(getMedicationCategories(restored.medications[0]), [
      "benzodiazepine",
      "antidepressant",
      "sleep-aid",
    ]);
    assert.deepEqual(getMedicationCategories(restored.medications[1]), [
      "benzodiazepine",
    ]);
    assert.deepEqual(getMedicationCategories(restored.medications[2]), [
      "opioid",
    ]);
    assert.deepEqual(getMedicationCategories(restored.medications[3]), []);
    assert.equal(Object.hasOwn(restored.medications[1], "categories"), false);
    assert.equal(
      Object.hasOwn(restored.medications[3], "isBenzodiazepine"),
      false,
    );
    assert.equal(Object.hasOwn(restored.medications[3], "isOpioid"), false);
    const exported = JSON.parse(
      JSON.stringify({ schemaVersion: 1, data: restored }),
    );
    assert.deepEqual(exported.data, restored);

    await mutateJournalState(reopen(), "personal", (state) => {
      for (const medication of state.medications)
        applyPatch(medication, {
          name: `${medication.name} Renamed`,
          archived: true,
        });
    });
    const unrelated = await readJournalState(reopen(), "personal");
    assert.deepEqual(
      unrelated.medications[0].categories,
      original.medications[0].categories,
    );
    for (const medication of unrelated.medications.slice(1))
      assert.equal(Object.hasOwn(medication, "categories"), false);
    assert.equal(unrelated.medications[1].isBenzodiazepine, true);
    assert.equal(Object.hasOwn(unrelated.medications[1], "isOpioid"), false);
    assert.equal(unrelated.medications[2].isOpioid, true);

    await mutateJournalState(reopen(), "personal", (state) => {
      applyPatch(state.medications[0], {
        isBenzodiazepine: false,
        isOpioid: true,
      });
      applyPatch(state.medications[1], {
        categories: ["sleep-aid", "benzodiazepine"],
        isBenzodiazepine: false,
      });
    });
    const changed = await readJournalState(reopen(), "personal");
    assert.deepEqual(changed.medications[0].categories, [
      "opioid",
      "antidepressant",
      "sleep-aid",
    ]);
    assert.deepEqual(getMedicationClasses(changed.medications[0]), ["opioid"]);
    assert.deepEqual(changed.medications[1].categories, [
      "benzodiazepine",
      "sleep-aid",
    ]);
    assert.equal(changed.medications[1].isBenzodiazepine, true);
    const historicalMedication = changed.medications.find(
      (item) => item.id === changed.intakes[0].medicationId,
    );
    assert.deepEqual(getMedicationCategories(historicalMedication), [
      "opioid",
      "antidepressant",
      "sleep-aid",
    ]);
    assert.equal(totalsForDay(changed, "2026-10-02")[0].totalMg, 1);

    await mutateJournalState(reopen(), "personal", (state) =>
      applyPatch(state.medications[0], { categories: [], isOpioid: true }),
    );
    const cleared = await readJournalState(reopen(), "personal");
    assert.deepEqual(cleared.medications[0].categories, []);
    assert.equal(cleared.medications[0].isBenzodiazepine, false);
    assert.equal(cleared.medications[0].isOpioid, false);
    assert.deepEqual(getMedicationCategories(cleared.medications[0]), []);
    for (const state of [unrelated, changed, cleared]) {
      assert.equal(
        state.intakes[0].medicationName,
        "Synthetic medication Renamed",
      );
      assert.deepEqual(
        {
          ...state.intakes[0],
          medicationName: original.intakes[0].medicationName,
        },
        original.intakes[0],
      );
      assert.deepEqual(state.goals, original.goals);
    }
    assert.equal(Object.hasOwn(cleared.intakes[0], "categories"), false);
    assert.equal(Object.hasOwn(cleared.goals[0], "categories"), false);
    assert.deepEqual(
      JSON.parse(JSON.stringify({ schemaVersion: 1, data: cleared })).data,
      cleared,
    );
    assert.deepEqual(
      await readJournalState(reopen(), otherJournal),
      otherBefore,
    );
  });
}
