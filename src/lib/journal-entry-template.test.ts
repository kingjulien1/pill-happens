import assert from "node:assert/strict";
import test from "node:test";
import { dayKey } from "./domain";
import {
  createJournalEntryTemplate,
  formatJournalEntryHeading,
} from "./journal-entry-template";

test("a new journal begins with one relaxed H1 and its cursor on the empty second line", () => {
  const entry = createJournalEntryTemplate("2026-11-14");
  assert.equal(entry.value, "# Sat, Nov 14 --\n");
  assert.deepEqual(entry.value.split("\n"), ["# Sat, Nov 14 --", ""]);
  assert.equal(entry.selectionStart, entry.value.indexOf("\n") + 1);
  assert.equal(entry.selectionEnd, entry.selectionStart);
  assert.equal(entry.value.slice(entry.selectionStart), "");
});

test("short calendar headings omit the year without losing weekday or month boundaries", () => {
  assert.equal(formatJournalEntryHeading("2027-01-01"), "# Fri, Jan 1 --");
  assert.equal(formatJournalEntryHeading("2028-02-29"), "# Tue, Feb 29 --");
  assert.equal(formatJournalEntryHeading("2026-12-31"), "# Thu, Dec 31 --");
});

test("the explicit tracking day remains authoritative after midnight and the 06:00 rollover", () => {
  const beforeReset = dayKey("2026-11-15T00:30:00.000Z", "Europe/Vienna");
  const afterReset = dayKey("2026-11-15T05:00:00.000Z", "Europe/Vienna");
  assert.equal(beforeReset, "2026-11-14");
  assert.equal(afterReset, "2026-11-15");
  const openEntry = createJournalEntryTemplate(beforeReset);
  assert.equal(openEntry.value, "# Sat, Nov 14 --\n");
  assert.equal(
    createJournalEntryTemplate(afterReset).value,
    "# Sun, Nov 15 --\n",
  );
  assert.equal(createJournalEntryTemplate(beforeReset).value, openEntry.value);
});

test("invalid or normalized dates cannot silently label a journal with another day", () => {
  for (const value of [
    "",
    "2026-02-29",
    "2026-11-31",
    "2026-1-01",
    "not-a-day",
  ])
    assert.throws(() => createJournalEntryTemplate(value), RangeError);
});
