import assert from "node:assert/strict";
import test from "node:test";
import { createDraftWorkspace, safeDraftKey } from "./journal-drafts";
import {
  intakeDraftDisplayTime,
  intakeDraftTimestamp,
  newIntakeFormDraft,
} from "./intake-form-draft";
import {
  hasEditedIntakeTiming,
  INTAKE_TIMING_KEY,
  isIntakeTimingPreference,
  pinnedIntakeTiming,
  originalIntakeTiming,
  withIntakeTiming,
  type IntakeTimingPreference,
} from "./intake-timing";

const now = new Date("2026-11-21T14:28:17Z");
const fresh = () =>
  newIntakeFormDraft({ medications: [], timezone: "Europe/Vienna", now });

test("timing survives intake saves, other draft resets and refresh, with one journal scope", () => {
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  const workspace = createDraftWorkspace("timing_a");
  workspace.hydrate(storage);
  assert.equal(safeDraftKey(INTAKE_TIMING_KEY), true);
  const pin = pinnedIntakeTiming({ ...fresh(), takenAt: "2026-11-20T17:23" });
  workspace.setDraft(INTAKE_TIMING_KEY, pin);
  for (const key of [
    "intake:new:today",
    "intake:edit:entry_a",
    "intake:new:2026-11-20",
  ]) {
    workspace.setDraft(key, fresh());
    workspace.clearDraft(key);
    assert.deepEqual(
      workspace.getSnapshot().drafts[INTAKE_TIMING_KEY].value,
      pin,
    );
  }
  const reopened = createDraftWorkspace("timing_a");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().drafts[INTAKE_TIMING_KEY].value, pin);
  const otherJournal = createDraftWorkspace("timing_b");
  otherJournal.hydrate(storage);
  assert.equal(otherJournal.getSnapshot().drafts[INTAKE_TIMING_KEY], undefined);
  reopened.setDraft(INTAKE_TIMING_KEY, { mode: "automatic" });
  workspace.synchronize();
  assert.deepEqual(workspace.getSnapshot().drafts[INTAKE_TIMING_KEY].value, {
    mode: "automatic",
  });
});

test("a shared pin overrides only timing and retains exact instants through DST and timezone changes", () => {
  const original = {
    ...fresh(),
    initialTimestamp: "2026-10-25T01:30:42Z",
    takenAt: "2026-10-25T02:30",
    medicationId: "first",
    quantity: "2",
  };
  const pin = pinnedIntakeTiming(original);
  const next = { ...fresh(), medicationId: "another", quantity: "0.5" };
  const resolved = withIntakeTiming(next, pin, "America/New_York", now, true);
  assert.equal(resolved.medicationId, "another");
  assert.equal(resolved.quantity, "0.5");
  assert.equal(intakeDraftTimestamp(resolved), "2026-10-25T01:30:42Z");
  assert.equal(
    intakeDraftDisplayTime(resolved, "America/New_York"),
    "2026-10-24T21:30",
  );
  assert.deepEqual(
    pin,
    pinnedIntakeTiming(
      withIntakeTiming(original, pin, "Europe/Vienna", now, false),
    ),
  );
});

test("live time advances without writing drafts; unpinned existing or past-day times stay deliberate", () => {
  const initial = fresh();
  const automatic: IntakeTimingPreference = { mode: "automatic" };
  const later = new Date("2026-11-22T00:03:25Z");
  const live = withIntakeTiming(
    initial,
    automatic,
    "Europe/Vienna",
    later,
    true,
  );
  assert.equal(live.takenAt, "2026-11-22T01:03");
  assert.equal(intakeDraftTimestamp(live), later.toISOString());
  assert.equal(
    withIntakeTiming(initial, automatic, "Europe/Vienna", later, false),
    initial,
  );
  assert.equal(hasEditedIntakeTiming(initial), false);
  assert.equal(
    hasEditedIntakeTiming({ ...initial, takenAt: "2026-11-19T10:00" }),
    true,
  );
  assert.equal(hasEditedIntakeTiming({ ...initial, takenAt: "T" }), true);
});

test("partial input remains restorable while malformed timing is rejected", () => {
  assert.equal(isIntakeTimingPreference({ mode: "automatic" }), true);
  assert.equal(
    isIntakeTimingPreference(
      pinnedIntakeTiming({ ...fresh(), takenAt: "2026-11-20T" }),
    ),
    true,
  );
  for (const value of [
    null,
    [],
    { mode: "pinned" },
    { ...pinnedIntakeTiming(fresh()), timezone: "no/such-zone" },
    { ...pinnedIntakeTiming(fresh()), initialTimestamp: "not a date" },
    { mode: "surprise" },
  ])
    assert.equal(isIntakeTimingPreference(value), false);
});

test("releasing a pin supersedes old manual timing without erasing the rest of an intake draft", () => {
  const legacy = {
    ...fresh(),
    takenAt: "2026-11-19T08:00",
    medicationId: "med_a",
    quantity: "1.5",
  };
  const released = originalIntakeTiming(legacy, "2026-11-18T10:00:37Z");
  assert.equal(hasEditedIntakeTiming(released), false);
  assert.equal(released.takenAt, "2026-11-18T11:00");
  assert.equal(released.medicationId, "med_a");
  assert.equal(released.quantity, "1.5");
  assert.equal(intakeDraftTimestamp(released), "2026-11-18T10:00:37Z");
});
