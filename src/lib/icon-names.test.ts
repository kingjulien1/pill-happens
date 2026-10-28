import assert from "node:assert/strict";
import test from "node:test";
import {
  iconSearchText,
  normalizeIconQuery,
  tabletIconLabel,
  toIconComponentName,
} from "./icon-names";

test("tablet labels capitalize words and append mg only to numeric name parts", () => {
  assert.equal(tabletIconLabel("quetialan-100"), "Quetialan 100mg");
  assert.equal(tabletIconLabel("queatialan-25"), "Queatialan 25mg");
  assert.equal(tabletIconLabel("queatialan-200"), "Queatialan 200mg");
  assert.equal(tabletIconLabel("dominal-forte"), "Dominal Forte");
  assert.equal(
    tabletIconLabel("tablet-wideplain-plus"),
    "Tablet Wideplain Plus",
  );
  assert.equal(tabletIconLabel("euthyrox"), "Euthyrox");
  assert.equal(toIconComponentName("queatialan-25"), "Queatialan25");
  assert.equal(toIconComponentName("Four-leaf clover"), "FourLeafClover");
});

test("identity indexing supports component and label spellings without changing keyword boundaries", () => {
  const text = iconSearchText(
    ["quetialan-100", "Quetialan100", "Quetialan 100mg"],
    ["medicine", "yellow"],
  );
  for (const query of [
    "quetialan-100",
    "Quetialan100",
    "Quetialan100mg",
    "Quetialan 100 mg",
  ])
    assert.ok(
      normalizeIconQuery(query)
        .split(" ")
        .every((term) => text.includes(term)),
      query,
    );
  assert.ok(!text.includes("medicineyellow"));
  assert.equal(normalizeIconQuery("  GRÜN / Fuß  "), "grun fuss");
  assert.equal(normalizeIconQuery("sPrÖsSlInG"), "sprossling");
});
