import assert from "node:assert/strict";
import test from "node:test";
import {
  goalSchema,
  intakeSchema,
  medicationSchema,
  settingsSchema,
} from "./validation";

const medicationId = "6cfa88e7-8474-4b17-a148-545fb825785b";
const intake = {
  medicationId,
  quantity: 0.25,
  takenAt: "2025-01-01T12:00:00.000Z",
  note: "",
};

test("fractional quantities are accepted and nonpositive or nonfinite values are rejected", () => {
  assert.equal(intakeSchema.parse(intake).quantity, 0.25);
  for (const quantity of [0, -1, Infinity, NaN, 10_001]) {
    assert.equal(
      intakeSchema.safeParse({ ...intake, quantity }).success,
      false,
    );
  }
});

test("intakes cannot be future-dated or carry invalid dates or medication identifiers", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal(
    intakeSchema.safeParse({ ...intake, takenAt: future }).success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...intake, takenAt: "2025-02-30T12:00:00Z" })
      .success,
    false,
  );
  assert.equal(
    intakeSchema.safeParse({ ...intake, medicationId: "another-user-input" })
      .success,
    false,
  );
});

test("medications require a name and preserve user-entered fractional strengths", () => {
  const medication = {
    name: "  Example  ",
    strengthMg: 0.125,
    form: "tablet",
    color: "rose",
  };
  assert.equal(medicationSchema.parse(medication).name, "Example");
  assert.equal(medicationSchema.parse(medication).strengthMg, 0.125);
  assert.equal(
    medicationSchema.safeParse({ ...medication, strengthMg: 0 }).success,
    false,
  );
  assert.equal(
    medicationSchema.safeParse({ ...medication, name: "   " }).success,
    false,
  );
});

test("goal periods use real calendar days in chronological order", () => {
  const goal = {
    medicationId,
    dailyLimitMg: 1,
    startsOn: "2026-10-26",
    endsOn: null,
    note: "",
  };
  assert.equal(goalSchema.safeParse(goal).success, true);
  assert.equal(
    goalSchema.safeParse({ ...goal, startsOn: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    goalSchema.safeParse({ ...goal, endsOn: "2026-10-25" }).success,
    false,
  );
  assert.equal(
    goalSchema.safeParse({ ...goal, endsOn: "2026-10-26" }).success,
    true,
  );
});

test("a user-entered zero goal is accepted while negative, nonfinite and oversized goals are rejected", () => {
  const goal = {
    medicationId,
    dailyLimitMg: 0,
    startsOn: "2026-10-26",
    endsOn: null,
    note: "",
  };
  assert.equal(goalSchema.parse(goal).dailyLimitMg, 0);
  for (const dailyLimitMg of [-0.01, Infinity, -Infinity, NaN, 100_001]) {
    assert.equal(
      goalSchema.safeParse({ ...goal, dailyLimitMg }).success,
      false,
    );
  }
  assert.equal(
    goalSchema.safeParse({ ...goal, dailyLimitMg: 0.125 }).success,
    true,
  );
});

test("timezone validation rejects values that cannot group persisted timestamps", () => {
  assert.equal(
    settingsSchema.safeParse({ timezone: "Europe/Vienna" }).success,
    true,
  );
  assert.equal(
    settingsSchema.safeParse({ timezone: "America/New_York" }).success,
    true,
  );
  assert.equal(
    settingsSchema.safeParse({ timezone: "Arbitrary/Zone" }).success,
    false,
  );
});
