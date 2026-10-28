import assert from "node:assert/strict";
import test from "node:test";
import {
  EMOJI_CATALOG,
  normalizeEmojiQuery,
  searchEmoji,
} from "./emoji-catalog";
import { isMedicationIcon } from "./medication-appearance";

test("the local catalog contains unique, valid medication emoji with bilingual metadata", () => {
  assert.ok(EMOJI_CATALOG.length >= 250 && EMOJI_CATALOG.length <= 400);
  assert.equal(
    new Set(EMOJI_CATALOG.map((entry) => entry.value)).size,
    EMOJI_CATALOG.length,
  );
  for (const entry of EMOJI_CATALOG) {
    assert.equal(isMedicationIcon(entry.value), true, entry.value);
    assert.ok(entry.label.trim(), entry.value);
    assert.ok(entry.keywords.length >= 4, entry.label);
    assert.ok(
      entry.keywords.every((keyword) => keyword.trim()),
      entry.label,
    );
  }
});

test("all requested emoji subject groups are searchable in German", () => {
  for (const query of [
    "Natur",
    "Pflanzen",
    "Tiere",
    "Menschen",
    "Hände",
    "Körperteile",
    "Essen",
    "Trinken",
    "Aktivitäten",
    "Sport",
    "Musik",
    "Reise",
    "Transport",
    "Orte",
    "Objekte",
    "Gegenstände",
    "Symbole",
    "Abstrakt",
    "Abstraktes",
  ]) {
    assert.ok(searchEmoji(query).length > 0, query);
  }
});

test("English and German aliases find the same specific emoji", () => {
  for (const [english, german, value] of [
    ["sunflower", "Sonnenblume", "🌻"],
    ["butterfly", "Schmetterling", "🦋"],
    ["pill", "Medikament", "💊"],
    ["bicycle", "Fahrrad", "🚲"],
    ["headphones", "Kopfhörer", "🎧"],
    ["toothbrush", "Zahnbürste", "🪥"],
  ]) {
    assert.ok(searchEmoji(english).some((entry) => entry.value === value));
    assert.ok(searchEmoji(german).some((entry) => entry.value === value));
  }
});

test("search handles accents, German transliteration, case, punctuation and multiple words", () => {
  assert.equal(normalizeEmojiQuery("  GRÜN / Fuß  "), "grun fuss");
  assert.deepEqual(
    searchEmoji("   WHITE   HEART  "),
    searchEmoji("white heart"),
  );
  assert.ok(searchEmoji("grün herz").some((entry) => entry.value === "💚"));
  assert.ok(searchEmoji("GRUEN HERZ").some((entry) => entry.value === "💚"));
  assert.ok(searchEmoji("Kopfhorer").some((entry) => entry.value === "🎧"));
  assert.ok(searchEmoji("Kopfhoerer").some((entry) => entry.value === "🎧"));
  assert.deepEqual(searchEmoji("blue heart"), searchEmoji("blue / heart"));
  assert.ok(
    searchEmoji("blue heart").every((entry) => /heart/i.test(entry.label)),
  );
});

test("pasting an emoji finds it directly, with optional presentation selector", () => {
  assert.equal(searchEmoji("  💊  ")[0]?.value, "💊");
  assert.equal(searchEmoji("❤")[0]?.value, "❤️");
  assert.equal(searchEmoji("❤️")[0]?.value, "❤️");
  assert.equal(searchEmoji("👩‍⚕️")[0]?.value, "👩‍⚕️");
  assert.deepEqual(searchEmoji("💊🌿"), []);
});

test("empty, unmatched and bounded searches return predictable results", () => {
  for (const query of ["", "   ", "/", "not-a-real-emoji-query-xyz"]) {
    assert.deepEqual(searchEmoji(query), [], query);
  }
  assert.ok(searchEmoji("nature").length > 12);
  assert.equal(searchEmoji("nature", 12).length, 12);
  assert.deepEqual(searchEmoji("nature", 0), []);
  assert.deepEqual(searchEmoji("nature", -1), []);
  assert.deepEqual(searchEmoji("nature", Number.NaN), []);
  assert.deepEqual(searchEmoji("💊", 0.5), []);
  assert.equal(searchEmoji("nature", 1.5).length, 1);
  assert.ok(searchEmoji("symbol", Infinity).length > 20);
});
