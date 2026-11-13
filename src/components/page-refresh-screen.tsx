import type { CSSProperties } from "react";
import { Pill, RefreshCw } from "lucide-react";
import { getBrandThemeStyle } from "@/lib/action-button-system";
import { PAGE_REFRESH_BOOT_SCRIPT } from "@/lib/page-refresh-handoff";
import {
  LOADING_SCREEN_COPY,
  LOADING_SCREEN_LINKS,
} from "@/lib/loading-screen-content";
import { LOADING_SCREEN_ORNAMENTS_SCRIPT } from "@/lib/loading-screen-ornaments";

export const PAGE_REFRESH_CRITICAL_CSS = String.raw`/* Critical server-rendered paint. One original reload clock:
   gather0–1200ms, exact brand threshold1200–2160ms, live loop2160ms+,
   stationary600ms release. PAGE_REFRESH_SEQUENCE owns the handoff durations.
   The46px brand world is uniformly scaled2.5; only its native spring scales vary. */
.page-refresh-screen {
  --brand-surface: #1d161e;
  --brand-copy: #f9a8d4;
  --brand-tone-ice: #fbcfe8;
  --brand-tone-teal: #f472b6;
  --brand-tone-pale: #fbcfe8;
  --brand-tone-seafoam: #f472b6;
  --brand-tone-emerald: var(--color-pink-500, oklch(65.6% 0.241 354.308));
  --brand-charge-secondary: var(--brand-tone-teal);
  --brand-charge-accent: var(--brand-tone-emerald);
  --brand-charge-pearl: var(--brand-tone-pale);
  --brand-charge-ice: var(--brand-tone-ice);
  /* Resolve mixed paints before using them in border and shadow shorthands. */
  --refresh-paint-copy-p67: color-mix(in srgb, var(--brand-copy) 67%, transparent);
  --refresh-paint-copy-p10: color-mix(in srgb, var(--brand-copy) 10%, transparent);
  --refresh-paint-surface-p10: color-mix(in srgb, var(--brand-surface) 10%, transparent);
  --refresh-paint-copy-p8: color-mix(in srgb, var(--brand-copy) 8%, transparent);
  --refresh-paint-copy-a179: color-mix( in srgb, var(--brand-copy) calc(100% * 179 / 255), transparent );
  --refresh-paint-copy-p14-902: color-mix(in srgb, var(--brand-copy) 14.902%, transparent);
  --refresh-paint-copy-a112: color-mix(in srgb, var(--brand-copy) calc(100% * 112 / 255), transparent);
  --refresh-paint-copy-p27-059: color-mix(in srgb, var(--brand-copy) 27.059%, transparent);
  --refresh-paint-copy-a31: color-mix(in srgb, var(--brand-copy) calc(100% * 31 / 255), transparent);
  --refresh-paint-copy-a38: color-mix(in srgb, var(--brand-copy) calc(100% * 38 / 255), transparent);
  --refresh-paint-charge-secondary-p28: color-mix(in srgb, var(--brand-charge-secondary) 28%, transparent);
  --refresh-paint-charge-accent-p18: color-mix(in srgb, var(--brand-charge-accent) 18%, transparent);
  --refresh-paint-copy-a115: color-mix(in srgb, var(--brand-copy) calc(100% * 115 / 255), transparent);
  --refresh-paint-charge-pearl-p22: color-mix(in srgb, var(--brand-charge-pearl) 22%, transparent);
  --refresh-paint-copy-a23: color-mix(in srgb, var(--brand-copy) calc(100% * 23 / 255), transparent);
  --refresh-paint-charge-secondary-p30: color-mix(in srgb, var(--brand-charge-secondary) 30%, transparent);
  --refresh-paint-charge-ice-p72: color-mix(in srgb, var(--brand-charge-ice) 72%, transparent);
  --refresh-paint-tone-seafoam-a54: color-mix(in srgb, var(--brand-tone-seafoam) calc(100% * 54 / 255), transparent);
  --refresh-paint-copy-a48: color-mix(in srgb, var(--brand-copy) calc(100% * 48 / 255), transparent);
  --refresh-paint-charge-accent-p16: color-mix(in srgb, var(--brand-charge-accent) 16%, transparent);
  --refresh-paint-copy-a56: color-mix(in srgb, var(--brand-copy) calc(100% * 56 / 255), transparent);
  --refresh-paint-charge-accent-p24: color-mix(in srgb, var(--brand-charge-accent) 24%, transparent);
  --refresh-paint-charge-secondary-p22: color-mix(in srgb, var(--brand-charge-secondary) 22%, transparent);
  --refresh-paint-copy-a50: color-mix(in srgb, var(--brand-copy) calc(100% * 50 / 255), transparent);
  --refresh-paint-charge-secondary-p31: color-mix(in srgb, var(--brand-charge-secondary) 31%, transparent);
  --refresh-paint-copy-p7-843: color-mix(in srgb, var(--brand-copy) 7.843%, transparent);
  --refresh-paint-copy-a53: color-mix(in srgb, var(--brand-copy) calc(100% * 53 / 255), transparent);
  --refresh-paint-copy-a140: color-mix( in srgb, var(--brand-copy) calc(100% * 140 / 255), transparent );
  --refresh-paint-copy-p40: color-mix(in srgb, var(--brand-copy) 40%, transparent);
  --refresh-paint-copy-a102: color-mix( in srgb, var(--brand-copy) calc(100% * 102 / 255), transparent );
  --refresh-paint-tone-pale-a64: color-mix( in srgb, var(--brand-tone-pale) calc(100% * 64 / 255), transparent );
  --refresh-paint-tone-seafoam-a48: color-mix( in srgb, var(--brand-tone-seafoam) calc(100% * 48 / 255), transparent );
  --refresh-paint-tone-teal-a31: color-mix( in srgb, var(--brand-tone-teal) calc(100% * 31 / 255), transparent );
  --refresh-paint-copy-a77: color-mix(in srgb, var(--brand-copy) calc(100% * 77 / 255), transparent);
  --refresh-paint-tone-ice-a69: color-mix( in srgb, var(--brand-tone-ice) calc(100% * 69 / 255), transparent );
  --refresh-paint-tone-emerald-a43: color-mix( in srgb, var(--brand-tone-emerald) calc(100% * 43 / 255), transparent );
  --refresh-paint-tone-seafoam-a31: color-mix( in srgb, var(--brand-tone-seafoam) calc(100% * 31 / 255), transparent );
  --refresh-paint-tone-pale-a20: color-mix( in srgb, var(--brand-tone-pale) calc(100% * 20 / 255), transparent );
  --refresh-paper: #f8e7ef;
  --refresh-ink: #000;
  --refresh-muted: rgb(0 0 0 / 40%);
  --refresh-cameo: #9d4a70;
  --refresh-wash: rgb(249 168 212 / 8%);
  --refresh-arrival: var(--page-refresh-elapsed, 0ms);
  --refresh-threshold: calc(var(--page-refresh-elapsed, 0ms) + 1200ms);
  --refresh-loop: calc(var(--page-refresh-elapsed, 0ms) + 2160ms);
  --page-refresh-motion: paused;
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: none;
  box-sizing: border-box;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 42%, var(--refresh-wash), transparent 68%),
    var(--refresh-paper);
  color: var(--refresh-ink);
  color-scheme: light;
  font-family: ui-sans-serif, system-ui, sans-serif;
  isolation: isolate;
}
html[data-page-refresh-active] .page-refresh-screen {
  --page-refresh-motion: var(--page-refresh-visibility, running);
  display: grid;
}
.page-refresh-screen,
.page-refresh-screen *,
.page-refresh-screen *::before,
.page-refresh-screen *::after {
  box-sizing: border-box;
  animation-play-state: var(--page-refresh-motion, paused) !important;
}
.page-refresh-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: refresh-brand-atmosphere-enter 2160ms ease-out var(--refresh-arrival) both;
}
.page-refresh-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(100vw, 580px);
  height: min(85vh, 500px);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 35% 35%, color-mix(in srgb, var(--brand-tone-ice) 7%, transparent), transparent 58%),
    radial-gradient(ellipse at 64% 66%, color-mix(in srgb, var(--brand-tone-teal) 6%, transparent), transparent 63%),
    radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-copy) 5%, transparent), transparent 68%);
  -webkit-mask-image: radial-gradient(ellipse at center, #000 28%, transparent 74%);
  mask-image: radial-gradient(ellipse at center, #000 28%, transparent 74%);
  transform: translate(-50%, -50%);
  animation: refresh-brand-aura-breathe 3800ms ease-in-out var(--refresh-loop) infinite;
}
.page-refresh-scene {
  position: absolute;
  top: 44%;
  left: 50%;
  width: min(calc(100% - 48px), 320px);
  height: 115px;
  transform: translate(-50%, -50%);
  text-align: center;
}
.page-refresh-loader {
  position: relative;
  display: block;
  width: 115px;
  height: 115px;
  margin: 0 auto;
  color: var(--brand-copy);
  pointer-events: none;
}
.page-refresh-world {
  position: absolute;
  top: calc(50% - 23px);
  left: calc(50% - 23px);
  width: 46px;
  height: 46px;
  transform: scale(2.5);
  transform-origin: center;
  isolation: isolate;
}
.page-refresh-arrival,
.page-refresh-threshold,
.page-refresh-face-exit,
.page-refresh-button-exit,
.page-refresh-core,
.page-refresh-edge,
.page-refresh-edge-exit,
.page-refresh-glow-enter,
.page-refresh-charged-glow,
.page-refresh-glyph-intro,
.page-refresh-glyph-threshold,
.page-refresh-glyph-exit,
.page-refresh-glyph,
.page-refresh-rotor-wind,
.page-refresh-rotor,
.page-refresh-rotor-breath,
.page-refresh-orbit-enter,
.page-refresh-orbit-arrival,
.page-refresh-orbit-exit,
.page-refresh-burst,
.page-refresh-wave,
.page-refresh-echo,
.page-refresh-shock {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  transform-origin: center;
}
.page-refresh-arrival { animation: refresh-brand-face-arrive 1200ms linear var(--refresh-arrival) both; }
.page-refresh-threshold { animation: refresh-brand-spring-core 960ms linear var(--refresh-threshold) both; }
.page-refresh-core {
  border: 2.5px solid var(--refresh-paint-copy-p67);
  border-radius: 14px;
  background: var(--brand-surface);
  box-shadow: inset 0 .5625px 0 var(--refresh-paint-copy-p10), 0 1.6875px 6.75px var(--refresh-paint-surface-p10);
}
.page-refresh-core::before {
  content: "";
  position: absolute;
  z-index: 0;
  inset: -2.5px;
  border: 2.5px solid var(--refresh-paint-copy-p8);
  border-radius: inherit;
  filter: blur(.8px);
  pointer-events: none;
}
.page-refresh-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}
.page-refresh-edge {
  box-shadow: inset 0 0 0 1px var(--refresh-paint-copy-a179), inset 0 0 0 3px var(--refresh-paint-copy-p14-902);
  animation: refresh-brand-edge-enter 1200ms ease-in var(--refresh-arrival) both, refresh-brand-edgeBreath 3200ms ease-in-out calc(var(--refresh-threshold) + 700ms) infinite;
}
.page-refresh-light {
  position: absolute;
  inset: -2px;
  border: 1px solid var(--refresh-paint-copy-a112);
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 13px 3px var(--refresh-paint-copy-p27-059), 0 0 24px 7px var(--refresh-paint-copy-a31);
  opacity: 0;
  filter: blur(2px);
  animation: refresh-brand-spring-flare 960ms linear var(--refresh-threshold) both;
}
.page-refresh-glow-enter { animation: refresh-brand-glow-enter 380ms ease-out var(--refresh-threshold) both; }
.page-refresh-charged-glow {
  z-index: 1;
  inset: -2px;
  background: transparent;
  box-shadow: -4px -3px 15px 2px var(--refresh-paint-copy-a38), 4px 3px 18px 3px var(--refresh-paint-charge-secondary-p28), 0 0 28px 4px var(--refresh-paint-charge-accent-p18);
  animation: refresh-brand-chargeGlow 3800ms ease-in-out calc(var(--refresh-threshold) + 180ms) infinite;
}
.page-refresh-charged-glow::before,
.page-refresh-charged-glow::after {
  content: "";
  position: absolute;
  inset: -1px;
  border: 1.5px solid var(--refresh-paint-copy-a115);
  border-radius: inherit;
  background: transparent;
  filter: blur(2px);
}
.page-refresh-charged-glow::after { inset: -4px; border-width: 1px; border-color: var(--refresh-paint-charge-pearl-p22); filter: blur(3px); }
.page-refresh-glyph { z-index: 3; display: grid; place-items: center; color: var(--brand-copy); }
.page-refresh-glyph-intro {
  animation:
    refresh-brand-glyph-arrive 1200ms linear var(--refresh-arrival) both,
    refresh-brand-intro-spin 1200ms linear var(--refresh-arrival) both;
}
.page-refresh-glyph-threshold { animation: refresh-brand-spring-glyph 960ms linear var(--refresh-threshold) both; }
.page-refresh-rotor-wind,
.page-refresh-rotor,
.page-refresh-rotor-breath { display: grid; place-items: center; }
.page-refresh-rotor-wind { animation: refresh-brand-threshold-turn 960ms cubic-bezier(.333333, .435733932, .666667, .769067265) var(--refresh-threshold) both; }
.page-refresh-rotor { animation: refresh-brand-fast-rotor 1800ms linear var(--refresh-loop) infinite both; }
.page-refresh-rotor-breath { animation: refresh-brand-fast-breath 1800ms ease-in-out var(--refresh-loop) infinite both; }
.page-refresh-glyph svg { display: block; width: 23px; height: 23px; overflow: visible; transform-origin: center; }
.page-refresh-orbit-enter { z-index: 2; inset: -1px; animation: refresh-brand-rings-enter 260ms ease-out var(--refresh-threshold) both; }
.page-refresh-orbit-arrival { animation: refresh-brand-orbitArrival 900ms cubic-bezier(0.16, 1, 0.3, 1) var(--refresh-threshold) both; }
.page-refresh-orbit-track,
.page-refresh-orbit-ribbon,
.page-refresh-orbit-counter,
.page-refresh-orbit-bead { rotate: 20deg; position: absolute; inset: 0; border-radius: 50%; }
.page-refresh-orbit-track { inset: 2px; border: .7px solid var(--refresh-paint-copy-a23); }
.page-refresh-orbit-ribbon {
  background: conic-gradient(from 14deg, transparent 0deg 64deg, color-mix(in srgb, var(--brand-charge-ice) 9%, transparent) 100deg, color-mix(in srgb, var(--brand-charge-pearl) 34%, transparent) 176deg, color-mix(in srgb, var(--brand-copy) calc(100% * 163 / 255), transparent) 244deg, var(--brand-copy) 276deg, transparent 279deg 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.7px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.2px), #000 calc(100% - 1.7px));
  animation: refresh-brand-ribbonDrift 8000ms linear var(--refresh-loop) infinite both;
}
.page-refresh-orbit-counter {
  inset: 4px;
  background: conic-gradient(from 20deg, transparent 0deg 38deg, var(--brand-charge-pearl) 75deg, color-mix(in srgb, var(--brand-copy) calc(100% * 184 / 255), transparent) 101deg, transparent 104deg 218deg, var(--brand-charge-ice) 255deg, color-mix(in srgb, var(--brand-copy) calc(100% * 153 / 255), transparent) 281deg, transparent 284deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.3px), #000 calc(100% - .8px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 1.3px), #000 calc(100% - .8px));
  opacity: .62;
  animation: refresh-brand-counterDrift 8000ms linear var(--refresh-loop) infinite both;
}
.page-refresh-orbit-bead { animation: refresh-brand-ribbonDrift 8000ms linear var(--refresh-loop) infinite both; }
.page-refresh-orbit-bead::after { content: ""; position: absolute; top: calc(50% - 1.5px); left: -.4px; width: 3px; height: 3px; border-radius: 50%; background: var(--brand-charge-pearl); box-shadow: 0 0 5px 1px var(--refresh-paint-charge-secondary-p30); opacity: .8; }
.page-refresh-inner-pop { position: absolute; z-index: 4; inset: -2px; width: calc(100% + 4px); height: calc(100% + 4px); opacity: 0; transform-origin: center; animation: refresh-brand-spring-pop 960ms linear var(--refresh-threshold) both; }
.page-refresh-burst { z-index: 5; scale: 1.25; overflow: visible; pointer-events: none; }
.page-refresh-wave,
.page-refresh-echo,
.page-refresh-shock { inset: -2px; border: 1.8px solid var(--brand-charge-pearl); border-radius: 38%; opacity: 0; animation: refresh-brand-ripple 900ms cubic-bezier(.16, 1, .3, 1) var(--refresh-threshold) both; }
.page-refresh-echo { inset: -5px; border-color: var(--refresh-paint-charge-ice-p72); border-width: 1.2px; animation-delay: calc(var(--refresh-threshold) + 95ms); }
.page-refresh-shock { inset: -1px; border-width: 6px; border-color: var(--refresh-paint-tone-seafoam-a54); animation: refresh-brand-shockwave 790ms cubic-bezier(.16, 1, .3, 1) calc(var(--refresh-threshold) + 35ms) both; }
.page-refresh-rays { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); overflow: visible; fill: none; stroke: var(--brand-charge-pearl); stroke-width: 1.2px; stroke-linecap: round; stroke-dasharray: 8; opacity: 0; transform-origin: center; animation: refresh-brand-raysOpen 820ms cubic-bezier(.16, 1, .3, 1) calc(var(--refresh-threshold) + 55ms) both; }
.page-refresh-rays path:nth-child(6n + 1) { stroke: var(--brand-tone-pale); }
.page-refresh-rays path:nth-child(6n + 2) { stroke: var(--brand-tone-seafoam); }
.page-refresh-rays path:nth-child(6n + 3) { stroke: var(--brand-copy); }
.page-refresh-rays path:nth-child(6n + 4) { stroke: var(--brand-tone-ice); }
.page-refresh-rays path:nth-child(6n + 5) { stroke: var(--brand-charge-ice); }
.page-refresh-particle { --refresh-paint-particle-p40: color-mix(in srgb, var(--particle-color) 40%, transparent); position: absolute; top: 50%; left: 50%; width: 3.4px; height: 3.4px; border-radius: 50%; background: var(--particle-color); box-shadow: 0 0 4px var(--refresh-paint-particle-p40); opacity: 0; animation: refresh-brand-confetti 820ms cubic-bezier(.16, 1, .3, 1) calc(var(--refresh-threshold) + 45ms + var(--particle-delay) * .6) both; }
.page-refresh-particle[data-shape="1"] { width: 2.8px; height: 7px; border-radius: 2px; }
.page-refresh-particle[data-shape="2"] { width: 5px; height: 5px; background: transparent; border: 1.3px solid var(--particle-color); border-radius: 1px; }
.page-refresh-particle[data-shape="3"] { width: 7px; height: 7px; clip-path: polygon(50% 0, 64% 36%, 100% 50%, 64% 64%, 50% 100%, 36% 64%, 0 50%, 36% 36%); }
.page-refresh-copy { position: absolute; top: calc(100% + 94px); inset-inline: 0; color: var(--refresh-ink); animation: refresh-brand-copy-enter 500ms ease-out calc(var(--refresh-arrival) + 500ms) both; }
.page-refresh-title { margin: 0; font-size: 13px; line-height: 20px; font-weight: 450; letter-spacing: -.01em; }
.page-refresh-secondary { margin: 13px 0 0; color: var(--refresh-muted); font-size: 11px; line-height: 18px; font-weight: 400; letter-spacing: 0; }
.page-refresh-secondary span, .page-refresh-footer-copy span { display: block; }
.page-refresh-footer { position: absolute; z-index: 2; bottom: max(72px, calc(env(safe-area-inset-bottom) + 40px)); left: 50%; width: min(calc(100% - 48px), 340px); transform: translateX(-50%); text-align: center; color: var(--refresh-muted); font-weight: 400; }
.page-refresh-footer-links { display: flex; min-height: 32px; justify-content: center; align-items: center; gap: 14px; }
.page-refresh-footer a { display: none; padding: 8px 4px; color: inherit; font: inherit; font-size: 10px; line-height: 16px; text-decoration: none; text-underline-offset: 3px; }
.page-refresh-footer a:focus-visible { outline: 1px solid currentColor; outline-offset: 3px; border-radius: 3px; }
.page-refresh-footer-copy { margin: 15px 0 0; font-size: 9px; line-height: 14px; letter-spacing: .005em; }
${LOADING_SCREEN_LINKS.map(({ id }) => `html[data-page-refresh-link-one="${id}"] .page-refresh-footer a[data-loading-link="${id}"], html[data-page-refresh-link-two="${id}"] .page-refresh-footer a[data-loading-link="${id}"] { display: inline-block; }`).join("\n")}
.page-refresh-wanderers { position: absolute; inset: 0; pointer-events: none; display: none; }
html[data-page-refresh-pills-ready="true"] .page-refresh-wanderers { display: block; }
.page-refresh-wanderer { position: absolute; left: var(--pill-x); top: var(--pill-y); width: var(--pill-size, 18px); height: var(--pill-size, 18px); translate: -50% -50%; visibility: var(--pill-visible, hidden); }
.page-refresh-wanderer svg { display: block; width: 100%; height: 100%; color: var(--refresh-cameo); fill: none; stroke-width: 1.65; opacity: 0; animation: refresh-pill-cameo 8000ms linear calc(var(--refresh-loop) + var(--pill-slot) * 1000ms) infinite both; transform-origin: center; }
@keyframes refresh-pill-cameo {
  0% { opacity: 0; transform: rotate(var(--pill-angle)) scale(.06); animation-timing-function: cubic-bezier(.16,.8,.25,1); }
  6% { opacity: .32; transform: rotate(calc(var(--pill-angle) + var(--pill-spin) * 720deg)) scale(1); animation-timing-function: ease-in-out; }
  10% { opacity: .32; transform: rotate(calc(var(--pill-angle) + var(--pill-spin) * 760deg)) scale(.97); animation-timing-function: cubic-bezier(.65,0,.9,.25); }
  16.25% { opacity: 0; transform: rotate(calc(var(--pill-angle) + var(--pill-spin) * 1480deg)) scale(.04); }
  100% { opacity: 0; transform: rotate(calc(var(--pill-angle) + var(--pill-spin) * 1480deg)) scale(.04); }
}
@media (hover: hover) and (pointer: fine) { .page-refresh-footer a:hover { text-decoration: underline; } }
@media (max-height: 700px) {
  .page-refresh-scene { top: 39%; }
  .page-refresh-copy { top: calc(100% + 64px); }
  .page-refresh-footer { bottom: max(40px, calc(env(safe-area-inset-bottom) + 24px)); }
}
@media (max-height: 450px) and (min-width: 600px) {
  .page-refresh-scene { top: 42%; left: 27%; width: 240px; }
  .page-refresh-copy { top: 28px; left: calc(100% + 16px); right: auto; width: 255px; text-align: left; }
  .page-refresh-footer { bottom: max(24px, calc(env(safe-area-inset-bottom) + 12px)); }
}
/* Independent exit owners leave the live rotor angle continuous. */
html[data-page-refresh-active="fading"] .page-refresh-screen { animation: refresh-brand-curtain-exit 600ms ease-in both; }
html[data-page-refresh-active="fading"] .page-refresh-atmosphere { animation: refresh-brand-atmosphere-exit 600ms ease-in both; }
html[data-page-refresh-active="fading"] .page-refresh-face-exit { animation: refresh-brand-face-exit 600ms cubic-bezier(.45, 0, .25, 1) both; }
html[data-page-refresh-active="fading"] .page-refresh-button-exit { animation: refresh-brand-releaseButton 600ms cubic-bezier(.22, .8, .25, 1) both; }
html[data-page-refresh-active="fading"] .page-refresh-glyph-exit { animation: refresh-brand-releasePulse 600ms cubic-bezier(.45, 0, .25, 1) both; }
html[data-page-refresh-active="fading"] .page-refresh-orbit-exit { animation: refresh-brand-orbit-exit 600ms cubic-bezier(.45, 0, .25, 1) both; }
html[data-page-refresh-active="fading"] .page-refresh-edge-exit { animation: refresh-brand-releaseEdge 600ms ease-out both; }
html[data-page-refresh-active="fading"] .page-refresh-charged-glow { animation: refresh-brand-chargeLaunch 600ms ease-out both; }
html[data-page-refresh-active="fading"] :is(.page-refresh-wave, .page-refresh-echo) { animation: refresh-brand-releaseRipple 600ms cubic-bezier(.2, .8, .25, 1) both; }
html[data-page-refresh-active="fading"] .page-refresh-echo { animation-delay: 55ms; animation-duration: 545ms; }
html[data-page-refresh-active="fading"] .page-refresh-shock { animation: refresh-brand-shockwave 500ms cubic-bezier(.16, 1, .3, 1) 90ms both; }
html[data-page-refresh-active="fading"] .page-refresh-rays { animation: refresh-brand-raysLaunch 550ms cubic-bezier(.16, 1, .3, 1) 30ms both; }
html[data-page-refresh-active="fading"] .page-refresh-particle { animation: refresh-brand-releaseParticles 560ms cubic-bezier(.16, 1, .3, 1) 20ms both; }
html[data-page-refresh-active="fading"] .page-refresh-copy { animation: refresh-brand-copy-exit 600ms ease-in both; }
@keyframes refresh-brand-face-arrive { 0% { opacity: 0; transform: scale(.0001); } 22% { opacity: 1; transform: scale(.42); } 66.666667% { transform: scale(.94); } 100% { opacity: 1; transform: scale(.84); } }
/* Keep the spring's original size track independent of the opening turn. */
@keyframes refresh-brand-glyph-arrive { 0% { transform: scale(.0001); animation-timing-function: linear; } 66.666667% { transform: scale(.94); animation-timing-function: cubic-bezier(.333333, .378788, .666667, .69697); } 100% { transform: scale(1); } }
/* 540deg in 300ms, then a 250ms brake from 1800 to 1200deg/s.
   The rest of the arrival keeps that moderate speed; no reset at either join. */
@keyframes refresh-brand-intro-spin {
  0% { rotate: 0deg; animation-timing-function: linear; }
  25% { rotate: 540deg; animation-timing-function: cubic-bezier(.333333, .4, .666667, .733333); }
  45.833333% { rotate: 915deg; animation-timing-function: linear; }
  100% { rotate: 1695deg; }
}
@keyframes refresh-brand-edge-enter { 0%, 20% { opacity: 0; } 100% { opacity: 1; } }
@keyframes refresh-brand-glow-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes refresh-brand-rings-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes refresh-brand-copy-enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
/* Continue at 1200deg/s, then ease to the live rotor's 635.983deg/s.
   Distance and cubic endpoint tangents preserve angle and speed at both joins. */
@keyframes refresh-brand-threshold-turn { from { transform: rotate(0deg); } to { transform: rotate(881.271739deg); } }
@keyframes refresh-brand-fast-rotor {
  0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(.333333, .340324, .666667, .67895); }
  25% { transform: rotate(280.31324deg); animation-timing-function: cubic-bezier(.333333, .346568, .666667, .674216); }
  50% { transform: rotate(540deg); animation-timing-function: cubic-bezier(.333333, .325784, .666667, .653432); }
  75% { transform: rotate(799.68676deg); animation-timing-function: cubic-bezier(.333333, .32105, .666667, .659676); }
  100% { transform: rotate(1080deg); }
}
@keyframes refresh-brand-fast-breath { 0%, 100% { transform: scale(1.02); } 50% { transform: scale(.98); } }
@keyframes refresh-brand-atmosphere-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes refresh-brand-aura-breathe { 0%, 100% { opacity: .68; scale: 1; } 50% { opacity: .9; scale: 1.03; } }
@keyframes refresh-brand-curtain-exit { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
@keyframes refresh-brand-atmosphere-exit { 0%, 30% { opacity: 1; } 100% { opacity: 0; } }
@keyframes refresh-brand-face-exit { 0%, 42% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.02); } }
/* Arrival owns the fixed−120deg angle, so this launch changes only relative size. */
@keyframes refresh-brand-orbit-exit { 0% { opacity: .86; transform: scale(1); } 20% { opacity: 1; transform: scale(.92); } 55% { opacity: .8; transform: scale(1.06); } 100% { opacity: 0; transform: scale(1.12); } }
@keyframes refresh-brand-copy-exit { 0%, 17% { opacity: 1; transform: scale(1); } 40% { opacity: 1; transform: scale(1.025); } 100% { opacity: 0; transform: scale(.9); } }
@media (prefers-color-scheme: dark) {
  :where(html:not([data-color-mode])) .page-refresh-screen {
    --refresh-paper: #17121c;
    --refresh-ink: #fdf1f7;
    --refresh-muted: rgb(253 241 247 / 40%);
    --refresh-cameo: #f9a8d4;
    --refresh-wash: rgb(244 114 182 / 7%);
    color-scheme: dark;
  }
}
:where(html[data-color-mode="dark"]) .page-refresh-screen {
  --refresh-paper: #17121c;
  --refresh-ink: #fdf1f7;
  --refresh-muted: rgb(253 241 247 / 40%);
  --refresh-cameo: #f9a8d4;
  --refresh-wash: rgb(244 114 182 / 7%);
  color-scheme: dark;
}

@keyframes refresh-brand-spring-core {
  0% { transform: scale(1.0000000); }
  2.083333% { transform: scale(1.0287571); }
  4.166667% { transform: scale(1.1028254); }
  6.25% { transform: scale(1.2034937); }
  8.333333% { transform: scale(1.3133190); }
  10.416667% { transform: scale(1.4178069); }
  12.5% { transform: scale(1.5500688); }
  14.583333% { transform: scale(1.7747772); }
  16.666667% { transform: scale(1.9157999); }
  18.75% { transform: scale(1.9763180); }
  20.833333% { transform: scale(1.9678784); }
  22.916667% { transform: scale(1.9071794); }
  25% { transform: scale(1.8130088); }
  27.083333% { transform: scale(1.7036447); }
  29.166667% { transform: scale(1.5949079); }
  31.25% { transform: scale(1.4989358); }
  33.333333% { transform: scale(1.4690870); }
  35.416667% { transform: scale(1.4540983); }
  37.5% { transform: scale(1.4463715); }
  39.583333% { transform: scale(1.4451213); }
  41.666667% { transform: scale(1.4490100); }
  43.75% { transform: scale(1.4564250); }
  45.833333% { transform: scale(1.4657238); }
  47.916667% { transform: scale(1.4754260); }
  50% { transform: scale(1.4843437); }
  52.083333% { transform: scale(1.5001431); }
  54.166667% { transform: scale(1.5178940); }
  56.25% { transform: scale(1.5282263); }
  58.333333% { transform: scale(1.5316671); }
  60.416667% { transform: scale(1.5294012); }
  62.5% { transform: scale(1.5229877); }
  64.583333% { transform: scale(1.5140978); }
  66.666667% { transform: scale(1.5043011); }
  68.75% { transform: scale(1.4949109); }
  70.833333% { transform: scale(1.4877412); }
  72.916667% { transform: scale(1.4859567); }
  75% { transform: scale(1.4848212); }
  77.083333% { transform: scale(1.4843147); }
  79.166667% { transform: scale(1.4843508); }
  81.25% { transform: scale(1.4848016); }
  83.333333% { transform: scale(1.4855214); }
  85.416667% { transform: scale(1.4863676); }
  87.5% { transform: scale(1.4872156); }
  89.583333% { transform: scale(1.4879694); }
  91.666667% { transform: scale(1.4896888); }
  93.75% { transform: scale(1.4910678); }
  95.833333% { transform: scale(1.4917961); }
  97.916667% { transform: scale(1.4919402); }
  100% { transform: scale(1.4880952); }
}
@keyframes refresh-brand-spring-glyph {
  0% { transform: scale(1.0000000); }
  2.083333% { transform: scale(1.0082484); }
  4.166667% { transform: scale(1.0294933); }
  6.25% { transform: scale(1.0583680); }
  8.333333% { transform: scale(1.0898691); }
  10.416667% { transform: scale(1.1198392); }
  12.5% { transform: scale(1.4021617); }
  14.583333% { transform: scale(2.3527264); }
  16.666667% { transform: scale(2.9492829); }
  18.75% { transform: scale(3.2052876); }
  20.833333% { transform: scale(3.1695861); }
  22.916667% { transform: scale(2.9128163); }
  25% { transform: scale(2.5144543); }
  27.083333% { transform: scale(2.0518209); }
  29.166667% { transform: scale(1.5918407); }
  31.25% { transform: scale(1.1858577); }
  33.333333% { transform: scale(1.1345479); }
  35.416667% { transform: scale(1.1302487); }
  37.5% { transform: scale(1.1280324); }
  39.583333% { transform: scale(1.1276738); }
  41.666667% { transform: scale(1.1287892); }
  43.75% { transform: scale(1.1309161); }
  45.833333% { transform: scale(1.1335832); }
  47.916667% { transform: scale(1.1363661); }
  50% { transform: scale(1.1389239); }
  52.083333% { transform: scale(1.1909651); }
  54.166667% { transform: scale(1.2660551); }
  56.25% { transform: scale(1.3097631); }
  58.333333% { transform: scale(1.3243182); }
  60.416667% { transform: scale(1.3147332); }
  62.5% { transform: scale(1.2876025); }
  64.583333% { transform: scale(1.2499964); }
  66.666667% { transform: scale(1.2085541); }
  68.75% { transform: scale(1.1688319); }
  70.833333% { transform: scale(1.1398985); }
  72.916667% { transform: scale(1.1393866); }
  75% { transform: scale(1.1390609); }
  77.083333% { transform: scale(1.1389156); }
  79.166667% { transform: scale(1.1389260); }
  81.25% { transform: scale(1.1390553); }
  83.333333% { transform: scale(1.1392617); }
  85.416667% { transform: scale(1.1395045); }
  87.5% { transform: scale(1.1397477); }
  89.583333% { transform: scale(1.1399639); }
  91.666667% { transform: scale(1.1467413); }
  93.75% { transform: scale(1.1525744); }
  95.833333% { transform: scale(1.1556555); }
  97.916667% { transform: scale(1.1562649); }
  100% { transform: scale(1.1400000); }
}
@keyframes refresh-brand-spring-flare {
  0% { opacity: 0.0000000; }
  2.083333% { opacity: 0.0000000; }
  4.166667% { opacity: 0.0000000; }
  6.25% { opacity: 0.0000000; }
  8.333333% { opacity: 0.0000000; }
  10.416667% { opacity: 0.0000000; }
  12.5% { opacity: 0.0921311; }
  14.583333% { opacity: 0.4261867; }
  16.666667% { opacity: 0.6358337; }
  18.75% { opacity: 0.7258011; }
  20.833333% { opacity: 0.7132546; }
  22.916667% { opacity: 0.6230183; }
  25% { opacity: 0.4830225; }
  27.083333% { opacity: 0.3204399; }
  29.166667% { opacity: 0.1587897; }
  31.25% { opacity: 0.0161157; }
  33.333333% { opacity: 0.0000000; }
  35.416667% { opacity: 0.0000000; }
  37.5% { opacity: 0.0000000; }
  39.583333% { opacity: 0.0000000; }
  41.666667% { opacity: 0.0000000; }
  43.75% { opacity: 0.0000000; }
  45.833333% { opacity: 0.0000000; }
  47.916667% { opacity: 0.0000000; }
  50% { opacity: 0.0000000; }
  52.083333% { opacity: 0.0179106; }
  54.166667% { opacity: 0.0442994; }
  56.25% { opacity: 0.0596596; }
  58.333333% { opacity: 0.0647747; }
  60.416667% { opacity: 0.0614062; }
  62.5% { opacity: 0.0518717; }
  64.583333% { opacity: 0.0386559; }
  66.666667% { opacity: 0.0240919; }
  68.75% { opacity: 0.0101323; }
  70.833333% { opacity: 0.0000000; }
  72.916667% { opacity: 0.0000000; }
  75% { opacity: 0.0000000; }
  77.083333% { opacity: 0.0000000; }
  79.166667% { opacity: 0.0000000; }
  81.25% { opacity: 0.0000000; }
  83.333333% { opacity: 0.0000000; }
  85.416667% { opacity: 0.0000000; }
  87.5% { opacity: 0.0000000; }
  89.583333% { opacity: 0.0000000; }
  91.666667% { opacity: 0.0023691; }
  93.75% { opacity: 0.0044190; }
  95.833333% { opacity: 0.0055018; }
  97.916667% { opacity: 0.0057160; }
  100% { opacity: 0.0000000; }
}
@keyframes refresh-brand-spring-pop {
  0% { opacity: 0.0000000; transform: scale(0.6500000); }
  2.083333% { opacity: 0.0000000; transform: scale(0.6500000); }
  4.166667% { opacity: 0.0000000; transform: scale(0.6500000); }
  6.25% { opacity: 0.0000000; transform: scale(0.6500000); }
  8.333333% { opacity: 0.0000000; transform: scale(0.6500000); }
  10.416667% { opacity: 0.0000000; transform: scale(0.6500000); }
  12.5% { opacity: 0.1123550; transform: scale(0.7511195); }
  14.583333% { opacity: 0.5197399; transform: scale(1.1177659); }
  16.666667% { opacity: 0.7754070; transform: scale(1.3478663); }
  18.75% { opacity: 0.8851232; transform: scale(1.4466109); }
  20.833333% { opacity: 0.8698226; transform: scale(1.4328404); }
  22.916667% { opacity: 0.7597784; transform: scale(1.3338006); }
  25% { opacity: 0.5890518; transform: scale(1.1801467); }
  27.083333% { opacity: 0.3907804; transform: scale(1.0017023); }
  29.166667% { opacity: 0.1936460; transform: scale(0.8242814); }
  31.25% { opacity: 0.0196533; transform: scale(0.6676880); }
  33.333333% { opacity: 0.0000000; transform: scale(0.6500000); }
  35.416667% { opacity: 0.0000000; transform: scale(0.6500000); }
  37.5% { opacity: 0.0000000; transform: scale(0.6500000); }
  39.583333% { opacity: 0.0000000; transform: scale(0.6500000); }
  41.666667% { opacity: 0.0000000; transform: scale(0.6500000); }
  43.75% { opacity: 0.0000000; transform: scale(0.6500000); }
  45.833333% { opacity: 0.0000000; transform: scale(0.6500000); }
  47.916667% { opacity: 0.0000000; transform: scale(0.6500000); }
  50% { opacity: 0.0000000; transform: scale(0.6500000); }
  52.083333% { opacity: 0.0218422; transform: scale(0.6696580); }
  54.166667% { opacity: 0.0540236; transform: scale(0.6986212); }
  56.25% { opacity: 0.0727556; transform: scale(0.7154800); }
  58.333333% { opacity: 0.0789935; transform: scale(0.7210942); }
  60.416667% { opacity: 0.0748857; transform: scale(0.7173971); }
  62.5% { opacity: 0.0632582; transform: scale(0.7069324); }
  64.583333% { opacity: 0.0471413; transform: scale(0.6924272); }
  66.666667% { opacity: 0.0293803; transform: scale(0.6764423); }
  68.75% { opacity: 0.0123565; transform: scale(0.6611209); }
  70.833333% { opacity: 0.0000000; transform: scale(0.6500000); }
  72.916667% { opacity: 0.0000000; transform: scale(0.6500000); }
  75% { opacity: 0.0000000; transform: scale(0.6500000); }
  77.083333% { opacity: 0.0000000; transform: scale(0.6500000); }
  79.166667% { opacity: 0.0000000; transform: scale(0.6500000); }
  81.25% { opacity: 0.0000000; transform: scale(0.6500000); }
  83.333333% { opacity: 0.0000000; transform: scale(0.6500000); }
  85.416667% { opacity: 0.0000000; transform: scale(0.6500000); }
  87.5% { opacity: 0.0000000; transform: scale(0.6500000); }
  89.583333% { opacity: 0.0000000; transform: scale(0.6500000); }
  91.666667% { opacity: 0.0028891; transform: scale(0.6526002); }
  93.75% { opacity: 0.0053890; transform: scale(0.6548501); }
  95.833333% { opacity: 0.0067095; transform: scale(0.6560385); }
  97.916667% { opacity: 0.0069707; transform: scale(0.6562736); }
  100% { opacity: 0.0000000; transform: scale(0.6500000); }
}
@keyframes refresh-brand-chargeGlow {
  0%,
  100% {
    box-shadow:
      -4px -3px 15px 2px
        var(--refresh-paint-copy-a48),
      4px 3px 18px 3px
        var(--refresh-paint-charge-secondary-p28),
      0 0 26px 4px
        var(--refresh-paint-charge-accent-p16);
  }
  35% {
    box-shadow:
      4px -3px 19px 3px
        var(--refresh-paint-copy-a56),
      -3px 4px 18px 3px
        var(--refresh-paint-charge-accent-p24),
      0 0 29px 5px
        var(--refresh-paint-charge-secondary-p22);
  }
  70% {
    box-shadow:
      4px 3px 17px 3px
        var(--refresh-paint-copy-a50),
      -4px -3px 21px 4px
        var(--refresh-paint-charge-secondary-p31),
      0 0 26px 4px
        var(--refresh-paint-charge-accent-p18);
  }
}
@keyframes refresh-brand-edgeBreath {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px
        var(--refresh-paint-copy-a179),
      inset 0 0 0 3px var(--refresh-paint-copy-p14-902),
      0 0 8px var(--refresh-paint-copy-p7-843);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px var(--brand-copy),
      inset 0 0 0 3px var(--refresh-paint-copy-p27-059),
      0 0 15px
        var(--refresh-paint-copy-a53);
  }
}
@keyframes refresh-brand-orbitArrival {
  0% {
    transform: rotate(-120deg) scale(0.8);
  }
  38% {
    transform: rotate(-120deg) scale(1.16);
  }
  70% {
    transform: rotate(-120deg) scale(0.96);
  }
  100% {
    transform: rotate(-120deg) scale(1);
  }
}
@keyframes refresh-brand-ribbonDrift {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(
      0.333333,
      0.111111,
      0.666667,
      0.444444
    );
  }
  8.125% {
    transform: rotate(122.10023deg);
    animation-timing-function: cubic-bezier(
      0.333333,
      0.550964,
      0.666667,
      0.884298
    );
  }
  15.625% {
    transform: rotate(235.74736deg);
    animation-timing-function: linear;
  }
  59.375% {
    transform: rotate(465.85933deg);
    animation-timing-function: cubic-bezier(0.333333, 0.666667, 0.666667, 1);
  }
  64.375% {
    transform: rotate(479.00859deg);
    animation-timing-function: cubic-bezier(0.333333, 0, 0.666667, 0.333333);
  }
  67.25% {
    transform: rotate(473.24796deg);
    animation-timing-function: cubic-bezier(0.333333, 0.666667, 0.666667, 1);
  }
  70.625% {
    transform: rotate(466.48549deg);
    animation-timing-function: cubic-bezier(0.333333, 0, 0.666667, 0.333333);
  }
  82.5% {
    transform: rotate(551.25122deg);
    animation-timing-function: cubic-bezier(
      0.333333,
      0.493506,
      0.666667,
      0.82684
    );
  }
  100% {
    transform: rotate(720deg);
  }
}
@keyframes refresh-brand-counterDrift {
  0% {
    transform: rotate(0deg);
    opacity: 0.58;
  }
  22% {
    transform: rotate(-79.2deg);
    opacity: 0.72;
  }
  64% {
    transform: rotate(-230.4deg);
    opacity: 0.48;
  }
  100% {
    transform: rotate(-360deg);
    opacity: 0.58;
  }
}
@keyframes refresh-brand-ripple {
  0% {
    opacity: 0;
    transform: scale(0.7) rotate(-28deg);
  }
  15% {
    opacity: 0.85;
  }
  48% {
    opacity: 0.42;
  }
  100% {
    opacity: 0;
    transform: scale(3.2) rotate(40deg);
    border-radius: 50%;
  }
}
@keyframes refresh-brand-shockwave {
  0% {
    opacity: 0;
    transform: scale(0.75);
  }
  17% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: scale(3.7);
    border-radius: 50%;
  }
}
@keyframes refresh-brand-raysOpen {
  0% {
    opacity: 0;
    transform: scale(0.6) rotate(-25deg);
    stroke-dashoffset: 8;
  }
  20% {
    opacity: 0.8;
    stroke-dashoffset: 0;
  }
  70% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(1.8) rotate(22deg);
    stroke-dashoffset: -8;
  }
}
@keyframes refresh-brand-confetti {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
  }
  13% {
    opacity: 1;
  }
  58% {
    opacity: 0.82;
  }
  100% {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--particle-x)),
        calc(-50% + var(--particle-y))
      )
      scale(0.3) rotate(var(--particle-turn));
  }
}
@keyframes refresh-brand-releaseButton {
  0% {
    scale: 1;
  }
  18% {
    scale: 0.82;
  }
  43% {
    scale: 1.2;
  }
  73% {
    scale: 0.92;
  }
  100% {
    scale: 1;
  }
}
@keyframes refresh-brand-releasePulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  17% {
    transform: scale(0.75);
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
  72% {
    transform: scale(0.78);
    opacity: 0.85;
  }
  100% {
    transform: scale(0.08);
    opacity: 0;
  }
}
@keyframes refresh-brand-releaseEdge {
  0%,
  100% {
    box-shadow:
      inset 0 0 0 1px
        var(--refresh-paint-copy-a140),
      inset 0 0 0 3px var(--refresh-paint-copy-p14-902);
  }
  42% {
    box-shadow:
      inset 0 0 0 1.5px var(--brand-copy),
      inset 0 0 0 3.5px var(--refresh-paint-copy-p40),
      0 0 22px
        var(--refresh-paint-copy-a102);
  }
}
@keyframes refresh-brand-chargeLaunch {
  0% {
    opacity: 1;
    box-shadow:
      -4px -3px 15px 2px
        var(--refresh-paint-tone-pale-a64),
      4px 3px 18px 3px
        var(--refresh-paint-tone-seafoam-a48),
      0 0 30px 5px
        var(--refresh-paint-tone-teal-a31);
  }
  42% {
    opacity: 1;
    box-shadow:
      -4px 3px 22px 4px
        var(--refresh-paint-copy-a77),
      4px -3px 24px 4px
        var(--refresh-paint-tone-ice-a69),
      0 0 38px 8px
        var(--refresh-paint-tone-emerald-a43);
  }
  100% {
    opacity: 0;
    box-shadow:
      -4px 3px 25px 5px
        var(--refresh-paint-tone-seafoam-a31),
      4px -3px 27px 5px
        var(--refresh-paint-tone-teal-a31),
      0 0 42px 8px
        var(--refresh-paint-tone-pale-a20);
  }
}
@keyframes refresh-brand-releaseRipple {
  0% {
    opacity: 0.2;
    transform: scale(1.2) rotate(20deg);
  }
  22% {
    opacity: 0.85;
    transform: scale(0.85) rotate(-10deg);
  }
  100% {
    opacity: 0;
    transform: scale(3.8) rotate(42deg);
    border-radius: 50%;
  }
}
@keyframes refresh-brand-raysLaunch {
  0% {
    opacity: 0;
    transform: scale(0.8) rotate(15deg);
    stroke-dashoffset: 8;
  }
  23% {
    opacity: 0.9;
    stroke-dashoffset: 0;
  }
  100% {
    opacity: 0;
    transform: scale(2.05) rotate(-18deg);
    stroke-dashoffset: -8;
  }
}
@keyframes refresh-brand-releaseParticles {
  0% {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--particle-x) * 0.32),
        calc(-50% + var(--particle-y) * 0.32)
      )
      scale(0.7) rotate(0deg);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.15) rotate(45deg);
  }
  100% {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--particle-x) * 1.2),
        calc(-50% + var(--particle-y) * 1.2)
      )
      scale(0.2) rotate(var(--particle-turn));
  }
}
.brand-mark {
  --tablet-loop: 4.8s;
  position: relative;
  display: block;
  overflow: visible;
  color: var(--brand-ink, var(--foreground));
}
.brand-tablet-orbit {
  position: absolute;
  inset: 0;
  transform: rotate(35deg);
  animation: tablet-orbit var(--tablet-loop) linear infinite;
}
.brand-tablet-carrier {
  position: absolute;
  top: 25%;
  left: 25%;
  width: 50%;
  height: 50%;
  animation-duration: var(--tablet-loop);
  animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  animation-iteration-count: infinite;
}
.brand-tablet-carrier--first {
  transform: translateX(-56.25%);
  animation-name: tablet-approach-first;
}
.brand-tablet-carrier--second {
  transform: translateX(56.25%);
  animation-name: tablet-approach-second;
}
.brand-tablet {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform-box: border-box;
  transform-origin: center;
  animation-duration: var(--tablet-loop);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.brand-tablet--first {
  transform: rotate(-70deg);
  animation-name: tablet-spin-first;
}
.brand-tablet--second {
  transform: rotate(-35deg);
  animation-name: tablet-spin-second;
}
@keyframes tablet-orbit {
  from {
    transform: rotate(35deg);
  }
  to {
    transform: rotate(395deg);
  }
}
/* Near contact at quarter turns; the visible circle gap stays at 0.125px. */
@keyframes tablet-approach-first {
  0%,
  50%,
  100% {
    transform: translateX(-56.25%);
  }
  25%,
  75% {
    transform: translateX(-39.583333%);
  }
}
@keyframes tablet-approach-second {
  0%,
  50%,
  100% {
    transform: translateX(56.25%);
  }
  25%,
  75% {
    transform: translateX(39.583333%);
  }
}
/* Orbit adds one turn: these local spins produce equal +2/-2 absolute turns. */
@keyframes tablet-spin-first {
  from {
    transform: rotate(-70deg);
  }
  to {
    transform: rotate(290deg);
  }
}
@keyframes tablet-spin-second {
  from {
    transform: rotate(-35deg);
  }
  to {
    transform: rotate(-1115deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-refresh-screen,
  .page-refresh-screen *,
  .page-refresh-screen *::before,
  .page-refresh-screen *::after,
  .brand-tablet-orbit,
  .brand-tablet-carrier,
  .brand-tablet { animation: none !important; }
  .page-refresh-arrival { opacity: 1; transform: scale(1); }
  .page-refresh-threshold { transform: scale(1.25); }
  .page-refresh-glyph-intro { transform: none; }
  .page-refresh-glyph-threshold { transform: scale(1.14); }
  .page-refresh-rotor-wind, .page-refresh-rotor, .page-refresh-rotor-breath { transform: none; }
  .page-refresh-copy { opacity: 1; transform: none; }
  .page-refresh-wanderers { display: none !important; }
  .page-refresh-edge { opacity: 1; }
  .page-refresh-atmosphere, .page-refresh-glow-enter, .page-refresh-light,
  .page-refresh-orbit-enter, .page-refresh-inner-pop, .page-refresh-burst { display: none; }
}
`;

/** The handoff is decided before the incoming document can paint its body. */
export function PageRefreshHead() {
  return (
    <>
      <style
        data-page-refresh-critical
        dangerouslySetInnerHTML={{ __html: PAGE_REFRESH_CRITICAL_CSS }}
      />
      <script
        data-page-refresh-boot
        dangerouslySetInnerHTML={{ __html: PAGE_REFRESH_BOOT_SCRIPT }}
      />
      <script
        data-page-refresh-ornaments
        dangerouslySetInnerHTML={{ __html: LOADING_SCREEN_ORNAMENTS_SCRIPT }}
      />
    </>
  );
}

/** Static markup and critical CSS preserve one clock across documents. */
export function PageRefreshScreen() {
  const colors = [
    "var(--brand-copy)",
    "var(--brand-tone-pale)",
    "var(--brand-tone-teal)",
    "var(--brand-tone-seafoam)",
    "var(--brand-copy)",
    "var(--brand-tone-ice)",
    "var(--brand-tone-emerald)",
  ];
  return (
    <div
      className="page-refresh-screen"
      data-page-refresh-screen
      style={getBrandThemeStyle()}
    >
      <div className="page-refresh-atmosphere" aria-hidden="true">
        <span className="page-refresh-aura" />
      </div>
      <div className="page-refresh-wanderers" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className="page-refresh-wanderer"
            data-loading-pill-slot={index}
            style={
              {
                "--pill-slot": index,
                "--pill-x": `var(--refresh-pill-x-${index})`,
                "--pill-y": `var(--refresh-pill-y-${index})`,
                "--pill-size": `var(--refresh-pill-size-${index})`,
                "--pill-spin": `var(--refresh-pill-spin-${index}, 1)`,
                "--pill-angle": `var(--refresh-pill-angle-${index}, 0deg)`,
                "--pill-visible": `var(--refresh-pill-visible-${index}, hidden)`,
              } as CSSProperties
            }
          >
            {index % 2 === 0 ? (
              <Pill />
            ) : (
              <svg
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m5.6 5.6 12.8 12.8" />
              </svg>
            )}
          </span>
        ))}
      </div>
      <div
        className="page-refresh-scene"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Refreshing your journal"
      >
        <div
          className="page-refresh-loader"
          aria-hidden="true"
          data-refresh-art
        >
          <div className="page-refresh-world" data-refresh-world>
            <div className="page-refresh-arrival">
              <div className="page-refresh-threshold">
                <div className="page-refresh-face-exit">
                  <div className="page-refresh-button-exit">
                    <div className="page-refresh-core" data-refresh-core>
                      <span className="page-refresh-face">
                        <span className="page-refresh-edge-exit">
                          <span className="page-refresh-edge" />
                        </span>
                      </span>
                      <span className="page-refresh-glow-enter">
                        <span className="page-refresh-charged-glow" />
                      </span>
                      <span className="page-refresh-orbit-enter">
                        <span className="page-refresh-orbit-arrival">
                          <span className="page-refresh-orbit-exit">
                            <span className="page-refresh-orbit-track" />
                            <span className="page-refresh-orbit-ribbon" />
                            <span className="page-refresh-orbit-counter" />
                            <span className="page-refresh-orbit-bead" />
                          </span>
                        </span>
                      </span>
                      <span className="page-refresh-light" />
                      <span className="page-refresh-glyph" data-refresh-glyph>
                        <span className="page-refresh-glyph-intro">
                          <span className="page-refresh-glyph-threshold">
                            <span className="page-refresh-glyph-exit">
                              <span className="page-refresh-rotor-wind">
                                <span
                                  className="page-refresh-rotor"
                                  data-refresh-rotor
                                >
                                  <span className="page-refresh-rotor-breath">
                                    <RefreshCw
                                      strokeWidth={2.65}
                                      data-refresh-symbol="refresh-cw"
                                    />
                                  </span>
                                </span>
                              </span>
                            </span>
                          </span>
                        </span>
                      </span>
                      <svg
                        className="page-refresh-inner-pop"
                        viewBox="0 0 46 46"
                        fill="none"
                        focusable="false"
                      >
                        <circle
                          cx="9"
                          cy="12"
                          r="1.7"
                          fill="var(--brand-copy)"
                        />
                        <circle
                          cx="36"
                          cy="14"
                          r="1.4"
                          fill="var(--brand-copy)"
                        />
                        <circle
                          cx="30"
                          cy="36"
                          r="1.7"
                          fill="var(--brand-copy)"
                        />
                        <path
                          d="m6 28 4-1m22-20 1 4m2 19 4 2"
                          stroke="var(--brand-copy)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span className="page-refresh-burst" data-refresh-burst>
              <span className="page-refresh-wave" />
              <span className="page-refresh-echo" />
              <span className="page-refresh-shock" />
              <svg
                className="page-refresh-rays"
                viewBox="0 0 64 64"
                fill="none"
                focusable="false"
              >
                <path d="M32 3v8" />
                <path d="M32 53v8" />
                <path d="M3 32h8" />
                <path d="M53 32h8" />
                <path d="m11.5 11.5 5.7 5.7" />
                <path d="m46.8 46.8 5.7 5.7" />
                <path d="m52.5 11.5-5.7 5.7" />
                <path d="m17.2 46.8-5.7 5.7" />
              </svg>
              {Array.from({ length: 18 }, (_, index) => {
                const angle = (index * 20 * Math.PI) / 180;
                const reach = 44 + (index % 4) * 9;
                return (
                  <span
                    key={index}
                    className="page-refresh-particle"
                    data-shape={index % 4}
                    style={
                      {
                        "--particle-x": `${(Math.cos(angle) * reach).toFixed(2)}px`,
                        "--particle-y": `${(Math.sin(angle) * reach).toFixed(2)}px`,
                        "--particle-turn": `${75 + index * 37}deg`,
                        "--particle-delay": `${(index % 3) * 24}ms`,
                        "--particle-color": colors[index % colors.length],
                      } as CSSProperties
                    }
                  />
                );
              })}
            </span>
          </div>
        </div>
        <div className="page-refresh-copy" data-refresh-copy>
          <p className="page-refresh-title">{LOADING_SCREEN_COPY.title}</p>
          <p className="page-refresh-secondary">
            {LOADING_SCREEN_COPY.secondary.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>
      </div>
      <footer className="page-refresh-footer" data-refresh-footer>
        <nav className="page-refresh-footer-links" aria-label="While You Wait">
          {LOADING_SCREEN_LINKS.map(({ id, href, label }) => (
            <a key={id} href={href} data-loading-link={id}>
              {label}
            </a>
          ))}
        </nav>
        <p className="page-refresh-footer-copy">
          {LOADING_SCREEN_COPY.footer.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </footer>
    </div>
  );
}
