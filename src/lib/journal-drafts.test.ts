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
