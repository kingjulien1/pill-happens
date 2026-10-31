import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_INTAKE_STACK_VIEW,
  foldIntakeStack,
  layoutIntakeStacks,
  normalizeIntakeStackView,
  showIntakeStackChildren,
} from "./intake-stack-layout";

const entries = Array.from({ length: 12 }, (_, index) => ({
  id: "entry-" + index,
}));
const heights = Object.fromEntries(entries.map((entry) => [entry.id, 80]));

test("legacy promoted heads normalize to one root without changing intake order", () => {
  const original = entries.map((entry) => entry.id);
  const view = normalizeIntakeStackView(entries, {
    heads: ["entry-7", "entry-3", "entry-0", "entry-3", "missing"],
    expanded: ["entry-3", "entry-7", "missing"],
  });
  assert.deepEqual(view, { heads: ["entry-0"], expanded: [] });
  const layout = layoutIntakeStacks({ entries, heights, view });
  assert.deepEqual(
    layout.frames.map((face) => face.id),
    original,
  );
  assert.equal(layout.frames.filter((face) => face.head).length, 1);
  assert.ok(layout.frames.every((face) => face.headId === "entry-0"));
  assert.deepEqual(
    entries.map((entry) => entry.id),
    original,
  );
});

test("a saved root disclosure opens the entire group and ignores extra head IDs", () => {
  const view = normalizeIntakeStackView(entries, {
    heads: ["entry-0", "entry-4", "entry-8"],
    expanded: ["entry-0", "entry-4", "entry-0"],
  });
  assert.deepEqual(view, { heads: ["entry-0"], expanded: ["entry-0"] });
  const layout = layoutIntakeStacks({ entries, heights, view });
  assert.ok(layout.frames.every((face) => !face.hidden && face.scale === 1));
  assert.equal(layout.frames.filter((face) => face.head).length, 1);
  assert.equal(layout.height, entries.length * 80 + (entries.length - 1) * 8);
  for (const face of layout.frames) assert.equal(face.y, face.order * 88);
});

test("folded groups retain complete cards with six slightly smaller rear previews", () => {
  const layout = layoutIntakeStacks({
    entries,
    heights,
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  assert.equal(layout.frames.length, entries.length);
  assert.equal(layout.frames[0].head, true);
  assert.equal(layout.frames[0].scale, 1);
  for (const face of layout.frames.slice(1)) {
    assert.equal(face.head, false);
    assert.equal(face.depth, face.order);
    assert.equal(face.hidden, face.order > 6);
    assert.equal(face.scale, 1 - Math.min(face.order, 6) * 0.008);
    assert.equal(face.height, 80);
  }
  assert.equal(layout.height, 80 + 6 * 24);
});

test("Show and Fold affect one complete group and are idempotent", () => {
  const shown = showIntakeStackChildren(entries, {
    heads: ["entry-0", "entry-5"],
    expanded: ["entry-5"],
  });
  assert.deepEqual(shown, { heads: ["entry-0"], expanded: ["entry-0"] });
  assert.deepEqual(showIntakeStackChildren(entries, shown), shown);
  const folded = foldIntakeStack(entries, shown);
  assert.deepEqual(folded, { heads: ["entry-0"], expanded: [] });
  assert.deepEqual(foldIntakeStack(entries, folded), folded);
});

test("natural heights keep complete folded faces and define expanded row positions", () => {
  const measured: Record<string, number> = {
    ...heights,
    "entry-2": 360,
    "entry-6": 240,
  };
  const folded = layoutIntakeStacks({
    entries,
    heights: measured,
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  for (const face of folded.frames.filter((face) => !face.hidden)) {
    assert.equal(face.height, measured[face.id]);
    assert.ok(face.y >= 0);
    assert.ok(face.y + face.height * face.scale <= folded.height + 0.0001);
  }
  const shown = layoutIntakeStacks({
    entries,
    heights: measured,
    view: showIntakeStackChildren(entries, EMPTY_INTAKE_STACK_VIEW),
  });
  assert.equal(
    shown.height,
    Object.values(measured).reduce((sum, value) => sum + value, 0) +
      (entries.length - 1) * 8,
  );
  for (let index = 1; index < shown.frames.length; index += 1) {
    const previous = shown.frames[index - 1];
    assert.equal(shown.frames[index].y, previous.y + previous.height + 8);
  }
});

test("empty, single, removed and reordered groups retain only a valid first entry", () => {
  assert.deepEqual(
    normalizeIntakeStackView([], { heads: ["entry-0"], expanded: ["entry-0"] }),
    EMPTY_INTAKE_STACK_VIEW,
  );
  assert.deepEqual(
    showIntakeStackChildren([entries[0]], EMPTY_INTAKE_STACK_VIEW),
    { heads: ["entry-0"], expanded: [] },
  );
  assert.deepEqual(
    normalizeIntakeStackView([entries[4], entries[1]], {
      heads: ["entry-0", "entry-1", "entry-4"],
      expanded: ["entry-0", "entry-1"],
    }),
    { heads: ["entry-4"], expanded: [] },
  );
  const empty = layoutIntakeStacks({
    entries: [],
    heights: {},
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  assert.equal(empty.height, 0);
  assert.deepEqual(empty.frames, []);
  assert.deepEqual(
    foldIntakeStack([], EMPTY_INTAKE_STACK_VIEW),
    EMPTY_INTAKE_STACK_VIEW,
  );
});

test("unavailable or invalid measurements fall back while real card heights survive", () => {
  const layout = layoutIntakeStacks({
    entries: entries.slice(0, 6),
    heights: {
      "entry-0": NaN,
      "entry-1": -5,
      "entry-2": 0,
      "entry-3": Infinity,
      "entry-4": 34,
    },
    view: EMPTY_INTAKE_STACK_VIEW,
  });
  assert.deepEqual(
    layout.frames.map((face) => face.height),
    [80, 80, 80, 80, 34, 80],
  );
  assert.ok(Number.isFinite(layout.height));
});

test("group height waits for the last returning card and reserves expansion space first", () => {
  const shown = showIntakeStackChildren(entries, EMPTY_INTAKE_STACK_VIEW);
  const folded = foldIntakeStack(entries, shown);
  const previous = layoutIntakeStacks({ entries, heights, view: shown });
  const closing = layoutIntakeStacks({
    entries,
    heights,
    view: folded,
    from: shown,
    stage: "close",
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
  for (let time = 0; time <= closing.duration; time += 15) {
    const phase = progress(time, closing.heightDelay, closing.heightDuration);
    const containerHeight =
      previous.height + (closing.height - previous.height) * phase;
    for (const face of closing.frames) {
      const old = previous.frames[face.order];
      const phase = progress(time, face.delay, 420);
      const oldBottom = old.y + old.height * old.scale;
      const newBottom = face.y + face.height * face.scale;
      assert.ok(
        oldBottom + (newBottom - oldBottom) * phase <= containerHeight + 0.001,
      );
    }
  }
  const opening = layoutIntakeStacks({
    entries,
    heights,
    view: shown,
    from: folded,
    stage: "open",
  });
  assert.equal(opening.heightDelay, 0);
  assert.equal(opening.heightDuration, 420);
});

test("large groups keep a bounded forward opening stagger and reverse closing stagger", () => {
  const many = Array.from({ length: 200 }, (_, index) => ({
    id: "many-" + index,
  }));
  const shown = showIntakeStackChildren(many, EMPTY_INTAKE_STACK_VIEW);
  const folded = foldIntakeStack(many, shown);
  const opening = layoutIntakeStacks({
    entries: many,
    heights: {},
    view: shown,
    from: folded,
    stage: "open",
  });
  const closing = layoutIntakeStacks({
    entries: many,
    heights: {},
    view: folded,
    from: shown,
    stage: "close",
  });
  assert.ok(opening.duration <= 750);
  assert.ok(closing.duration <= 690);
  const openDelays = opening.frames.slice(1).map((face) => face.delay);
  const closeDelays = closing.frames.slice(1).map((face) => face.delay);
  assert.ok(
    openDelays.every(
      (delay, index) => index === 0 || delay >= openDelays[index - 1],
    ),
  );
  assert.ok(
    closeDelays.every(
      (delay, index) => index === 0 || delay <= closeDelays[index - 1],
    ),
  );
  assert.equal(opening.frames.filter((face) => face.head).length, 1);
  const idle = layoutIntakeStacks({ entries: many, heights: {}, view: shown });
  assert.equal(idle.duration, 0);
  assert.equal(idle.heightDuration, 0);
});
