import assert from "node:assert/strict";
import test from "node:test";
import type { Intake } from "./domain";
import { groupIntakes } from "./intake-groups";

const takenAt = Date.parse("2026-10-27T11:00:00.000Z");

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
    takenAt: new Date(takenAt + offsetMs).toISOString(),
    createdAt: "2026-10-27T12:00:00.000Z",
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

test("equal intake times and exactly five minutes share a window, but one millisecond later does not", () => {
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

test("the five-minute window is anchored to its earliest intake rather than chained", () => {
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

test("backfilled intakes taken together group even when created on different days", () => {
  assert.deepEqual(
    memberIds([
      intake("saved-first", 120_000, {
        createdAt: "2026-10-27T12:00:00.000Z",
      }),
      intake("backfilled-later", 0, {
        createdAt: "2026-10-30T12:00:00.000Z",
      }),
    ]),
    [["backfilled-later", "saved-first"]],
  );
});

test("intakes created together split when their taken times are far apart", () => {
  assert.deepEqual(
    memberIds([
      intake("morning"),
      intake("afternoon", 6 * 3_600_000),
      intake("next-day", 86_400_000),
    ]),
    [["morning"], ["afternoon"], ["next-day"]],
  );
});

test("unsorted nonadjacent records become chronological taken-time groups", () => {
  assert.deepEqual(
    memberIds([
      intake("after-a-day", 86_400_000),
      intake("four", 240_000),
      intake("after-an-hour", 3_600_000),
      intake("zero"),
      intake("eight", 480_000),
    ]),
    [["zero", "four"], ["eight"], ["after-an-hour"], ["after-a-day"]],
  );
});

test("equal taken instants preserve source order regardless of IDs and creation time", () => {
  assert.deepEqual(
    memberIds([
      intake("z-first", 0, { createdAt: "2026-10-30T12:00:00.000Z" }),
      intake("a-second", 0, { createdAt: "2026-10-27T12:00:00.000Z" }),
      intake("m-third", 0, { createdAt: "2026-10-28T12:00:00.000Z" }),
    ]),
    [["z-first", "a-second", "m-third"]],
  );
});

test("appending a later intake within a window preserves its earliest member's group identity", () => {
  const first = intake("first");
  const nextWindow = intake("next-window", 600_000);
  const before = groupIntakes([first, nextWindow]);
  const after = groupIntakes([
    intake("within-next-window", 720_000),
    first,
    intake("within-first-window", 120_000),
    nextWindow,
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

test("backdating an intake can reanchor its group without changing the existing records", () => {
  const existing = intake("existing", 120_000);
  assert.equal(groupIntakes([existing])[0].id, "existing");
  const backfilled = intake("backfilled", 0, {
    createdAt: "2026-10-30T12:00:00.000Z",
  });
  const after = groupIntakes([existing, backfilled]);
  assert.equal(after[0].id, "backfilled");
  assert.deepEqual(after[0].entries, [backfilled, existing]);
  assert.equal(existing.takenAt, "2026-10-27T11:02:00.000Z");
});

test("editing time taken regroups the intake immediately without consulting creation time", () => {
  const first = intake("first");
  const second = intake("second", 120_000);
  const later = intake("later", 3_600_000);
  assert.deepEqual(memberIds([first, second, later]), [
    ["first", "second"],
    ["later"],
  ]);
  const edited = { ...second, takenAt: intake("time", 3_660_000).takenAt };
  assert.deepEqual(memberIds([first, edited, later]), [
    ["first"],
    ["later", "second"],
  ]);
  assert.equal(edited.createdAt, second.createdAt);
  assert.equal(second.takenAt, "2026-10-27T11:02:00.000Z");
});

test("invalid taken times remain stable singletons after valid groups without falling back to creation time", () => {
  assert.deepEqual(
    memberIds([
      intake("unknown", 0, { takenAt: "not-a-date" }),
      intake("before"),
      intake("also-unknown", 0, { takenAt: "" }),
      intake("after", 60_000),
      intake("next-window", 600_000),
    ]),
    [["before", "after"], ["next-window"], ["unknown"], ["also-unknown"]],
  );
});

test("malformed creation timestamps do not affect valid taken-time grouping", () => {
  assert.deepEqual(
    memberIds([
      intake("second", 60_000, { createdAt: "not-a-date" }),
      intake("first", 0, { createdAt: "" }),
      intake("outside", 600_000, { createdAt: "invalid" }),
    ]),
    [["first", "second"], ["outside"]],
  );
});

test("elapsed time taken groups correctly over midnight and daylight-saving offset changes", () => {
  for (const [first, second] of [
    ["2026-10-27T23:58:00.000Z", "2026-10-28T00:02:00.000Z"],
    ["2026-03-29T01:58:00.000+01:00", "2026-03-29T03:02:00.000+02:00"],
    ["2026-10-25T02:58:00.000+02:00", "2026-10-25T02:02:00.000+01:00"],
  ]) {
    assert.deepEqual(
      memberIds([
        intake("second", 0, { takenAt: second }),
        intake("first", 0, { takenAt: first }),
      ]),
      [["first", "second"]],
    );
  }
  assert.deepEqual(
    memberIds([
      intake("first", 0, { takenAt: "2026-10-25T02:58:00.000+02:00" }),
      intake("six-minutes-later", 0, {
        takenAt: "2026-10-25T02:04:00.000+01:00",
      }),
    ]),
    [["first"], ["six-minutes-later"]],
  );
});

test("sorting and grouping never mutate source arrays or any recorded intake facts", () => {
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
  const source = Object.freeze([second, first]);
  const snapshot = structuredClone(source);
  const groups = groupIntakes(source);

  assert.equal(groups.length, 1);
  assert.notEqual(groups[0].entries, source);
  assert.equal(groups[0].entries[0], first);
  assert.equal(groups[0].entries[1], second);
  assert.deepEqual(source, snapshot);
  assert.deepEqual(groups[0].entries, [first, second]);

  // Group containers are independent; changing one cannot alter the input or
  // a later derivation. Original medication snapshots remain the same objects.
  groups[0].entries.pop();
  assert.equal(source.length, 2);
  assert.equal(groupIntakes(source)[0].entries.length, 2);
  assert.deepEqual(source, snapshot);
});
