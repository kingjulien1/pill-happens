import assert from "node:assert/strict";
import test from "node:test";
import {
  intakeGroupEntranceStart,
  nextIntakeGroupEntranceState,
  type IntakeGroupEntranceFace,
} from "./intake-group-entrance";

const done = { exposed: true, state: "done" };
const running = (startsAt: number): IntakeGroupEntranceFace => ({
  exposed: true,
  state: "running",
  startsAt,
});
const next = (faces: readonly IntakeGroupEntranceFace[], now: number) =>
  nextIntakeGroupEntranceState({
    current: "pending",
    faces,
    now,
    ready: true,
    settle: false,
  });

test("the frame follows the last reserved stack start by the same 180ms card beat", () => {
  const faces = [running(100), running(280), running(460)];
  assert.equal(intakeGroupEntranceStart(faces), 640);
  assert.equal(next(faces, 639), "pending");
  assert.equal(next(faces, 640), "running");
  // The last card is still well inside its 960ms entrance at this point.
  assert.equal(next(faces, 700), "running");
});

test("late reservations postpone only their own frame beat", () => {
  assert.equal(intakeGroupEntranceStart([running(100), running(280)]), 460);
  const extended = [running(100), running(280), running(640)];
  assert.equal(intakeGroupEntranceStart(extended), 820);
  assert.equal(next(extended, 460), "pending");
  assert.equal(next(extended, 820), "running");
});

test("capped, inaccessible and not-yet-scheduled offscreen cards invent no future beats", () => {
  const faces = [
    running(100),
    running(280),
    { exposed: false, state: "running", startsAt: 10000 },
    { exposed: false, state: "idle" },
    { exposed: true, state: "pending" },
  ];
  assert.equal(intakeGroupEntranceStart(faces), 460);
  assert.equal(next(faces, 460), "running");
});

test("settling or canceling a delayed face releases its future reservation", () => {
  const faces = [running(100), { ...done, startsAt: 10000 }];
  assert.equal(intakeGroupEntranceStart(faces), 280);
  assert.equal(next(faces, 280), "running");
  assert.equal(next([done, done], 0), "running");
});

test("a not-yet-measured, fully hidden or unknown-running stack never invents an entrance", () => {
  for (const faces of [
    [],
    [{ exposed: false, state: "done" }],
    [{ exposed: true, state: "pending" }],
    [{ exposed: true, state: "running" }],
    [running(100), { exposed: true, state: "running", startsAt: NaN }],
  ]) {
    assert.equal(intakeGroupEntranceStart(faces), null);
    assert.equal(next(faces, 10000), "pending");
  }
});

test("a refreshed page cannot start its frame before the loading curtain is gone", () => {
  assert.equal(
    nextIntakeGroupEntranceState({
      current: "pending",
      faces: [running(100), running(280)],
      now: 10000,
      ready: false,
      settle: false,
    }),
    "pending",
  );
  // Moving reservations by the curtain pause retains their unspent local beat.
  const resumed = [running(100 + 2000), running(280 + 2000)];
  assert.equal(next(resumed, 2300), "pending");
  assert.equal(next(resumed, 2460), "running");
});

test("interaction, disclosure, backgrounding and reduced motion release controls immediately", () => {
  for (const current of ["pending", "running", "done"] as const) {
    assert.equal(
      nextIntakeGroupEntranceState({
        current,
        faces: [running(10000)],
        now: 0,
        ready: false,
        settle: true,
      }),
      "done",
    );
  }
});

test("completed frames stay visible after reopening, resize or newly exposed children", () => {
  assert.equal(
    nextIntakeGroupEntranceState({
      current: "done",
      faces: [{ exposed: true, state: "pending" }],
      now: 0,
      ready: true,
      settle: false,
    }),
    "done",
  );
});

test("an active shell is not replayed by measurement changes or a temporary curtain", () => {
  assert.equal(
    nextIntakeGroupEntranceState({
      current: "running",
      faces: [{ exposed: true, state: "pending" }],
      now: 0,
      ready: false,
      settle: false,
    }),
    "running",
  );
});
