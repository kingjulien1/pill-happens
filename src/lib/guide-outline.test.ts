import assert from "node:assert/strict";
import test from "node:test";
import {
  guideHeadingId,
  guideOutlineEntries,
  searchGuideOutline,
} from "./guide-outline";

test("guide fragments remain readable and stable across punctuation and page namespaces", () => {
  assert.equal(
    guideHeadingId("guide-detail", "Energy & Stress"),
    "guide-detail-energy-stress",
  );
  assert.equal(
    guideHeadingId("developer-detail", "Édits / Backups"),
    "developer-detail-edits-backups",
  );
  assert.equal(
    guideHeadingId("guide-detail", "  Name & Strength! "),
    "guide-detail-name-strength",
  );
});

test("outline preserves source order and real parentage without inventing missing tiers", () => {
  const result = guideOutlineEntries([
    { id: "a", label: "Section A", level: 1 },
    { id: "b", label: "Card", level: 2 },
    { id: "c", label: "  Deeper   Details ", level: 3 },
    { id: "d", label: "Section B", level: 1 },
    { id: "e", label: "Direct leaf", level: 3 },
    { id: "f", label: "Sibling leaf", level: 3 },
    { id: "e", label: "Duplicate fragment", level: 3 },
    { id: "", label: "Not linkable", level: 2 },
  ]);
  assert.deepEqual(
    result.map(({ id, level, parentId }) => ({ id, level, parentId })),
    [
      { id: "a", level: 1, parentId: null },
      { id: "b", level: 2, parentId: "a" },
      { id: "c", level: 3, parentId: "b" },
      { id: "d", level: 1, parentId: null },
      { id: "e", level: 2, parentId: "d" },
      { id: "f", level: 2, parentId: "d" },
    ],
  );
  assert.equal(result[2].label, "Deeper Details");
});

const searchable = guideOutlineEntries([
  { id: "notifications", label: "Notifications", level: 1 },
  { id: "timers", label: "Countdown & Pause", level: 2 },
  { id: "undo", label: "Undo An Edit", level: 2 },
  { id: "colors", label: "Colors & Appearance", level: 1 },
  { id: "cafe", label: "Café Palette", level: 2 },
]);

test("outline search preserves heading context and the original reading order", () => {
  assert.deepEqual(
    searchGuideOutline(searchable, "pause").map(({ id }) => id),
    ["notifications", "timers"],
  );
  assert.deepEqual(
    searchGuideOutline(searchable, "notifications").map(({ id }) => id),
    ["notifications", "timers", "undo"],
  );
});

test("outline search combines parent and child terms without crossing branches", () => {
  assert.deepEqual(
    searchGuideOutline(searchable, "notifications countdown").map(
      ({ id }) => id,
    ),
    ["notifications", "timers"],
  );
  assert.deepEqual(searchGuideOutline(searchable, "colors countdown"), []);
});

test("outline search accepts accents, mixed case and whitespace and leaves its source untouched", () => {
  const previous = structuredClone(searchable);
  assert.deepEqual(
    searchGuideOutline(searchable, "  CAFE   palette ").map(({ id }) => id),
    ["colors", "cafe"],
  );
  assert.deepEqual(searchGuideOutline(searchable, " \n "), searchable);
  assert.deepEqual(searchable, previous);
});
