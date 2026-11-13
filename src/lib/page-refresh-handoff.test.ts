import assert from "node:assert/strict";
import { Script, createContext } from "node:vm";
import test from "node:test";
import {
  BRAND_REFRESH_MARKER,
  BRAND_REFRESH_MARKER_TTL,
} from "./brand-refresh";
import {
  PAGE_REFRESH_BOOT_SCRIPT,
  PAGE_REFRESH_SEQUENCE,
  beginPageRefresh,
  cancelPageRefresh,
  finishPageRefresh,
  getPageRefreshPhase,
  getServerPageRefreshPhase,
  restorePageRefreshScroll,
  subscribePageRefresh,
} from "./page-refresh-handoff";
import { getPageEntryReadiness } from "./page-entry-readiness";

const ATTRIBUTE = "data-page-refresh-active";
const HISTORY_KEY = "__pillPageRefresh";
const CHANGE_EVENT = "pill:page-refresh-change";
const SPIN_DELAY = "--page-refresh-spin-delay";
const TABLET_DELAY = "--page-refresh-tablet-delay";
const ELAPSED = "--page-refresh-elapsed";
const bootProgram = new Script(PAGE_REFRESH_BOOT_SCRIPT);

type BootBridge = {
  version: number;
  begin: () => boolean;
  finish: () => void;
  cancel: () => void;
  restoreScroll: () => void;
};

/** A document/parser harness, not a React mount: no paint/effect has run yet. */
function browser({
  now = 1_000_000,
  pathname = "/history",
  search = "?view=all",
  hash = "#logged-intakes",
  session,
  state = { __NA: true, tree: ["", { children: ["history"] }] } as unknown,
  storageDenied = false,
  historyDenied = false,
  reducedMotion = false,
  hidden = false,
  viewport,
  objectScrollThrows = false,
  scrollThrows = false,
}: {
  now?: number;
  pathname?: string;
  search?: string;
  hash?: string;
  session?: string;
  state?: unknown;
  storageDenied?: boolean;
  historyDenied?: boolean;
  reducedMotion?: boolean;
  hidden?: boolean;
  viewport?: { x: unknown; y: unknown };
  objectScrollThrows?: boolean;
  scrollThrows?: boolean;
} = {}) {
  let clockNow = now;
  let wallClockOffset = 0;
  let reduced = reducedMotion;
  let hiddenDocument = hidden;
  let currentState = state;
  let timerSequence = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const attributes = new Map<string, string>();
  const styles = new Map<string, string>();
  const storage = new Map<string, string>();
  if (session !== undefined) storage.set(BRAND_REFRESH_MARKER, session);
  storage.set("unrelated-draft", "keep this value");
  const historyWrites: Array<{ title: string; url?: string }> = [];
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const phaseEvents: string[] = [];
  const scrollCalls: unknown[][] = [];
  const document = {
    get hidden() {
      return hiddenDocument;
    },
    addEventListener(name: string, listener: (event: Event) => void) {
      const group = listeners.get(name) ?? new Set();
      group.add(listener);
      listeners.set(name, group);
    },
    // Model a ready provider: only the actual curtain may block entry animations.
    querySelector: () => ({
      getAttribute: (name: string) =>
        name === "data-page-entry-ready" ? "true" : null,
    }),
    documentElement: {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      style: {
        setProperty: (name: string, value: string) => styles.set(name, value),
        removeProperty: (name: string) => styles.delete(name),
      },
    },
  };
  const window = {
    location: { pathname, search, hash },
    history: {
      get state() {
        if (historyDenied) throw new Error("History unavailable");
        return currentState;
      },
      replaceState(value: unknown, title: string, url?: string) {
        if (historyDenied) throw new Error("History unavailable");
        currentState = value;
        historyWrites.push({ title, url });
      },
    },
    sessionStorage: {
      getItem(name: string) {
        if (storageDenied) throw new Error("Storage blocked");
        return storage.get(name) ?? null;
      },
      setItem(name: string, value: string) {
        if (storageDenied) throw new Error("Storage blocked");
        storage.set(name, value);
      },
      removeItem(name: string) {
        if (storageDenied) throw new Error("Storage blocked");
        storage.delete(name);
      },
    },
    Event,
    addEventListener(name: string, listener: (event: Event) => void) {
      const group = listeners.get(name) ?? new Set();
      group.add(listener);
      listeners.set(name, group);
    },
    removeEventListener(name: string, listener: (event: Event) => void) {
      listeners.get(name)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      if (event.type === CHANGE_EVENT)
        phaseEvents.push(attributes.get(ATTRIBUTE) ?? "idle");
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
    setTimeout(callback: () => void, milliseconds: number) {
      const id = ++timerSequence;
      timers.set(id, { callback, at: clockNow + milliseconds });
      return id;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
    matchMedia: () => ({ matches: reduced }),
    scrollTo(...args: unknown[]) {
      scrollCalls.push(args);
      if (scrollThrows || (objectScrollThrows && typeof args[0] === "object"))
        throw new Error("Unsupported scroll call");
    },
  };
  if (viewport !== undefined)
    Object.assign(window, { scrollX: viewport.x, scrollY: viewport.y });
  const context = createContext({
    window,
    document,
    Date: class extends Date {
      static now() {
        return clockNow + wallClockOffset;
      }
    },
  });

  const run = () => bootProgram.runInContext(context);
  const advance = (milliseconds: number) => {
    const end = clockNow + milliseconds;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      timers.delete(due[0]);
      clockNow = due[1].at;
      due[1].callback();
    }
    clockNow = end;
  };
  run();
  return {
    run,
    advance,
    shiftClock(milliseconds: number) {
      wallClockOffset += milliseconds;
    },
    setReducedMotion(value: boolean) {
      reduced = value;
    },
    setHidden(value: boolean) {
      hiddenDocument = value;
      window.dispatchEvent(new Event("visibilitychange"));
    },
    window,
    document,
    attributes,
    styles,
    storage,
    historyWrites,
    phaseEvents,
    scrollCalls,
    timers,
    get state() {
      return currentState;
    },
    get bridge() {
      return (window as unknown as Record<string, unknown>)[
        HISTORY_KEY
      ] as BootBridge;
    },
    get phase() {
      return attributes.get(ATTRIBUTE) ?? "idle";
    },
  };
}

const marker = (at: number, path = "/history?view=all") =>
  JSON.stringify({ at, path });
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

test("a valid handoff covers the incoming document synchronously before body paint", () => {
  const page = browser({ session: marker(998_100) });
  assert.equal(page.phase, "restoring");
  assert.equal(page.styles.get(SPIN_DELAY), "-500ms");
  assert.equal(page.styles.get(TABLET_DELAY), "-1900ms");
  assert.equal(page.styles.get(ELAPSED), "-1900ms");
  assert.deepEqual(page.phaseEvents, ["restoring"]);
  assert.equal(
    page.timers.size,
    1,
    "only the independent deadline is scheduled",
  );
});

test("the newest valid source wins while mismatched or malformed sources are ignored", () => {
  for (const session of [
    marker(999_000),
    marker(999_900, "/medications"),
    "{",
  ]) {
    const page = browser({
      session,
      state: {
        __NA: true,
        [HISTORY_KEY]: { at: 999_500, path: "/history?view=all" },
      },
    });
    assert.equal(page.phase, "restoring");
    assert.equal(page.styles.get(SPIN_DELAY), "-500ms");
    assert.equal(
      JSON.parse(page.storage.get(BRAND_REFRESH_MARKER)!).at,
      999_500,
    );
  }
  const page = browser({
    session: marker(999_900),
    state: { [HISTORY_KEY]: { at: 999_000, path: "/history?view=all" } },
  });
  assert.equal(page.styles.get(SPIN_DELAY), "-100ms");
});

test("expired, future, unrelated and malformed markers never activate a curtain", () => {
  const now = 1_000_000;
  const values = [
    marker(now - BRAND_REFRESH_MARKER_TTL),
    marker(now - BRAND_REFRESH_MARKER_TTL - 1),
    marker(now + 1),
    marker(now, "/history"),
    marker(now, "/history?view=active"),
    marker(now, "/"),
    "null",
    "[]",
    "not JSON",
    JSON.stringify({ at: String(now), path: "/history?view=all" }),
    JSON.stringify({ at: now }),
    '{"at":1e999,"path":"/history?view=all"}',
  ];
  for (const value of values) {
    const page = browser({ session: value });
    assert.equal(page.phase, "idle", value);
    assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
    assert.equal(page.styles.size, 0);
    assert.equal(page.timers.size, 0);
  }
  assert.equal(
    browser({ session: marker(now - BRAND_REFRESH_MARKER_TTL + 1) }).phase,
    "restoring",
  );
});

test("login documents discard even an exact recent marker and cannot begin a refresh", () => {
  for (const pathname of ["/login", "/login/help"]) {
    const page = browser({
      pathname,
      search: "?next=history",
      session: marker(999_500, `${pathname}?next=history`),
    });
    assert.equal(page.phase, "idle");
    assert.equal(page.bridge.begin(), false);
    assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
  }
});

test("blocked session storage restores from history without erasing Next state or the URL", () => {
  const nextState = {
    __NA: true,
    tree: ["", { children: ["history"] }],
    key: "keep",
  };
  const page = browser({
    storageDenied: true,
    state: {
      ...nextState,
      [HISTORY_KEY]: { at: 999_600, path: "/history?view=all" },
    },
  });
  assert.equal(page.phase, "restoring");
  assert.equal(page.styles.get(SPIN_DELAY), "-400ms");
  page.bridge.cancel();
  assert.deepEqual(plain(page.state), nextState);
  assert.equal(page.window.location.hash, "#logged-intakes");
  assert.ok(page.historyWrites.every(({ url }) => url === undefined));
});

test("begin writes one cosmetic marker to both stores, synchronously shows and rejects duplicates", () => {
  const page = browser();
  assert.equal(page.phase, "idle");
  assert.equal(page.bridge.begin(), true);
  assert.equal(page.phase, "reloading");
  assert.equal(page.styles.get(SPIN_DELAY), "0ms");
  assert.equal(page.styles.get(TABLET_DELAY), "0ms");
  assert.equal(page.styles.get(ELAPSED), "0ms");
  assert.deepEqual(JSON.parse(page.storage.get(BRAND_REFRESH_MARKER)!), {
    at: 1_000_000,
    path: "/history?view=all",
  });
  const state = plain(page.state);
  assert.equal(state.__NA, true);
  assert.deepEqual(state.tree, ["", { children: ["history"] }]);
  assert.deepEqual(state[HISTORY_KEY], {
    at: 1_000_000,
    path: "/history?view=all",
  });
  const writes = page.historyWrites.length;
  page.advance(100);
  assert.equal(page.bridge.begin(), false);
  assert.equal(page.historyWrites.length, writes);
  assert.deepEqual(page.phaseEvents, ["reloading"]);
});

test("a new document adopts history fallback and preserves elapsed animation phase", () => {
  const outgoing = browser({ storageDenied: true });
  assert.equal(outgoing.bridge.begin(), true);
  const incoming = browser({
    now: 1_001_700,
    storageDenied: true,
    state: outgoing.state,
  });
  assert.equal(incoming.phase, "restoring");
  assert.equal(incoming.styles.get(SPIN_DELAY), "-300ms");
  assert.equal(incoming.styles.get(TABLET_DELAY), "-1700ms");
  assert.equal(incoming.styles.get(ELAPSED), "-1700ms");
  assert.equal(incoming.window.location.hash, "#logged-intakes");
});

test("an intentional refresh captures its viewport and restores it once after the document handoff", () => {
  const outgoing = browser({
    storageDenied: true,
    pathname: "/history/2026-11-04",
    search: "?view=all",
    viewport: { x: 24.5, y: 600 },
  });
  assert.equal(outgoing.bridge.begin(), true);
  outgoing.bridge.restoreScroll();
  assert.equal(
    outgoing.scrollCalls.length,
    0,
    "outgoing content must never be repositioned",
  );
  const incoming = browser({
    now: 1_000_800,
    storageDenied: true,
    pathname: "/history/2026-11-04",
    search: "?view=all",
    state: outgoing.state,
  });
  assert.equal(incoming.phase, "restoring");
  assert.equal(
    incoming.scrollCalls.length,
    0,
    "head boot waits for the ready-content signal",
  );
  incoming.bridge.restoreScroll();
  assert.deepEqual(plain(incoming.scrollCalls), [
    [{ left: 24.5, top: 600, behavior: "instant" }],
  ]);
  incoming.bridge.restoreScroll();
  assert.equal(incoming.scrollCalls.length, 1);
  assert.deepEqual(incoming.window.location, {
    pathname: "/history/2026-11-04",
    search: "?view=all",
    hash: "#logged-intakes",
  });
  assert.ok(incoming.historyWrites.every(({ url }) => url === undefined));
});

test("zero and finite boundary viewports remain valid; overscroll capture stays bounded", () => {
  for (const [input, expected] of [
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 10_000_000, y: 19.25 },
      { x: 10_000_000, y: 19.25 },
    ],
    [
      { x: -18, y: -0.5 },
      { x: 0, y: 0 },
    ],
    [
      { x: 10_000_100, y: 20_000_000 },
      { x: 10_000_000, y: 10_000_000 },
    ],
  ]) {
    const outgoing = browser({ viewport: input });
    outgoing.bridge.begin();
    const saved = JSON.parse(outgoing.storage.get(BRAND_REFRESH_MARKER)!);
    assert.deepEqual(saved.viewport, expected);
    const incoming = browser({
      now: 1_000_500,
      session: JSON.stringify(saved),
    });
    incoming.bridge.restoreScroll();
    assert.deepEqual(plain(incoming.scrollCalls), [
      [{ left: expected.x, top: expected.y, behavior: "instant" }],
    ]);
  }
});

test("invalid captured coordinates are omitted without preventing refresh", () => {
  for (const point of [
    { x: Number.NaN, y: 100 },
    { x: 0, y: Number.POSITIVE_INFINITY },
    { x: "12", y: 100 },
    { x: undefined, y: 100 },
  ]) {
    const page = browser({ viewport: point });
    assert.equal(page.bridge.begin(), true);
    const saved = JSON.parse(page.storage.get(BRAND_REFRESH_MARKER)!);
    assert.equal(Object.hasOwn(saved, "viewport"), false);
    assert.equal(page.phase, "reloading");
  }
});

test("malformed stored viewports do not spoil a valid curtain or trigger a scroll override", () => {
  for (const point of [
    null,
    [],
    {},
    { x: 0 },
    { x: "0", y: 600 },
    { x: 0, y: Number.NaN },
    { x: Number.NEGATIVE_INFINITY, y: 600 },
    { x: -0.01, y: 600 },
    { x: 0, y: 10_000_000.01 },
  ]) {
    const page = browser({
      state: {
        __NA: true,
        [HISTORY_KEY]: {
          at: 999_500,
          path: "/history?view=all",
          viewport: point,
        },
      },
    });
    assert.equal(page.phase, "restoring");
    page.bridge.restoreScroll();
    assert.equal(page.scrollCalls.length, 0);
    assert.equal(
      Object.hasOwn(
        JSON.parse(page.storage.get(BRAND_REFRESH_MARKER)!),
        "viewport",
      ),
      false,
    );
  }
});

test("cold links and legacy handoff markers keep their existing scroll policy", () => {
  const cold = browser();
  cold.bridge.restoreScroll();
  assert.equal(cold.phase, "idle");
  assert.equal(cold.scrollCalls.length, 0);
  const legacy = browser({ session: marker(999_500) });
  legacy.bridge.restoreScroll();
  assert.equal(legacy.phase, "restoring");
  assert.equal(legacy.scrollCalls.length, 0);
  assert.equal(legacy.window.location.hash, "#logged-intakes");
});

test("scroll restoration uses a numeric fallback if options are unsupported and never retries twice", () => {
  const saved = JSON.stringify({
    at: 999_500,
    path: "/history?view=all",
    viewport: { x: 20, y: 600 },
  });
  const page = browser({ session: saved, objectScrollThrows: true });
  assert.doesNotThrow(() => page.bridge.restoreScroll());
  assert.deepEqual(plain(page.scrollCalls), [
    [{ left: 20, top: 600, behavior: "instant" }],
    [20, 600],
  ]);
  page.bridge.restoreScroll();
  assert.equal(page.scrollCalls.length, 2);
  const unavailable = browser({ session: saved, scrollThrows: true });
  assert.doesNotThrow(() => unavailable.bridge.restoreScroll());
  unavailable.bridge.restoreScroll();
  assert.equal(unavailable.scrollCalls.length, 2);
});

test("finish, cancel and deadline discard an unused viewport as well as its marker", () => {
  const saved = JSON.stringify({
    at: 999_500,
    path: "/history?view=all",
    viewport: { x: 0, y: 600 },
  });
  for (const release of ["finish", "cancel", "deadline"] as const) {
    const page = browser({ session: saved });
    if (release === "deadline") page.advance(23_000);
    else page.bridge[release]();
    page.bridge.restoreScroll();
    assert.equal(page.scrollCalls.length, 0);
    assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
    assert.equal(Object.hasOwn(page.state as object, HISTORY_KEY), false);
    const next = browser({ state: page.state });
    next.bridge.restoreScroll();
    assert.equal(next.phase, "idle");
    assert.equal(next.scrollCalls.length, 0);
  }
});

test("fast finish preserves the original 3000ms entrance and charged loop, then exits once for 600ms", () => {
  const page = browser({ session: marker(999_400) });
  page.attributes.set("data-unrelated", "keep");
  page.styles.set("--unrelated", "keep");
  page.bridge.finish();
  assert.equal(page.phase, "restoring");
  assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
  assert.equal(Object.hasOwn(page.state as object, HISTORY_KEY), false);
  assert.equal(page.styles.get(SPIN_DELAY), "-600ms");
  assert.equal(page.styles.get(ELAPSED), "-600ms");
  assert.equal(page.timers.size, 2, "entrance hold keeps the deadline alive");
  page.advance(100);
  page.bridge.finish();
  page.advance(2299);
  assert.equal(page.phase, "restoring", "finish does not restart the entrance");
  page.advance(1);
  assert.equal(page.phase, "fading");
  assert.equal(page.timers.size, 2, "exit keeps the same deadline alive");
  page.advance(100);
  page.bridge.finish();
  page.advance(499);
  assert.equal(
    page.phase,
    "fading",
    "duplicate finish must not reset the fade timer",
  );
  page.advance(1);
  assert.equal(page.phase, "idle");
  assert.equal(page.styles.has(SPIN_DELAY), false);
  assert.equal(page.styles.has(TABLET_DELAY), false);
  assert.equal(page.styles.has(ELAPSED), false);
  assert.equal(page.attributes.get("data-unrelated"), "keep");
  assert.equal(page.styles.get("--unrelated"), "keep");
  assert.equal(page.storage.get("unrelated-draft"), "keep this value");
  assert.deepEqual(page.phaseEvents, ["restoring", "fading", "idle"]);
  assert.equal(page.timers.size, 0);
});

test("a fast cross-document handoff counts the outgoing entrance instead of restarting it", () => {
  const outgoing = browser();
  outgoing.bridge.begin();
  outgoing.advance(PAGE_REFRESH_SEQUENCE.outgoingHold);
  const incoming = browser({
    now: 1_001_550,
    session: outgoing.storage.get(BRAND_REFRESH_MARKER),
    state: outgoing.state,
  });
  assert.equal(incoming.styles.get(ELAPSED), "-1550ms");
  incoming.advance(50);
  incoming.bridge.finish();
  incoming.advance(1399);
  assert.equal(incoming.phase, "restoring");
  incoming.advance(1);
  assert.equal(incoming.phase, "fading");
  incoming.advance(599);
  assert.equal(incoming.phase, "fading");
  incoming.advance(1);
  assert.equal(incoming.phase, "idle");
});

test("slow loads keep raw full elapsed phase and add only the 600ms exit", () => {
  for (const elapsed of [3000, 3001, 4800, 29_750, 59_999]) {
    const page = browser({ session: marker(1_000_000 - elapsed) });
    assert.equal(page.styles.get(ELAPSED), `-${elapsed}ms`);
    page.bridge.finish();
    assert.equal(page.phase, "fading", `elapsed ${elapsed}ms`);
    page.advance(599);
    assert.equal(page.phase, "fading");
    page.advance(1);
    assert.equal(page.phase, "idle");
    assert.equal(page.styles.size, 0);
  }
});

test("reduced motion finishes directly without an entrance hold or fade task", () => {
  const page = browser({ reducedMotion: true, session: marker(999_500) });
  page.bridge.finish();
  assert.equal(page.phase, "idle");
  assert.equal(page.timers.size, 0);
  assert.deepEqual(page.phaseEvents, ["restoring", "idle"]);
});

test("hidden documents pause only decorative motion while the original hold and safety clocks keep running", () => {
  const idle = browser();
  idle.setHidden(true);
  assert.equal(idle.phase, "idle");
  assert.equal(idle.styles.size, 0);
  assert.equal(idle.timers.size, 0);

  const page = browser({ hidden: true, session: marker(999_400) });
  assert.equal(page.styles.get("--page-refresh-visibility"), "paused");
  const elapsed = page.styles.get(ELAPSED);
  const deadline = [...page.timers.values()][0];
  const writes = page.historyWrites.length;
  page.advance(100);
  page.setHidden(false);
  assert.equal(page.styles.get("--page-refresh-visibility"), "running");
  page.setHidden(true);
  assert.equal(page.styles.get("--page-refresh-visibility"), "paused");
  assert.equal(
    page.styles.get(ELAPSED),
    elapsed,
    "visibility never restarts arrival or loops",
  );
  assert.equal(page.historyWrites.length, writes);
  assert.deepEqual(page.phaseEvents, ["restoring"]);
  assert.ok([...page.timers.values()].includes(deadline));
  page.bridge.finish();
  page.advance(2299);
  assert.equal(page.phase, "restoring");
  page.advance(1);
  assert.equal(page.phase, "fading");
  page.advance(599);
  assert.equal(page.phase, "fading");
  page.advance(1);
  assert.equal(page.phase, "idle", "hidden animation cannot trap the curtain");
  assert.equal(page.styles.size, 0);
  assert.equal(page.timers.size, 0);
  page.setHidden(false);
  assert.equal(page.styles.size, 0);
  assert.equal(page.timers.size, 0);
});

test("reduced motion can skip an already pending entrance or remaining exit", () => {
  for (const when of ["entrance callback", "repeat finish", "during exit"]) {
    const page = browser({ session: marker(999_500) });
    page.bridge.finish();
    if (when === "during exit") page.advance(2500);
    page.setReducedMotion(true);
    if (when === "entrance callback") page.advance(2500);
    else page.bridge.finish();
    assert.equal(page.phase, "idle", when);
    assert.equal(page.timers.size, 0);
    assert.equal(page.styles.size, 0);
    page.advance(30_000);
    assert.equal(page.phase, "idle");
  }
});

test("the original deadline survives finish during entrance holding and exit", () => {
  for (const holding of [false, true]) {
    const page = browser({ session: marker(999_500) });
    const deadline = [...page.timers.values()][0];
    page.advance(22_900);
    if (holding) page.shiftClock(-23_400);
    page.bridge.finish();
    assert.equal(page.phase, holding ? "restoring" : "fading");
    assert.ok([...page.timers.values()].includes(deadline));
    page.advance(99);
    assert.notEqual(page.phase, "idle");
    page.advance(1);
    assert.equal(page.phase, "idle");
    assert.equal(page.timers.size, 0);
    assert.equal(page.styles.size, 0);
    page.advance(2000);
    assert.equal(page.phase, "idle", "no late entrance may reactivate a cover");
  }
});

test("clock corrections cannot restart a long arrival or make a finish hold unbounded", () => {
  for (const offset of [-3_600_000, 3_600_000]) {
    const page = browser({ session: marker(999_500) });
    page.shiftClock(offset);
    page.bridge.finish();
    assert.equal(page.phase, offset < 0 ? "restoring" : "fading");
    if (offset < 0) page.advance(3000);
    assert.equal(page.phase, "fading");
    page.advance(600);
    assert.equal(page.phase, "idle");
  }
});

test("cancelling a pending entrance or exit cannot interfere with a later refresh", () => {
  for (const stage of ["entrance", "exit"]) {
    const page = browser({ session: marker(999_500) });
    page.bridge.finish();
    page.advance(stage === "entrance" ? 100 : 2600);
    page.bridge.cancel();
    assert.equal(page.timers.size, 0);
    assert.equal(page.bridge.begin(), true);
    assert.equal(page.styles.get(ELAPSED), "0ms");
    page.bridge.finish();
    page.advance(2999);
    assert.equal(page.phase, "reloading");
    page.advance(1);
    assert.equal(page.phase, "fading");
    page.advance(600);
    assert.equal(page.phase, "idle");
    assert.equal(page.timers.size, 0);
  }
});

test("a refresh with unavailable storage still follows its in-memory entrance and exit clock", () => {
  const page = browser({ storageDenied: true, historyDenied: true });
  page.bridge.begin();
  page.advance(100);
  page.bridge.finish();
  page.advance(2899);
  assert.equal(page.phase, "reloading");
  page.advance(1);
  assert.equal(page.phase, "fading");
  page.advance(600);
  assert.equal(page.phase, "idle");
});

test("a React-independent 23-second deadline releases even an unhydrated incoming document", () => {
  const page = browser({ session: marker(999_500) });
  page.advance(22_999);
  assert.equal(page.phase, "restoring");
  page.advance(1);
  assert.equal(page.phase, "idle");
  assert.equal(page.styles.size, 0);
  assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
  assert.equal(Object.hasOwn(page.state as object, HISTORY_KEY), false);
  assert.deepEqual(page.phaseEvents, ["restoring", "idle"]);
});

test("cancel and persisted pageshow remove stale covers and pending timers", () => {
  for (const stage of ["restoring", "holding", "fading"]) {
    const page = browser({ session: marker(999_500) });
    if (stage !== "restoring") page.bridge.finish();
    if (stage === "fading") page.advance(2500);
    const event = new Event("pageshow");
    Object.defineProperty(event, "persisted", { value: true });
    page.window.dispatchEvent(event);
    assert.equal(page.phase, "idle");
    assert.equal(page.timers.size, 0);
    assert.equal(page.styles.size, 0);
    assert.equal(page.storage.has(BRAND_REFRESH_MARKER), false);
    page.advance(30_000);
    assert.equal(page.phase, "idle");
    assert.equal(
      page.bridge.begin(),
      true,
      "a stale cover must not disable later refreshes",
    );
  }
  const page = browser({ session: marker(999_500) });
  page.window.dispatchEvent(new Event("pageshow"));
  assert.equal(
    page.phase,
    "restoring",
    "ordinary pageshow is not a BFCache return",
  );
  page.bridge.cancel();
  assert.equal(page.phase, "idle");
});

test("missing storage and history never throw or prevent an outgoing refresh", () => {
  const page = browser({ storageDenied: true, historyDenied: true });
  assert.equal(page.phase, "idle");
  assert.equal(page.bridge.begin(), true);
  assert.equal(page.phase, "reloading");
  assert.doesNotThrow(() => page.bridge.cancel());
  assert.equal(page.phase, "idle");
});

test("running the boot script twice does not reset its phase, timers or event listeners", () => {
  const page = browser({ session: marker(999_500) });
  const firstBridge = page.bridge;
  const firstTimer = [...page.timers.keys()];
  page.run();
  assert.equal(page.bridge, firstBridge);
  assert.deepEqual([...page.timers.keys()], firstTimer);
  assert.deepEqual(page.phaseEvents, ["restoring"]);
});

test("client helpers are SSR-safe and subscribe to the same prepaint bridge", () => {
  assert.equal(getPageRefreshPhase(), "idle");
  assert.equal(getServerPageRefreshPhase(), "idle");
  assert.equal(beginPageRefresh(), false);
  assert.doesNotThrow(finishPageRefresh);
  assert.doesNotThrow(cancelPageRefresh);
  assert.doesNotThrow(restorePageRefreshScroll);
  assert.doesNotThrow(() => subscribePageRefresh(() => {})());

  const page = browser();
  const globals = ["window", "document"] as const;
  const previous = globals.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: page.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: page.document,
  });
  try {
    let notifications = 0;
    const unsubscribe = subscribePageRefresh(() => notifications++);
    assert.equal(beginPageRefresh(), true);
    assert.equal(getPageRefreshPhase(), "reloading");
    assert.equal(getPageEntryReadiness(), false);
    finishPageRefresh();
    assert.equal(getPageRefreshPhase(), "reloading");
    page.advance(2999);
    assert.equal(getPageEntryReadiness(), false);
    page.advance(1);
    assert.equal(getPageRefreshPhase(), "fading");
    assert.equal(getPageEntryReadiness(), false);
    page.advance(599);
    assert.equal(getPageEntryReadiness(), false);
    page.advance(1);
    assert.equal(getPageRefreshPhase(), "idle");
    assert.equal(getPageEntryReadiness(), true);
    assert.equal(notifications, 3);
    unsubscribe();
    beginPageRefresh();
    cancelPageRefresh();
    assert.equal(notifications, 3);
    assert.equal(getServerPageRefreshPhase(), "idle");
  } finally {
    globals.forEach((key, index) => {
      const descriptor = previous[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
