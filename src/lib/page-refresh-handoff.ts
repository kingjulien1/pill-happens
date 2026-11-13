import {
  BRAND_REFRESH_MARKER,
  BRAND_REFRESH_MARKER_TTL,
} from "./brand-refresh";

export type PageRefreshPhase = "idle" | "reloading" | "restoring" | "fading";

const PHASE_ATTRIBUTE = "data-page-refresh-active";
const CHANGE_EVENT = "pill:page-refresh-change";
const BRIDGE_NAME = "__pillPageRefresh";
/** One cross-document clock gives the stationary brand sequence time to resolve. */
export const PAGE_REFRESH_SEQUENCE = Object.freeze({
  threshold: 1_200,
  settle: 960,
  loading: 2_160,
  minimumVisible: 3_000,
  exit: 600,
  outgoingHold: 1_500,
});
const configuration = {
  marker: BRAND_REFRESH_MARKER,
  ttl: BRAND_REFRESH_MARKER_TTL,
  historyKey: "__pillPageRefresh",
  bridge: BRIDGE_NAME,
  attribute: PHASE_ATTRIBUTE,
  event: CHANGE_EVENT,
  deadline: 23_000,
  minimumVisible: PAGE_REFRESH_SEQUENCE.minimumVisible,
  fade: PAGE_REFRESH_SEQUENCE.exit,
  spinPeriod: 1_400,
  tabletPeriod: 4_800,
  viewportLimit: 10_000_000,
};

/**
 * Runs in the document head, before the incoming body can paint. Keep this raw
 * program self-contained: serializing a compiled function could introduce
 * minifier helpers or references to a module closure that does not exist here.
 * Only a route, timestamp, viewport and cosmetic phase cross the reload.
 */
export const PAGE_REFRESH_BOOT_SCRIPT = `
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var config = ${JSON.stringify(configuration).replace(/</g, "\\u003c")};
  var root = document.documentElement;
  if (!root || (window[config.bridge] && window[config.bridge].version === 1)) return;
  var finishTimer = 0;
  var fadeTimer = 0;
  var deadlineTimer = 0;
  var restorePoint = null;
  var startedAt = 0;

  function phase() {
    var value = root.getAttribute(config.attribute);
    return value === "reloading" || value === "restoring" || value === "fading" ? value : "idle";
  }
  function notify(previous) {
    if (phase() !== previous) window.dispatchEvent(new window.Event(config.event));
  }
  function currentPath() {
    return window.location.pathname + window.location.search;
  }
  function isLogin() {
    return window.location.pathname === "/login" || window.location.pathname.indexOf("/login/") === 0;
  }
  function historyState() {
    try {
      var state = window.history.state;
      return state === null || (state && typeof state === "object" && !Array.isArray(state)) ? state : undefined;
    } catch (_) {
      return undefined;
    }
  }
  function viewport(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (typeof value.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    if (value.x < 0 || value.y < 0 || value.x > config.viewportLimit || value.y > config.viewportLimit) return null;
    return { x: value.x, y: value.y };
  }
  function marker(value, now) {
    try {
      var item = typeof value === "string" ? JSON.parse(value) : value;
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      if (item.path !== currentPath() || typeof item.at !== "number" || !Number.isFinite(item.at)) return null;
      if (item.at > now || now - item.at >= config.ttl) return null;
      var result = { at: item.at, path: item.path };
      var point = viewport(item.viewport);
      if (point) result.viewport = point;
      return result;
    } catch (_) {
      return null;
    }
  }
  function storedMarker(now) {
    var session = null;
    var history = null;
    try { session = marker(window.sessionStorage.getItem(config.marker), now); } catch (_) {}
    var state = historyState();
    if (state) history = marker(state[config.historyKey], now);
    if (!session) return history;
    if (!history) return session;
    return session.at >= history.at ? session : history;
  }
  function storeMarker(value) {
    try { window.sessionStorage.setItem(config.marker, JSON.stringify(value)); } catch (_) {}
    var state = historyState();
    if (state !== undefined) {
      try {
        var next = Object.assign({}, state || {});
        next[config.historyKey] = value;
        window.history.replaceState(next, "");
      } catch (_) {}
    }
  }
  function clearMarkers() {
    try { window.sessionStorage.removeItem(config.marker); } catch (_) {}
    var state = historyState();
    if (state && Object.prototype.hasOwnProperty.call(state, config.historyKey)) {
      try {
        var next = Object.assign({}, state);
        delete next[config.historyKey];
        window.history.replaceState(next, "");
      } catch (_) {}
    }
  }
  function clearTimers() {
    window.clearTimeout(finishTimer);
    window.clearTimeout(fadeTimer);
    window.clearTimeout(deadlineTimer);
    finishTimer = 0;
    fadeTimer = 0;
    deadlineTimer = 0;
  }
  function clearPaint() {
    root.removeAttribute(config.attribute);
    root.removeAttribute("data-page-refresh-request");
    root.style.removeProperty("--page-refresh-elapsed");
    root.style.removeProperty("--page-refresh-spin-delay");
    root.style.removeProperty("--page-refresh-tablet-delay");
    root.style.removeProperty("--page-refresh-visibility");
  }
  function syncVisibility() {
    if (phase() === "idle") return;
    root.style.setProperty("--page-refresh-visibility", document.hidden ? "paused" : "running");
  }
  function cancel() {
    var previous = phase();
    clearTimers();
    clearMarkers();
    clearPaint();
    restorePoint = null;
    startedAt = 0;
    notify(previous);
  }
  function activate(nextPhase, value, now) {
    var previous = phase();
    clearTimers();
    restorePoint = nextPhase === "restoring" ? value.viewport || null : null;
    startedAt = value.at;
    var elapsed = Math.max(0, now - value.at);
    // Finite phases and ambient loops share the original clock across documents.
    root.style.setProperty("--page-refresh-elapsed", String(-elapsed) + "ms");
    root.style.setProperty("--page-refresh-spin-delay", String(-(elapsed % config.spinPeriod)) + "ms");
    root.style.setProperty("--page-refresh-tablet-delay", String(-(elapsed % config.tabletPeriod)) + "ms");
    root.setAttribute("data-page-refresh-request", String(value.at));
    root.setAttribute(config.attribute, nextPhase);
    syncVisibility();
    deadlineTimer = window.setTimeout(cancel, config.deadline);
    notify(previous);
  }
  function begin() {
    if (phase() !== "idle" || isLogin()) return false;
    var now = Date.now();
    var value = { at: now, path: currentPath() };
    if (typeof window.scrollX === "number" && typeof window.scrollY === "number" && Number.isFinite(window.scrollX) && Number.isFinite(window.scrollY)) {
      value.viewport = {
        x: Math.max(0, Math.min(config.viewportLimit, window.scrollX)),
        y: Math.max(0, Math.min(config.viewportLimit, window.scrollY))
      };
    }
    storeMarker(value);
    activate("reloading", value, now);
    return true;
  }
  function restoreScroll() {
    if (phase() !== "restoring" || !restorePoint) return;
    var point = restorePoint;
    restorePoint = null;
    try {
      window.scrollTo({ left: point.x, top: point.y, behavior: "instant" });
    } catch (_) {
      try { window.scrollTo(point.x, point.y); } catch (_) {}
    }
  }
  function reducedMotion() {
    try {
      return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {}
    return false;
  }
  function fade() {
    finishTimer = 0;
    if (phase() === "idle" || phase() === "fading") return;
    if (reducedMotion()) {
      cancel();
      return;
    }
    var previous = phase();
    root.setAttribute(config.attribute, "fading");
    fadeTimer = window.setTimeout(cancel, config.fade);
    notify(previous);
  }
  function finish() {
    restorePoint = null;
    clearMarkers();
    if (phase() === "idle") return;
    if (reducedMotion()) {
      cancel();
      return;
    }
    if (phase() === "fading" || finishTimer) return;
    var elapsed = Math.max(0, Date.now() - startedAt);
    var remaining = Math.max(0, config.minimumVisible - elapsed);
    // Keep the existing deadline armed through both the entrance hold and exit.
    if (remaining > 0) finishTimer = window.setTimeout(fade, remaining);
    else fade();
  }
  window[config.bridge] = { version: 1, begin: begin, finish: finish, cancel: cancel, restoreScroll: restoreScroll };
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) cancel();
  });
  document.addEventListener("visibilitychange", syncVisibility);

  var now = Date.now();
  var saved = isLogin() ? null : storedMarker(now);
  if (saved) {
    storeMarker(saved);
    activate("restoring", saved, now);
  } else {
    cancel();
  }
})();
`;

type PageRefreshBridge = {
  version: 1;
  begin: () => boolean;
  finish: () => void;
  cancel: () => void;
  restoreScroll: () => void;
};

function bridge(): PageRefreshBridge | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[BRIDGE_NAME];
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PageRefreshBridge>;
  return candidate.version === 1 &&
    typeof candidate.begin === "function" &&
    typeof candidate.finish === "function" &&
    typeof candidate.cancel === "function" &&
    typeof candidate.restoreScroll === "function"
    ? (candidate as PageRefreshBridge)
    : null;
}

export function getPageRefreshPhase(): PageRefreshPhase {
  if (typeof document === "undefined") return "idle";
  const value = document.documentElement.getAttribute(PHASE_ATTRIBUTE);
  return value === "reloading" || value === "restoring" || value === "fading"
    ? value
    : "idle";
}

/** Hydration adopts the pre-painted curtain through the external store. */
export function getServerPageRefreshPhase(): PageRefreshPhase {
  return "idle";
}

export function subscribePageRefresh(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => listener();
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function beginPageRefresh() {
  return bridge()?.begin() ?? false;
}

export function finishPageRefresh() {
  bridge()?.finish();
}

/** Restore only an intentional reload's captured viewport, never a cold link. */
export function restorePageRefreshScroll() {
  bridge()?.restoreScroll();
}

export function cancelPageRefresh() {
  bridge()?.cancel();
}
