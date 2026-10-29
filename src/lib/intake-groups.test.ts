import assert from "node:assert/strict";
import test from "node:test";
import type { Intake } from "./domain";
import { groupIntakes } from "./intake-groups";

const savedAt = Date.parse("2026-10-27T12:00:00.000Z");

function intake(
  id: string,
  offsetMs = 0,
  overrides: Partial<Intake> = {},
): Intake {
  return {
    id,
    medicationId: `medication-${id}`,
    medicationName: `Recorded ${id}`,
    medicationForm: "tablet",
    strengthMg: 1,
    quantity: 1,
    takenAt: "2026-10-27T11:00:00.000Z",
    createdAt: new Date(savedAt + offsetMs).toISOString(),
    note: "",
    ...overrides,
  };
}

function memberIds(entries: readonly Intake[]) {
  return groupIntakes(entries).map((group) =>
    group.entries.map(({ id }) => id),
  );
}

test("empty and single-entry timelines retain their natural shape", () => {
  assert.deepEqual(groupIntakes([]), []);
  const entry = intake("one");
  assert.deepEqual(groupIntakes([entry]), [{ id: "one", entries: [entry] }]);
});

test("entries saved together and at exactly five minutes share one window", () => {
  assert.deepEqual(
    memberIds([
      intake("first"),
      intake("same-time"),
      intake("five-minutes", 300_000),
      intake("one-ms-late", 300_001),
    ]),
    [["first", "same-time", "five-minutes"], ["one-ms-late"]],
  );
});

test("the five-minute window is anchored rather than chained by nearby entries", () => {
  assert.deepEqual(
    memberIds([
      intake("zero"),
      intake("four", 240_000),
      intake("eight", 480_000),
      intake("twelve", 720_000),
      intake("sixteen", 960_000),
    ]),
    [["zero", "four"], ["eight", "twelve"], ["sixteen"]],
  );
});

test("save time determines a group even when manually entered intake times differ", () => {
  assert.deepEqual(
    memberIds([
      intake("earlier-intake", 0, { takenAt: "2026-10-26T08:00:00.000Z" }),
      intake("later-intake", 90_000, { takenAt: "2026-10-27T14:00:00.000Z" }),
      intake("saved-later", 600_000, { takenAt: "2026-10-26T08:00:00.000Z" }),
    ]),
    [["earlier-intake", "later-intake"], ["saved-later"]],
  );
});

test("large gaps create independent groups without changing creation order", () => {
  assert.deepEqual(
    memberIds([
      intake("z-first"),
      intake("a-same-time"),
      intake("after-an-hour", 3_600_000),
      intake("after-a-day", 86_400_000),
    ]),
    [["z-first", "a-same-time"], ["after-an-hour"], ["after-a-day"]],
  );
});

test("appending within a window keeps the first entry's stable group identity", () => {
  const first = intake("first");
  const nextWindow = intake("next-window", 600_000);
  const before = groupIntakes([first, nextWindow]);
  const after = groupIntakes([
    first,
    intake("within-first-window", 120_000),
    nextWindow,
    intake("within-next-window", 720_000),
  ]);
  assert.deepEqual(
    before.map(({ id }) => id),
    ["first", "next-window"],
  );
  assert.deepEqual(
    after.map(({ id }) => id),
    before.map(({ id }) => id),
  );
});

test("invalid creation timestamps stay singletons and cannot bridge other groups", () => {
  assert.deepEqual(
    memberIds([
      intake("before"),
      intake("unknown", 0, { createdAt: "not-a-date" }),
      intake("also-unknown", 0, { createdAt: "" }),
      intake("after", 60_000),
      intake("next", 120_000),
    ]),
    [["before"], ["unknown"], ["also-unknown"], ["after", "next"]],
  );
});

test("unexpected backward timestamps split without silently sorting entries", () => {
  assert.deepEqual(
    memberIds([
      intake("two", 120_000),
      intake("four", 240_000),
      intake("three", 180_000),
      intake("five", 300_000),
    ]),
    [
      ["two", "four"],
      ["three", "five"],
    ],
  );
});

test("elapsed save time groups correctly over midnight and DST offset changes", () => {
  for (const [first, second] of [
    ["2026-10-27T23:58:00.000Z", "2026-10-28T00:02:00.000Z"],
    ["2026-03-29T01:58:00.000+01:00", "2026-03-29T03:02:00.000+02:00"],
    ["2026-10-25T02:58:00.000+02:00", "2026-10-25T02:02:00.000+01:00"],
  ]) {
    assert.deepEqual(
      memberIds([
        intake("first", 0, { createdAt: first }),
        intake("second", 0, { createdAt: second }),
      ]),
      [["first", "second"]],
    );
  }
  assert.deepEqual(
    memberIds([
      intake("first", 0, { createdAt: "2026-10-25T02:58:00.000+02:00" }),
      intake("six-minutes-later", 0, {
        createdAt: "2026-10-25T02:04:00.000+01:00",
      }),
    ]),
    [["first"], ["six-minutes-later"]],
  );
});

test("grouping retains separate snapshots and never mutates source records or arrays", () => {
  const first = Object.freeze(
    intake("first", 0, { strengthMg: 2.5, quantity: 0.5, note: "First note" }),
  );
  const second = Object.freeze(
    intake("second", 1_000, {
      strengthMg: 100,
      quantity: 2,
      note: "Other note",
    }),
  );
  const source = Object.freeze([first, second]);
  const snapshot = structuredClone(source);
  const groups = groupIntakes(source);

  assert.equal(groups.length, 1);
  assert.notEqual(groups[0].entries, source);
  assert.equal(groups[0].entries[0], first);
  assert.equal(groups[0].entries[1], second);
  assert.deepEqual(source, snapshot);
  assert.deepEqual(groups[0].entries, snapshot);

  // Returned containers are independent; altering one cannot alter the source
  // timeline or a later derivation. The actual medication snapshots stay intact.
  groups[0].entries.pop();
  assert.equal(source.length, 2);
  assert.equal(groupIntakes(source)[0].entries.length, 2);
  assert.deepEqual(source, snapshot);
});
