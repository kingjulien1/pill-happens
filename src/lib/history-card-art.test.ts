import assert from "node:assert/strict";
import test from "node:test";
import type { DailyTotal, Medication } from "./domain";
import { getHistoryCardArt } from "./history-card-art";
import { getIntakeCardArt } from "./intake-card-art";
import { getMedicationColor, MEDICATION_COLORS } from "./medication-appearance";
import { getMedicationColorScale } from "./medication-preview-colors";

function medication(id: string, color: Medication["color"]): Medication {
  return {
    id,
    name: `Synthetic ${id}`,
    strengthMg: 1,
    form: "tablet",
    color,
    archived: false,
    createdAt: "2026-10-01T12:00:00.000Z",
  };
}

function total(medicationId: string, count = 1, totalMg = 1): DailyTotal {
  return {
    medicationId,
    medicationName: `Recorded ${medicationId}`,
    count,
    totalMg,
  };
}

const day = "2026-10-27";
const hex = (value: string) => getMedicationColor(value).hex;

test("an empty day uses the legacy fallback without claiming any logged colors", () => {
  const art = getHistoryCardArt(day, [], [medication("unlogged", "purple")]);
  const scale = getMedicationColorScale();
  assert.deepEqual(art.colors, []);
  assert.equal(art.primary, hex("rose"));
  assert.equal(art.secondary, scale.lighter);
  assert.equal(art.tertiary, scale.darker);
});

test("a single medication keeps its pigment and uses only neighboring ramp shades", () => {
  for (const color of [
    "tw-green-500",
    "slate",
    "tw-black",
    "tw-white",
  ] as const) {
    const art = getHistoryCardArt(
      day,
      [total("one")],
      [medication("one", color)],
    );
    const scale = getMedicationColorScale(color);
    assert.deepEqual(art.colors, [hex(color)]);
    assert.equal(art.primary, hex(color));
    assert.equal(art.secondary, scale.lighter);
    assert.equal(art.tertiary, scale.darker);
  }
});

test("mixed days use their actual pigments ranked by intake count, never by milligrams", () => {
  const medications = [
    medication("a", "blue"),
    medication("b", "purple"),
    medication("c", "mint"),
  ];
  const art = getHistoryCardArt(
    day,
    [total("b", 2, 9_999), total("a", 5, 0.25), total("c", 1, 50_000)],
    medications,
  );
  assert.deepEqual(art.colors, [hex("blue"), hex("purple"), hex("mint")]);
  assert.equal(art.primary, hex("blue"));
  assert.equal(art.secondary, hex("purple"));
  assert.equal(art.tertiary, hex("mint"));

  const pair = getHistoryCardArt(day, [total("a"), total("b")], medications);
  assert.equal(pair.tertiary, pair.primary);
  assert.ok(pair.colors.includes(pair.secondary));
});

test("medications sharing a pigment combine their intake counts and occupy one slot", () => {
  const medications = [
    medication("a", "blue"),
    medication("b", "blue"),
    medication("c", "purple"),
  ];
  const art = getHistoryCardArt(
    day,
    [total("c", 3), total("b", 2), total("a", 2)],
    medications,
  );
  assert.deepEqual(art.colors, [hex("blue"), hex("purple")]);
  assert.equal(art.primary, hex("blue"));
});

test("only recorded medication IDs contribute, including archived and missing records", () => {
  const archived = { ...medication("archived", "blue"), archived: true };
  const medications = [
    archived,
    medication("other-day", "tw-fuchsia-400"),
    medication("never-logged", "tw-cyan-300"),
  ];
  const art = getHistoryCardArt(
    day,
    [total("archived", 2), total("removed", 1)],
    medications,
  );
  assert.deepEqual(art.colors, [hex("blue"), hex("rose")]);
  assert.ok(!art.colors.includes(hex("tw-fuchsia-400")));
  assert.ok(!art.colors.includes(hex("tw-cyan-300")));

  // Invalid appearance values on legacy records have the same safe fallback.
  const unknown = medication(
    "unknown",
    "no-longer-valid" as Medication["color"],
  );
  assert.deepEqual(
    getHistoryCardArt(day, [total("unknown")], [unknown]).colors,
    [hex("rose")],
  );
});

test("more than four colors keep the most frequent pigments with stable ID tie breaks", () => {
  const medications = [
    medication("f", "blue"),
    medication("e", "purple"),
    medication("d", "mint"),
    medication("c", "pink"),
    medication("b", "lemon"),
    medication("a", "rose"),
  ];
  const totals = medications.map(({ id }) => total(id, id === "f" ? 4 : 2));
  const expected = [hex("blue"), hex("rose"), hex("lemon"), hex("pink")];
  const art = getHistoryCardArt(day, totals, medications);
  assert.deepEqual(art.colors, expected);
  assert.deepEqual(
    getHistoryCardArt(day, [...totals].reverse(), [...medications].reverse()),
    art,
  );
  // Input arrays and records retain their original order and values.
  assert.deepEqual(
    totals.map(({ medicationId }) => medicationId),
    ["f", "e", "d", "c", "b", "a"],
  );
  assert.ok(totals.every(({ count }) => count === 2 || count === 4));
});

test("a day's geometry stays fixed when counts, dose, or medication appearance change", () => {
  const art = getHistoryCardArt(
    day,
    [total("a", 2), total("b", 1)],
    [medication("a", "blue"), medication("b", "purple")],
  );
  const changed = getHistoryCardArt(
    day,
    [total("b", 10, 5_000), total("a", 1, 0.1)],
    [medication("a", "pink"), medication("b", "mint")],
  );
  assert.notDeepEqual(changed.colors, art.colors);
  assert.deepEqual(changed.curves, art.curves);
  assert.equal(changed.phaseSeconds, art.phaseSeconds);
  assert.equal(changed.orbitAngle, art.orbitAngle);

  const source = getIntakeCardArt(day);
  assert.deepEqual(art.curves, [source.curveA, source.curveB]);
  assert.equal(art.phaseSeconds, source.phaseSeconds);
  assert.equal(art.orbitAngle, source.orbitAngle);
  assert.notDeepEqual(
    getHistoryCardArt("2026-10-26", [], []).curves,
    art.curves,
  );
});

test("all palette and day inputs yield bounded safe decoration without sharing mutable results", () => {
  for (const color of MEDICATION_COLORS) {
    for (const key of [day, "", "💊", "<svg onload='bad()'>"]) {
      const art = getHistoryCardArt(
        key,
        [total("one", Number.NaN)],
        [medication("one", color.value)],
      );
      assert.equal(art.colors.length, 1);
      for (const pigment of [
        ...art.colors,
        art.primary,
        art.secondary,
        art.tertiary,
      ])
        assert.match(pigment, /^#[0-9a-f]{6}$/);
      assert.equal(art.curves.length, 2);
      for (const path of art.curves)
        assert.match(path, /^M -?\d+ -?\d+(?: C(?: -?\d+){6}){3}$/);
      assert.ok(art.phaseSeconds >= -24 && art.phaseSeconds <= 0);
      assert.ok(art.orbitAngle >= -24 && art.orbitAngle <= 24);
    }
  }

  const first = getHistoryCardArt(day, [], []);
  first.colors.push("unsafe");
  first.curves[0] = "unsafe";
  assert.notDeepEqual(getHistoryCardArt(day, [], []), first);
});
