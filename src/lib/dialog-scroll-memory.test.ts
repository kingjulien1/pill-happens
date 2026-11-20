import assert from "node:assert/strict";
import test from "node:test";
import {
  clampDialogScroll,
  createDialogScrollSession,
  createPublicDialogScrollMemory,
} from "./dialog-scroll-memory";

test("a new dialog visit always starts at the top after an earlier scrolled visit", () => {
  const session = createDialogScrollSession();
  session.setOpen(true);
  session.set("body", { top: 570, left: 20 });
  session.setOpen(false);
  session.set("body", { top: 990, left: 30 });
  session.setOpen(true);
  assert.deepEqual(session.get("body"), { top: 0, left: 0 });
});

test("pane changes retain only the current open session", () => {
  const session = createDialogScrollSession();
  session.setOpen(true);
  session.set("source", { top: 300, left: 0 });
  session.set("preview", { top: 160, left: 0 });
  session.setOpen(true);
  assert.deepEqual(session.get("source"), { top: 300, left: 0 });
  assert.deepEqual(session.get("preview"), { top: 160, left: 0 });
  assert.deepEqual(session.get("another-record"), { top: 0, left: 0 });
  session.setOpen(false);
  session.setOpen(true);
  assert.deepEqual(session.get("source"), { top: 0, left: 0 });
  assert.deepEqual(session.get("preview"), { top: 0, left: 0 });
});

test("a replacement popup discards positions without ending the active session", () => {
  const session = createDialogScrollSession();
  session.setOpen(true);
  session.set("source", { top: 300, left: 0 });
  session.set("preview", { top: 160, left: 0 });
  session.reset();
  assert.deepEqual(session.get("source"), { top: 0, left: 0 });
  assert.deepEqual(session.get("preview"), { top: 0, left: 0 });
  session.set("source", { top: 60, left: 0 });
  assert.deepEqual(session.get("source"), { top: 60, left: 0 });
});

test("dialog instances and returned coordinates cannot leak positions into one another", () => {
  const first = createDialogScrollSession();
  const second = createDialogScrollSession();
  first.setOpen(true);
  second.setOpen(true);
  const position = { top: 80, left: 0 };
  first.set("body", position);
  position.top = 300;
  const read = first.get("body");
  read.top = 900;
  assert.deepEqual(first.get("body"), { top: 80, left: 0 });
  assert.deepEqual(second.get("body"), { top: 0, left: 0 });
});

test("restoration clamps to a smaller dialog without negative coordinates", () => {
  assert.deepEqual(
    clampDialogScroll({ top: 570, left: 30 }, { height: 120, width: 0 }),
    { top: 120, left: 0 },
  );
  assert.deepEqual(
    clampDialogScroll({ top: 570, left: 30 }, { height: -10, width: -20 }),
    { top: 0, left: 0 },
  );
});

test("public dialog memory persists only numeric positions under explicit safe identities", () => {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_: string, value: string) => {
      raw = value;
    },
  };
  const first = createPublicDialogScrollMemory(storage);
  first.set("/login", "create-journal", { top: 120, left: 0 });
  first.set("/guide", "install-app", { top: 50, left: 0 });
  const reopened = createPublicDialogScrollMemory(storage);
  assert.deepEqual(reopened.get("/login", "create-journal"), {
    top: 120,
    left: 0,
  });
  assert.equal(reopened.get("/", "create-journal"), undefined);
  assert.deepEqual(reopened.get("/guide", "install-app"), { top: 50, left: 0 });
  const before = raw;
  first.set("https://evil.test", "install-app", { top: 1, left: 0 });
  first.set("/login", "credentials" as "create-journal", { top: 1, left: 0 });
  first.set("/login", "create-journal", { top: Infinity, left: 0 });
  assert.equal(raw, before);
  for (const item of Object.values(JSON.parse(raw!)))
    assert.deepEqual(Object.keys(item as object).sort(), ["left", "top"]);
});

test("blocked storage and corrupt public memory remain usable without content persistence", () => {
  const blocked = createPublicDialogScrollMemory({
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  blocked.set("/login", "create-journal", { top: 95, left: 0 });
  assert.deepEqual(blocked.get("/login", "create-journal"), {
    top: 95,
    left: 0,
  });
  const corrupt = createPublicDialogScrollMemory({
    getItem: () =>
      JSON.stringify({
        "/login|create-journal": { top: "password", left: 0 },
        "/guide|install-app": { top: 40, left: 0 },
      }),
    setItem: () => {},
  });
  assert.equal(corrupt.get("/login", "create-journal"), undefined);
  assert.deepEqual(corrupt.get("/guide", "install-app"), { top: 40, left: 0 });
});

test("separate public dialog writers preserve one another’s numeric positions", () => {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_: string, value: string) => {
      raw = value;
    },
  };
  const login = createPublicDialogScrollMemory(storage);
  const install = createPublicDialogScrollMemory(storage);
  login.set("/login", "create-journal", { top: 120, left: 0 });
  install.set("/login", "install-app", { top: 50, left: 0 });
  const reopened = createPublicDialogScrollMemory(storage);
  assert.deepEqual(reopened.get("/login", "create-journal"), {
    top: 120,
    left: 0,
  });
  assert.deepEqual(reopened.get("/login", "install-app"), { top: 50, left: 0 });
});
