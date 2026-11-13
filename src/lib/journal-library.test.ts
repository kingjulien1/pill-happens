import assert from "node:assert/strict";
import test from "node:test";
import { checkInDefaults } from "./check-in-draft";
import type { DailyCheckIn } from "./daily-check-in";
import { reflectionStats } from "./reflection-writing";
import {
  journalEntryEditDraft,
  journalEntryTitle,
  journalLibraryEntries,
} from "./journal-library";

const words = (count: number) =>
  Array.from({ length: count }, (_, index) => `word${index}`).join(" ");
function checkIn(fields: Partial<DailyCheckIn> = {}): DailyCheckIn {
  return {
    day: "2026-11-08",
    period: "evening",
    note: words(101),
    moods: [],
    energy: null,
    stress: null,
    sleepHours: null,
    helped: "",
    createdAt: "2026-11-08T10:00:00Z",
    updatedAt: "2026-11-08T10:00:00Z",
    ...fields,
  };
}

test("only saved reflections strictly above 100 shared word-count words qualify", () => {
  for (const count of [0, 20, 99, 100, 101, 250]) {
    const note = `  ${words(count)}  \n\n`;
    assert.equal(
      journalLibraryEntries([checkIn({ note })]).length,
      count > 100 ? 1 : 0,
    );
  }
  const note = `# A heading\n\n${words(99)}`;
  assert.equal(reflectionStats(note).words, 101);
  assert.equal(journalLibraryEntries([checkIn({ note })]).length, 1);
  assert.deepEqual(journalLibraryEntries(undefined), []);
});

test("both periods remain separate saved pages, including legacy Evening identity", () => {
  const entries = journalLibraryEntries([
    checkIn({ period: "morning" }),
    checkIn({ period: undefined }),
  ]);
  assert.deepEqual(
    entries.map(({ id }) => id),
    ["2026-11-08:evening", "2026-11-08:morning"],
  );
  assert.equal(entries[0].period, "evening");
  assert.equal(entries[1].period, "morning");
  assert.ok(entries.every(({ title }) => !/morning|evening/i.test(title)));
});

test("the latest duplicate wins before eligibility so a removed long note never reappears", () => {
  const old = checkIn({ note: words(180), updatedAt: "2026-11-08T10:00:00Z" });
  const changed = checkIn({
    note: words(20),
    updatedAt: "2026-11-08T11:00:00Z",
  });
  assert.deepEqual(journalLibraryEntries([old, changed]), []);
  assert.deepEqual(journalLibraryEntries([changed, old]), []);
  const morning = checkIn({ period: "morning" });
  assert.equal(
    journalLibraryEntries([old, morning, changed])[0].period,
    "morning",
  );
});

test("pages sort by tracking day, then saved update time, with stable identity ties", () => {
  const entries = journalLibraryEntries([
    checkIn({ day: "2026-11-07", updatedAt: "2026-11-10T14:00:00Z" }),
    checkIn({ period: "morning", updatedAt: "2026-11-08T13:00:00Z" }),
    checkIn({ updatedAt: "2026-11-08T12:00:00Z" }),
    checkIn({
      day: "2026-11-09",
      updatedAt: "bad",
      createdAt: "2026-11-09T08:00:00Z",
    }),
    checkIn({ day: "2026-02-30" }),
  ]);
  assert.deepEqual(
    entries.map(({ id }) => id),
    [
      "2026-11-09:evening",
      "2026-11-08:morning",
      "2026-11-08:evening",
      "2026-11-07:evening",
    ],
  );
});

test("saved Markdown, Unicode and input identities remain unchanged", () => {
  const note = `  # **A little clarity**\n\n${Array.from({ length: 101 }, () => "café").join(" ")}\n\n`;
  const saved = Object.freeze(checkIn({ note }));
  const source = Object.freeze([saved]);
  const entry = journalLibraryEntries(source)[0];
  assert.equal(entry.value, note);
  assert.equal(entry.checkIn, saved);
  assert.equal(entry.title, "A little clarity");
  assert.equal(source[0], saved);
});

test("the first real Markdown heading supplies the title while code and comments do not", () => {
  const note =
    "```md\n# Code sample\n```\n<!--\n# Hidden\n-->\n## A **real** [heading](https://example.com) ##\n# Later";
  assert.equal(journalEntryTitle(note, "2026-11-08"), "A real heading");
  assert.equal(
    journalEntryTitle("A quieter page\n===\ntext", "2026-11-08"),
    "A quieter page",
  );
  assert.equal(
    journalEntryTitle("No heading here", "2026-11-08"),
    "November 8, 2026",
  );
});

test("edit routing changes only writingOpen on a valid unfinished draft", () => {
  const saved = checkIn({ period: "morning" });
  const draft = Object.freeze({
    ...checkInDefaults(saved),
    note: "Unfinished words",
    energy: 4,
    helped: "Walk",
    writingOpen: false,
    reflectionBaseUpdatedAt: "2026-11-07T10:00:00Z",
  });
  const next = journalEntryEditDraft(saved, draft);
  assert.deepEqual(next, { ...draft, writingOpen: true });
  assert.equal(draft.writingOpen, false);
  assert.notEqual(next, draft);
});

test("missing or malformed drafts seed the correct saved entry without inventing responses", () => {
  for (const period of ["morning", "evening"] as const) {
    const saved = checkIn({
      period,
      note: "Saved exact Markdown\n\n",
      bedtime: period === "evening" ? "23:45" : undefined,
    });
    const next = journalEntryEditDraft(saved, { note: "invalid draft" });
    assert.deepEqual(next, {
      ...checkInDefaults(saved, period),
      writingOpen: true,
    });
    assert.equal(next.reflectionBaseUpdatedAt, saved.updatedAt);
  }
});
