import assert from "node:assert/strict";
import test from "node:test";
import {
  createDraftWorkspace,
  safeDraftKey,
  safeRememberedDialog,
  safeWorkspaceHash,
  safeWorkspacePath,
  shouldRestoreLastScreen,
  type DraftStorage,
} from "./journal-drafts";

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
    " ".repeat(1_048_577),
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
