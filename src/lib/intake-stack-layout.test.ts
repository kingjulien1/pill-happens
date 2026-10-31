import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_INTAKE_STACK_VIEW,
  foldIntakeStackSteps,
  layoutIntakeStacks,
  normalizeIntakeStackView,
  promoteIntakeStack,
  showIntakeStackChildren,
} from "./intake-stack-layout";

const entries = Array.from({ length: 12 }, (_, index) => ({
  id: `entry-${index}`,
}));
const heights = Object.fromEntries(entries.map((entry) => [entry.id, 80]));

test("promoting an exact rear preserves order and creates its own full head with a folded suffix", () => {
  const first = promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "entry-3");
  const second = promoteIntakeStack(entries, first, "entry-7");
  const earlier = promoteIntakeStack(entries, second, "entry-5");
  assert.deepEqual(earlier.heads, ["entry-0", "entry-3", "entry-5", "entry-7"]);
  const layout = layoutIntakeStacks({ entries, heights, view: earlier });
  assert.equal(layout.frames.length, entries.length);
  assert.deepEqual(
    layout.frames.map((face) => face.id),
    entries.map((entry) => entry.id),
  );
  for (const index of [0, 3, 5, 7]) {
    assert.equal(layout.frames[index].depth, 0);
    assert.equal(layout.frames[index].scale, 1);
    assert.equal(layout.frames[index].hidden, false);
    assert.equal(layout.frames[index].headId, `entry-${index}`);
  }
  assert.equal(layout.frames[4].headId, "entry-3");
  assert.equal(layout.frames[4].depth, 1);
  assert.equal(layout.frames[6].headId, "entry-5");
  assert.equal(layout.frames[8].headId, "entry-7");
});

test("any number of heads is supported and the six-rear cap resets for each new head", () => {
  const initial = layoutIntakeStacks({
    entries,
    heights,
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  assert.equal(initial.frames[6].hidden, false);
  assert.equal(initial.frames[7].hidden, true);
  const split = promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "entry-6");
  const next = layoutIntakeStacks({ entries, heights, view: split });
  assert.equal(next.frames[7].hidden, false);
  assert.equal(next.frames[7].depth, 1);
  assert.equal(next.frames[11].hidden, false);
  let view = EMPTY_INTAKE_STACK_VIEW;
  for (const entry of entries)
    view = promoteIntakeStack(entries, view, entry.id);
  const full = layoutIntakeStacks({ entries, heights, view });
  assert.equal(view.heads.length, entries.length);
  assert.ok(
    full.frames.every((face) => face.head && !face.hidden && face.scale === 1),
  );
  assert.equal(full.height, entries.length * 80 + (entries.length - 1) * 8);
});

test("shown children can split without folding the earlier portion or changing other heads", () => {
  const shown = showIntakeStackChildren(entries, EMPTY_INTAKE_STACK_VIEW);
  const promoted = promoteIntakeStack(entries, shown, "entry-4");
  assert.deepEqual(promoted.heads, ["entry-0", "entry-4"]);
  assert.deepEqual(promoted.expanded, ["entry-0"]);
  const layout = layoutIntakeStacks({ entries, heights, view: promoted });
  assert.ok(
    layout.frames.slice(0, 4).every((face) => face.scale === 1 && !face.hidden),
  );
  assert.equal(layout.frames[5].expanded, false);
  assert.equal(layout.frames[5].depth, 1);
  assert.equal(layout.frames[11].hidden, true);
});

test("natural card heights define complete folded faces, separate heads, and the real lower edge", () => {
  const measured: Record<string, number> = {
    ...heights,
    "entry-2": 360,
    "entry-6": 240,
  };
  const view = promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "entry-4");
  const layout = layoutIntakeStacks({ entries, heights: measured, view });
  const firstSection = layout.frames.slice(0, 4);
  const lastBottom = Math.max(
    ...firstSection.map((face) => face.y + face.height * face.scale),
  );
  assert.equal(layout.frames[4].y, lastBottom + 8);
  for (const face of layout.frames.filter((face) => !face.hidden)) {
    assert.equal(face.height, measured[face.id]);
    assert.ok(face.y >= 0);
    assert.ok(face.y + face.height * face.scale <= layout.height + 0.0001);
  }
  const allShown = showIntakeStackChildren(entries, view);
  const shownLayout = layoutIntakeStacks({
    entries,
    heights: measured,
    view: allShown,
  });
  assert.equal(
    shownLayout.height,
    Object.values(measured).reduce((sum, value) => sum + value, 0) +
      (entries.length - 1) * 8,
  );
});

test("folding closes shown children before gathering deepest heads, with bounded finite waves", () => {
  let view = promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "entry-3");
  view = promoteIntakeStack(entries, view, "entry-7");
  view = showIntakeStackChildren(entries, view);
  const steps = foldIntakeStackSteps(entries, view);
  assert.deepEqual(
    steps.map((step) => step.stage),
    ["fold-children", "gather", "gather"],
  );
  assert.deepEqual(steps[0].view.heads, ["entry-0", "entry-3", "entry-7"]);
  assert.deepEqual(steps[0].view.expanded, []);
  assert.deepEqual(steps[1].view.heads, ["entry-0", "entry-3"]);
  assert.deepEqual(steps[2].view.heads, ["entry-0"]);
  let from = view;
  for (const step of steps) {
    const layout = layoutIntakeStacks({
      entries,
      heights,
      view: step.view,
      from,
      stage: step.stage,
    });
    assert.ok(layout.duration <= 690);
    assert.ok(
      layout.frames.every((face) => face.delay >= 0 && face.delay <= 270),
    );
    from = step.view;
  }
  const many = Array.from({ length: 200 }, (_, index) => ({
    id: `many-${index}`,
  }));
  const deep = { heads: many.map((entry) => entry.id), expanded: [] };
  const waves = foldIntakeStackSteps(many, deep);
  assert.ok(waves.length <= 6);
  assert.deepEqual(waves.at(-1)?.view.heads, ["many-0"]);
  assert.ok(waves.every((wave) => wave.view.heads[0] === "many-0"));
});

test("presentation normalization handles removed, reordered, duplicate and invalid head IDs", () => {
  const view = normalizeIntakeStackView([entries[4], entries[1], entries[0]], {
    heads: ["entry-0", "entry-1", "missing", "entry-1"],
    expanded: ["entry-1", "missing", "entry-0"],
  });
  assert.deepEqual(view.heads, ["entry-4", "entry-1", "entry-0"]);
  assert.deepEqual(view.expanded, []);
  assert.deepEqual(
    promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "missing"),
    normalizeIntakeStackView(entries, EMPTY_INTAKE_STACK_VIEW),
  );
  assert.deepEqual(foldIntakeStackSteps([], EMPTY_INTAKE_STACK_VIEW), []);
  const empty = layoutIntakeStacks({
    entries: [],
    heights: {},
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  assert.equal(empty.height, 0);
  assert.deepEqual(empty.frames, []);
});

test("group height waits for the last delayed return and reserves expansion space first", () => {
  const split = promoteIntakeStack(entries, EMPTY_INTAKE_STACK_VIEW, "entry-6");
  const folded = foldIntakeStackSteps(entries, split).at(-1)!;
  const previous = layoutIntakeStacks({ entries, heights, view: split });
  const closing = layoutIntakeStacks({
    entries,
    heights,
    view: folded.view,
    from: split,
    stage: folded.stage,
  });
  assert.ok(closing.height < previous.height);
  assert.equal(closing.heightDuration, 420);
  assert.equal(
    closing.heightDelay,
    Math.max(...closing.frames.map((face) => face.delay)),
  );
  assert.equal(closing.duration, closing.heightDelay + closing.heightDuration);
  const progress = (time: number, delay: number, duration: number) =>
    Math.max(0, Math.min(1, (time - delay) / duration));
  // With the same monotone easing, starting the container after every face
  // guarantees that its shrink cannot overtake a delayed returning lower edge.
  for (let time = 0; time <= closing.duration; time += 15) {
    const phase = progress(time, closing.heightDelay, closing.heightDuration);
    const containerHeight =
      previous.height + (closing.height - previous.height) * phase;
    for (const face of closing.frames) {
      const old = previous.frames[face.order];
      if (old.hidden && face.hidden) continue;
      const phase = progress(time, face.delay, 420);
      const oldBottom = old.y + old.height * old.scale;
      const newBottom = face.y + face.height * face.scale;
      assert.ok(
        oldBottom + (newBottom - oldBottom) * phase <= containerHeight + 0.001,
      );
    }
  }
  const shown = showIntakeStackChildren(entries, folded.view);
  const opening = layoutIntakeStacks({
    entries,
    heights,
    view: shown,
    from: folded.view,
    stage: "open",
  });
  assert.equal(opening.heightDelay, 0);
  assert.equal(opening.heightDuration, 420);
});
