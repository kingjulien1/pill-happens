import assert from "node:assert/strict";
import test from "node:test";
import { getIntakeCardArt } from "./intake-card-art";

test("an intake keeps its curves and animation phase across independent renders", () => {
  const first = getIntakeCardArt("234d1d67-7457-4bac-9b69-9a430660c314");
  getIntakeCardArt("another-intake");
  assert.deepEqual(
    getIntakeCardArt("234d1d67-7457-4bac-9b69-9a430660c314"),
    first,
  );
  first.orbitAngle = 180;
  assert.notEqual(
    getIntakeCardArt("234d1d67-7457-4bac-9b69-9a430660c314").orbitAngle,
    180,
  );
});

test("different intake IDs get varied curves and phases rather than one repeated scene", () => {
  const scenes = Array.from({ length: 100 }, (_, index) =>
    getIntakeCardArt(`synthetic-intake-${index}`),
  );
  assert.equal(
    new Set(scenes.map(({ curveA, curveB }) => curveA + curveB)).size,
    100,
  );
  assert.ok(new Set(scenes.map(({ phaseSeconds }) => phaseSeconds)).size > 50);
  assert.ok(new Set(scenes.map(({ orbitAngle }) => orbitAngle)).size > 30);
});

test("all decorative paths and motion stay bounded and contain only generated numeric geometry", () => {
  const ids = [
    "",
    "💊",
    "<svg onload='bad()'>",
    ...Array.from({ length: 500 }, (_, index) => `synthetic-${index}`),
  ];
  for (const id of ids) {
    const art = getIntakeCardArt(id);
    for (const path of [art.curveA, art.curveB]) {
      assert.match(path, /^M -?\d+ -?\d+(?: C(?: -?\d+){6}){3}$/);
      const coordinates = path.match(/-?\d+/g)!.map(Number);
      for (let index = 0; index < coordinates.length; index += 2) {
        assert.ok(coordinates[index] >= -24 && coordinates[index] <= 388);
        assert.ok(
          coordinates[index + 1] >= -14 && coordinates[index + 1] <= 148,
        );
      }
    }
    assert.ok(art.phaseSeconds >= -24 && art.phaseSeconds <= 0);
    assert.ok(art.orbitAngle >= -24 && art.orbitAngle <= 24);
    assert.ok(art.accentX >= 62 && art.accentX <= 88);
    assert.ok(art.accentY >= 22 && art.accentY <= 78);
    assert.notEqual(art.curveA, art.curveB);
  }
});
