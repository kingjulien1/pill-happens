import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import {
  APPEARANCE_BOOT_SCRIPT,
  APPEARANCE_CHANGE_EVENT,
  APPEARANCE_STORAGE_KEY,
  normalizeAppearance,
  resolveAppearance,
} from "./appearance";
import { APP_THEME_VALUES } from "./app-theme";

function browser({
  stored,
  dark = false,
  denied = false,
  noMedia = false,
}: {
  stored?: string;
  dark?: boolean;
  denied?: boolean;
  noMedia?: boolean;
} = {}) {
  const storage = new Map<string, string>();
  if (stored !== undefined) storage.set(APPEARANCE_STORAGE_KEY, stored);
  const localStorage = {
    getItem(key: string) {
      if (denied) throw new Error("blocked");
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (denied) throw new Error("blocked");
      storage.set(key, value);
    },
  };
  const root = {
    dataset: { pageRefreshActive: "reloading" } as Record<string, string>,
    style: {} as Record<string, string>,
  };
  const metas = [{ content: "old light" }, { content: "old dark" }];
  const media = Object.assign(new EventTarget(), { matches: dark });
  const window = Object.assign(new EventTarget(), {
    localStorage,
    matchMedia() {
      if (noMedia) throw new Error("unavailable");
      return media;
    },
    __pillAppearance: undefined as unknown as {
      version: number;
      getSnapshot(): {
        preference: string;
        resolved: string;
        persisted: boolean;
      };
      setPreference(mode: string): void;
    },
  });
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    readyState: "loading",
    querySelectorAll: () => metas,
  });
  const boot = () =>
    vm.runInNewContext(APPEARANCE_BOOT_SCRIPT, { window, document, Event });
  boot();
  return {
    window,
    document,
    root,
    media,
    metas,
    storage,
    boot,
    state: () => window.__pillAppearance.getSnapshot(),
    set: (mode: string) => window.__pillAppearance.setPreference(mode),
    os(dark: boolean) {
      media.matches = dark;
      media.dispatchEvent(new Event("change"));
    },
    remote(
      value: string | null,
      key: string | null = APPEARANCE_STORAGE_KEY,
      area: unknown = localStorage,
    ) {
      window.dispatchEvent(
        Object.assign(new Event("storage"), {
          key,
          newValue: value,
          storageArea: area,
        }),
      );
    },
  };
}

test("appearance normalization and resolution accept only the three documented choices", () => {
  for (const invalid of [undefined, null, 1, {}, "DARK", '"dark"', "auto"])
    assert.equal(normalizeAppearance(invalid), "system");
  for (const mode of ["light", "dark", "system"] as const)
    assert.equal(normalizeAppearance(mode), mode);
  assert.equal(resolveAppearance("system", true), "dark");
  assert.equal(resolveAppearance("system", false), "light");
  assert.equal(resolveAppearance("dark", false), "dark");
  assert.equal(resolveAppearance("light", true), "light");
});

test("serialized prepaint bootstrap is self-contained and restores a manual choice against the OS", () => {
  const b = browser({ stored: "light", dark: true });
  assert.equal(b.state().preference, "light");
  assert.equal(b.state().resolved, "light");
  assert.equal(b.state().persisted, true);
  assert.equal(b.root.dataset.colorMode, "light");
  assert.equal(b.root.dataset.colorPreference, "light");
  assert.equal(b.root.style.colorScheme, "light");
  assert.equal(b.root.dataset.pageRefreshActive, "reloading");
  assert.ok(
    b.metas.every((m) => m.content === APP_THEME_VALUES.light.background),
  );
  b.set("dark");
  assert.equal(b.storage.get(APPEARANCE_STORAGE_KEY), "dark");
  assert.ok(
    b.metas.every((m) => m.content === APP_THEME_VALUES.dark.background),
  );
  assert.equal(
    browser({
      stored: b.storage.get(APPEARANCE_STORAGE_KEY),
      dark: false,
    }).state().resolved,
    "dark",
  );
});

test("system preference follows OS changes immediately while a manual preference remains stable", () => {
  const b = browser();
  b.os(true);
  assert.equal(b.state().resolved, "dark");
  b.os(false);
  assert.equal(b.state().resolved, "light");
  b.set("dark");
  const snapshot = b.state();
  b.os(true);
  b.os(false);
  assert.equal(b.state(), snapshot);
  b.set("system");
  assert.equal(b.state().resolved, "light");
  b.os(true);
  assert.equal(b.state().resolved, "dark");
});

test("storage denial retains session choices and reports them as unpersisted", () => {
  const b = browser({ denied: true, dark: true });
  assert.equal(b.state().preference, "system");
  assert.equal(b.state().resolved, "dark");
  assert.equal(b.state().persisted, false);
  b.set("light");
  assert.equal(b.state().resolved, "light");
  assert.equal(b.state().persisted, false);
  b.os(true);
  assert.equal(b.state().resolved, "light");
});

test("cross-tab changes and storage clearing synchronize without processing unrelated stores", () => {
  const b = browser({ dark: true });
  b.remote("light");
  assert.equal(b.state().resolved, "light");
  b.remote("dark", "journal-data");
  assert.equal(b.state().resolved, "light");
  b.remote("dark", APPEARANCE_STORAGE_KEY, {});
  assert.equal(b.state().resolved, "light");
  b.remote(null, null);
  assert.equal(b.state().preference, "system");
  assert.equal(b.state().resolved, "dark");
  b.remote("not a choice");
  assert.equal(b.state().preference, "system");
});

test("bootstrap is idempotent, keeps snapshot identity stable and synchronizes late metadata", () => {
  const b = browser({ stored: "dark" });
  const bridge = b.window.__pillAppearance;
  const snapshot = b.state();
  let events = 0;
  b.window.addEventListener(APPEARANCE_CHANGE_EVENT, () => events++);
  b.boot();
  assert.equal(b.window.__pillAppearance, bridge);
  b.set("dark");
  assert.equal(b.state(), snapshot);
  assert.equal(events, 0);
  b.set("light");
  assert.equal(events, 1);
  b.metas.push({ content: "late" });
  b.document.dispatchEvent(new Event("DOMContentLoaded"));
  assert.ok(
    b.metas.every((m) => m.content === APP_THEME_VALUES.light.background),
  );
  assert.equal(browser({ noMedia: true }).state().resolved, "light");
});

const require = createRequire(import.meta.url);
const postcss = require("postcss") as typeof import("postcss").default;
const appearancePlugin = require("../../scripts/postcss-appearance.cjs");
const transform = async (css: string, from = "global.css") =>
  (await postcss([appearancePlugin()]).process(css, { from })).css;

test("CSS adapts global palettes with zero-specificity resolved-mode guards and an OS fallback", async () => {
  const css = await transform(
    "@media (prefers-color-scheme: dark){:root{--paper:ink}.card,.card:hover{color:peach}}",
  );
  assert.match(css, /:root:where\(\[data-color-mode="dark"\]\)/);
  assert.match(css, /:where\(html\[data-color-mode="dark"\]\) \.card/);
  assert.match(css, /:where\(html:not\(\[data-color-mode\]\)\) \.card/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.equal((css.match(/--paper:ink/g) || []).length, 2);
  assert.equal((css.match(/color:peach/g) || []).length, 2);
});

test("CSS Modules preserve local selectors and global mode guards without splitting functional commas", async () => {
  const css = await transform(
    '@media(prefers-color-scheme:light){:is(.one,.two),[data-name="a,b"]{color:ink}}',
    "card.module.css",
  );
  assert.match(
    css,
    /:global\(:where\(html\[data-color-mode="light"\]\)\) :is\(\.one,\.two\)/,
  );
  assert.match(
    css,
    /:global\(:where\(html\[data-color-mode="light"\]\)\) \[data-name="a,b"\]/,
  );
});

test("nested Tailwind color media keeps its declarations conditional; unrelated media remains intact", async () => {
  const css = await transform(
    ".dark\\:card{@media(prefers-color-scheme:dark){background:ink;&:hover{color:peach}}}@media(max-width:400px){.card{width:100%}}",
  );
  assert.match(
    css,
    /:where\(html\[data-color-mode="dark"\]\) &\{background:ink/,
  );
  assert.match(
    css,
    /:where\(html:not\(\[data-color-mode\]\)\) &\{background:ink/,
  );
  assert.match(css, /@media\(max-width:400px\)\{\.card\{width:100%\}\}/);
});
