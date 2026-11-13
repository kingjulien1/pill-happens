import assert from "node:assert/strict";
import test from "node:test";
import { EMOJI_CATALOG, searchEmoji } from "./emoji-catalog";
import { LUCIDE_ICON_CATALOG, searchLucideIcons } from "./lucide-catalog";
import {
  searchMedicationSymbols,
  SYMBOL_PAGE_SIZE,
  SYMBOL_SOURCE_COUNTS,
  type SymbolSourceFilter,
} from "./medication-symbol-browser";
import { searchSvgIcons, SVG_ICON_CATALOG } from "./svg-icon-catalog";

test("source totals describe the complete catalogs, with custom SVGs included in Icons", () => {
  assert.equal(SYMBOL_PAGE_SIZE, 100);
  assert.deepEqual(SYMBOL_SOURCE_COUNTS, {
    icons: LUCIDE_ICON_CATALOG.length + SVG_ICON_CATALOG.length,
    emojis: EMOJI_CATALOG.length,
    customs: SVG_ICON_CATALOG.length,
  });
  assert.deepEqual(searchMedicationSymbols("", "all"), []);
  assert.deepEqual(searchMedicationSymbols("  \n ", "all"), []);
});

test("every symbol is reachable exactly once across full 100-item browse pages", () => {
  const scopes = {
    icons: [...LUCIDE_ICON_CATALOG, ...SVG_ICON_CATALOG],
    emojis: EMOJI_CATALOG,
    customs: SVG_ICON_CATALOG,
  };
  for (const source of Object.keys(scopes) as (keyof typeof scopes)[]) {
    const expected = scopes[source];
    const results = searchMedicationSymbols("", source);
    const reached = new Set<string>();
    let pageCount = 0;
    for (let offset = 0; offset < results.length; offset += SYMBOL_PAGE_SIZE) {
      const page = results.slice(offset, offset + SYMBOL_PAGE_SIZE);
      assert.equal(
        page.length,
        Math.min(SYMBOL_PAGE_SIZE, expected.length - offset),
        `${source}: page ${pageCount + 1}`,
      );
      for (const { value, label } of page) {
        assert.ok(!reached.has(value), `${source}: duplicate ${value}`);
        assert.ok(label.length > 0, `${source}: missing label for ${value}`);
        reached.add(value);
      }
      pageCount++;
    }
    assert.equal(pageCount, Math.ceil(expected.length / 100), source);
    assert.deepEqual(
      reached,
      new Set(expected.map(({ value }) => value)),
      source,
    );
    assert.deepEqual(searchMedicationSymbols(" \n ", source), results, source);
  }
});

test("browse scopes expose the correct rendering source for each catalog entry", () => {
  const icons = searchMedicationSymbols("", "icons");
  assert.equal(
    icons.filter(({ source }) => source === "Icon").length,
    LUCIDE_ICON_CATALOG.length,
  );
  assert.equal(
    icons.some(({ source }) => source === "Emoji"),
    false,
  );
  const customs = searchMedicationSymbols("", "customs");
  assert.ok(customs.some(({ source }) => source === "SVG"));
  assert.ok(customs.some(({ source }) => source === "Color"));
  for (const entry of SVG_ICON_CATALOG) {
    const result = customs.find(({ value }) => value === entry.value);
    assert.equal(result?.label, entry.label);
    assert.equal(result?.source, entry.variant === "color" ? "Color" : "SVG");
    assert.deepEqual(
      icons.find(({ value }) => value === entry.value),
      result,
    );
  }
  assert.ok(
    searchMedicationSymbols("", "emojis").every(
      ({ source }) => source === "Emoji",
    ),
  );
});

test("broad searches retain matches past the former 96-result limit in every scope", () => {
  const query = "a";
  const lucide = searchLucideIcons(query, Infinity);
  const svgs = searchSvgIcons(query, Infinity);
  const emoji = searchEmoji(query, Infinity);
  assert.ok(lucide.length > 100);
  assert.ok(emoji.length > 100);
  const expected = {
    all: [...lucide, ...svgs, ...emoji],
    icons: [...lucide, ...svgs],
    emojis: emoji,
    customs: svgs,
  };
  for (const source of Object.keys(expected) as SymbolSourceFilter[]) {
    const results = searchMedicationSymbols(query, source);
    const values = results.map(({ value }) => value);
    assert.equal(new Set(values).size, values.length, source);
    assert.deepEqual(
      new Set(values),
      new Set(expected[source].map(({ value }) => value)),
      source,
    );
  }
  assert.ok(
    searchMedicationSymbols(query, "icons").some(
      ({ value }) => value === lucide.at(-1)?.value,
    ),
  );
  assert.ok(
    searchMedicationSymbols(query, "emojis").some(
      ({ value }) => value === emoji.at(-1)?.value,
    ),
  );
});

test("mixed search keeps bucket ranking and interleaves icons, SVGs, then emoji", () => {
  const query = "heart";
  const results = searchMedicationSymbols(query, "all");
  assert.deepEqual(
    results.slice(0, 3).map(({ source }) => source),
    ["Icon", "SVG", "Emoji"],
  );
  assert.equal(results[0].value, "heart");
  assert.equal(results[1].value, "svg:heart-leaf");
  assert.deepEqual(
    results.filter(({ source }) => source === "Icon").map(({ value }) => value),
    searchLucideIcons(query, Infinity).map(({ value }) => value),
  );
  assert.deepEqual(
    results
      .filter(({ source }) => source === "SVG" || source === "Color")
      .map(({ value }) => value),
    searchSvgIcons(query, Infinity).map(({ value }) => value),
  );
  assert.deepEqual(
    results
      .filter(({ source }) => source === "Emoji")
      .map(({ value }) => value),
    searchEmoji(query, Infinity).map(({ value }) => value),
  );
  assert.deepEqual(searchMedicationSymbols(" HEART ", "all"), results);
});

test("literal emoji outside the catalog are offered only in All and Emojis", () => {
  for (const value of ["🫨", "🇦🇹", "1️⃣", "🧑🏽‍💻"]) {
    assert.equal(
      EMOJI_CATALOG.some((entry) => entry.value === value),
      false,
    );
    for (const source of ["all", "emojis"] as const) {
      const results = searchMedicationSymbols(`  ${value}  `, source);
      assert.deepEqual(results[0], {
        value,
        label: "Your emoji",
        source: "Emoji",
      });
      assert.equal(
        results.filter((result) => result.value === value).length,
        1,
      );
    }
    for (const source of ["icons", "customs"] as const)
      assert.ok(
        searchMedicationSymbols(value, source).every(
          (result) => result.value !== value && result.source !== "Emoji",
        ),
      );
  }
  // The keycap remains first while the existing searches still find "1" terms.
  assert.ok(searchMedicationSymbols("1️⃣", "all").length > 1);
});

test("presentation selectors do not duplicate a catalog emoji or replace its label", () => {
  for (const query of ["❤", "❤️", "☘", "☘️"]) {
    for (const source of ["all", "emojis"] as const) {
      const results = searchMedicationSymbols(query, source);
      assert.equal(results.length, 1, `${source}: ${query}`);
      assert.equal(results[0].source, "Emoji");
      assert.notEqual(results[0].label, "Your emoji");
      assert.equal(
        results[0].value.replaceAll("\uFE0F", ""),
        query.replaceAll("\uFE0F", ""),
      );
    }
    for (const source of ["icons", "customs"] as const)
      assert.deepEqual(searchMedicationSymbols(query, source), []);
  }
});

test("stable icon IDs and invalid input cannot enter the literal emoji fallback", () => {
  for (const query of ["pill", "capsule", "svg:color:viagra"]) {
    assert.ok(
      searchMedicationSymbols(query, "all").every(
        ({ value, source }) => value !== query || source !== "Emoji",
      ),
    );
  }
  assert.deepEqual(searchMedicationSymbols("svg:color:viagra", "emojis"), []);
  for (const query of [
    "not-a-symbol-xyz",
    "svg:unknown",
    "<svg/>",
    "https://example.com/icon.svg",
    "💊🌿",
  ]) {
    for (const source of ["all", "icons", "emojis", "customs"] as const) {
      const results = searchMedicationSymbols(query, source);
      assert.ok(
        results.every(
          ({ value, label }) => value !== query && label !== "Your emoji",
        ),
        `${source}: ${query} must never become a saved option`,
      );
      assert.ok(
        results.every(({ value }) =>
          [...LUCIDE_ICON_CATALOG, ...SVG_ICON_CATALOG, ...EMOJI_CATALOG].some(
            (entry) => entry.value === value,
          ),
        ),
        `${source}: ${query} may only find existing catalog entries`,
      );
    }
  }
  assert.deepEqual(searchMedicationSymbols("not-a-symbol-xyz", "all"), []);
  assert.deepEqual(searchMedicationSymbols("💊🌿", "all"), []);
});
