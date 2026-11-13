import { LOADING_SCREEN_LINKS } from "./loading-screen-content";

/** Cosmetic head program. No React-owned text, children, or attributes change. */
export const LOADING_SCREEN_ORNAMENTS_SCRIPT = String.raw`
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  var root = document.documentElement;
  if (!root || window.__pillLoadingOrnaments) return;
  window.__pillLoadingOrnaments = true;
  var links = ${JSON.stringify(LOADING_SCREEN_LINKS).replace(/</g, "\\u003c")};
  var request = null;
  var selectedSeed = 0;
  var frame = 0;
  var waiting = null;

  function random(seed) {
    var state = seed >>> 0;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }
  function routePath(value) {
    return value.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  }
  function active() { return root.hasAttribute("data-page-refresh-active"); }
  function setLinks(seed) {
    var next = random(seed);
    var origin = routePath(window.location.pathname);
    var pool = links.filter(function (link) {
      var path = routePath(link.href);
      return origin !== path && !(path !== "/" && origin.indexOf(path + "/") === 0);
    });
    var first = pool.splice(Math.floor(next() * pool.length), 1)[0];
    var second = pool[Math.floor(next() * pool.length)];
    root.setAttribute("data-page-refresh-link-one", first.id);
    root.setAttribute("data-page-refresh-link-two", second.id);
  }
  function box(element, padding) {
    var rect = element.getBoundingClientRect();
    return { left: rect.left - padding, right: rect.right + padding,
      top: rect.top - padding, bottom: rect.bottom + padding };
  }
  function placePills() {
    frame = 0;
    if (!active()) return;
    var screen = document.querySelector("[data-page-refresh-screen]");
    if (!screen) return;
    var art = screen.querySelector("[data-refresh-art]");
    var copy = screen.querySelector("[data-refresh-copy]");
    var footer = screen.querySelector("[data-refresh-footer]");
    if (!art || !copy || !footer) return;
    if (waiting) { waiting.disconnect(); waiting = null; }
    var width = root.clientWidth || window.innerWidth;
    var height = window.innerHeight;
    var excluded = [box(art, 62), box(copy, 22), box(footer, 22)];
    var next = random(selectedSeed ^ 0x50494c4c);
    var placed = [];
    function clear(x, y, radius) {
      return !excluded.some(function (rect) {
        return x + radius > rect.left && x - radius < rect.right &&
          y + radius > rect.top && y - radius < rect.bottom;
      }) && !placed.some(function (point) {
        return Math.hypot(point.x - x, point.y - y) < 34;
      });
    }
    for (var i = 0; i < 8; i++) {
      var size = 14 + Math.floor(next() * 7);
      var radius = size * 0.75;
      var x = 24, y = 36, found = false;
      for (var attempt = 0; attempt < 300; attempt++) {
        x = 24 + next() * Math.max(0, width - 48);
        y = 36 + next() * Math.max(0, height - 72);
        if (clear(x, y, radius)) { found = true; break; }
      }
      if (!found) {
        for (var row = 32; row < height - 24 && !found; row += 28) {
          for (var col = 24; col < width - 20; col += 28) {
            if (clear(col, row, radius)) { x = col; y = row; found = true; break; }
          }
        }
      }
      // A very small viewport can opt out of a slot rather than cover content.
      root.style.setProperty("--refresh-pill-visible-" + i, found ? "visible" : "hidden");
      root.style.setProperty("--refresh-pill-x-" + i, x.toFixed(2) + "px");
      root.style.setProperty("--refresh-pill-y-" + i, y.toFixed(2) + "px");
      root.style.setProperty("--refresh-pill-size-" + i, size + "px");
      root.style.setProperty("--refresh-pill-spin-" + i, next() > 0.5 ? "1" : "-1");
      root.style.setProperty("--refresh-pill-angle-" + i, Math.floor(next() * 360) + "deg");
      if (found) placed.push({ x: x, y: y });
    }
    root.setAttribute("data-page-refresh-pills-ready", "true");
  }
  function scheduleLayout() {
    if (!active() || frame) return;
    frame = window.requestAnimationFrame(placePills);
  }
  function sync() {
    if (!active()) {
      request = null;
      root.removeAttribute("data-page-refresh-pills-ready");
      root.removeAttribute("data-page-refresh-link-one");
      root.removeAttribute("data-page-refresh-link-two");
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (waiting) { waiting.disconnect(); waiting = null; }
      return;
    }
    var current = root.getAttribute("data-page-refresh-request") || "initial";
    if (request !== current) {
      request = current;
      selectedSeed = Number(current) || Date.now();
      root.removeAttribute("data-page-refresh-pills-ready");
      setLinks(selectedSeed);
    }
    scheduleLayout();
    if (!document.querySelector("[data-page-refresh-screen]") && !waiting) {
      waiting = new MutationObserver(scheduleLayout);
      waiting.observe(root, { childList: true, subtree: true });
    }
  }
  var phases = new MutationObserver(sync);
  phases.observe(root, { attributes: true, attributeFilter: ["data-page-refresh-active", "data-page-refresh-request"] });
  window.addEventListener("pill:page-refresh-change", sync);
  window.addEventListener("resize", scheduleLayout);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleLayout);
  document.addEventListener("DOMContentLoaded", sync, { once: true });
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target && event.target.closest ? event.target.closest("[data-loading-link]") : null;
    if (!link || !link.closest("[data-page-refresh-screen]")) return;
    var bridge = window.__pillPageRefresh;
    if (bridge && typeof bridge.cancel === "function") bridge.cancel();
  });
  sync();
})();
`;
