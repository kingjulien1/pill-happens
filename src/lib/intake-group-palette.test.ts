import assert from "node:assert/strict";
import test from "node:test";
import { getIntakeGroupGradient } from "./intake-group-palette";
import { getMedicationColor, MEDICATION_COLORS } from "./medication-appearance";

const medications = [
  { id: "blue", color: "blue" },
  { id: "green", color: "green" },
  { id: "pink", color: "pink" },
];
const entries = (...ids: string[]) =>
  ids.map((medicationId) => ({ medicationId }));
const conicStops = (gradient: string) =>
  Array.from(
    gradient
      .slice(gradient.lastIndexOf("conic-gradient("))
      .matchAll(/(#[\da-f]{6}) (-?[\d.]+)deg/g),
    ([, hex, degrees]) => ({ hex, degrees: Number(degrees) }),
  );

test("every current card color contributes, including cards after the group head", () => {
  const group = entries("blue", "green", "pink");
  const original = getIntakeGroupGradient(group, medications);
  for (const medication of medications) {
    assert.ok(original.includes(getMedicationColor(medication.color).hex));
  }
  assert.ok(!original.includes(getMedicationColor().hex));

  const changed = getIntakeGroupGradient(
    group,
    medications.map((medication) =>
      medication.id === "pink" ? { ...medication, color: "cyan" } : medication,
    ),
  );
  assert.ok(changed.includes(getMedicationColor("cyan").hex));
  assert.ok(!changed.includes(getMedicationColor("pink").hex));
  assert.notEqual(changed, original);
});

test("repeated colors get proportional angular space without repeated layers", () => {
  const group = entries("blue", "blue", "blue", "green");
  const gradient = getIntakeGroupGradient(group, medications);
  const stops = conicStops(gradient);
  const blend = stops[1].degrees;
  const span = (hex: string) => {
    const held = stops.slice(1, -1).filter((stop) => stop.hex === hex);
    return held[1].degrees - held[0].degrees + 2 * blend;
  };
  assert.equal(span(getMedicationColor("blue").hex), 270);
  assert.equal(span(getMedicationColor("green").hex), 90);
  assert.equal(
    getIntakeGroupGradient(
      Array.from({ length: 1_000 }, () => group).flat(),
      medications,
    ),
    gradient,
  );
  assert.equal(
    (gradient.match(/(?:radial|conic)-gradient\(/g) ?? []).length,
    3,
  );
});

test("all catalog colors remain included while layer count stays bounded", () => {
  const catalog = MEDICATION_COLORS.map((color, index) => ({
    id: String(index),
    color: color.value,
  }));
  const gradient = getIntakeGroupGradient(
    entries(...catalog.map(({ id }) => id)),
    catalog,
  );
  const expected = new Set(MEDICATION_COLORS.map(({ hex }) => hex));
  const actual = new Set(conicStops(gradient).map(({ hex }) => hex));
  assert.deepEqual(actual, expected);
  assert.equal(conicStops(gradient).length, expected.size * 2 + 2);
  assert.equal(
    (gradient.match(/(?:radial|conic)-gradient\(/g) ?? []).length,
    3,
  );
});

test("missing, cleared or unsafe colors use the card's canonical default", () => {
  const gradient = getIntakeGroupGradient(
    entries("missing", "cleared", "unsafe", "unknown"),
    [
      { id: "cleared" },
      { id: "unsafe", color: "red); background: url(https://example.invalid)" },
      { id: "unknown", color: "#123456" },
    ],
  );
  assert.deepEqual(
    new Set(conicStops(gradient).map(({ hex }) => hex)),
    new Set([getMedicationColor().hex]),
  );
  assert.ok(!gradient.includes("url("));
  assert.ok(!gradient.includes("#123456"));
});

test("the cycle blends continuously across its 0/360 boundary", () => {
  const gradient = getIntakeGroupGradient(
    entries("blue", "green", "pink"),
    medications,
  );
  const stops = conicStops(gradient);
  const [before, after] = stops;
  const [beforeNext, afterNext] = stops.slice(-2);
  assert.equal(beforeNext.hex, before.hex);
  assert.equal(afterNext.hex, after.hex);
  assert.equal(beforeNext.degrees - before.degrees, 360);
  assert.equal(afterNext.degrees - after.degrees, 360);
});

test("empty/single groups are valid and input records remain unchanged", () => {
  assert.equal(getIntakeGroupGradient([], medications), "none");
  const group = Object.freeze(
    entries("blue").map((entry) => Object.freeze(entry)),
  );
  const meds = Object.freeze(
    medications.map((medication) => Object.freeze({ ...medication })),
  );
  const gradient = getIntakeGroupGradient(group, meds);
  assert.deepEqual(
    new Set(conicStops(gradient).map(({ hex }) => hex)),
    new Set([getMedicationColor("blue").hex]),
  );
  assert.equal(getIntakeGroupGradient(group, meds), gradient);
});
