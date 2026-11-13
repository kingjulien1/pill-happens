import assert from "node:assert/strict";
import test from "node:test";
import { createIntakeStackController } from "./intake-stack-controller";

test("empty registry is stable and bulk operations have no effect", () => {
  const controller = createIntakeStackController();
  const first = controller.getSnapshot();
  controller.toggleAll();
  assert.equal(controller.getSnapshot(), first);
  assert.deepEqual(first, {
    groupCount: 0,
    openCount: 0,
    allOpen: false,
    controls: "",
  });
});

test("mixed disclosures open only closed groups, then all collapse", () => {
  const controller = createIntakeStackController();
  const events: [string, boolean][] = [];
  controller.register({
    id: "a",
    controls: "cards-a",
    open: false,
    changeOpen: (open) => events.push(["a", open]),
  });
  controller.register({
    id: "b",
    controls: "cards-b",
    open: true,
    changeOpen: (open) => events.push(["b", open]),
  });
  assert.equal(controller.getSnapshot().allOpen, false);
  assert.equal(controller.getSnapshot().openCount, 1);
  assert.equal(controller.getSnapshot().controls, "cards-a cards-b");
  controller.toggleAll();
  assert.deepEqual(events, [["a", true]]);
  assert.equal(controller.getSnapshot().allOpen, true);
  controller.toggleAll();
  assert.deepEqual(events, [
    ["a", true],
    ["a", false],
    ["b", false],
  ]);
  assert.equal(controller.getSnapshot().openCount, 0);
});

test("individual intent updates the aggregate without invoking another toggle", () => {
  const controller = createIntakeStackController();
  const events: boolean[] = [];
  controller.register({
    id: "a",
    controls: "cards-a",
    open: false,
    changeOpen: (open) => events.push(open),
  });
  controller.setOpen("a", true);
  assert.equal(controller.getSnapshot().allOpen, true);
  assert.deepEqual(events, []);
  controller.toggleAll();
  assert.deepEqual(events, [false]);
});

test("successive bulk intents reverse immediately without a render or timer", () => {
  const controller = createIntakeStackController();
  const events: boolean[] = [];
  controller.register({
    id: "a",
    controls: "cards-a",
    open: false,
    changeOpen: (open) => events.push(open),
  });
  controller.toggleAll();
  controller.toggleAll();
  controller.toggleAll();
  assert.deepEqual(events, [true, false, true]);
  assert.equal(controller.getSnapshot().allOpen, true);
});

test("new and removed groups keep their own state rather than inheriting a bulk override", () => {
  const controller = createIntakeStackController();
  const removeA = controller.register({
    id: "a",
    controls: "cards-a",
    open: false,
    changeOpen() {},
  });
  controller.toggleAll();
  const removeB = controller.register({
    id: "b",
    controls: "cards-b",
    open: false,
    changeOpen() {},
  });
  assert.equal(controller.getSnapshot().openCount, 1);
  assert.equal(controller.getSnapshot().allOpen, false);
  removeB();
  assert.equal(controller.getSnapshot().allOpen, true);
  assert.equal(controller.getSnapshot().controls, "cards-a");
  removeA();
  assert.equal(controller.getSnapshot().groupCount, 0);
  assert.equal(controller.getSnapshot().controls, "");
});

test("a stale cleanup cannot remove a replacement registration", () => {
  const controller = createIntakeStackController();
  const oldCleanup = controller.register({
    id: "a",
    controls: "old",
    open: false,
    changeOpen() {},
  });
  controller.register({
    id: "a",
    controls: "new",
    open: true,
    changeOpen() {},
  });
  oldCleanup();
  assert.equal(controller.getSnapshot().groupCount, 1);
  assert.equal(controller.getSnapshot().controls, "new");
  assert.equal(controller.getSnapshot().allOpen, true);
});

test("a reversal during dispatch cancels remaining stale callbacks", () => {
  const controller = createIntakeStackController();
  const events: [string, boolean][] = [];
  controller.register({
    id: "a",
    controls: "cards-a",
    open: false,
    changeOpen(open) {
      events.push(["a", open]);
      if (open) controller.toggleAll();
    },
  });
  controller.register({
    id: "b",
    controls: "cards-b",
    open: false,
    changeOpen: (open) => events.push(["b", open]),
  });
  controller.toggleAll();
  assert.deepEqual(events, [
    ["a", true],
    ["a", false],
    ["b", false],
  ]);
  assert.equal(controller.getSnapshot().openCount, 0);
});
