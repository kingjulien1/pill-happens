import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmReflectionAcknowledgement,
  createReflectionSaveController,
  ReflectionSaveError,
  reflectionRetryAt,
  reflectionSaveDue,
  type ReflectionSaveAcknowledgement,
  type ReflectionSaveStateInput,
} from "./reflection-save";

const initial: ReflectionSaveStateInput = {
  note: "Draft",
  savedNote: "",
  savedAt: null,
  baseUpdatedAt: null,
  enabled: true,
  busy: false,
  online: true,
};
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function harness(fields: Partial<ReflectionSaveStateInput> = {}) {
  let time = 0;
  let serial = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const requests: {
    note: string;
    expected: string | null;
    resolve: (ack: ReflectionSaveAcknowledgement) => void;
    reject: (error: Error) => void;
  }[] = [];
  const acknowledged: (string | null)[] = [];
  const controller = createReflectionSaveController({
    initial: { ...initial, ...fields },
    now: () => time,
    schedule(callback, delay) {
      const id = ++serial;
      timers.set(id, { at: time + delay, callback });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    cancel(timer) {
      timers.delete(timer as unknown as number);
    },
    send: (note, expected) =>
      new Promise((resolve, reject) =>
        requests.push({ note, expected, resolve, reject }),
      ),
    acknowledge: (stamp) => acknowledged.push(stamp),
  });
  const advance = (ms: number) => {
    const target = time + ms;
    for (let guard = 0; guard < 100; guard++) {
      const next = [...timers]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      time = next[1].at;
      next[1].callback();
    }
    time = target;
  };
  controller.start();
  return { controller, advance, requests, acknowledged };
}

test("debounce, minimum cadence, max-wait and Retry-After parsing", () => {
  assert.equal(reflectionSaveDue(0, 0, 0, -Infinity), 2000);
  assert.equal(reflectionSaveDue(3000, 3000, 0, 2000), 17000);
  assert.equal(reflectionSaveDue(29000, 29000, 0, -Infinity), 30000);
  assert.equal(reflectionRetryAt("30", 1000), 31000);
  assert.equal(
    reflectionRetryAt("Fri, 06 Nov 2026 12:00:00 GMT", 0),
    Date.parse("2026-11-06T12:00:00Z"),
  );
  assert.equal(reflectionRetryAt("invalid", 0), null);
  assert.equal(reflectionRetryAt("-1", 0), null);
  assert.equal(reflectionRetryAt("1e308", 0), null);
});

test("acknowledgements require the exact writing and a valid saved version", () => {
  const updatedAt = "2026-11-06T12:00:00.000Z";
  assert.deepEqual(
    confirmReflectionAcknowledgement("  Raw **writing**\n", {
      note: "  Raw **writing**\n",
      updatedAt,
    }),
    { note: "  Raw **writing**\n", updatedAt },
  );
  assert.deepEqual(confirmReflectionAcknowledgement(" \n ", undefined), {
    note: "",
    updatedAt: null,
  });
  for (const saved of [undefined, { note: "Older writing", updatedAt }])
    assert.throws(
      () => confirmReflectionAcknowledgement("New writing", saved),
      (error: unknown) =>
        error instanceof ReflectionSaveError && error.status === 409,
    );
  assert.throws(
    () =>
      confirmReflectionAcknowledgement("Writing", {
        note: "Writing",
        updatedAt: "invalid",
      }),
    (error: unknown) =>
      error instanceof ReflectionSaveError && error.kind === "network",
  );
});

test("one in-flight request coalesces later edits and acknowledges only its snapshot", async () => {
  const h = harness();
  h.advance(1999);
  await flush();
  assert.equal(h.requests.length, 0);
  h.advance(1);
  await flush();
  assert.equal(h.requests.length, 1);
  h.controller.update({ ...initial, note: "Intermediate" });
  h.controller.update({ ...initial, note: "Newest" });
  h.advance(3000);
  await flush();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ note: "Draft", updatedAt: "v1" });
  await flush();
  assert.equal(h.controller.getSnapshot().status, "pending");
  h.advance(11999);
  await flush();
  assert.equal(h.requests.length, 1);
  h.advance(1);
  await flush();
  assert.equal(h.requests.length, 2);
  assert.deepEqual(
    [h.requests[1].note, h.requests[1].expected],
    ["Newest", "v1"],
  );
  h.requests[1].resolve({ note: "Newest", updatedAt: "v2" });
  await flush();
  assert.equal(h.controller.getSnapshot().status, "saved");
  assert.equal(h.controller.getSnapshot().canSave, false);
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 2);
});

test("unknown legacy drafts require explicit Save, then establish a known base", async () => {
  const h = harness({
    savedNote: "Remote",
    savedAt: "existing",
    baseUpdatedAt: undefined,
  });
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 0);
  assert.equal(h.controller.getSnapshot().status, "review");
  const save = h.controller.save();
  await flush();
  assert.equal(h.requests[0].expected, "existing");
  h.requests[0].resolve({ note: "Draft", updatedAt: "new" });
  await save;
  assert.deepEqual(h.acknowledged, ["new"]);
});

test("a late-restored draft with a stale version pauses instead of publishing", async () => {
  const h = harness({
    note: "Current journal writing",
    savedNote: "Current journal writing",
    savedAt: "current-version",
    baseUpdatedAt: "current-version",
  });
  h.controller.update({
    ...initial,
    note: "Restored local writing",
    savedNote: "Current journal writing",
    savedAt: "current-version",
    baseUpdatedAt: "old-version",
  });
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 0);
  assert.equal(h.controller.getSnapshot().status, "review");
  void h.controller.save();
  await flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].expected, "current-version");
});

test("manual follow-up uses the acknowledged version before provider props catch up", async () => {
  const h = harness();
  h.advance(2000);
  await flush();
  h.controller.update({ ...initial, note: "Next edit" });
  h.requests[0].resolve({ note: "Draft", updatedAt: "acknowledged" });
  await flush();
  void h.controller.save();
  await flush();
  assert.equal(h.requests[1].expected, "acknowledged");
});

test("429 cooldown re-enables manual Save without automatically retrying", async () => {
  const h = harness();
  h.advance(2000);
  await flush();
  h.requests[0].reject(new ReflectionSaveError("Wait", 429, 30000));
  await flush();
  h.controller.update({ ...initial, note: "Latest" });
  h.advance(10000);
  await h.controller.save();
  assert.equal(h.requests.length, 1);
  h.advance(18000);
  await flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.controller.getSnapshot().canSave, true);
  void h.controller.save();
  await flush();
  assert.equal(h.requests.length, 2);
});

test("network failures pause instead of polling, online gives one fresh attempt", async () => {
  const h = harness();
  h.advance(2000);
  await flush();
  h.requests[0].reject(new Error("offline"));
  await flush();
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 1);
  h.controller.online();
  h.advance(0);
  await flush();
  assert.equal(h.requests.length, 2);
  h.requests[1].reject(new Error("still offline"));
  await flush();
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 2);
});

test("a clean draft reset clears a previous fault before the next edit", async () => {
  const h = harness();
  h.advance(2000);
  await flush();
  h.requests[0].reject(new Error("Network failed"));
  await flush();
  assert.equal(h.controller.getSnapshot().status, "error");
  h.controller.update({ ...initial, note: "" });
  assert.equal(h.controller.getSnapshot().status, "saved");
  h.controller.update({ ...initial, note: "Fresh writing" });
  h.advance(15000);
  await flush();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].note, "Fresh writing");
});

test("full-form pause drains a flight and prevents any trailing patch", async () => {
  const h = harness();
  h.advance(2000);
  await flush();
  h.controller.update({ ...initial, note: "Full form snapshot" });
  let drained = false;
  const drain = h.controller.pauseAndDrain().then(() => {
    drained = true;
  });
  await flush();
  assert.equal(drained, false);
  h.requests[0].resolve({ note: "Draft", updatedAt: "v1" });
  await drain;
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 1);
  h.controller.dispose();
  assert.equal(h.acknowledged.length, 1);
});

test("a changed remote note pauses autosave and disposed acknowledgements cannot edit drafts", async () => {
  const h = harness();
  h.controller.update({
    ...initial,
    savedNote: "Other device",
    savedAt: "remote",
  });
  h.advance(100000);
  await flush();
  assert.equal(h.requests.length, 0);
  assert.equal(h.controller.getSnapshot().status, "conflict");
  void h.controller.save();
  await flush();
  h.controller.dispose();
  h.requests[0].resolve({ note: "Draft", updatedAt: "new" });
  await flush();
  assert.deepEqual(h.acknowledged, []);
});

test("save display rejects stale saved snapshots and offline claims without changing save eligibility", async () => {
  const { reflectionSaveDisplay } = await import("./reflection-save");
  const saved = {
    status: "saved" as const,
    canSave: false,
    message: "Writing is up to date in your journal.",
    lastSavedAt: "2026-11-09T12:00:00Z",
  };
  assert.equal(
    reflectionSaveDisplay(saved, "new text", "old text", true).status,
    "pending",
  );
  assert.equal(
    reflectionSaveDisplay(saved, "same", "same", false).status,
    "offline",
  );
  assert.equal(reflectionSaveDisplay(saved, "same", "same", true), saved);
  assert.equal(reflectionSaveDisplay(saved, "  ", "", true), saved);
  assert.equal(
    reflectionSaveDisplay(saved, "new text", "old text", true).canSave,
    false,
  );
  const error = {
    ...saved,
    status: "error" as const,
    canSave: true,
    message: "Try saving again.",
  };
  assert.equal(
    reflectionSaveDisplay(error, "new text", "old text", true),
    error,
  );
});
