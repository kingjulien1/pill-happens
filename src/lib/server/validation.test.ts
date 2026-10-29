import assert from "node:assert/strict";
import test from "node:test";
import {
  goalSchema,
  intakeSchema,
  medicationSchema,
  medicationPatchSchema,
  settingsSchema,
} from "./validation";
import {
  MEDICATION_COLORS,
  MEDICATION_ICON_NAMES,
} from "../medication-appearance";
import { SVG_ICON_CATALOG } from "../svg-icon-catalog";

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

test("medication intake defaults accept fractional quantities within the log input limits", () => {
  const medication = {
    name: "Example",
    strengthMg: 2,
    form: "tablet",
    color: "rose",
  };
  for (const defaultQuantity of [0.000001, 0.25, 0.5, 1, 10_000]) {
    const result = medicationSchema.parse({ ...medication, defaultQuantity });
    assert.equal(result.defaultQuantity, defaultQuantity);
    assert.equal(result.strengthMg, 2);
  }
  for (const defaultQuantity of [
    0,
    -1,
    0.0000001,
    10_000.1,
    Infinity,
    NaN,
    null,
    "0.5",
  ]) {
    assert.equal(
      medicationSchema.safeParse({ ...medication, defaultQuantity }).success,
      false,
    );
    assert.equal(
      medicationPatchSchema.safeParse({ defaultQuantity }).success,
      false,
    );
  }
});

test("metered-pump medications keep the manually entered mg per pump and intake default", () => {
  const medication = {
    name: "Synthetic metered dispenser",
    strengthMg: 2.5,
    defaultQuantity: 3,
    form: "pump",
    color: "rose",
  };
  const parsed = medicationSchema.parse(medication);
  assert.equal(parsed.form, "pump");
  assert.equal(parsed.strengthMg, 2.5);
  assert.equal(parsed.defaultQuantity, 3);
  assert.deepEqual(medicationPatchSchema.parse({ form: "pump" }), {
    form: "pump",
  });
  assert.equal(
    medicationSchema.safeParse({ ...medication, strengthMg: undefined })
      .success,
    false,
  );
  assert.equal(
    medicationSchema.safeParse({ ...medication, form: "spray" }).success,
    false,
  );
  const recorded = intakeSchema.parse({ ...intake, quantity: 3 });
  assert.equal(recorded.quantity, 3);
  // Icon names, bottle capacity, and pump counts never supply a missing strength.
  assert.equal(Object.hasOwn(recorded, "strengthMg"), false);
});

test("legacy medications and unrelated patches do not gain or reset an intake default", () => {
  const legacy = medicationSchema.parse({
    name: "Legacy",
    strengthMg: 1,
    form: "tablet",
    color: "rose",
  });
  assert.equal(Object.hasOwn(legacy, "defaultQuantity"), false);
  assert.deepEqual(medicationPatchSchema.parse({ archived: true }), {
    archived: true,
  });
  assert.deepEqual(medicationPatchSchema.parse({ name: "Renamed" }), {
    name: "Renamed",
  });
  assert.deepEqual(medicationPatchSchema.parse({ defaultQuantity: 0.5 }), {
    defaultQuantity: 0.5,
  });
});

test("medication icon rotation accepts whole clockwise degrees and explicit upright reset", () => {
  const medication = {
    name: "Example",
    strengthMg: 1,
    form: "tablet",
    color: "rose",
  };
  for (const iconRotation of [0, 1, 45, 90, 315, 359]) {
    assert.equal(
      medicationSchema.parse({ ...medication, iconRotation }).iconRotation,
      iconRotation,
    );
    assert.deepEqual(medicationPatchSchema.parse({ iconRotation }), {
      iconRotation,
    });
  }
  for (const iconRotation of [-1, 360, 45.5, Infinity, NaN, null, "45"]) {
    assert.equal(
      medicationSchema.safeParse({ ...medication, iconRotation }).success,
      false,
    );
    assert.equal(
      medicationPatchSchema.safeParse({ iconRotation }).success,
      false,
    );
  }
});

test("legacy medications and unrelated patches do not introduce or reset icon rotation", () => {
  const legacy = medicationSchema.parse({
    name: "Legacy",
    strengthMg: 1,
    form: "tablet",
    color: "rose",
  });
  assert.equal(Object.hasOwn(legacy, "iconRotation"), false);
  for (const patch of [
    { name: "Renamed" },
    { archived: true },
    { icon: "🌙" },
  ]) {
    assert.deepEqual(medicationPatchSchema.parse(patch), patch);
    const edited = Object.assign({ ...legacy, iconRotation: 135 }, patch);
    assert.equal(edited.iconRotation, 135);
  }
});

test("medication validation accepts every registered color and rejects unknown colors", () => {
  const medication = { name: "Example", strengthMg: 1, form: "tablet" };
  for (const { value } of MEDICATION_COLORS) {
    assert.equal(
      medicationSchema.parse({ ...medication, color: value }).color,
      value,
    );
  }
  assert.equal(
    medicationSchema.safeParse({ ...medication, color: "unregistered" })
      .success,
    false,
  );
});

test("legacy medications omit the optional icon instead of receiving a persisted default", () => {
  for (const color of ["rose", "amber", "violet"]) {
    const result = medicationSchema.parse({
      name: "Example",
      strengthMg: 1,
      form: "tablet",
      color,
    });
    assert.equal(Object.hasOwn(result, "icon"), false);
  }
});

test("archiving and unrelated medication patches preserve emoji and local SVG icons", () => {
  const medication = {
    name: "Example",
    strengthMg: 1,
    form: "tablet",
    color: "rose",
    icon: "🌙",
  };
  for (const icon of [
    medication.icon,
    ...SVG_ICON_CATALOG.map(({ value }) => value),
  ]) {
    const archivePatch = medicationPatchSchema.parse({ archived: true });
    assert.deepEqual(archivePatch, { archived: true });
    assert.equal(
      Object.assign({ ...medication, icon }, archivePatch).icon,
      icon,
    );
    const namePatch = medicationPatchSchema.parse({ name: "Renamed" });
    assert.deepEqual(namePatch, { name: "Renamed" });
    assert.equal(Object.assign({ ...medication, icon }, namePatch).icon, icon);
  }
});

test("medication icons accept allowlisted names and a single complex emoji", () => {
  const medication = {
    name: "Example",
    strengthMg: 1,
    form: "tablet",
    color: "mint",
  };
  for (const icon of [
    ...MEDICATION_ICON_NAMES,
    ...SVG_ICON_CATALOG.map(({ value }) => value),
    "👩🏽‍⚕️",
    "🇦🇹",
    "❤️",
  ]) {
    assert.equal(medicationSchema.parse({ ...medication, icon }).icon, icon);
    assert.equal(medicationPatchSchema.parse({ icon }).icon, icon);
  }
  for (const icon of [
    "hello",
    "🌙🌙",
    "<svg/>",
    " ",
    "🌙".repeat(33),
    "svg:unknown",
    "svg:../pill-spark",
    "svg:color:unknown",
    "svg:color:../valium",
    "Bromazepam",
    "/icons/medications/pill-spark.svg",
    "https://example.com/pill.svg",
    "data:image/svg+xml,<svg/>",
    null,
  ]) {
    assert.equal(
      medicationSchema.safeParse({ ...medication, icon }).success,
      false,
    );
    assert.equal(medicationPatchSchema.safeParse({ icon }).success, false);
  }
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
