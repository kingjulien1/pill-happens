# Pill happens

A personal medication journal: record what you took, keep your own notes, and revisit each tracking day without losing the details.

Built with **Next.js 16.4.3**, **React 19.3.1**, TypeScript, Tailwind CSS 4 and shadcn/ui components using Base UI. The production app runs on Vercel, with Neon Postgres connected through the Vercel Marketplace.

## Shared theme and page layout

`src/lib/app-theme.ts` is the source for paired semantic colors and generated application/offline CSS. Plum `#2b233e`, Lilac `#b7a4e5`, Apricot `#f2b88f`, Black `#111014` and White `#ffffff` form the foundation. Rose, Iris and Mint add related reflections. Light appearance uses rose/lilac surfaces with deep Plum copy; dark appearance keeps opaque Plum reading surfaces. Canvas copy has its own tested foreground pair. Medication colors are personal identity information and remain independent of interface theme choices.

The shared canvas uses [React Bits Iridescence](https://reactbits.dev/backgrounds/iridescence?clickSwirl=false&mouseReact=false&color=7c3aed) in Violet `#7c3aed`, at **speed 0.92**, detail 8 and brightness 1.5. Mouse reaction and click swirls are disabled. A background-only 4px blur is followed by Pink300 at 21% and Purple900 at 69%. The same still fallback and overlays paint before hydration, offline or without WebGL2. Hidden/offscreen animation pauses; reduced motion uses a still. Mobile rendering is capped at DPR 1.25 / 750,000 pixels and desktop at DPR 1.5 / 1,800,000 pixels. Upstream attribution is retained in `public/licenses/react-bits.txt`.

**Main actions** explicitly opt into the shared intake appearance: an opaque dark-pink `#29131f` face, a Pink600 inward band at 74%, Pink200 supporting icons/copy and a moving pink rim with a 28% Pink300 admixture. Today and Add Medication share the intake card’s **80px height and 21px corners**. Their 5.5px moving rim remains at 30% opacity, with a separate 2px inner band after a 1px gap. Dialog submission buttons share this finish at their compact form size. Ordinary small controls retain semantic variants; Secondary stays tonal.

Header branding, navigation and the loading core share Pink950 beneath a Mauve900 overlay at 67%, Pink400 artwork/edges and a finer inward edge. The 46px controls keep their existing gestures and focus behavior. Navigation has its own scoped rose/plum surfaces; form selectors and Appearance retain paired semantic menu roles.

Today and individual history timelines use a **510px** content cap; collection screens use **760px**. Guides have a wider responsive reading shell, native in-page navigation and an outline rail from 1024px. Mobile gutters, scrollable tables/code, safe areas and touch targets keep the references usable on a phone. Regenerate with `npm run theme:generate`; verify with `npm run theme:check`.

## The experience

- **Password journals:** an existing password opens its journal. A new password opens a confirmation drawer/dialog showing the exact value; only confirmation creates the separate empty journal. Anyone with the same exact password can open the same journal.
- **First visit:** a freshly created journal first opens `/guide#start`. Its Daily Log action can start immediately; returning journals can resume their last screen. Getting Started and Developer Guide remain available from navigation.
- **Today:** intake cards run chronologically by **Date & Time Taken**. Log Intake opens a bottom drawer below 768px and a centered dialog above it. Medication, quantity, optional route and taken time remain editable. Fractions accept a comma or dot; dose is quantity × that medication’s current strength. Distinct medications never merge into one dose.
- **Navigation:** phones use the same bottom-sheet Drawer family as intake editing, with safe-area clearance, modal focus management and scrolling destinations. Desktop uses a 376px anchored Base UI menu with keyboard navigation/typeahead. The six destinations are Today, Journal, Past Days, Medications, Goals and Getting Started. Footer tools include Backups & Export, Report a Bug and Developer Guide. Appearance offers Light, Dark and Follow Your Device.
- **Brand gestures:** click/keyboard activation opens Today; pull down to refresh or right to open Medications. Short pulls cancel. Loading readiness holds page entrances until the actual refresh presentation is finished; background writes do not replay completed card entrances.
- **Medications:** saved entries use the intake card’s shared frame, surface, artwork and compact typography. A colored medication-form badge replaces the plain type label, and names truncate before their category rail. The count row shows the displayed medication total with subtle active/archive count filters. The notice that edits update all past logs uses a 37%-opacity surface. Archive/Restore lives in the editor header beside Reset Draft and Close.
- **Medication identity:** name, strength, physical form, default intake quantity and optional Active Ingredient/Wirkstoff are editable. Categories are manual and independent; names never infer them. Appearance search includes Lucide, emoji and project SVG symbols, with outline and colored variants counted separately. Color and rotation remain part of the saved identity; Final Look shows the actual shared card composition.
- **Corrections:** medication edits update linked past entries; strength edits recalculate historical doses from recorded quantities. Intake quantity, taken/creation times and notes remain as entered. The library opens editing from its whole card, and intake deletion requires confirmation.
  Shared medication artwork keeps a fixed 48px face within a 56px rail, with a thick glass outer rim and a saturated family-400/500 inner edge at 78%. Recorded quantities other than one appear as plain **`× n` total quantities** at its top-left, including fractions. The decorative fan still stops at three icons. The heading rail brings intake route and physical form beside the category outlines, with a small dot and consistent primary ink; these values stay distinct and never alter dose calculations.

- **Groups:** consecutive taken times within a rolling 13-minute gap share a stack. Each taken time extends the window. A folded stack shows one main face and up to six complete rear faces; revealing it exposes every original card at full size. A second card activation edits that intake. Cards stay mounted; disclosure state is remembered for the day and journal. Weekly history reuses the same stack behavior and visual frame.
- **Goals & streaks:** daily maximums are personal reference values for one medication. Logging streaks count consecutive recorded tracking days, independent of dose-goal compliance. Earned milestones remain unlocked after a gap; `/streaks` and milestone pages are reached through the Getting Started guide. Comparisons use existing records and leave missing values unknown.

### Morning and Evening

Morning opens from the **06:00 reset**; Evening becomes available at **17:00 in the journal timezone**. Their placement changes with the active period; historical days retain Morning above and Evening below the intakes. Both use pink accents, very dark icon tiles, primary-ink artwork and compact completion rings. Morning’s three shortened steam curls have no pot refill, fireworks or large rising glow. Evening’s crescent follows its physics-derived pendulum path with bounded twinkling stars. Ambient motion starts 300ms after icon entry settles, pauses behind an open editor or offscreen/hidden page, and respects reduced motion.

The leading `HH:mm` records the **first observed opening on this device**, separately from the latest successful save. Opening metadata persists without pressing Save and survives draft resets; it grants no completion credit. The 40px ring uses a small 9.208333px number. Unobserved, content-free cards retain a dim starter arc and truthful zero progress; drafts and saved responses remain distinguishable.

- **Morning’s five completion groups:** Notes, Sleep Ratings, Sleep Schedule, Night Interruptions and Sleep Duration. Optional 1–10 ratings cover dream recall, sleepiness, depth, restfulness and overall quality. Enter clock times, interruptions and actual/extra sleep without invented defaults. Time in bed and estimated efficiency are neutral arithmetic summaries.
- **Evening’s five visible groups:** Notes, Mood, Energy, Stress and What Helped. **105 Lucide moods** span Steady, Bright, Connected, Energized, Low and Unsettled. Search matches labels/IDs/keywords/families immediately; a three-row scrolling picker allows up to four selections. Saved usage sorts first; a deterministic day-seeded shuffle orders ties and unused choices. Existing mood IDs render through the same Lucide renderer everywhere.
- **Ratings:** new Energy/Stress values use optional 1–10 sliders. Old five-point values keep their raw scale until that field is edited or cleared. Display and comparison helpers handle both without a bulk rewrite.
- **Legacy sleep:** Evening no longer shows Sleep & Tonight inputs. Existing `sleepHours` and `bedtime` stay in records, exports and compatible drafts; explicit legacy sleep completion remains queryable. New sleep details belong in Morning.

### Journal writing and saved drafts

Both check-ins open the shared Markdown writing space, up to **100,000 characters**. Exactly empty writing starts with a relaxed date H1 such as `# Tue, Nov 17 --` and the cursor on line two. Existing content is never overwritten just to add that scaffold. Local drafts save as you type; writing has its own acknowledged autosave policy, while full check-in and other form submissions remain explicit.

`@` references medications, active ingredients and manual categories. `/` references days, ISO weeks and Morning/Evening journals. Suggestions use only the already-loaded journal and preserve stable absolute destinations. Readers render compact linked components; references to intakes reveal the actual card and references to medications open the matching library record. Journal previews show dates, reading metadata and mentioned references rather than raw body excerpts. The main collection includes saved writing strictly longer than 100 Markdown-aware words; direct journal links can read shorter saved notes.

The journal-scoped device workspace keeps unfinished intake, medication, goal, check-in and preference inputs, including incomplete raw text. It also remembers the last screen, scroll position, ordinary open dialogs and stack disclosure. Successful saves clear only their own draft; failed requests and closing retain it. Reset Draft requires confirmation where provided and never changes saved records. Multi-tab reconciliation applies explicit draft changes to the latest durable workspace. Passwords, authentication tokens and destructive confirmations never enter draft storage. Device/browser storage can still be unavailable or cleared; the UI reports that fallback honestly.

### Past Days and private card caching

Past Days includes intake and check-in-only days, newest first, grouped into Monday–Sunday ISO weeks. Its initial **20-recorded-day budget** includes the complete boundary week; Load More Weeks adds another 20 without splitting a week. Day cards use the intake card’s frame, restrained selected-color tint and first chronologically taken medication artwork. Counts and saved-period summaries replace reflection excerpts. Open a day to review its timeline or add a missed entry.

Older day-card display models are cached privately on the device through `history-card-cache.ts` and `use-history-card-summary.ts`. **The newest three recorded past days always stay live**; Today/future/empty days do not use snapshots. Keys are versioned and journal-scoped. Fingerprints include displayed intake values, current medication identity/strength/color/artwork/categories and check-in completion, so relevant edits immediately invalidate older snapshots. New live-day membership removes only that day’s owned key. Cache records contain counts, artwork identity and accessible summary labels, never journal prose, intake notes or authentication material. Storage errors fall back to live rendering. This is neither an encrypted backup nor a public service-worker/shared server response cache.

### Notifications and undo

Every notice has its own countdown; rear notices never wait for the front one. The first activation on a folded notification stack **only reveals the stack**. Activate a revealed card again for details. There is no notification-count cap: the expanded stack scrolls within the viewport and keeps every active notice reachable.

The default nominal budget is `22_000 / 3` ms. Its eased final segment makes the bar last about **8.633 active seconds**, followed by **1 second of active grace**. Holding, focus or expanded details pause that notice. Card/bar urgency begins at halfway; color approaches Rose near the end. A circular `3 / 2 / 1` marker uses true remaining active time and distinct number-change/entry/exit motion. Reduced motion keeps a static, truthful indicator.

The result badge is separated from the heading by a spaced dot. Success, error, warning, info, loading and update variants share semantic badge contracts. The bell’s check alone uses Emerald ink; the bell body keeps primary ink. Its rear plates are enlarged by 25% with 39% lower opacity, preserving their independent rotation/sway. Expanded details prioritize a brief change summary and original shared Before/After cards, with yearless dates, centered captions, route/form glyphs, inset separators and compact footer tools. Header and footer Undo slots remain visible but disabled when no reversal exists. A real Undo uses only the server-issued receipt; missing or failed responses never manufacture a successful preview.

The detailed public API, timing, motion, accessibility and recovery contracts live in the **Developer Guide → Notifications & Undo**, including a synthetic playground that never writes to the journal.

### A new day begins at 06:00

Small wake-up and bedtime markers frame the daily stack on Today and past-day pages. Their display-only fallbacks are **12:30** and **23:30**. Morning’s Got up time updates the first marker; an existing saved Evening bedtime can still inform the last. The new Evening form has no bedtime input. These markers never create responses, change intake ordering or move the journal’s 06:00 tracking-day boundary.

The default journal timezone is **Europe/Vienna**. An intake taken at 05:59 belongs to the previous tracking day; one taken at 06:00 belongs to the new day. The home page switches days automatically while open. Previous entries stay saved in history.

Times are stored as UTC timestamps and interpreted using the journal's IANA timezone, independently of the device timezone. The day calculation uses the local calendar, so daylight-saving days can contain 23 or 25 hours. Changing the timezone regroups existing entries without changing their timestamps.

The date/time field opens at the current time for a new log. When adding a missed intake from a past day's page, it starts at noon on that day. The form shows which tracking day will receive the entry. Future intake times are rejected. A nonexistent local time during the spring clock change is rejected; a manually entered repeated time during the autumn clock change selects its earlier occurrence. An unchanged time field preserves the original instant and seconds, including entries from the second occurrence of a repeated hour.

The timeline is ordered by **Date & Time Taken**, from earliest to latest. Backdated entries appear at their recorded time and join the appropriate rolling 13-minute group, extending or bridging stacks when the consecutive gaps allow it. Creation timestamps remain saved but do not determine the displayed order.

### Each medication stays separate

Enter strength in **mg per tablet, capsule, drop, or other unit**, using the medication packaging. The amount field records a quantity of those units with up to two decimal places, then shows the calculated dose beside it inside the same control. For a 6 mg tablet, **0.5 tablets · 3 mg** means a quantity of 0.5 and a calculated dose of 3 mg. The mg display does not change the recorded unit. The calculated dose is:

```text
current strength in mg per unit × logged quantity = dose in mg
```

The app does not convert between medications or add different medications into one combined dose. A daily goal and its progress always belong to one medication.

Medication edits apply to every linked intake, including older records created before this policy. Names, strengths, and medication types follow the current medication; changing strength recalculates each dose and every daily total from its actual logged quantity. Quantity, intake time, creation time, notes, and chosen goal limits remain unchanged. Default-quantity changes only affect new-log prefills. The optional `categories` array stores stable IDs from the 19-label manual catalog in `src/lib/medication-categories.ts`. Labels are optional and can overlap; they organize the journal rather than infer a medical classification or change a medication’s dosage form. The catalog retains English/German aliases for shared lookup helpers; the Categories popup directly lists all labels and uses native keyboard typeahead. Explicit arrays are authoritative, deduplicated, and placed in a stable order; `categories: []` clears the selection, including the two priority flags. When categories are absent, earlier `isBenzodiazepine` and `isOpioid` markings remain readable as a compatibility fallback. Those strict optional booleans remain supported: a flag-only edit updates its priority category on an already categorized record without discarding other labels, while unrelated partial edits and archiving preserve metadata. The current form submits the complete category selection and keeps the priority flags in sync. Exports include categories and compatibility flags with medication details; no intake classification snapshot or storage migration is needed. State and backup reads reconcile old details immediately without writing to storage. Each successful mutation persists the reconciled history within the same atomic save, including concurrent-save retries; failed saves cannot partially update medication details or history. Entries without a linked medication retain their saved name, strength, and unit as a readable fallback. The intake editor also uses the current medication details, even when an open editor outlives an update in another window.

### Goals are personal reference values

Goals are nonnegative daily maximums entered by the user, rather than a generated taper plan. When several goals apply to the same medication and day, the one with the latest start date applies; if start dates match, the most recently created goal applies. Start and end dates are inclusive. A newer goal permanently supersedes earlier goals from its start date. When that newer goal expires, no maximum applies until another goal starts; older maximums do not silently return.

Create a new goal to change a target over time. Removing a goal also removes its effect on historical summaries; intake records remain saved. Progress describes the entries recorded so far and does not prescribe a dose.

Work with your prescriber on dose changes. Stopping benzodiazepines suddenly or reducing them too quickly can cause dangerous withdrawal, including seizures; tapering needs an individual plan and support. See the [FDA's benzodiazepine safety guidance](https://www.fda.gov/drugs/drug-safety-and-availability/fda-requiring-boxed-warning-updated-improve-safe-use-benzodiazepine-drug-class).

## Run locally

Use **Node.js 22 or newer** and npm. The lockfile is committed for reproducible installs.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The development command listens on the loopback interface.

With no database or password configured, development runs without sign-in and saves to **`.data/state.json`**. With a password and session secret configured, this file remains the original journal and additional password journals use **`.data/journals.json`**. This directory is ignored by Git. Local writes are serialized and replace the file atomically. This storage mode is for a single local development process; production always requires Postgres.

To use environment variables locally, copy the example:

```sh
cp .env.example .env.local
```

Restart the development server after changing the environment. Once a database or password is configured, sign-in requires both a valid password and session secret. A development session connected to a database reads and writes that database.

The retained reflection-insights endpoint has optional server-only `OPENAI_API_KEY` and `OPENAI_MODEL` configuration (default model `gpt-5.4-mini`). Reading, writing and manual Refresh do not call that endpoint. Separately, optional daily journal editing uses `OPENAI_API_KEY`, an explicit `JOURNAL_EDITING_JOURNAL_ID`, `CRON_SECRET` and its own `JOURNAL_EDITING_MODEL` setting described below. Keep every credential out of browser-prefixed variables and source control.

## Deploy on Vercel

[Vercel Postgres is no longer available as a standalone product](https://vercel.com/docs/postgres). This app uses Neon through Vercel's Marketplace integration, which provisions the database and connects its environment variables to the project. See [Neon on Vercel](https://vercel.com/docs/storage/marketplace/neon).

1. Keep the source in a **private GitHub repository** and import it as a new project in Vercel. Use the detected Next.js framework preset, the repository root, and the standard `npm run build` command.
2. In the project's Storage or Marketplace integration flow, add **Neon Postgres** and connect it to the project. Confirm that the production environment contains **`DATABASE_URL`**. Choose an appropriate database region near the Vercel function region.
3. Generate credentials on your own machine:

   ```sh
   npm run secrets
   ```

   The script prints a random `APP_PASSWORD` and `SESSION_SECRET` in the terminal. Save the password in your password manager and copy both values into the project's private Vercel environment variables.

4. Ensure the three required production variables are configured, then deploy or redeploy so the running app receives them.
5. Open the deployment, sign in, add a medication from its packaging, and save a test entry. Reload to confirm persistence, then delete that test entry.

The tracked `vercel.json` selects the Next.js preset and pins functions to Frankfurt (`fra1`), matching the initial Neon database region.

Optional daily editing is scheduled by Vercel at `15 5 * * *` UTC through `GET /api/cron/journal-editing`, after Vienna’s 06:00 tracking-day reset. On Hobby, invocation can vary within the scheduled hour; this is not an exact-minute guarantee. Set `JOURNAL_EDITING_JOURNAL_ID` to the one intended journal, `CRON_SECRET` to an independent random secret of at least 32 characters, and `OPENAI_API_KEY` server-side. The optional `JOURNAL_EDITING_MODEL` defaults to `gpt-5.4-mini`; it is separate from the retained insights endpoint’s `OPENAI_MODEL`. Redeploy after changing configuration. The cron fails closed without valid authorization, a valid explicit journal ID, the provider key and database URL; it never chooses a journal from a password or browser session.

Only nonempty writing from completed past tracking days is eligible. The current tracking day and device drafts are untouched. The conservative copy-editing policy keeps the writer’s voice, facts, numbers and dose context, negation, existing links and authored titles; it corrects clear grammar/syntax while keeping the complete body and adding no advice. One dated H1 carries a few-word summary, capped at 12 words/110 characters and refreshed to reflect the whole current body when an entry changes. Other authored H1 titles become H2 without losing their text; additional H2/separator structure stays minimal. New links must match allowlisted existing app references; no new external URL is accepted. Saved note and medication/reference context are sent to the configured provider for this optional server-side operation.

A source/output hash and policy version skip unchanged reviewed entries. Each invocation processes at most 8 entries within a 240-second work budget, with a 45-second provider timeout and a 10-minute lease against overlapping work. Applying an edit compares both the original note and `updatedAt`, so concurrent manual edits are skipped. Failed, skipped or excess eligible work remains available for a later daily run rather than creating an immediate retry loop. Original and edited Markdown are retained in `AppData.journalEditing.revisions` and the normal private export. Once the intended journal is configured, an owner-authorized initial invocation of the same cron endpoint can process eligible backlog; scheduled runs continue any remaining work.

The server creates its tables automatically on first database use. The database connection therefore needs permission to create tables. The password-journal update adds credential and registry tables and preserves the original `personal` journal row, including its version and timestamp. The repeatable schema statements live in `src/lib/server/journal-repository.ts`; no manual data migration is needed.

For Preview deployments, configure the same authentication requirements with a separate Neon database or branch. This keeps preview changes separate from the personal production journal.

### Environment reference

| Variable                     | Purpose                                                                                                                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Neon Postgres connection string. Required in production. The Marketplace integration normally supplies it.                                                                                                 |
| `APP_PASSWORD`               | Password for the original personal journal, at least 4 characters. Required in production or when a database or password is configured. Additional journal passwords are created through the login screen. |
| `SESSION_SECRET`             | Random session-signing secret, at least 32 characters. Required alongside authentication.                                                                                                                  |
| `APP_ORIGIN`                 | Optional exact origin, such as `https://your-project.vercel.app`, for a reverse proxy that changes the request origin. Normally leave unset. No trailing slash; use environment-specific values if needed. |
| `OPENAI_API_KEY`             | Server-only provider key, required for optional daily journal editing; also used by the retained insights endpoint. Reading and manual Refresh do not call the provider.                                   |
| `OPENAI_MODEL`               | Optional compatible model for the retained insights endpoint only. Defaults to `gpt-5.4-mini` when blank.                                                                                                  |
| `JOURNAL_EDITING_JOURNAL_ID` | Exact ID of the single journal eligible for scheduled editing. Required to enable that job; never inferred from a browser session.                                                                         |
| `CRON_SECRET`                | Independent random bearer secret of at least 32 characters for the Vercel cron endpoint. Required for scheduled editing.                                                                                   |
| `JOURNAL_EDITING_MODEL`      | Optional compatible daily-editing model. Defaults to `gpt-5.4-mini`; independent of `OPENAI_MODEL`.                                                                                                        |

Production fails closed until the database, password, and session secret are configured. It never falls back to local file storage in production. The login page displays generic setup guidance when configuration is incomplete.

Changing `APP_PASSWORD` changes access to the original personal journal and invalidates its sessions. Changing `SESSION_SECRET` invalidates all sessions; additional journals keep their passwords because password verifiers do not depend on the signing secret. Sessions last up to 400 days and use persistent HTTP-only cookies, marked secure in production, with `SameSite=Lax`, `Priority=High`, and path `/`. Lax allows a valid session on incoming top-level navigation, where Strict could show the sign-in page despite a stored cookie. Every verified state load or cookie-only session check reapplies the current cookie policy; the signed token renews at most daily. Existing valid 30-day sessions upgrade automatically; expired, tampered, or revoked tokens are never renewed. The 400-day setting follows [Chrome’s persistent-cookie limit and renewal behavior](https://developer.chrome.com/blog/cookie-max-age-expires).

The journal checks again when its window becomes visible, returns from the back/forward cache, regains focus, or comes online. Concurrent refreshes share a request, and a 20-second deadline prevents a stalled mobile load from blocking later attempts. Visible, continuously open windows also make a lightweight check every six hours. That endpoint returns only authentication status and never loads journal records. A transient 401 gets a short session-recovery window before redirecting; unavailable servers, timeouts, and contradictory authentication responses keep the current screen with a retry message. A restored session retries only the journal GET, never a medication or intake save. The sign-in screen can recover a delayed saved cookie before the user starts typing. Successful sign-in and sign-out use a fresh document navigation to avoid stale authentication responses in the router cache.

Normal reloads, closing and reopening the browser or PWA, and device restarts should preserve the persistent cookie when the browser retains its site data. Browsers or operating systems may clear it earlier; clearing site data, explicit sign-out, and credential revocation require signing in again. Safari and its installed Home Screen app can have separate cookie stores, so sign in inside the installed app if needed. The password and bearer token are never copied into local storage, IndexedDB, or service-worker caches. Sign out through **Past days → Preferences**; this cancels the window’s background checks and clears its cookie even if that session has already expired. Same-origin validation remains required for sign-out and all other mutations.

## Storage and privacy

Each exact password selects one journal. There are no usernames, email addresses, or password-reset flow. Passwords preserve spaces, case, and Unicode without normalization and accept 4–1,024 characters using the input's native length rules. The creation confirmation displays the password in plain text only while it is open. Cancelling creates nothing; an existing password opens its journal directly. Duplicate creation, including simultaneous requests, cannot replace a journal's records.

Authentication protects the application routes and API. Every data read, mutation, and export derives its journal from the verified session cookie; request parameters cannot select another journal. Existing original-journal sessions remain compatible. Mutations require the same origin, inputs are validated on the server, and sign-in is limited to 10 attempts per 15-minute window across the installation. Creation also has a separate 10-attempt window. Successful sign-in or creation does not reset either counter, so access to one journal cannot bypass the limit for another. Database-backed rate limiting works across Vercel function instances.

Additional journal passwords use scrypt with a random 16-byte salt, a 64-byte verifier, and constant-time verification. Plain-text passwords are not stored in the credential tables, session cookies, URLs, or browser storage. Password lookup verifies the stored salted hashes rather than maintaining a fast password index. This design is intended for personal use and caps additional journals at 50; lookup time grows with the number of journals.

The production database has four tables:

| Table                           | Contents                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pill_happens_state`            | One document per journal containing medications, linked intake details, goals, and timezone settings, plus its version counter and update timestamp. |
| `pill_happens_login_attempts`   | Separate installation-wide sign-in and creation counters and rate-limit windows.                                                                     |
| `pill_happens_journal_registry` | A version counter used to serialize concurrent credential creation.                                                                                  |
| `pill_happens_journals`         | Additional journal identifiers, salted scrypt password verifiers, and creation timestamps.                                                           |

Updates use optimistic version checks and retry on contention to avoid overwriting a simultaneous save. The client also prevents overlapping saves within one open app instance. The full journal is loaded into the client; the 20-day history limit controls the display, rather than database pagination. This is intentionally sized for personal use.

There is no runtime analytics or advertising integration. Journal responses use `private, no-store`; database details and submitted notes are not written to application error logs. The app does not implement client-side or field-level encryption. Access to the hosting and database accounts also grants access to stored records.

`.env` files, local data, Vercel project metadata, and build artifacts are ignored by Git. Keep actual intake records and credentials out of commits, screenshots, and issue descriptions.

## Export and backups

Use **Past days → Export journal** while signed in. The authenticated `/api/export` endpoint downloads a JSON document containing:

- `schemaVersion` and `exportedAt` metadata;
- all medications, including archived items;
- all intake records with current medication details, timestamps, quantities, and notes;
- all goals and notes;
- saved Morning/Evening check-ins and their complete Markdown;
- original/edited journal-writing revisions and audit metadata when present;
- the journal timezone.

Exports contain personal records, including original writing retained before an automated edit, and should be stored privately. There is **no full-export import or restore interface**. A separate authenticated, same-origin `POST /api/journal/editing/restore` with `{ "revisionId": "…" }` restores only that editing revision’s original note when the current note still matches its edited hash; an intervening change is kept and returns a conflict. There is no additional restoration UI. An export can be inspected or used for a future migration; database recovery should use the database provider's backup tools. Local development data is a separate dataset and is not automatically migrated when a production database is connected.

## Development and verification

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run theme:check
npm run icons:app:check
npm run build
```

Tests use Node's test runner with `tsx`. They cover day boundaries, timezone conversion, daylight-saving transitions, invalid local times, separate medication totals, retroactive medication details and missing-medication fallbacks, goal precedence, calendar validation, server input validation, fail-closed configuration, session tampering and expiry, credential rotation, and origin checks. Password-journal regressions also run the real SQL repository against an isolated PGlite Postgres engine, without deployment credentials: additive schema preservation, journal isolation, duplicate and concurrent creation, transaction rollback, simultaneous saves, and separate creation quotas.

Draft regressions cover raw unfinished values, namespace isolation, safe route/dialog descriptors, corruption recovery, version and size limits, unavailable storage, quota failures, no age expiry, successful-save cleanup, and stale dialog generations. Intake draft tests preserve original seconds and repeated daylight-saving instants, retain blank fields, and adapt display after timezone changes without changing the recorded instant. Stack regressions cover one-head normalization, legacy extra-head removal, full-card folded geometry, open/closed targets, variable natural heights, and remembered state across reloads and interrupted transitions.

Verification includes automated tests, a production build, strict TypeScript, ESLint, and formatting checks. The password-journal flow also passed 68 isolated HTTP checks using synthetic records, covering CRUD and export separation, exact passwords, duplicate races, origin checks, tampered sessions, and rate limits. Browser checks at 320px, 390px, and 1024px in both color modes cover confirmation, cancellation, long passwords, connection errors, creation conflicts, pending submission, and existing-password sign-in. These checks use fake credentials and do not read production journal records.

Session persistence verification covers real cookie attributes, existing-cookie policy migration, aged-token renewal, expired/revoked rejection, normal and hard reloads, closing/relaunching a persistent browser profile, and incoming navigation from another site. Isolated browser checks also exercise delayed cookie startup, a transient state 401, an unavailable session server, coalesced resume events, and explicit sign-out during a pending load. Recovery primitives have 14 focused tests; the complete suite includes seventeen milestone sequence, comparison and data-coverage checks, nineteen daily-check-in timing, validation and persistence checks, six brand-refresh gesture/marker checks, sixteen rolling taken-time grouping regressions, nine background timing and resolution checks, six retroactive-medication and atomic-save checks, eight manual-classification validation and persistence checks plus four shared four-state classification helper checks, seven canonical-theme registry, composited-contrast and generated-asset checks, four legacy wave-geometry utility checks, and five neighboring-family wave-color utility checks. These checks use a temporary development server and synthetic journals. Five first-visit onboarding regressions additionally cover legacy compatibility, persistent acknowledgement, isolated journals, failed saves and concurrent updates. Six spotlight-navigation regressions cover current-run targeting, valid query values, older milestones and unchanged achievement status. Eleven category catalog, compatibility and persistence checks cover multi-label selection, bilingual search, legacy markings, and saved data. Seven request-parser regressions additionally cover exact byte limits, full-length Unicode/escaped reflections, dishonest content lengths, content types, and malformed JSON. Spotlight helper checks cover valid milestone links, current-run targeting, canonical query parsing, and the separation between navigation intent and recorded achievement status. Mobile/standalone emulation does not constitute testing a physical iPhone, WebKit, or an actual device restart.

Earlier manual checks covered the logging and management flow, backdating, correction, deletion, and 20-day history loading. Production HTTP checks confirmed that missing configuration blocks data reads and writes and returns a generic setup screen.

`npm run build` produces a production build. To run that build locally, configure the production database and authentication variables, then use `npm start`. Like the development command, it listens on `127.0.0.1` by default.

Daily check-ins allow a 1 MiB JSON body so valid full-length Unicode or escaped text can reach validation; other mutation bodies retain their 16 KiB cap.

### Medication SVG Library

The appearance picker includes **57 custom SVG choices**: 16 original symbols, 20 tablet/dispenser outlines and 21 flat-color variants. The latest four pairs are:

| Name         | Simplified Shape / Imprint                        | Flat Color           |
| ------------ | ------------------------------------------------- | -------------------- |
| Xanax        | Horizontal oval; equal-height `UPJOHN` above `90` | Zinc 300 `#D4D4D8`   |
| Iserlohn     | Upright capsule with a center seam                | Violet 300 `#c4b4ff` |
| Desloratadin | Round tablet with a centered `5`                  | Sky 400 `#00bcff`    |
| Atarax       | Slender scored tablet                             | Zinc 300 `#D4D4D8`   |

Each pair lives in `public/icons/medications/tablets/outline/{name}.svg` and `color/{name}.svg`, generated from `src/lib/tablet-icons/geometry.ts` and `artwork.ts`. Assets use Lucide’s 24×24 viewport, default 2px currentColor stroke, no fill and rounded line caps/joins. Imprints use fine vector paths; the filled versions use a single flat pigment with transparent cutouts, without fonts, bitmaps, gradients, shadows or highlights. `Xanax`, `Iserlohn`, `Desloratadin` and `Atarax` are also exported as Lucide-compatible components from `src/components/tablet-icons.tsx`.

Search by the medication name, component name, imprint, shape or color. Both `svg:{name}` and `svg:color:{name}` are allowlisted saved values. Outline icons follow the chosen appearance tint; filled artwork retains its palette color. Both support saved rotation and use the normal picker, medication and intake rendering paths. Generate with `npm run icons:tablets`, then check with `npm run icons:tablets:check`; all existing SVG assets and saved IDs remain stable.

### Theme maintenance

`src/lib/app-theme.ts` is the single source for the five palette pigments, 69 semantic roles, descriptions, intended pairings, and exact light/dark HEX values, including alpha bytes. Its 19 Surfaces & Reading roles distinguish foundation, card, popover, raised, inset, inverse, reading and the fixed canvas with its copy. Generated `src/app/theme.css` supplies the application variables; the generator also updates the offline page’s inline colors and theme-color metadata. The guide reads the registry directly for previews, tables, inspection, and CSS/JSON exports, so it does not keep a separate list of values.

After intentionally editing the registry, run:

```sh
npm run theme:generate
npm run theme:check
npm run icons:app
npm run icons:app:check
```

The theme check detects stale application and offline CSS. Five theme tests cover palette and role integrity, readable text/surface pairings, the literal background ramp, generated styles, and stable mixtures/alpha exports. The app-icon check separately verifies the generated installation artwork. These commands do not recolor the medication catalog or flat-color medication artwork.

### GitHub And Contributions

The repository is [kingjulien1/pill-happens](https://github.com/kingjulien1/pill-happens). Its Developer Guide card pairs the repository heading with “Care, in the making.” and a tiny static split-capsule separator, followed by fuller source/history/contribution copy. A subtle “made with ❤️ by @kingjulien1” credit links directly to the author profile; existing repository destinations and the outline anchor remain stable. The [contribution guide](CONTRIBUTING.md) explains local development, theme and asset generation, focused validation, and reviewable changes. GitHub offers a bug form, an improvement-idea form, and a pull request template from `.github/`. The developer guide links to these entry points, source files, commit history, comparisons, releases and the repository itself. Private GitHub resources require repository access.

### Source map

| Location                                       | Responsibility                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/app/(journal)/`                           | Protected routes for today, history, medications, and goals.                            |
| `src/app/login/`                               | Private sign-in and setup guidance.                                                     |
| `src/components/login-form.tsx`                | Password lookup and explicit new-journal confirmation.                                  |
| `src/components/journal-pages.tsx`             | Daily dashboard, history summaries, management pages, and preferences.                  |
| `src/lib/journal-mentions.ts`                  | Trigger-aware local search, calendar resolution, strict hrefs and reference catalogues. |
| `src/lib/journal-reference-markdown.ts`        | Render-only enrichment for exact typed medication/category and calendar references.     |
| `src/components/journal-mention-menu.tsx`      | Debounced caret popup, separate child disclosure and keyboard/pointer interaction.      |
| `src/components/journal-reference.tsx`         | Seven compact inline reference families shared by previews and readers.                 |
| `src/components/journal-reference-arrival.tsx` | Live intake navigation, group reveal, record focus, scroll and transient highlight.     |
| `src/lib/journal-reference-details.ts`         | Per-medication historical statistics, category membership and sparse ISO week models.   |
| `src/components/medication-category-page.tsx`  | Category hero, sourced background, saved medications and connected ingredients.         |
| `src/components/medication-detail-page.tsx`    | Saved definition, active-ingredient context, separate amounts and linked intakes.       |
| `src/lib/history-card-cache.ts`                | Versioned private day-card summaries, fingerprints and newest-three live policy.        |
| `src/components/use-history-card-summary.ts`   | Journal-scoped device cache integration with safe live-state fallback.                  |
| `src/components/history-week-page.tsx`         | ISO week range, actual history cards and separate per-medication totals.                |
| `src/components/journal-entry-page.tsx`        | Dated Morning/Evening reading without the main collection’s word-count threshold.       |
| `src/components/medication-card.tsx`           | Shared intake/library card content, class markers, metadata slots and density.          |
| `src/components/medication-card-base.tsx`      | Content-free selected-color and glyph frame shared by intake and library cards.         |
| `src/components/medication-library-card.tsx`   | Full-card medication editor trigger and composed library details.                       |
| `src/lib/journal-drafts.ts`                    | Versioned per-journal local draft workspace and safe route/dialog validation.           |
| `src/components/journal-drafts.tsx`            | Draft hooks, storage status, and page/dialog resume lifecycle.                          |
| `src/lib/intake-stack-layout.ts`               | Single-stack open/folded state, natural card geometry and staggered transitions.        |
| `src/lib/intake-form-draft.ts`                 | Raw intake controls and timezone/DST-safe draft timestamps.                             |
| `src/components/intake-form.tsx`               | Intake creation and correction.                                                         |
| `src/components/manage-forms.tsx`              | Medication and goal forms.                                                              |
| `src/components/responsive-modal.tsx`          | Mobile drawer and desktop dialog behavior.                                              |
| `src/components/journal-background.tsx`        | The shared static CSS canvas, independent of panel appearance.                          |
| `src/components/grainient.tsx`                 | Optional React Bits renderer; not mounted for the app canvas.                           |
| `src/components/ui/`                           | Local shadcn/ui components.                                                             |
| `src/lib/domain.ts`                            | Shared types, 06:00 calendar rules, totals, and goal selection.                         |
| `src/lib/medication-categories.ts`             | Manual category catalog, aliases, search, and legacy priority-label compatibility.      |
| `src/lib/streak-spotlight.ts`                  | Valid milestone targets and local spotlight links.                                      |
| `src/lib/streak-spotlight-client.ts`           | Target-only browser-history replay markers and explicit replay events.                  |
| `src/components/streak-spotlight.tsx`          | Visible-card focus/scroll and reduced-motion-aware spotlight animation.                 |
| `src/lib/server/journal-repository.ts`         | Repeatable Postgres schema, atomic creation, and scoped persistence.                    |
| `src/lib/server/journal-service.ts`            | Password lookup, duplicate detection, and journal creation policy.                      |
| `src/lib/server/passwords.ts`                  | Exact-password validation and salted scrypt verifiers.                                  |
| `src/lib/server/`                              | Authentication, validated API helpers, and storage.                                     |
| `src/app/api/`                                 | Authenticated journal endpoints, export, and sign-in/out.                               |
| `src/lib/app-theme.ts`                         | Canonical five-color palette, semantic roles, pairings, and CSS rendering.              |
| `src/app/theme.css`                            | Generated system light/dark theme variables.                                            |
| `src/lib/guide-colors.ts`                      | Registry-derived guide data, exports, and HEX/RGB presentation.                         |
| `src/components/guide-colors.tsx`              | Theme previews, paired role tables, color inspector, and copy controls.                 |
| `src/components/developer-guide-page.tsx`      | Dedicated design-system, implementation and contribution handbook.                      |
| `src/lib/developer-guide.ts`                   | Shared source references, code recipes and developer-guide content.                     |
| `src/components/guide-onboarding.tsx`          | First-visit acknowledgement and race-safe links to Today.                               |
| `src/components/intake-medication-select.tsx`  | Enlarged intake medication options with metadata and native selection behavior.         |
| `src/components/medication-indicator.tsx`      | Priority Brain / Skull / BatteryCharging glyphs and category lookup.                    |
| `src/components/medication-indicator-mark.tsx` | Shared scaled Benzo, orange Opioid, cyan Stimulant and indigo pill-count tiles.         |
| `src/components/medication-card-dose.tsx`      | Shared recorded/default quantity × strength and dose total.                             |
| `src/components/accent-button.tsx`             | Reusable charcoal/Mint accent action and primitive API.                                 |
| `src/components/accent-button.module.css`      | Shared pigment field, inward 3px rim and reduced-motion finish.                         |
| `src/app/layout-spacing.css`                   | Three responsive minimum-clearance tiers.                                               |
| `src/lib/layout-spacing.ts`                    | The documented clearance bands and their rationale.                                     |
| `src/components/guide-content-spacing.tsx`     | Developer Guide reference and truncation examples.                                      |
| `src/lib/server/guide-onboarding.ts`           | Journal-scoped pending-guide checks and atomic acknowledgement.                         |
| `src/app/api/onboarding/guide/route.ts`        | Authenticated, idempotent guide acknowledgement endpoint.                               |
| `scripts/generate-app-theme.ts`                | Generate/check application and offline theme styles.                                    |
| `scripts/generate-app-icons.ts`                | Generate/check the canonical app SVG and installed PNG artwork.                         |
| `src/app/globals.css`                          | Shared visual styles, fixed canvas host, and component animation.                       |
| `public/offline.html`, `public/sw.js`          | Theme-aware public offline shell and versioned installation cache.                      |

The app starts with an empty journal. It includes no demo medication, suggested doses, medication equivalence calculations, automated reductions, or reminders to take medication.
