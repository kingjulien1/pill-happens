import assert from "node:assert/strict";
import test from "node:test";
import {
  cardEntrySchedule,
  reserveCardEntryDelays,
  resetCardEntryDelaysIfIdle,
  reserveTimelineCardEntryDelays,
} from "./card-entry-timing";

test("large visible batches keep 280ms between every start", () => {
  const result = cardEntrySchedule(12, 100);
  assert.deepEqual(
    result.delays,
    Array.from({ length: 12 }, (_, i) => i * 280),
  );
  assert.equal(result.nextAvailable, 3460);
});

test("a following controller joins the clock rather than starting simultaneously", () => {
  const first = cardEntrySchedule(3, 100);
  const second = cardEntrySchedule(2, 140, first.nextAvailable);
  assert.deepEqual(first.delays, [0, 280, 560]);
  assert.deepEqual(second.delays, [800, 1080]);
  assert.equal(second.nextAvailable, 1500);
});

test("an elapsed queue starts a later scroll batch immediately", () => {
  assert.deepEqual(cardEntrySchedule(2, 2000, 760), {
    delays: [0, 280],
    nextAvailable: 2560,
  });
});

test("empty and invalid batches do not invent future starts", () => {
  assert.deepEqual(cardEntrySchedule(0, 100), {
    delays: [],
    nextAvailable: 100,
  });
  assert.deepEqual(cardEntrySchedule(-2, 100), {
    delays: [],
    nextAvailable: 100,
  });
  assert.deepEqual(cardEntrySchedule(Infinity, 100), {
    delays: [],
    nextAvailable: 100,
  });
});

test("scope clocks are shared locally and reset only after delayed cards settle", (t) => {
  t.mock.method(performance, "now", () => 100);
  let running = true;
  const scope = {
    querySelector: () => (running ? {} : null),
  } as unknown as Element;
  const first = { closest: () => scope } as unknown as Element;
  const second = { closest: () => scope } as unknown as Element;
  const otherScope = { querySelector: () => null } as unknown as Element;
  const otherRoute = { closest: () => otherScope } as unknown as Element;
  assert.deepEqual(reserveCardEntryDelays(first, 2), [350, 630]);
  assert.deepEqual(reserveCardEntryDelays(second, 1), [910]);
  assert.deepEqual(reserveCardEntryDelays(otherRoute, 1), [350]);
  assert.equal(resetCardEntryDelaysIfIdle(first), false);
  assert.deepEqual(reserveCardEntryDelays(second, 1), [1190]);
  // Focus, backgrounding or reduced motion settles the last reserved face.
  running = false;
  assert.equal(resetCardEntryDelaysIfIdle(first), true);
  assert.deepEqual(reserveCardEntryDelays(second, 2), [0, 280]);
});

type Face = { id: string; stack: Element | null; head: boolean };
const face = (
  id: string,
  stack: Element | null = null,
  head = false,
): Face => ({
  id,
  stack,
  head,
});
const scope = (running: () => boolean = () => true) => {
  const root = {
    closest: () => root,
    querySelector: () => (running() ? {} : null),
  } as unknown as Element;
  return root;
};
const reserve = (
  root: Element,
  faces: readonly Face[],
  rears: WeakMap<Element, number>,
) =>
  reserveTimelineCardEntryDelays(
    root,
    faces,
    (entry) => entry.stack,
    (entry) => entry.head,
    rears,
  );

test("mixed timeline heads keep one cadence while each rear cascade branches from its head", (t) => {
  t.mock.method(performance, "now", () => 100);
  const root = scope(),
    a = {} as Element,
    b = {} as Element;
  const rears = new WeakMap<Element, number>();
  const faces = [
    face("single"),
    face("a-head", a, true),
    face("a-rear1", a),
    face("a-rear2", a),
    face("b-head", b, true),
    face("b-rear", b),
    face("following"),
  ];
  assert.deepEqual(
    reserve(root, faces, rears),
    [350, 630, 910, 1190, 910, 1190, 1190],
  );
  assert.equal(rears.get(a), 1570);
  assert.equal(rears.get(b), 1570);
  assert.deepEqual(reserveCardEntryDelays(root, 1), [1470]);
});

test("one or six rear cards leave every following main start and global reservation identical", (t) => {
  t.mock.method(performance, "now", () => 100);
  for (const count of [1, 6]) {
    const root = scope(),
      a = {} as Element,
      b = {} as Element;
    const faces = [
      face("evening"),
      face("a-head", a, true),
      ...Array.from({ length: count }, (_, index) => face(`a-rear${index}`, a)),
      face("single"),
      face("b-head", b, true),
      face("b-rear", b),
      face("last-single"),
      face("morning"),
    ];
    const delays = reserve(root, faces, new WeakMap());
    assert.deepEqual(
      faces.flatMap((entry, index) =>
        entry.stack === null || entry.head ? [delays[index]] : [],
      ),
      [350, 630, 910, 1190, 1470, 1750],
    );
    assert.deepEqual(
      faces.flatMap((entry, index) =>
        entry.stack === a && !entry.head ? [delays[index]] : [],
      ),
      Array.from({ length: count }, (_, index) => 910 + index * 280),
    );
    assert.deepEqual(reserveCardEntryDelays(root, 1), [2030]);
  }
});

test("late-visible rears continue absolute local reservations without taking a new main slot", (t) => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const root = scope(),
    a = {} as Element,
    b = {} as Element;
  const rears = new WeakMap<Element, number>();
  assert.deepEqual(
    reserve(root, [face("a-head", a, true), face("a-rear", a)], rears),
    [350, 630],
  );
  now = 140;
  assert.deepEqual(
    reserve(
      root,
      [
        face("late-a-rear", a),
        face("b-head", b, true),
        face("b-rear", b),
        face("single"),
      ],
      rears,
    ),
    [870, 590, 870, 870],
  );
  now = 150;
  assert.deepEqual(reserve(root, [face("another-a-rear", a)], rears), [1140]);
  assert.deepEqual(reserveCardEntryDelays(root, 1), [1140]);
});

test("a rear-only batch cannot prolong the global clock even while its own tail is far ahead", (t) => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const root = scope(),
    a = {} as Element;
  const rears = new WeakMap<Element, number>();
  reserve(
    root,
    [
      face("head", a, true),
      ...Array.from({ length: 6 }, (_, index) => face(`rear${index}`, a)),
    ],
    rears,
  );
  now = 140;
  assert.deepEqual(reserve(root, [face("late-rear", a)], rears), [2270]);
  assert.deepEqual(reserve(root, [face("following")], rears), [590]);
});

test("orphan rear faces start locally instead of waiting for an offscreen head or delaying another unit", (t) => {
  t.mock.method(performance, "now", () => 100);
  const root = scope(),
    a = {} as Element,
    b = {} as Element;
  const rears = new WeakMap<Element, number>();
  assert.deepEqual(
    reserve(
      root,
      [face("a-rear1", a), face("a-rear2", a), face("b-rear", b)],
      rears,
    ),
    [0, 280, 0],
  );
  assert.deepEqual(reserve(root, [face("next-main")], rears), [350]);
});

test("a later head never rewinds rear reservations that were already assigned", (t) => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const root = scope(),
    a = {} as Element;
  const rears = new WeakMap<Element, number>();
  assert.deepEqual(
    reserve(root, [face("rear1", a), face("rear2", a)], rears),
    [0, 280],
  );
  now = 140;
  assert.deepEqual(
    reserve(root, [face("head", a, true), face("rear3", a)], rears),
    [350, 630],
  );
  assert.deepEqual(reserveCardEntryDelays(root, 1), [630]);
});

test("settling main faces releases abandoned global starts while retaining an independent rear tail", (t) => {
  let mainRunning = true;
  t.mock.method(performance, "now", () => 100);
  const root = scope(() => mainRunning),
    a = {} as Element;
  const rears = new WeakMap<Element, number>();
  reserve(
    root,
    [face("head", a, true), face("rear1", a), face("rear2", a), face("single")],
    rears,
  );
  assert.equal(resetCardEntryDelaysIfIdle(root), false);
  mainRunning = false;
  assert.equal(resetCardEntryDelaysIfIdle(root), true);
  assert.deepEqual(
    reserve(root, [face("new-main"), face("late-rear", a)], rears),
    [0, 1190],
  );
});

test("separate daily-log scopes and their rear clocks never inherit each other's reservations", (t) => {
  t.mock.method(performance, "now", () => 100);
  const first = scope(),
    second = scope(),
    a = {} as Element;
  const firstRears = new WeakMap<Element, number>(),
    secondRears = new WeakMap<Element, number>();
  reserve(
    first,
    [face("head", a, true), face("rear1", a), face("rear2", a), face("single")],
    firstRears,
  );
  assert.deepEqual(
    reserve(
      second,
      [face("other-head", a, true), face("other-rear", a)],
      secondRears,
    ),
    [350, 630],
  );
  assert.deepEqual(reserveCardEntryDelays(first, 1), [910]);
  assert.deepEqual(reserveCardEntryDelays(second, 1), [630]);
});
