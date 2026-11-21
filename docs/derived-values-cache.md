# Derived values and caching

The Morning card’s flask-marked sleep value is a **sample**, not an answer. It
shows the mean of all valid recorded nights, rounded to the nearest minute. A
Morning record takes precedence over an Evening sleep field for the same day.
Legacy sleep-hour records count too. Missing/invalid durations are excluded;
recorded zeroes count. With no history, the sample displays an em dash. Saved
answers and active drafts always show their own duration instead.

## Daily preferences

These small aggregates persist on the device in a journal-scoped cache:

| Value                                              | Refresh          |
| -------------------------------------------------- | ---------------- |
| Average recorded sleep                             | Next local 06:00 |
| Medication usage and ordering                      | Next local 06:00 |
| Per-medication route preference and route ordering | Next local 06:00 |
| Frequently logged quantities for quick amounts     | Next local 06:00 |
| Feeling usage counts                               | Next local 06:00 |

The existing minute clock requests fresh journal data at the boundary; the
accepted server response rebuilds the cache. A closed/backgrounded PWA refreshes
on its next active load or resume. DST makes a tracking day 23 or 25 hours when
needed. A timezone change rebuilds immediately. Network failures keep the last
snapshot and retry through the existing clock/focus refresh paths.

The key is `pill-happens:derived:v1:<journal scope>`. It stores aggregate counts,
ranked IDs, route/quantity suggestions and the sleep mean—no medication names,
raw intakes or journal text. Reads validate the scope, version, timezone, expiry,
shape and numeric bounds. Malformed or unavailable storage falls back to rebuilding
from loaded data and a memory cache. Logout/session expiration removes this
journal’s cache. Persistence is capped at 2 MB; larger aggregates remain in memory.

Ordering is cached separately from entities, so a medication’s edited name,
strength, appearance or archived state is never replaced by an old object. The
fresh Log Intake dialog still starts empty; preferences apply only after choosing
a medication. An explicitly chosen route wins over a suggestion.

## Values that must stay current

| Computation                                       | Cache lifetime                       |
| ------------------------------------------------- | ------------------------------------ |
| Intake usage/route/quantity index                 | Immutable intake-array snapshot      |
| Tracking-day intake lists and dose totals         | Intake snapshot + timezone           |
| Effective goal lookup                             | Goal-array snapshot                  |
| Journal day lists                                 | Intake/check-in snapshots + timezone |
| Saved Journal collection and reading metadata     | Check-in-array snapshot              |
| Feeling counts outside daily preference consumers | Check-in-array snapshot              |

These use weak keys, allowing old snapshots to be collected. Medication ordering
keeps at most 64 filtered-library variants per usage snapshot. Day indexes retain
at most two timezone variants. Returned ordering/list/total arrays are copies so
view sorting cannot corrupt the cached result.

Live dose arithmetic, form validation, word counts while typing, countdowns,
active draft state and save acknowledgements are deliberately not held behind a
daily TTL. Editors already memoize reading statistics by their current text.
History summaries retain their existing cache and exclusion of the newest three
past days. Static palettes, formatter instances and immutable lookup tables
retain module caches; medication colors now use a prebuilt lookup map.
