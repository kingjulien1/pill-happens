import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyData, type Intake, type Medication } from "./domain";
import {
  categoryRecordDetails,
  isIsoWeekStart,
  medicationRecordStats,
  sameIngredientMedications,
  weekRecordDetails,
} from "./journal-reference-details";

const medication = (
  id: string,
  patch: Partial<Medication> = {},
): Medication => ({
  id,
  name: id,
  strengthMg: 10,
  form: "tablet",
  color: "violet",
  archived: false,
  createdAt: "2026-01-01T12:00:00Z",
  ...patch,
});
const intake = (
  id: string,
  medicationId: string,
  patch: Partial<Intake> = {},
): Intake => ({
  id,
  medicationId,
  medicationName: medicationId,
  strengthMg: 10,
  quantity: 1,
  takenAt: "2026-10-26T12:00:00Z",
  createdAt: "2026-10-26T12:00:00Z",
  note: "",
  ...patch,
});

describe("reference destination statistics", () => {
  it("uses manual overlapping categories and includes archived definitions, not orphan/name inference", () => {
    const data = emptyData();
    data.medications = [
      medication("a", {
        categories: ["sleep-aid", "benzodiazepine"],
        archived: true,
      }),
      medication("b", { name: "Benzodiazepine", categories: [] }),
      medication("legacy", { isBenzodiazepine: true }),
    ];
    data.intakes = [intake("1", "a"), intake("2", "b"), intake("3", "missing")];
    const benzo = categoryRecordDetails(data, "benzodiazepine");
    assert.deepEqual(
      benzo.medications.map((item) => item.id),
      ["a", "legacy"],
    );
    assert.equal(benzo.count, 1);
    assert.equal(categoryRecordDetails(data, "sleep-aid").count, 1);
    assert.equal(benzo.medications[0].archived, true);
  });

  it("keeps historical forms, quantities and strength snapshots separate from the current definition", () => {
    const data = emptyData();
    data.medications = [medication("a", { strengthMg: 99, form: "capsule" })];
    data.intakes = [
      intake("1", "a", {
        quantity: 0.5,
        strengthMg: 10,
        medicationForm: "tablet",
      }),
      intake("2", "a", { quantity: 3, strengthMg: 2, medicationForm: "drops" }),
      intake("3", "a", { quantity: 0.1, strengthMg: 0.2 }),
    ];
    const stats = medicationRecordStats(data, "a");
    assert.equal(stats.totalMg, 11.02);
    assert.deepEqual(
      stats.quantities.map(({ form, quantity }) => [form, quantity]),
      [
        ["tablet", 0.5],
        ["drops", 3],
        ["capsule", 0.1],
      ],
    );
    assert.deepEqual(stats.routes, [{ route: "unspecified", count: 3 }]);
  });

  it("counts distinct tracking days across the 06:00 boundary and both DST changes", () => {
    const data = emptyData();
    data.intakes = [
      intake("1", "a", { takenAt: "2026-03-29T03:59:59Z" }),
      intake("2", "a", { takenAt: "2026-03-29T04:00:00Z" }),
      intake("3", "a", { takenAt: "2026-10-25T00:30:00Z" }),
      intake("4", "a", { takenAt: "2026-10-25T01:30:00Z" }),
      intake("5", "a", { takenAt: "2026-10-25T05:00:00Z" }),
    ];
    assert.deepEqual(medicationRecordStats(data, "a").days, [
      "2026-10-25",
      "2026-10-24",
      "2026-03-29",
      "2026-03-28",
    ]);
  });

  it("finds the most used same ingredient, including archived entries and stable ties", () => {
    const data = emptyData();
    data.medications = [
      medication("a", { activeIngredient: "  CÁFÉine " }),
      medication("b", { activeIngredient: "cafeine", archived: true }),
      medication("c", { activeIngredient: "different" }),
      medication("d", { activeIngredient: "cafeine" }),
    ];
    data.intakes = [
      intake("1", "b"),
      intake("2", "b"),
      intake("3", "a"),
      intake("4", "d"),
    ];
    assert.deepEqual(
      sameIngredientMedications(data, "CAFEINE").map((item) => item.id),
      ["b", "a", "d"],
    );
    assert.deepEqual(sameIngredientMedications(data, " "), []);
  });

  it("shows sparse week records, preserves missing medications and never combines medication doses", () => {
    const data = emptyData();
    data.medications = [medication("a")];
    data.intakes = [
      intake("1", "a", { quantity: 0.5, takenAt: "2026-10-26T04:59:59Z" }),
      intake("2", "a", { quantity: 0.5, takenAt: "2026-10-26T05:00:00Z" }),
      intake("3", "missing", {
        strengthMg: 2,
        quantity: 3,
        medicationName: "Old name",
        takenAt: "2026-11-01T22:00:00Z",
      }),
    ];
    const week = weekRecordDetails(data, "2026-10-26");
    assert.equal(week.weekNumber, 44);
    assert.deepEqual(week.days, ["2026-11-01", "2026-10-26"]);
    assert.equal(week.count, 2);
    assert.deepEqual(
      week.records.map(({ name, totalMg }) => [name, totalMg]),
      [
        ["a", 5],
        ["Old name", 6],
      ],
    );
    assert.equal(week.records[1].medication, undefined);
    assert.equal("totalMg" in week, false);
    assert.deepEqual(weekRecordDetails(data, "2026-11-09").days, []);
    assert.equal(isIsoWeekStart("2026-10-27"), false);
    assert.equal(isIsoWeekStart("2026-02-30"), false);
    assert.throws(() => weekRecordDetails(data, "2026-10-27"), RangeError);
  });

  it("includes check-in-only days in their actual ISO year and excludes unrelated days", () => {
    const data = emptyData();
    const checkIn = {
      note: "A short reflection.",
      moods: [],
      energy: null,
      stress: null,
      sleepHours: null,
      helped: "",
      createdAt: "2027-01-01T12:00:00Z",
      updatedAt: "2027-01-01T12:00:00Z",
    };
    data.dailyCheckIns = [
      { ...checkIn, day: "2027-01-01", period: "morning" },
      { ...checkIn, day: "2027-01-01" },
      { ...checkIn, day: "2027-01-03", period: "morning" },
      { ...checkIn, day: "2027-01-04" },
    ];
    const week = weekRecordDetails(data, "2026-12-28");
    assert.equal(week.weekYear, 2026);
    assert.equal(week.weekNumber, 53);
    assert.equal(week.end, "2027-01-03");
    assert.deepEqual(week.days, ["2027-01-03", "2027-01-01"]);
    assert.equal(week.count, 0);
    assert.deepEqual(week.records, []);
  });

  it("preserves explicit routes and never infers a route from dosage form", () => {
    const data = emptyData();
    data.medications = [medication("a", { form: "drops" })];
    data.intakes = [
      intake("1", "a", { route: "nasal" }),
      intake("2", "a"),
      intake("3", "a", { route: "nasal" }),
    ];
    assert.deepEqual(medicationRecordStats(data, "a").routes, [
      { route: "nasal", count: 2 },
      { route: "unspecified", count: 1 },
    ]);
  });
});
