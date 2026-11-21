# Performance audit — November 20, 2026

Responsiveness takes priority over decorative motion. The palette, card geometry,
group disclosure, drafts, notifications and save behavior remain; ambient effects
now use static CSS/SVG.

## Card appearance restoration — November 21

At the user's request, intake and Morning/Evening check-in cards now use the
November 20 appearance (`c6b937f`) again: glass blur, timeline arrivals, group
wash positioning, icon motion, shine, and check-in border effects. Their original
visibility and reduced-motion gates are retained. The check-in rim renderer is
isolated from ordinary buttons. The measurements below describe the earlier
performance pass, before this visual restoration; storage, subscription, history,
notification-clock, lazy-loading and app-wide background fixes remain in place.

## Bottlenecks and fixes

- **Decorative rendering:** the full-screen Iridescence shader and per-button
  WebGL rims each maintained render loops, graphics contexts and observers.
  Static theme layers and CSS/SVG borders replace them. Repeated 96px card/icon
  backdrop blurs, large nested blurs and perpetual glow/artwork loops are removed.
  Loading, saving and direct-interaction feedback remain.
- **Scroll choreography:** page/timeline entrance controllers scanned descendants,
  observed mutations and repeatedly read styles/geometry while scrolling. Cards
  render immediately. Group surface measurement watches only the label notch;
  fades use CSS rather than per-frame slot transforms. An invisible shine layer
  no longer mounts an observer for every intake.
- **Notification clocks:** every notice previously polled at 20 Hz, including
  indefinite and paused notices. Visible finite notices now paint only their
  progress rail at 5 Hz using `scaleX`; sleeping notices use one expiry deadline.
  Indefinite/paused notices have no polling timer. Forced lifecycle checkpoints
  retain countdown progress across refresh/navigation.
- **Draft/storage cascades:** full-workspace subscriptions caused unrelated cards
  and providers to rerender on typing and scroll updates. Consumers now select
  their own fields, and provider values are stable. Byte-identical validated
  storage and draft byte budgets are reused. Scroll checkpoints wait for a quiet
  interval; unchanged coordinates skip serialization/writes. **Draft text still
  saves immediately on each edit**, with cross-tab/recovery checks preserved.
- **History preparation:** each visible card scanned/timezone-converted the whole
  history before checking its cache. A shared, weakly held index builds once per
  immutable server snapshot. Valid cache hits skip redundant serialization and
  writes. The newest three past days remain uncached.
- **Loading and dialogs:** intake/management forms and check-in mood/sleep/writing
  components use dynamic imports. Dialog scroll restoration disconnects layout
  observers after the first interaction; opening at the top and writing-pane
  positions within one opening remain intact. OCR remains loaded only on import.

## Measurements

Same-machine synthetic comparisons against local commit `c6b937f`; these are
observations, not device-independent latency guarantees.

| Workload                                                      |             Before |              After |
| ------------------------------------------------------------- | -----------------: | -----------------: |
| 40 immediate durable draft edits, 900KB workspace             |              269ms |             69.5ms |
| 100 scroll checkpoints, same workspace                        |              648ms |              143ms |
| 100 unchanged location checkpoints                            | 629ms / 100 writes | 0.048ms / 0 writes |
| History sources/eligibility, 1,440 intakes and 60 cards       |            1,399ms |              141ms |
| Indefinite notice, 5 seconds: clock callbacks / DOM mutations |          100 / 700 |              0 / 0 |
| Finite visible notice, 5 seconds: callbacks / DOM mutations   |          101 / 808 |            25 / 29 |
| Finite visible notice, 5 seconds: storage writes              |                 10 |                  5 |

Production-minified React fixtures also exercised Today, Past Days and Medications
at 390×844 and 1100×844, using 24 medications, 48 current-day intakes and 600
historical intakes. Today removed four decorative canvases; its phone scroll
sample went from 214 geometry reads to zero and from 66 layouts to two. An idle
Today phone sample went from 202ms of main-thread tasks in three seconds to less
than 1ms, with no active notifications. Active countdowns still perform useful
scheduled work.

Browser measurements used headless Chrome with software graphics on macOS.
WebGL was unavailable there, so the measurements do **not** quantify the removed
shader's real GPU cost or establish physical Safari/iPhone frame rates.

## Validation and maintenance

- `npm test`: 1,092 passing tests, including selector stability, durable drafts,
  cross-tab recovery, no-op checkpoints, history index equivalence and notification
  scheduling/deadline overflow.
- `npm run lint`, `npm run typecheck`, `npm run theme:check`, production build.
- Synthetic browser checks: group reveal/fold; lazy forms; intake preview bounds;
  modal top-on-open/reopen; keyboard trapping, Escape and return focus; writer pane
  positions; notification expansion, actions, Undo, hover/focus pause, expiry,
  rear-card deadlines and refresh persistence; light/dark layouts.

For future effects, measure a production build on the target device. Avoid
per-card frame loops and subtree observers, keep geometry reads out of scroll
handlers, prefer compositor transforms for short transitions, and give every
timer/observer an explicit cleanup. Do not defer durable writing to improve a
benchmark. A growing journal, pending operations, device load and browser behavior
still affect latency; retain targeted profiling when a new slowdown appears.

A follow-up pass removed the newly added sleep alarm and score particle loops,
plus their observers and an unused writing-doorway visibility observer. Sleep
artwork is static again. Number formatters are reused, and date/time formatter
caches are bounded to 32 configurations. A same-machine synthetic sample of
5,000 dose labels fell from 567ms to 42ms; 1,000 day labels fell from 393ms to
8ms. These are formatting benchmarks, not an iPhone frame-rate guarantee.

These changes must be published before an installed production PWA can use them.

## Daily aggregates and snapshot indexes — November 21

A follow-up audit caches all-time sleep samples and usage-based medication,
route, quantity and mood preferences until the next local 06:00. Live dose totals,
effective goals, journal day lists and saved Journal metadata reuse immutable
source indexes instead of a daily TTL. See [cache coverage and invalidation](derived-values-cache.md)
for the scope, boundaries and storage behavior.
