import assert from "node:assert/strict";
import test from "node:test";
import {
  getPageEntryReadiness,
  getServerPageEntryReadiness,
  notifyPageEntryReadiness,
  subscribePageEntryReadiness,
} from "./page-entry-readiness";

const REFRESH_EVENT = "pill:page-refresh-change";
const PHASE_ATTRIBUTE = "data-page-refresh-active";
const READY_ATTRIBUTE = "data-page-entry-ready";

/** Restore descriptors as well as values, including an originally absent DOM. */
function withGlobals<T>(
  values: { window: unknown; document: unknown },
  run: () => T,
): T {
  const keys = ["window", "document"] as const;
  const descriptors = keys.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  for (const key of keys)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: values[key],
    });
  try {
    return run();
  } finally {
    keys.forEach((key, index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}

/** Only the provider attributes and actual curtain are needed to read readiness. */
function browser() {
  const window = new EventTarget();
  const rootAttributes = new Map<string, string>();
  let scopeAttributes: Map<string, string> | null = new Map([
    [READY_ATTRIBUTE, "false"],
  ]);
  const document = {
    documentElement: {
      getAttribute: (name: string) => rootAttributes.get(name) ?? null,
    },
    querySelector: () =>
      scopeAttributes && {
        getAttribute: (name: string) => scopeAttributes?.get(name) ?? null,
      },
  };
  return {
    window,
    document,
    setReady(ready: boolean) {
      scopeAttributes?.set(READY_ATTRIBUTE, String(ready));
    },
    setPhase(phase: "idle" | "reloading" | "restoring" | "fading") {
      if (phase === "idle") rootAttributes.delete(PHASE_ATTRIBUTE);
      else rootAttributes.set(PHASE_ATTRIBUTE, phase);
    },
    setBusy(busy: boolean) {
      scopeAttributes?.set("aria-busy", String(busy));
    },
    replaceScope(ready?: boolean) {
      scopeAttributes =
        ready === undefined
          ? null
          : new Map([[READY_ATTRIBUTE, String(ready)]]);
    },
    refreshEvent() {
      window.dispatchEvent(new Event(REFRESH_EVENT));
    },
    run<T>(callback: () => T) {
      return withGlobals({ window, document }, callback);
    },
  };
}

test("server snapshots stay blocked and subscriptions are safe without a DOM", () => {
  withGlobals({ window: undefined, document: undefined }, () => {
    assert.equal(getPageEntryReadiness(), false);
    assert.equal(getServerPageEntryReadiness(), false);
    let notifications = 0;
    const unsubscribe = subscribePageEntryReadiness(() => notifications++);
    assert.doesNotThrow(unsubscribe);
    assert.doesNotThrow(unsubscribe);
    assert.equal(notifications, 0);
  });
  const page = browser();
  page.setReady(true);
  page.run(() => {
    assert.equal(getPageEntryReadiness(), true);
    assert.equal(
      getServerPageEntryReadiness(),
      false,
      "hydration must adopt the paused SSR snapshot even on an already ready page",
    );
  });
});

test("public pages without a journal scope run normally once no curtain is active", () => {
  const page = browser();
  page.replaceScope();
  page.run(() => {
    assert.equal(getPageEntryReadiness(), true);
    page.setPhase("restoring");
    assert.equal(getPageEntryReadiness(), false);
    page.setPhase("idle");
    assert.equal(getPageEntryReadiness(), true);
  });
});

test("the committed provider readiness blocks a cold load even while curtain phase is idle", () => {
  const page = browser();
  page.run(() => {
    assert.equal(getPageEntryReadiness(), false);
    page.setReady(true);
    assert.equal(getPageEntryReadiness(), true);
    page.setReady(false);
    assert.equal(getPageEntryReadiness(), false);
  });
});

test("every active curtain phase overrides a stale ready provider attribute", () => {
  const page = browser();
  page.setReady(true);
  page.run(() => {
    for (const phase of ["reloading", "restoring", "fading"] as const) {
      page.setPhase(phase);
      assert.equal(getPageEntryReadiness(), false, phase);
    }
    page.setPhase("idle");
    assert.equal(getPageEntryReadiness(), true);
  });
});

test("refresh events cannot release entries before the readiness DOM commit", () => {
  const page = browser();
  page.setPhase("restoring");
  page.run(() => {
    const observed: boolean[] = [];
    const unsubscribe = subscribePageEntryReadiness(() => {
      observed.push(getPageEntryReadiness());
    });
    try {
      page.refreshEvent();
      page.setPhase("fading");
      page.refreshEvent();
      page.setPhase("idle");
      page.refreshEvent();
      assert.deepEqual(observed, [false, false, false]);
      page.setReady(true);
      notifyPageEntryReadiness();
      assert.deepEqual(observed, [false, false, false, true]);
    } finally {
      unsubscribe();
    }
  });
});

test("provider notifications read the newly committed scope rather than cached readiness", () => {
  const page = browser();
  page.run(() => {
    const observed: boolean[] = [];
    const unsubscribe = subscribePageEntryReadiness(() => {
      observed.push(getPageEntryReadiness());
    });
    try {
      page.setReady(true);
      assert.deepEqual(
        observed,
        [],
        "attribute writes alone are not store events",
      );
      notifyPageEntryReadiness();
      page.replaceScope(false);
      notifyPageEntryReadiness();
      page.setReady(true);
      notifyPageEntryReadiness();
      assert.deepEqual(observed, [true, false, true]);
    } finally {
      unsubscribe();
    }
  });
});

test("cleanup removes both event sources without removing another subscriber", () => {
  const page = browser();
  page.run(() => {
    let first = 0;
    let second = 0;
    const unsubscribeFirst = subscribePageEntryReadiness(() => first++);
    const unsubscribeSecond = subscribePageEntryReadiness(() => second++);
    try {
      notifyPageEntryReadiness();
      page.refreshEvent();
      assert.deepEqual([first, second], [2, 2]);
      unsubscribeFirst();
      unsubscribeFirst();
      notifyPageEntryReadiness();
      page.refreshEvent();
      assert.deepEqual([first, second], [2, 4]);
      unsubscribeSecond();
      notifyPageEntryReadiness();
      page.refreshEvent();
      assert.deepEqual([first, second], [2, 4]);
    } finally {
      unsubscribeFirst();
      unsubscribeSecond();
    }
  });
});

test("repeated loading commits stay blocked while ordinary busy writes leave ready entries alone", () => {
  const page = browser();
  page.run(() => {
    const observed: boolean[] = [];
    const unsubscribe = subscribePageEntryReadiness(() => {
      observed.push(getPageEntryReadiness());
    });
    try {
      for (let commit = 0; commit < 3; commit++) {
        page.setReady(false);
        page.setBusy(commit % 2 === 0);
        notifyPageEntryReadiness();
      }
      assert.deepEqual(observed, [false, false, false]);
      page.setReady(true);
      notifyPageEntryReadiness();
      for (const busy of [true, false, true]) {
        page.setBusy(busy);
        notifyPageEntryReadiness();
      }
      assert.deepEqual(observed, [false, false, false, true, true, true, true]);
    } finally {
      unsubscribe();
    }
  });
});
