import assert from "node:assert/strict";
import test from "node:test";
import { emptyData, shiftDayKey, type Intake } from "./domain";
import {
  getStreakSpotlight,
  parseStreakSpotlightTarget,
  streakSpotlightHref,
} from "./streak-spotlight";
import { getStreakMilestone, getStreakMilestones } from "./streak-milestones";

test("spotlight selection follows the current run's reached milestone or next early step", () => {
  for (const [current, target, reachedInCurrentRun] of [
    [0, 2, false],
    [1, 2, false],
    [2, 2, true],
    [3, 3, true],
    [4, 4, true],
    [5, 5, true],
    [6, 5, true],
    [7, 7, true],
    [9, 7, true],
    [12, 10, true],
    [14, 13, true],
    [16, 15, true],
    [19, 17, true],
    [24, 20, true],
    [29, 25, true],
    [30, 30, true],
    [34, 30, true],
    [35, 35, true],
    [39, 35, true],
    [40, 40, true],
    [103, 100, true],
  ] as const) {
    assert.deepEqual(getStreakSpotlight({ current }), {
      target,
      reachedInCurrentRun,
      href: `/streaks?spotlight=${target}#milestone-${target}`,
    });
  }
});

test("query parsing accepts only canonical safe targets from the actual milestone sequence", () => {
  for (const target of [
    2, 3, 4, 5, 7, 10, 13, 15, 17, 20, 25, 30, 35, 40, 800, 1_000_000,
    9_007_199_254_740_990,
  ]) {
    assert.equal(parseStreakSpotlightTarget(String(target)), target);
    const href = streakSpotlightHref(target);
    const url = new URL(href, "https://journal.example.test");
    assert.equal(url.pathname, "/streaks");
    assert.equal(url.searchParams.get("spotlight"), String(target));
    assert.equal(url.hash, `#milestone-${target}`);
    assert.equal(url.origin, "https://journal.example.test");
  }
  for (const value of [
    null,
    undefined,
    2,
    true,
    {},
    [],
    ["2"],
    ["2", "3"],
    "",
    "0",
    "1",
    "6",
    "8",
    "9",
    "12",
    "18",
    "29",
    "31",
    "34",
    "36",
    "-5",
    "+5",
    "05",
    " 5",
    "5 ",
    "5\n",
    "5.0",
    "2.5",
    "5e1",
    "0x23",
    "NaN",
    "Infinity",
    "9007199254740995",
    "10000000000000000",
    "9".repeat(1_000),
    "javascript:alert(1)",
    "https://evil.example/35",
    "//evil.example/35",
    "35#other",
    "35&next=https://evil.example",
    "<script>35</script>",
    "%33%35",
  ])
    assert.equal(parseStreakSpotlightTarget(value), null, String(value));
  for (const invalid of [
    -5,
    0,
    1,
    6,
    8,
    31,
    36,
    2.5,
    NaN,
    Infinity,
    9_007_199_254_740_992,
  ]) {
    assert.equal(streakSpotlightHref(invalid), "/streaks");
  }
});

function run(start: string, length: number): Intake[] {
  return Array.from({ length }, (_, index) => {
    const day = shiftDayKey(start, index);
    return {
      id: `${day}-synthetic`,
      medicationId: "synthetic-medication",
      medicationName: "Synthetic medication",
      strengthMg: 1,
      quantity: 1,
      takenAt: `${day}T12:00:00.000Z`,
      createdAt: `${day}T12:00:00.000Z`,
      note: "",
    };
  });
}

test("a shorter current run still spotlights its older milestone outside the latest-three list", () => {
  const data = emptyData();
  const now = new Date("2026-10-31T12:00:00.000Z");
  data.intakes = [...run("2026-09-01", 40), ...run("2026-10-26", 6)];
  const before = structuredClone(data);
  const view = getStreakMilestones(data, now);
  assert.equal(view.streak.best, 40);
  assert.equal(view.streak.current, 6);
  assert.deepEqual(
    view.achieved.map((item) => item.target),
    [40, 35, 30],
  );
  const spotlight = getStreakSpotlight(view.streak);
  assert.equal(spotlight.target, 5);
  assert.equal(spotlight.reachedInCurrentRun, true);
  assert.equal(
    [...view.achieved, ...view.upcoming].some(
      (item) => item.target === spotlight.target,
    ),
    false,
  );
  const extra = getStreakMilestone(data, now, spotlight.target);
  assert.equal(extra?.achieved, true);
  assert.equal(extra?.currentProgress, 5);
  assert.deepEqual(data, before);
});

test("a gap or one-day restart never replaces current progress with the historical best", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");
  for (const current of [0, 1]) {
    const data = emptyData();
    data.intakes = [...run("2026-09-01", 40), ...run("2026-10-31", current)];
    const view = getStreakMilestones(data, now);
    assert.equal(view.streak.best, 40);
    assert.equal(view.streak.current, current);
    assert.deepEqual(getStreakSpotlight(view.streak), {
      target: 2,
      reachedInCurrentRun: false,
      href: "/streaks?spotlight=2#milestone-2",
    });
    // The same milestone may have been earned before the gap. Its historical
    // achievement does not mean it has been reached again in this current run.
    assert.equal(getStreakMilestone(data, now, 2)?.achieved, true);
  }
});

test("a valid navigation target cannot turn an upcoming milestone into an achievement", () => {
  const data = emptyData();
  data.intakes = run("2026-10-26", 6);
  const target = parseStreakSpotlightTarget("100");
  assert.equal(target, 100);
  const milestone = getStreakMilestone(
    data,
    new Date("2026-10-31T12:00:00.000Z"),
    target!,
  );
  assert.equal(milestone?.achieved, false);
  assert.equal(milestone?.achievedOn, null);
  assert.equal(milestone?.analytics, null);
  assert.equal(milestone?.currentProgress, 6);
  assert.equal(milestone?.remaining, 94);
});

test("malformed counts have a deterministic first target and fractional counts match streak rules", () => {
  for (const current of [NaN, Infinity, -Infinity, -1, 9_007_199_254_740_992]) {
    assert.deepEqual(getStreakSpotlight({ current }), {
      target: 2,
      reachedInCurrentRun: false,
      href: "/streaks?spotlight=2#milestone-2",
    });
  }
  assert.equal(getStreakSpotlight({ current: 6.9 }).target, 5);
  const input = { current: 6, best: 40 };
  assert.deepEqual(getStreakSpotlight(input), getStreakSpotlight(input));
  assert.deepEqual(input, { current: 6, best: 40 });
});
