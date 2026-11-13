import assert from "node:assert/strict";
import test from "node:test";
import {
  createDraftWorkspace,
  safeDraftKey,
  safeRememberedDialog,
  safeWorkspaceHash,
  safeWorkspacePath,
  shouldRestoreLastScreen,
  DRAFT_STORAGE_LIMITS,
  CHECK_IN_OPENED_AT_LIMIT,
  type DraftStorage,
} from "./journal-drafts";
import {
  checkInDefaults,
  checkInDraftKey,
  isCheckInDraft,
} from "./check-in-draft";
import { DAILY_REFLECTION_MAX_LENGTH } from "./daily-check-in";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

test("first check-in opening survives saves, reset, close, reload and later reopening without becoming content", (t) => {
  let now = Date.parse("2026-11-11T07:04:00Z");
  t.mock.method(Date, "now", () => now);
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("first_open");
  workspace.hydrate(storage);
  const dialog = {
    kind: "check-in",
    day: "2026-11-11",
    period: "morning",
  } as const;
  const identity = checkInDraftKey(dialog.day, dialog.period);
  workspace.openDialog("/", dialog);
  const firstOpened = now;
  assert.equal(workspace.getSnapshot().checkInOpenedAt[identity], firstOpened);
  assert.deepEqual(workspace.getSnapshot().drafts, {});

  now += 60_000;
  workspace.setDraft(identity, {
    ...checkInDefaults(),
    note: "A new morning.",
  });
  workspace.clearDraft(identity);
  workspace.closeDialog("/");
  now += 60_000;
  workspace.openDialog("/", dialog);
  assert.equal(workspace.getSnapshot().checkInOpenedAt[identity], firstOpened);
  workspace.closeDialog("/");

  const reopened = createDraftWorkspace("first_open");
  reopened.hydrate(storage);
  now += 60_000;
  reopened.openDialog("/", dialog);
  assert.equal(reopened.getSnapshot().checkInOpenedAt[identity], firstOpened);
  assert.deepEqual(reopened.getSnapshot().drafts, {});
  assert.equal(reopened.getSnapshot().status, "saved");
});

test("first-open observations are independent by period, tracking day and journal", (t) => {
  let now = Date.parse("2026-11-11T07:04:00Z");
  t.mock.method(Date, "now", () => now);
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("first_open_periods");
  workspace.hydrate(storage);
  const expected: Record<string, number> = {};
  for (const [day, period] of [
    ["2026-11-10", "morning"],
    ["2026-11-10", "evening"],
    ["2026-11-11", "morning"],
    ["2026-11-11", "evening"],
  ] as const) {
    now += 60_000;
    workspace.openDialog("/", { kind: "check-in", day, period });
    expected[checkInDraftKey(day, period)] = now;
  }
  now += 60_000;
  workspace.openDialog("/", { kind: "check-in", day: "2026-11-11" });
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, expected);
  const other = createDraftWorkspace("first_open_another_journal");
  other.hydrate(storage);
  assert.deepEqual(other.getSnapshot().checkInOpenedAt, {});
});

test("legacy restored dialogs record the current actual observation, never old save or dormant screen times", (t) => {
  const now = Date.parse("2026-11-11T07:04:00Z");
  t.mock.method(Date, "now", () => now);
  const storage = memoryStorage();
  const key = "pill-happens:workspace:v1:legacy_open";
  const oldTime = now - 86_400_000;
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      scope: "legacy_open",
      drafts: {
        "checkin:2026-11-10": { value: checkInDefaults(), updatedAt: oldTime },
      },
      screens: {
        "/": {
          dialog: { kind: "check-in", day: "2026-11-11", period: "morning" },
          updatedAt: oldTime,
        },
        "/history/2026-11-10": {
          dialog: { kind: "check-in", day: "2026-11-10" },
          updatedAt: oldTime,
        },
      },
      lastPath: "/",
    }),
  );
  const workspace = createDraftWorkspace("legacy_open");
  workspace.hydrate(storage);
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, {});
  assert.equal(workspace.getSnapshot().status, "saved");
  workspace.setLocation("/", "", 0);
  workspace.completeBootstrap();
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, {
    "checkin:2026-11-11:morning": now,
  });
  const restored = createDraftWorkspace("legacy_open");
  restored.hydrate(storage);
  assert.deepEqual(
    restored.getSnapshot().checkInOpenedAt,
    workspace.getSnapshot().checkInOpenedAt,
  );
  assert.equal(
    restored.getSnapshot().drafts["checkin:2026-11-10"].updatedAt,
    oldTime,
  );
});

test("invalid dialog identities and invalid observation clocks do not create first-open metadata", (t) => {
  const workspace = createDraftWorkspace("guard_open");
  workspace.hydrate(memoryStorage());
  for (const day of ["2026-02-30", "not-a-day", "2026-13-11"]) {
    workspace.openDialog("/", { kind: "check-in", day });
  }
  workspace.openDialog("/history/2026-02-30", {
    kind: "check-in",
    day: "2026-11-11",
  });
  workspace.openDialog("/", {
    kind: "check-in",
    day: "2026-11-11",
    period: "afternoon",
  } as never);
  workspace.openDialog("/medications", { kind: "medication-new" });
  const clock = t.mock.method(Date, "now", () => Number.NaN);
  for (const value of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    0,
    1.5,
    253_402_300_800_000,
  ]) {
    clock.mock.mockImplementation(() => value);
    workspace.openDialog("/", { kind: "check-in", day: "2026-11-11" });
  }
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, {});
  assert.deepEqual(workspace.getSnapshot().drafts, {});
});

test("damaged first-open metadata is isolated from valid observations and saved drafts", () => {
  const storage = memoryStorage();
  const timestamp = Date.parse("2026-11-11T07:04:00Z");
  const key = "pill-happens:workspace:v1:damaged_open";
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      scope: "damaged_open",
      drafts: {
        "med:new": { value: { name: "Preserved" }, updatedAt: timestamp },
      },
      screens: {},
      checkInOpenedAt: {
        "checkin:2026-11-11:morning": timestamp,
        "checkin:2026-11-11": timestamp + 1,
        "checkin:2026-11-11:evening": timestamp,
        "checkin:2026-11-11:afternoon": timestamp,
        "checkin:2026-02-30": timestamp,
        "med:new": timestamp,
        "checkin:2026-11-10": "2026-11-10T08:00:00Z",
        "checkin:2026-11-09": -1,
        "checkin:2026-11-08": 0,
        "checkin:2026-11-07": 1.5,
        "checkin:2026-11-06": 253_402_300_800_000,
        "checkin:2026-11-05": null,
      },
    }),
  );
  const workspace = createDraftWorkspace("damaged_open");
  workspace.hydrate(storage);
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, {
    "checkin:2026-11-11:morning": timestamp,
    "checkin:2026-11-11": timestamp + 1,
  });
  assert.equal(workspace.getSnapshot().status, "error");
  assert.deepEqual(workspace.getSnapshot().drafts["med:new"].value, {
    name: "Preserved",
  });
});

test("first-open history is bounded without evicting earlier observations to record a new one", () => {
  const storage = memoryStorage();
  const start = Date.parse("2000-01-01T12:00:00Z");
  const observations = Object.fromEntries(
    Array.from({ length: CHECK_IN_OPENED_AT_LIMIT }, (_, index) => {
      const timestamp = start + index * 86_400_000;
      return [
        checkInDraftKey(new Date(timestamp).toISOString().slice(0, 10)),
        timestamp,
      ];
    }),
  );
  storage.setItem(
    "pill-happens:workspace:v1:bounded_open",
    JSON.stringify({
      version: 1,
      scope: "bounded_open",
      drafts: {},
      screens: {},
      checkInOpenedAt: observations,
    }),
  );
  const workspace = createDraftWorkspace("bounded_open");
  workspace.hydrate(storage);
  assert.equal(workspace.getSnapshot().status, "saved");
  workspace.openDialog("/", { kind: "check-in", day: "2026-11-11" });
  assert.equal(workspace.getSnapshot().status, "error");
  assert.deepEqual(workspace.getSnapshot().checkInOpenedAt, observations);
  assert.equal(
    workspace.getSnapshot().checkInOpenedAt["checkin:2026-11-11"],
    undefined,
  );

  const raw = JSON.parse(
    storage.getItem("pill-happens:workspace:v1:bounded_open")!,
  );
  raw.checkInOpenedAt["checkin:2026-11-11"] = Date.parse(
    "2026-11-11T07:00:00Z",
  );
  storage.setItem(
    "pill-happens:workspace:v1:bounded_open",
    JSON.stringify(raw),
  );
  const overLimit = createDraftWorkspace("bounded_open");
  overLimit.hydrate(storage);
  assert.equal(overLimit.getSnapshot().status, "error");
  assert.deepEqual(overLimit.getSnapshot().checkInOpenedAt, observations);
});

test("first-open metadata remains usable in memory when browser storage is unavailable", (t) => {
  const now = Date.parse("2026-11-11T07:04:00Z");
  t.mock.method(Date, "now", () => now);
  for (const storage of [
    null,
    {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota");
      },
    },
  ]) {
    const workspace = createDraftWorkspace("memory_open");
    workspace.hydrate(storage);
    workspace.openDialog("/", { kind: "check-in", day: "2026-11-11" });
    workspace.closeDialog("/");
    workspace.clearDraft("checkin:2026-11-11");
    assert.equal(
      workspace.getSnapshot().checkInOpenedAt["checkin:2026-11-11"],
      now,
    );
    assert.equal(workspace.getSnapshot().status, storage ? "error" : "memory");
  }
});

test("Journal is a durable screen without admitting check-in dialogs on the collection route", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("synthetic_journal_collection");
  first.hydrate(storage);
  assert.equal(safeWorkspacePath("/journal"), "/journal");
  assert.equal(safeWorkspacePath("/journal/anything"), null);
  first.setLocation("/journal", "", 284);
  const reopened = createDraftWorkspace("synthetic_journal_collection");
  reopened.hydrate(storage);
  assert.equal(reopened.getSnapshot().lastPath, "/journal");
  assert.equal(reopened.getSnapshot().screens["/journal"].scrollY, 284);
  assert.equal(
    shouldRestoreLastScreen({
      pathname: "/",
      search: "",
      hash: "",
      savedPath: "/journal",
      guidePending: false,
    }),
    true,
  );
  assert.equal(
    safeRememberedDialog(
      { kind: "check-in", day: "2026-11-06", period: "morning" },
      "/journal",
    ),
    null,
  );
});

test("Morning and legacy Evening keep independent full-length drafts after reload and reset", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("synthetic_morning_journal");
  first.hydrate(storage);
  const morning = checkInDraftKey("2026-10-30", "morning");
  const evening = checkInDraftKey("2026-10-30");
  const morningValue = {
    ...checkInDefaults(),
    note: "朝".repeat(DAILY_REFLECTION_MAX_LENGTH),
    writingOpen: true,
  };
  const eveningValue = {
    ...checkInDefaults(),
    note: "夜".repeat(DAILY_REFLECTION_MAX_LENGTH),
    moods: ["calm"],
  };
  assert.equal(first.setDraft(morning, morningValue), true);
  assert.equal(first.setDraft(evening, eveningValue), true);
  const reopened = createDraftWorkspace("synthetic_morning_journal");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().drafts[morning].value, morningValue);
  assert.deepEqual(reopened.getSnapshot().drafts[evening].value, eveningValue);
  reopened.clearDraft(morning);
  const afterReset = createDraftWorkspace("synthetic_morning_journal");
  afterReset.hydrate(storage);
  assert.equal(afterReset.getSnapshot().drafts[morning], undefined);
  assert.deepEqual(
    afterReset.getSnapshot().drafts[evening].value,
    eveningValue,
  );
});

test("Morning dialog restores its period and stale completions cannot close the other period", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("synthetic_morning_journal");
  first.hydrate(storage);
  const morning = {
    kind: "check-in",
    day: "2026-10-30",
    period: "morning",
  } as const;
  const evening = { kind: "check-in", day: "2026-10-30" } as const;
  first.openDialog("/", morning);
  const reopened = createDraftWorkspace("synthetic_morning_journal");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().screens["/"].dialog, morning);
  reopened.closeDialog(
    "/",
    evening,
    reopened.getSnapshot().screens["/"].dialogInstance,
  );
  assert.deepEqual(reopened.getSnapshot().screens["/"].dialog, morning);
  reopened.openDialog("/", evening);
  reopened.closeDialog(
    "/",
    morning,
    reopened.getSnapshot().screens["/"].dialogInstance,
  );
  assert.deepEqual(reopened.getSnapshot().screens["/"].dialog, evening);
  reopened.closeDialog(
    "/",
    { ...evening, period: "evening" },
    reopened.getSnapshot().screens["/"].dialogInstance,
  );
  assert.equal(reopened.getSnapshot().screens["/"].dialog, null);
  assert.deepEqual(
    safeRememberedDialog({ ...morning, period: "evening" }, "/"),
    evening,
  );
  for (const period of ["noon", "", null, 1])
    assert.equal(safeRememberedDialog({ ...morning, period }, "/"), null);
  for (const key of [
    "checkin:2026-02-30:morning",
    "checkin:2026-10-30:noon",
    "intake:new:2026-10-30:morning",
  ])
    assert.equal(safeDraftKey(key), false);
});

test("Morning dialog and both writing panes restore scroll independently from Evening", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("synthetic_morning_journal");
  first.hydrate(storage);
  const keys = ["", ":writing-source", ":writing-preview"].flatMap((suffix) =>
    ["morning", "evening"].map(
      (period) =>
        `/|${checkInDraftKey("2026-10-30", period as "morning" | "evening")}${suffix}:body`,
    ),
  );
  keys.forEach((key, index) =>
    assert.equal(
      first.setDialogScroll(key, { top: 70 + index * 110, left: 0 }),
      true,
    ),
  );
  const reopened = createDraftWorkspace("synthetic_morning_journal");
  reopened.hydrate(storage);
  keys.forEach((key, index) =>
    assert.equal(reopened.getSnapshot().scrollViews[key].top, 70 + index * 110),
  );
  assert.equal(new Set(keys).size, 6);
});

test("unfinished raw inputs and open dialogs survive a fresh authenticated workspace", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_a");
  first.hydrate(storage);
  assert.deepEqual(first.getSnapshot().drafts, {});
  assert.equal(
    storage.entries.size,
    0,
    "untouched initial defaults are never saved",
  );
  const value = {
    quantity: "",
    takenAt: "2026-10-31T",
    note: "Half a thought",
    search: "moon",
  };
  first.setDraft("intake:new:today", value);
  first.setLocation("/", "", 142);
  first.openDialog("/", { kind: "intake-new" });
  value.note = "An outside mutation must not change the saved draft";
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().drafts["intake:new:today"].value, {
    quantity: "",
    takenAt: "2026-10-31T",
    note: "Half a thought",
    search: "moon",
  });
  assert.deepEqual(reopened.getSnapshot().screens["/"].dialog, {
    kind: "intake-new",
  });
  assert.equal(reopened.getSnapshot().screens["/"].scrollY, 142);
  assert.equal(reopened.getSnapshot().status, "saved");
});

test("journal namespaces isolate drafts, routes, and dialogs without credential data", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_a");
  first.hydrate(storage);
  first.setDraft("med:new", { name: "Unfinished" });
  first.openDialog("/medications", { kind: "medication-new" });
  const other = createDraftWorkspace("journal_b");
  other.hydrate(storage);
  assert.deepEqual(other.getSnapshot().drafts, {});
  assert.equal(other.getSnapshot().lastPath, "/");
  assert.deepEqual(other.getSnapshot().screens, {});
  assert.equal(other.setDraft("password", { password: "1234" }), false);
  assert.equal(other.setDraft("med:new", { password: "1234" }), false);
  assert.equal(other.setDraft("preferences", { token: "sensitive" }), false);
  assert.equal(JSON.stringify([...storage.entries]).includes("1234"), false);
});

test("closing a dialog retains fields; only explicit successful-save cleanup removes a draft", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  workspace.setDraft("med:new", { name: "Saved later" });
  workspace.setDraft("goal:new", { target: "2" });
  workspace.openDialog("/medications", { kind: "medication-new" });
  workspace.closeDialog("/medications");
  assert.ok(workspace.getSnapshot().drafts["med:new"]);
  workspace.clearDraft("med:new");
  workspace.flush();
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.equal(reopened.getSnapshot().drafts["med:new"], undefined);
  assert.deepEqual(reopened.getSnapshot().drafts["goal:new"].value, {
    target: "2",
  });
  assert.equal(reopened.getSnapshot().screens["/medications"].dialog, null);
});

test("blocked browser storage and quota errors keep current inputs in memory without claiming durability", () => {
  const denied: DraftStorage = {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage blocked");
    },
  };
  const blocked = createDraftWorkspace("journal_a");
  blocked.hydrate(denied);
  blocked.setDraft("med:new", { name: "Still editable" });
  assert.equal(blocked.getSnapshot().status, "memory");
  assert.deepEqual(blocked.getSnapshot().drafts["med:new"].value, {
    name: "Still editable",
  });
  const full = createDraftWorkspace("journal_b");
  full.hydrate({
    getItem: () => null,
    setItem() {
      throw new Error("Quota exceeded");
    },
  });
  assert.equal(full.setDraft("med:new", { name: "Keep this" }), false);
  assert.equal(full.getSnapshot().status, "error");
  assert.deepEqual(full.getSnapshot().drafts["med:new"].value, {
    name: "Keep this",
  });
  full.flush();
  assert.ok(full.getSnapshot().drafts["med:new"]);
});

test("ordinary draft byte limits retain oversized edits in memory and cannot be bypassed by later route writes", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  const overhead = Buffer.byteLength(JSON.stringify({ note: "" }), "utf8");
  const accepted = { note: "x".repeat(DRAFT_STORAGE_LIMITS.draft - overhead) };
  assert.equal(workspace.setDraft("med:new", accepted), true);
  const durable = [...storage.entries.values()][0];
  const edited = { note: `${accepted.note}終` };
  assert.equal(workspace.setDraft("med:new", edited), false);
  assert.deepEqual(workspace.getSnapshot().drafts["med:new"].value, edited);
  assert.equal(workspace.getSnapshot().status, "error");
  workspace.setLocation("/medications", "", 12);
  workspace.flush();
  assert.equal(workspace.getSnapshot().status, "error");
  assert.equal(
    [...storage.entries.values()][0],
    durable,
    "over-budget memory must not overwrite the last durable copy",
  );
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().drafts["med:new"].value, accepted);
  assert.equal(
    workspace.setDraft("med:new", { note: "Edited down, safely." }),
    true,
  );
  assert.equal(workspace.getSnapshot().status, "saved");
});

test("multibyte text uses UTF-8 budgets, with the larger allowance confined to check-in drafts", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  const ordinary = { note: "静".repeat(30_000) };
  assert.ok(JSON.stringify(ordinary).length < DRAFT_STORAGE_LIMITS.draft);
  assert.ok(
    Buffer.byteLength(JSON.stringify(ordinary), "utf8") >
      DRAFT_STORAGE_LIMITS.draft,
  );
  assert.equal(workspace.setDraft("med:new", ordinary), false);
  assert.deepEqual(workspace.getSnapshot().drafts["med:new"].value, ordinary);
  workspace.clearDraft("med:new");
  const long = {
    ...checkInDefaults(),
    note: "静".repeat(DAILY_REFLECTION_MAX_LENGTH),
    writingOpen: true,
  };
  assert.equal(isCheckInDraft(long), true);
  assert.equal(workspace.setDraft("checkin:2026-10-30", long), true);
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(
    reopened.getSnapshot().drafts["checkin:2026-10-30"].value,
    long,
  );
});

test("the check-in-specific serialized byte budget has the same exact boundary when saving and reopening", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  // The generic workspace accepts JSON values; form-specific note validation
  // separately enforces the100,000-character reflection limit.
  const overhead = Buffer.byteLength(JSON.stringify({ note: "" }), "utf8");
  const value = {
    note: "x".repeat(DRAFT_STORAGE_LIMITS.checkInDraft - overhead),
  };
  assert.equal(workspace.setDraft("checkin:2026-10-30", value), true);
  const [key, durable] = [...storage.entries][0];
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(
    reopened.getSnapshot().drafts["checkin:2026-10-30"].value,
    value,
  );
  const oversized = { note: `${value.note}x` };
  assert.equal(workspace.setDraft("checkin:2026-10-30", oversized), false);
  assert.deepEqual(
    workspace.getSnapshot().drafts["checkin:2026-10-30"].value,
    oversized,
  );
  assert.equal([...storage.entries.values()][0], durable);
  const envelope = JSON.parse(durable);
  envelope.drafts["checkin:2026-10-30"].value = oversized;
  storage.setItem(key, JSON.stringify(envelope));
  const invalidReopen = createDraftWorkspace("journal_a");
  invalidReopen.hydrate(storage);
  assert.equal(
    invalidReopen.getSnapshot().drafts["checkin:2026-10-30"],
    undefined,
  );
  assert.equal(invalidReopen.getSnapshot().status, "error");
});

test("maximum-length escaped reflections and legacy prompt metadata survive draft reopening", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  const long = {
    ...checkInDefaults(),
    note: "\u0001".repeat(DAILY_REFLECTION_MAX_LENGTH),
    prompt: "moment",
  };
  assert.ok(Buffer.byteLength(JSON.stringify(long), "utf8") > 600_000);
  assert.ok(
    Buffer.byteLength(JSON.stringify(long), "utf8") <
      DRAFT_STORAGE_LIMITS.checkInDraft,
  );
  assert.equal(workspace.setDraft("checkin:2026-10-30", long), true);
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  const restored = reopened.getSnapshot().drafts["checkin:2026-10-30"].value;
  assert.equal(isCheckInDraft(restored), true);
  assert.deepEqual(restored, long);
});

test("aggregate UTF-8 overflow keeps all live writing and resumes durability when space is recovered", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  const note = "静".repeat(DAILY_REFLECTION_MAX_LENGTH);
  for (let day = 24; day <= 29; day++)
    assert.equal(
      workspace.setDraft(`checkin:2026-10-${day}`, {
        ...checkInDefaults(),
        note,
      }),
      true,
    );
  const durable = [...storage.entries.values()][0];
  assert.equal(
    workspace.setDraft("checkin:2026-10-30", { ...checkInDefaults(), note }),
    false,
  );
  assert.equal(Object.keys(workspace.getSnapshot().drafts).length, 7);
  assert.equal(workspace.getSnapshot().status, "error");
  assert.equal([...storage.entries.values()][0], durable);
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.equal(Object.keys(reopened.getSnapshot().drafts).length, 6);
  assert.equal(
    workspace.setDraft("checkin:2026-10-30", {
      ...checkInDefaults(),
      note: "A shorter seventh reflection.",
    }),
    true,
  );
  assert.equal(workspace.getSnapshot().status, "saved");
  const recovered = createDraftWorkspace("journal_a");
  recovered.hydrate(storage);
  assert.equal(Object.keys(recovered.getSnapshot().drafts).length, 7);
});

test("hydration enforces the same per-draft and total UTF-8 limits without discarding unrelated valid drafts", () => {
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  workspace.setDraft("checkin:2026-10-30", {
    ...checkInDefaults(),
    note: "Keep this reflection.",
  });
  const [key, raw] = [...storage.entries][0];
  const envelope = JSON.parse(raw);
  envelope.drafts["med:new"] = {
    value: { note: "静".repeat(30_000) },
    updatedAt: 1,
  };
  storage.setItem(key, JSON.stringify(envelope));
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.equal(reopened.getSnapshot().drafts["med:new"], undefined);
  assert.deepEqual(reopened.getSnapshot().drafts["checkin:2026-10-30"].value, {
    ...checkInDefaults(),
    note: "Keep this reflection.",
  });
  assert.equal(reopened.getSnapshot().status, "error");
  for (let day = 24; day <= 30; day++)
    envelope.drafts[`checkin:2026-10-${day}`] = {
      value: {
        ...checkInDefaults(),
        note: "静".repeat(DAILY_REFLECTION_MAX_LENGTH),
      },
      updatedAt: 1,
    };
  delete envelope.drafts["med:new"];
  const tooLarge = JSON.stringify(envelope);
  assert.ok(tooLarge.length < DRAFT_STORAGE_LIMITS.workspace);
  assert.ok(
    Buffer.byteLength(tooLarge, "utf8") > DRAFT_STORAGE_LIMITS.workspace,
  );
  storage.setItem(key, tooLarge);
  const invalidReopen = createDraftWorkspace("journal_a");
  invalidReopen.hydrate(storage);
  assert.deepEqual(invalidReopen.getSnapshot().drafts, {});
  assert.equal(invalidReopen.getSnapshot().status, "error");
});

test("quota failures retain a full long check-in draft in memory without claiming it was saved", () => {
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate({
    getItem: () => null,
    setItem: () => {
      throw new Error("Synthetic quota error");
    },
  });
  const long = {
    ...checkInDefaults(),
    note: "A".repeat(DAILY_REFLECTION_MAX_LENGTH),
    writingOpen: true,
  };
  assert.equal(workspace.setDraft("checkin:2026-10-30", long), false);
  assert.equal(workspace.getSnapshot().status, "error");
  assert.deepEqual(
    workspace.getSnapshot().drafts["checkin:2026-10-30"].value,
    long,
  );
});

test("corrupt records do not discard unrelated valid drafts, and drafts have no age expiry", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_a");
  first.hydrate(storage);
  first.setDraft("med:new", { name: "An old draft" });
  const [key, raw] = [...storage.entries][0];
  const envelope = JSON.parse(raw);
  envelope.drafts["med:new"].updatedAt = 1;
  envelope.drafts["goal:new"] = {
    value: { password: "never restore" },
    updatedAt: 1,
  };
  envelope.screens["https://example.com"] = { dialog: { kind: "delete" } };
  storage.setItem(key, JSON.stringify(envelope));
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(reopened.getSnapshot().drafts["med:new"].value, {
    name: "An old draft",
  });
  assert.equal(reopened.getSnapshot().drafts["goal:new"], undefined);
  assert.equal(reopened.getSnapshot().status, "error");
  reopened.setLocation("/medications", "", 0);
  assert.equal(
    reopened.getSnapshot().status,
    "error",
    "route writes must not hide a corrupted-draft warning",
  );
  reopened.setDraft("med:new", { name: "A confirmed replacement" });
  assert.equal(reopened.getSnapshot().status, "saved");
});

test("incompatible versions, wrong namespaces, invalid JSON, and oversized envelopes start safely", () => {
  for (const raw of [
    "{broken",
    JSON.stringify({ version: 2, scope: "journal_a", drafts: {}, screens: {} }),
    JSON.stringify({
      version: 1,
      scope: "journal_b",
      drafts: { "med:new": { name: "other journal" } },
      screens: {},
    }),
    " ".repeat(DRAFT_STORAGE_LIMITS.workspace + 1),
  ]) {
    const workspace = createDraftWorkspace("journal_a");
    workspace.hydrate({ getItem: () => raw, setItem() {} });
    assert.deepEqual(workspace.getSnapshot().drafts, {});
    assert.equal(workspace.getSnapshot().lastPath, "/");
    assert.equal(workspace.getSnapshot().status, "error");
  }
});

test("only known safe journal routes, anchor names, form keys, and non-destructive dialogs are accepted", () => {
  for (const path of [
    "/",
    "/medications",
    "/history/2026-10-31",
    "/streaks/3",
    "/guide",
    "/developer-guide",
    "/medications/med-123",
    "/medications/legacy.name",
    "/medications/Caf%C3%A9",
    "/medications/a%26b",
    "/medications/categories/benzodiazepine",
    "/history/weeks/2026-11-09",
    "/journal/2026-11-09/morning",
    "/journal/2026-11-09/evening",
  ])
    assert.equal(safeWorkspacePath(path), path);
  for (const path of [
    "//evil.test",
    "https://evil.test",
    "/login",
    "/api/session",
    "/history/2026-02-30",
    "/streaks/6",
    "/guide?secret=x",
    "/medications#x",
    "/../",
    "/medications/categories/unknown",
    "/medications/categories/tablet",
    "/medications/%2e%2e",
    "/medications/%2Fapi",
    "/medications/%252e%252e",
    "/medications/%E0%A4%A",
    "/history/weeks/2026-11-10",
    "/history/weeks/2026-02-30",
    "/journal/2026-02-30/morning",
    "/journal/2026-11-09/noon",
    "/journal/2026-11-09/morning?secret=x",
  ])
    assert.equal(safeWorkspacePath(path), null);
  assert.equal(safeWorkspaceHash("#start"), "#start");
  assert.equal(safeWorkspaceHash("#%E0%A4%A"), "");
  assert.equal(safeWorkspaceHash("#<script>"), "");
  for (const key of [
    "med:new",
    "med:edit:abc-123",
    "intake:new:today",
    "intake:new:2026-10-31",
    "checkin:2026-10-31",
    "preferences",
    "view:history",
    "view:medications",
  ])
    assert.equal(safeDraftKey(key), true);
  for (const key of [
    "login",
    "password",
    "intake:edit:../id",
    "checkin:2026-02-30",
    "view:anything",
  ])
    assert.equal(safeDraftKey(key), false);
  assert.deepEqual(
    safeRememberedDialog(
      { kind: "intake-new", day: "2026-10-31" },
      "/history/2026-10-31",
    ),
    { kind: "intake-new", day: "2026-10-31" },
  );
  assert.equal(
    safeRememberedDialog({ kind: "intake-new", day: "invalid" }, "/"),
    null,
  );
  assert.equal(
    safeRememberedDialog(
      { kind: "intake-new", day: "2026-10-30" },
      "/history/2026-10-31",
    ),
    null,
  );
  assert.equal(
    safeRememberedDialog(
      { kind: "medication-edit", id: "../bad" },
      "/medications",
    ),
    null,
  );
  assert.equal(
    safeRememberedDialog({ kind: "medication-edit", id: "abc" }, "/"),
    null,
  );
  assert.equal(safeRememberedDialog({ kind: "delete" }, "/medications"), null);
  assert.equal(safeRememberedDialog({ kind: "password" }, "/"), null);
});

test("late save completion cannot close another dialog or a newly reopened instance of the same form", () => {
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(memoryStorage());
  const old = { kind: "medication-edit", id: "abc" } as const;
  workspace.openDialog("/medications", old);
  const oldInstance =
    workspace.getSnapshot().screens["/medications"].dialogInstance;
  workspace.closeDialog("/medications");
  workspace.openDialog("/medications", old);
  workspace.closeDialog("/medications", old, oldInstance);
  assert.deepEqual(workspace.getSnapshot().screens["/medications"].dialog, old);
  workspace.openDialog("/goals", { kind: "goal-new" });
  const current =
    workspace.getSnapshot().screens["/medications"].dialogInstance;
  workspace.closeDialog("/medications", old, current);
  assert.equal(workspace.getSnapshot().lastPath, "/goals");
  assert.deepEqual(workspace.getSnapshot().screens["/goals"].dialog, {
    kind: "goal-new",
  });
});

test("resume only replaces a fresh bare root, preserving explicit links, onboarding, and ordinary navigation", () => {
  const base = {
    pathname: "/",
    search: "",
    hash: "",
    savedPath: "/medications",
    guidePending: false,
  };
  assert.equal(shouldRestoreLastScreen(base), true);
  assert.equal(
    shouldRestoreLastScreen({ ...base, pathname: "/history" }),
    false,
  );
  assert.equal(shouldRestoreLastScreen({ ...base, hash: "#start" }), false);
  assert.equal(shouldRestoreLastScreen({ ...base, search: "?focus=3" }), false);
  assert.equal(shouldRestoreLastScreen({ ...base, guidePending: true }), false);
  assert.equal(
    shouldRestoreLastScreen({ ...base, savedPath: "https://evil.test" }),
    false,
  );
  assert.equal(
    shouldRestoreLastScreen({
      ...base,
      referrer: "https://pill.test/guide",
      origin: "https://pill.test",
    }),
    false,
  );
  assert.equal(
    shouldRestoreLastScreen({
      ...base,
      referrer: "https://pill.test/login",
      origin: "https://pill.test",
    }),
    true,
  );
});

test("daily stack views reopen independently for every group, day and journal", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_a");
  first.hydrate(storage);
  const groupA = [{ id: "a0" }, { id: "a1" }, { id: "a2" }];
  const groupB = [{ id: "b0" }, { id: "b1" }, { id: "b2" }];
  first.setStackView(
    "2026-10-31",
    groupA.map((entry) => entry.id),
    {
      heads: ["a0"],
      expanded: ["a0"],
    },
  );
  first.setStackView(
    "2026-10-31",
    groupB.map((entry) => entry.id),
    {
      heads: ["b0"],
      expanded: [],
    },
  );
  first.setStackView("2026-10-30", ["past0", "past1"], {
    heads: ["past0"],
    expanded: ["past0"],
  });
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  const today = reopened.getSnapshot().stackViews["2026-10-31"];
  assert.deepEqual(today.heads, ["a0", "b0"]);
  assert.deepEqual(today.expanded, ["a0"]);
  assert.deepEqual(reopened.getSnapshot().stackViews["2026-10-30"].expanded, [
    "past0",
  ]);
  assert.equal(reopened.getSnapshot().status, "saved");
  assert.deepEqual(reopened.getSnapshot().drafts, {});
  const other = createDraftWorkspace("journal_b");
  other.hydrate(storage);
  assert.deepEqual(other.getSnapshot().stackViews, {});
});

test("stack persistence commits final Fold intent before animation and reversal can replace it", async () => {
  const {
    EMPTY_INTAKE_STACK_VIEW,
    foldIntakeStack,
    normalizeIntakeStackView,
    showIntakeStackChildren,
  } = await import("./intake-stack-layout");
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  const entries = Array.from({ length: 8 }, (_, index) => ({
    id: `i${index}`,
  }));
  const ids = entries.map((entry) => entry.id);
  const shown = showIntakeStackChildren(entries, EMPTY_INTAKE_STACK_VIEW);
  workspace.setStackView("2026-10-31", ids, shown);
  const folded = foldIntakeStack(entries, shown);
  workspace.setStackView("2026-10-31", ids, folded);
  const halfway = createDraftWorkspace("journal_a");
  halfway.hydrate(storage);
  assert.deepEqual(
    normalizeIntakeStackView(
      entries,
      halfway.getSnapshot().stackViews["2026-10-31"],
    ),
    {
      heads: ["i0"],
      expanded: [],
    },
  );
  assert.equal(JSON.stringify([...storage.entries]).includes("stage"), false);
  assert.equal(JSON.stringify([...storage.entries]).includes("pending"), false);
  const reversed = showIntakeStackChildren(entries, folded);
  workspace.setStackView("2026-10-31", ids, reversed);
  const afterReverse = createDraftWorkspace("journal_a");
  afterReverse.hydrate(storage);
  assert.deepEqual(
    normalizeIntakeStackView(
      entries,
      afterReverse.getSnapshot().stackViews["2026-10-31"],
    ),
    reversed,
  );
});

test("saved stack IDs follow live grouping and never invent or reorder intake records", async () => {
  const { normalizeIntakeStackView } = await import("./intake-stack-layout");
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  workspace.setStackView("2026-10-31", ["a", "b", "c"], {
    heads: ["a"],
    expanded: ["a"],
  });
  workspace.setStackView("2026-10-31", ["d", "e"], {
    heads: ["d"],
    expanded: ["d"],
  });
  const saved = workspace.getSnapshot().stackViews["2026-10-31"];
  const merged = [
    { id: "new" },
    { id: "a" },
    { id: "c" },
    { id: "d" },
    { id: "e" },
  ];
  assert.deepEqual(normalizeIntakeStackView(merged, saved), {
    heads: ["new"],
    expanded: [],
  });
  assert.deepEqual(
    merged.map((entry) => entry.id),
    ["new", "a", "c", "d", "e"],
  );
});

test("legacy substack metadata becomes one stack without disturbing other groups or forms", async () => {
  const { normalizeIntakeStackView } = await import("./intake-stack-layout");
  const storage = memoryStorage();
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(storage);
  workspace.setDraft("med:new", { name: "Keep this form" });
  workspace.setStackView("2026-10-31", ["other0", "other1"], {
    heads: ["other0"],
    expanded: ["other0"],
  });
  const [key, raw] = [...storage.entries][0];
  const envelope = JSON.parse(raw);
  // Old clients saved extra heads, including expanded promoted children.
  envelope.stackViews["2026-10-31"].heads.push("a0", "a2");
  envelope.stackViews["2026-10-31"].expanded.push("a0", "a2");
  storage.setItem(key, JSON.stringify(envelope));
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  const entries = [{ id: "a0" }, { id: "a1" }, { id: "a2" }, { id: "a3" }];
  const saved = reopened.getSnapshot().stackViews["2026-10-31"];
  const single = normalizeIntakeStackView(entries, saved);
  assert.deepEqual(single, { heads: ["a0"], expanded: ["a0"] });
  assert.deepEqual(
    normalizeIntakeStackView(entries, { ...saved, expanded: ["a2"] }),
    { heads: ["a0"], expanded: [] },
  );
  assert.equal(reopened.getSnapshot().status, "saved");
  reopened.setStackView(
    "2026-10-31",
    entries.map((entry) => entry.id),
    single,
  );
  const cleaned = createDraftWorkspace("journal_a");
  cleaned.hydrate(storage);
  assert.deepEqual(cleaned.getSnapshot().stackViews["2026-10-31"].heads, [
    "other0",
    "a0",
  ]);
  assert.deepEqual(cleaned.getSnapshot().stackViews["2026-10-31"].expanded, [
    "other0",
    "a0",
  ]);
  assert.deepEqual(cleaned.getSnapshot().drafts["med:new"].value, {
    name: "Keep this form",
  });
  assert.equal(cleaned.getSnapshot().status, "saved");
});

test("version1 workspaces gain optional stack views while corrupted view records are isolated", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_a");
  first.hydrate(storage);
  first.setDraft("med:new", { name: "Keep this form" });
  first.setLocation("/medications", "", 50);
  first.setStackView("2026-10-31", ["a", "b"], {
    heads: ["a"],
    expanded: ["a"],
  });
  const [key, raw] = [...storage.entries][0];
  const envelope = JSON.parse(raw);
  envelope.stackViews["2026-10-30"] = {
    heads: ["a"],
    expanded: ["not-a-head"],
    updatedAt: 1,
  };
  envelope.stackViews["2026-02-30"] = {
    heads: ["valid"],
    expanded: [],
    updatedAt: 1,
  };
  envelope.stackViews["2026-10-29"] = {
    heads: ["https://bad.test"],
    expanded: [],
    updatedAt: 1,
  };
  storage.setItem(key, JSON.stringify(envelope));
  const reopened = createDraftWorkspace("journal_a");
  reopened.hydrate(storage);
  assert.deepEqual(Object.keys(reopened.getSnapshot().stackViews), [
    "2026-10-31",
  ]);
  assert.deepEqual(reopened.getSnapshot().drafts["med:new"].value, {
    name: "Keep this form",
  });
  assert.equal(reopened.getSnapshot().lastPath, "/medications");
  assert.equal(reopened.getSnapshot().status, "error");
  reopened.setStackView("2026-10-31", ["a", "b"], {
    heads: ["a"],
    expanded: [],
  });
  assert.equal(reopened.getSnapshot().status, "error");
  delete envelope.stackViews;
  storage.setItem(key, JSON.stringify(envelope));
  const legacy = createDraftWorkspace("journal_a");
  legacy.hydrate(storage);
  assert.deepEqual(legacy.getSnapshot().stackViews, {});
  assert.ok(legacy.getSnapshot().drafts["med:new"]);
  assert.equal(legacy.getSnapshot().status, "saved");
});

test("stack metadata is bounded separately from 128 form drafts and keeps the latest 60 days", () => {
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(memoryStorage());
  for (let index = 0; index < 128; index++)
    workspace.setDraft(`med:edit:form-${index}`, { name: `Draft${index}` });
  for (let index = 0; index < 70; index++) {
    const day = new Date(Date.UTC(2026, 0, index + 1))
      .toISOString()
      .slice(0, 10);
    workspace.setStackView(day, [`head-${index}`], {
      heads: [`head-${index}`],
      expanded: [],
    });
  }
  assert.equal(Object.keys(workspace.getSnapshot().drafts).length, 128);
  assert.equal(Object.keys(workspace.getSnapshot().stackViews).length, 60);
  assert.ok(workspace.getSnapshot().stackViews["2026-03-11"]);
  assert.equal(workspace.getSnapshot().stackViews["2026-01-01"], undefined);
  assert.equal(workspace.getSnapshot().status, "saved");
  workspace.setStackView("2025-01-01", ["historical"], {
    heads: ["historical"],
    expanded: [],
  });
  assert.ok(workspace.getSnapshot().stackViews["2025-01-01"]);
  assert.equal(Object.keys(workspace.getSnapshot().stackViews).length, 60);
  assert.equal(
    workspace.setStackView("2026-02-30", ["a"], { heads: ["a"], expanded: [] }),
    false,
  );
  assert.equal(
    workspace.setStackView("2026-10-31", ["a"], {
      heads: ["not-in-this-group"],
      expanded: [],
    }),
    false,
  );
  assert.equal(
    workspace.setStackView("2026-10-31", ["a"], {
      heads: ["a"],
      expanded: ["other"],
    }),
    false,
  );
});

test("unavailable stack storage keeps in-visit views without claiming a durable save", () => {
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(null);
  assert.equal(
    workspace.setStackView("2026-10-31", ["a", "b"], {
      heads: ["a"],
      expanded: ["a"],
    }),
    false,
  );
  assert.deepEqual(workspace.getSnapshot().stackViews["2026-10-31"].heads, [
    "a",
  ]);
  assert.deepEqual(workspace.getSnapshot().stackViews["2026-10-31"].expanded, [
    "a",
  ]);
  assert.equal(workspace.getSnapshot().status, "memory");
});

test("day-view byte budgets prune old presentation metadata and reject oversized individual days", () => {
  const workspace = createDraftWorkspace("journal_a");
  workspace.hydrate(memoryStorage());
  for (let index = 1; index <= 10; index++) {
    const ids = Array.from(
      { length: 200 },
      (_, item) => `view-${index}-${item}-${"x".repeat(99)}`,
    );
    workspace.setStackView(`2026-10-${String(index).padStart(2, "0")}`, ids, {
      heads: ids,
      expanded: ids,
    });
  }
  assert.ok(
    JSON.stringify(workspace.getSnapshot().stackViews).length <= 262_144,
  );
  assert.ok(Object.keys(workspace.getSnapshot().stackViews).length < 10);
  assert.ok(workspace.getSnapshot().stackViews["2026-10-10"]);
  const previous = workspace.getSnapshot().stackViews;
  const huge = Array.from(
    { length: 500 },
    (_, index) => `large-${index}-${"z".repeat(100)}`,
  );
  assert.equal(
    workspace.setStackView("2026-10-31", huge, { heads: huge, expanded: huge }),
    false,
  );
  assert.equal(workspace.getSnapshot().status, "error");
  assert.equal(workspace.getSnapshot().stackViews, previous);
});

test("dialog scroll survives close and reload while isolating route, form identity, pane and journal", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_scroll_a");
  first.hydrate(storage);
  first.setDialogScroll("/medications|med:edit:one:body", {
    top: 370,
    left: 2,
  });
  first.setDialogScroll("/medications|med:edit:two:body", { top: 82, left: 0 });
  first.setDialogScroll("/|checkin:2026-10-31:writing-source:body", {
    top: 950,
    left: 0,
  });
  first.setDialogScroll("/|checkin:2026-10-31:writing-preview:body", {
    top: 123,
    left: 0,
  });
  first.setDialogScroll(
    "/history/2026-10-31|checkin:2026-10-31:writing-source:body",
    { top: 45, left: 0 },
  );
  first.openDialog("/medications", { kind: "medication-edit", id: "one" });
  first.closeDialog("/medications");
  const reopened = createDraftWorkspace("journal_scroll_a");
  reopened.hydrate(storage);
  assert.deepEqual(
    reopened.getSnapshot().scrollViews,
    first.getSnapshot().scrollViews,
  );
  assert.equal(
    reopened.getSnapshot().scrollViews["/medications|med:edit:one:body"].top,
    370,
  );
  assert.equal(
    reopened.getSnapshot().scrollViews["/medications|med:edit:two:body"].top,
    82,
  );
  const other = createDraftWorkspace("journal_scroll_b");
  other.hydrate(storage);
  assert.deepEqual(other.getSnapshot().scrollViews, {});
});

test("scroll-only writes are quiet, bounded and cannot overwrite fields or hide storage errors", () => {
  const workspace = createDraftWorkspace("journal_scroll_a");
  workspace.hydrate(memoryStorage());
  workspace.setDraft("med:new", { name: "Unfinished medication" });
  let emissions = 0;
  workspace.subscribe(() => emissions++);
  for (let i = 0; i < 300; i++) {
    workspace.setDialogScroll(`/medications|med:edit:sample-${i}:body`, {
      top: i,
      left: 0,
    });
  }
  assert.equal(
    emissions,
    0,
    "scroll positions do not rerender all journal forms",
  );
  assert.equal(Object.keys(workspace.getSnapshot().scrollViews).length, 256);
  assert.deepEqual(workspace.getSnapshot().drafts["med:new"].value, {
    name: "Unfinished medication",
  });
  for (const key of [
    "//evil.test|med:new",
    "/login|password",
    "/medications|__proto__",
    "/medications|med:edit:../bad",
    "constructor",
  ]) {
    assert.equal(workspace.setDialogScroll(key, { top: 1, left: 0 }), false);
  }
  assert.equal(
    workspace.setDialogScroll("/medications|med:new", {
      top: Number.NaN,
      left: 0,
    }),
    false,
  );
  workspace.setDialogScroll("/medications|med:new", {
    top: 100_000_000,
    left: -2,
  });
  assert.equal(
    workspace.getSnapshot().scrollViews["/medications|med:new"].top,
    10_000_000,
  );
  assert.equal(
    workspace.getSnapshot().scrollViews["/medications|med:new"].left,
    0,
  );
  const denied = createDraftWorkspace("journal_scroll_b");
  denied.hydrate({
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  let failures = 0;
  denied.subscribe(() => failures++);
  assert.equal(
    denied.setDialogScroll("/|intake:new:today:body", { top: 42, left: 0 }),
    false,
  );
  assert.equal(
    failures,
    1,
    "real storage failure still reaches status notices",
  );
  assert.equal(
    denied.getSnapshot().scrollViews["/|intake:new:today:body"].top,
    42,
  );
});

test("legacy workspaces hydrate without scroll records and corrupt coordinates preserve valid form drafts", () => {
  const storage = memoryStorage();
  const first = createDraftWorkspace("journal_scroll_a");
  first.hydrate(storage);
  first.setDraft("med:new", { name: "Keep this" });
  const [key, raw] = [...storage.entries][0];
  const envelope = JSON.parse(raw);
  delete envelope.scrollViews;
  storage.setItem(key, JSON.stringify(envelope));
  const legacy = createDraftWorkspace("journal_scroll_a");
  legacy.hydrate(storage);
  assert.equal(legacy.getSnapshot().status, "saved");
  assert.deepEqual(legacy.getSnapshot().scrollViews, {});
  envelope.scrollViews = {
    "/medications|med:edit:one:body": { top: 321, left: 0, updatedAt: 1 },
    "/medications|med:edit:two:body": { top: "bad", left: 0, updatedAt: 1 },
    "https://evil.test|med:new": { top: 12, left: 0, updatedAt: 1 },
  };
  storage.setItem(key, JSON.stringify(envelope));
  const damaged = createDraftWorkspace("journal_scroll_a");
  damaged.hydrate(storage);
  assert.equal(damaged.getSnapshot().status, "error");
  assert.equal(Object.keys(damaged.getSnapshot().scrollViews).length, 1);
  assert.deepEqual(damaged.getSnapshot().drafts["med:new"].value, {
    name: "Keep this",
  });
  damaged.setDialogScroll("/medications|med:new:body", { top: 123, left: 0 });
  assert.equal(
    damaged.getSnapshot().status,
    "error",
    "scroll writes preserve unrelated damaged-draft notices",
  );
});
