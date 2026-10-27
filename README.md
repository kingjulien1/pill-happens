# Pill happens

A quiet medication journal for personal use. Open a password's private journal, log an intake, and see the current tracking day at a glance.

Built with **Next.js 16.4.3**, **React 19.3.1**, TypeScript, Tailwind CSS 4, and shadcn/ui components using Base UI. The production app is designed to run on Vercel and store its journal in Neon Postgres connected through the Vercel Marketplace.

## The experience

- **Password journals:** enter an existing password to open its journal. A password without a journal opens a confirmation drawer on mobile or dialog on desktop. The exact password appears in a highlighted panel; **Create journal** creates an empty, separate journal and signs in. Going back creates nothing and keeps the entered password available to correct. Anyone using the same exact password opens the same journal.
- **Today:** the compact Today/date heading, with a consecutive logging-day count opposite it and a small “/ N to next” detail for the next streak milestone. Intake entries follow directly below in creation order from oldest to newest. The entries area expands to fill the available screen height, with the entries count and “In order logged” hint just above the logging button. This action area stays fixed near the bottom on mobile, with safe-area spacing and room for the last entry to scroll clear; on larger screens it sits at the bottom of short pages and follows longer lists. Content can grow and scroll normally when it needs more than one screen.
- **Logging:** a shadcn bottom drawer on mobile and a centered dialog at widths of 768px and above. Choose a medication, select or enter a quantity, check the calculated dose, set the time taken, and optionally add a note.
- **Medications:** create and edit the name, strength, medication type, color, and icon. Choose from 24 compact color swatches and 20 Lucide icons, or enter a single emoji. Medication-type and medication selection choices include a leading icon. Archive a medication to remove it from new-log choices; restore it whenever needed.
- **Goals:** record a daily maximum for one medication, with a start date, optional end date, and optional note. Future goals are supported.
- **Past days:** summaries of days with recorded intakes, newest first, with 20 days shown initially and a **Load more** button. Open any day for its entries, totals, and recorded goals, or add a missed intake.
- **Corrections:** tap an intake to edit its medication, quantity, time, or note. Delete an intake through an explicit confirmation.
- **Preferences and backups:** change the journal timezone, sign out, or download a JSON export from the history page.

The layout is designed for mobile, with a narrow reading column, compact centered icon navigation, and generous logging controls. Typography uses the default system sans-serif font, compact headings, and small muted context separated from each title by a dot. The brand pairs a 16px thick tablets mark with a 12px semibold wordmark inside a 40px bar, at least 144px wide. An Ember gradient fill, luminous gradient rim, saturated orange glow, feathered background blur, and slow sheen make it stand out. Light mode uses an apricot-to-orange fill with dark text; dark mode uses an ink-and-rust fill with cream text. Hover and keyboard focus strengthen the glow. Reduced motion retains the static fill, rim, and halo. Its outer link retains a 44px touch target and visible focus. The app icon uses the same tablets symbol. Navigation keeps the familiar bold Phosphor designs at 20px inside 36px buttons, in a 158px by 44px bar with background `#f97316be` and icons `#9a3412`. Cream button backgrounds keep the icons readable, with a brighter selected state and a playful hover/press response that respects reduced motion. Primary actions use larger symbols. Buttons and branding use near-black (`#120f17`) in light mode and brighter cream (`#fff1d6`) in dark mode. Medication markers use their selected color and Lucide icon or emoji across the library, intake entries, goal cards, and medication selectors. The swatch picker uses 20px dots in approximately 32px targets, with keyboard navigation and visible selection indicators.

The original Ember, Clay, and Sand identifiers remain compatible with existing records. Icon selection is optional in stored data; older medications display a pill until customized. Icon values are validated on both client and server as an allowed Lucide name or a single emoji, including combined emoji, skin tones, and flags. Archiving or changing another field preserves the chosen icon. The existing JSON storage accepts these appearance fields without a database migration.

The full-page background uses [React Bits Grainient](https://reactbits.dev/backgrounds/grainient), with the Ember colors `#120f17`, `#2a0f0a`, `#9a3412`, `#f97316`, and `#fed7aa`. It uses radial mode, flow 0.85, variation 16, speed 2.8, saturation 1.01, scale 0.3, contrast 0.84, silk 0.58, softness 0.96, grain amount 0.07, and grain size 1.2px. Animated grain and the intro are enabled; pointer interaction and click swirl are disabled. A theme-colored scrim keeps journal text readable. Both the background's light mode and the interface follow the operating system through `prefers-color-scheme`, including changes while open; there is no theme toggle. Reduced-motion preferences render a still frame. A static Ember wash covers browsers without WebGL. The adapted source is included under the [React Bits license](licenses/react-bits.txt).

The app includes a web manifest and icon for a home-screen shortcut. It requires a network connection to load and save; it has no service worker, offline mode, or queued offline writes.

## Tracking days, quantities, and goals

### Logging streaks and milestones

The counter beside Today counts consecutive tracking days with at least one saved intake. If today has no intake yet, an uninterrupted run ending yesterday remains current; an older gap ends that run. A small secondary label shows days remaining until the next consecutive-day milestone: for example, **3 days / 1 to next**. The milestones are **2, 3, 4, 5, 7, 10, 13, 15, 17, 20, 25, 30**, followed by **35, 40, 45**, and further five-day increments without a cap. Reaching a milestone advances the next target immediately. Backdated, edited, and deleted entries update the counter and remaining days immediately.

These counts describe saved records, not dose-goal compliance or proof that every intake was logged. Multiple entries on a day count once, regardless of dose. The journal timezone and 06:00 boundary apply, including daylight-saving changes. Invalid or future timestamps do not contribute.

Each home-page request selects one of six playful streak icons on the server. The icon stays stable during the visit to avoid flickering or hydration mismatches. The former separate badge, progress bar, and encouragement section are removed; the retained server-only encouragement bank is not selected or sent to the home page.

### A new day begins at 06:00

The default journal timezone is **Europe/Vienna**. An intake taken at 05:59 belongs to the previous tracking day; one taken at 06:00 belongs to the new day. The home page switches days automatically while open. Previous entries stay saved in history.

Times are stored as UTC timestamps and interpreted using the journal's IANA timezone, independently of the device timezone. The day calculation uses the local calendar, so daylight-saving days can contain 23 or 25 hours. Changing the timezone regroups existing entries without changing their timestamps.

The date/time field opens at the current time for a new log. When adding a missed intake from a past day's page, it starts at noon on that day. The form shows which tracking day will receive the entry. Future intake times are rejected. A nonexistent local time during the spring clock change is rejected; a manually entered repeated time during the autumn clock change selects its earlier occurrence. An unchanged time field preserves the original instant and seconds, including entries from the second occurrence of a repeated hour.

The timeline is ordered by **when entries were created**, as requested. Its displayed time is **when the medication was taken**, so a backdated entry can appear after a later intake.

### Each medication stays separate

Enter strength in **mg per tablet, capsule, drop, or other unit**, using the medication packaging. The amount field records a quantity of those units, including decimals. The recorded dose is:

```text
strength in mg per unit × quantity = recorded dose in mg
```

The app does not convert between medications or add different medications into one combined dose. A daily goal and its progress always belong to one medication.

Every intake stores a snapshot of its medication name and strength. Editing or archiving the medication leaves existing intake doses intact. Editing an intake while retaining its medication also preserves that snapshot; choosing a different medication uses that medication's current name and strength.

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

The server creates its tables automatically on first database use. The database connection therefore needs permission to create tables. The password-journal update adds credential and registry tables and preserves the original `personal` journal row, including its version and timestamp. The repeatable schema statements live in `src/lib/server/journal-repository.ts`; no manual data migration is needed.

For Preview deployments, configure the same authentication requirements with a separate Neon database or branch. This keeps preview changes separate from the personal production journal.

### Environment reference

| Variable         | Purpose                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon Postgres connection string. Required in production. The Marketplace integration normally supplies it.                                                                                                 |
| `APP_PASSWORD`   | Password for the original personal journal, at least 4 characters. Required in production or when a database or password is configured. Additional journal passwords are created through the login screen. |
| `SESSION_SECRET` | Random session-signing secret, at least 32 characters. Required alongside authentication.                                                                                                                  |
| `APP_ORIGIN`     | Optional exact origin, such as `https://your-project.vercel.app`, for a reverse proxy that changes the request origin. Normally leave unset. No trailing slash; use environment-specific values if needed. |

Production fails closed until the database, password, and session secret are configured. It never falls back to local file storage in production. The login page displays generic setup guidance when configuration is incomplete.

Changing `APP_PASSWORD` changes access to the original personal journal and invalidates its sessions. Changing `SESSION_SECRET` invalidates all sessions; additional journals keep their passwords because password verifiers do not depend on the signing secret. Sessions last up to 30 days and use HTTP-only, same-site cookies, marked secure in production. Sign out through **Past days → Preferences**.

## Storage and privacy

Each exact password selects one journal. There are no usernames, email addresses, or password-reset flow. Passwords preserve spaces, case, and Unicode without normalization and accept 4–1,024 characters using the input's native length rules. The creation confirmation displays the password in plain text only while it is open. Cancelling creates nothing; an existing password opens its journal directly. Duplicate creation, including simultaneous requests, cannot replace a journal's records.

Authentication protects the application routes and API. Every data read, mutation, and export derives its journal from the verified session cookie; request parameters cannot select another journal. Existing original-journal sessions remain compatible. Mutations require the same origin, inputs are validated on the server, and sign-in is limited to 10 attempts per 15-minute window across the installation. Creation also has a separate 10-attempt window. Successful sign-in or creation does not reset either counter, so access to one journal cannot bypass the limit for another. Database-backed rate limiting works across Vercel function instances.

Additional journal passwords use scrypt with a random 16-byte salt, a 64-byte verifier, and constant-time verification. Plain-text passwords are not stored in the credential tables, session cookies, URLs, or browser storage. Password lookup verifies the stored salted hashes rather than maintaining a fast password index. This design is intended for personal use and caps additional journals at 50; lookup time grows with the number of journals.

The production database has four tables:

| Table                           | Contents                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pill_happens_state`            | One document per journal containing medications, intake snapshots, goals, and timezone settings, plus its version counter and update timestamp. |
| `pill_happens_login_attempts`   | Separate installation-wide sign-in and creation counters and rate-limit windows.                                                                |
| `pill_happens_journal_registry` | A version counter used to serialize concurrent credential creation.                                                                             |
| `pill_happens_journals`         | Additional journal identifiers, salted scrypt password verifiers, and creation timestamps.                                                      |

Updates use optimistic version checks and retry on contention to avoid overwriting a simultaneous save. The client also prevents overlapping saves within one open app instance. The full journal is loaded into the client; the 20-day history limit controls the display, rather than database pagination. This is intentionally sized for personal use.

There is no runtime analytics or advertising integration. Journal responses use `private, no-store`; database details and submitted notes are not written to application error logs. The app does not implement client-side or field-level encryption. Access to the hosting and database accounts also grants access to stored records.

`.env` files, local data, Vercel project metadata, and build artifacts are ignored by Git. Keep actual intake records and credentials out of commits, screenshots, and issue descriptions.

## Export and backups

Use **Past days → Export journal** while signed in. The authenticated `/api/export` endpoint downloads a JSON document containing:

- `schemaVersion` and `exportedAt` metadata;
- all medications, including archived items;
- all intake snapshots, timestamps, quantities, and notes;
- all goals and notes;
- the journal timezone.

Exports contain personal records and should be stored privately. The prototype has **no import or restore interface**. An export can be inspected or used for a future migration; database recovery should use the database provider's backup tools. Local development data is a separate dataset and is not automatically migrated when a production database is connected.

## Development and verification

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Tests use Node's test runner with `tsx`. They cover day boundaries, timezone conversion, daylight-saving transitions, invalid local times, separate medication totals, historical snapshots, goal precedence, calendar validation, server input validation, fail-closed configuration, session tampering and expiry, credential rotation, and origin checks. Password-journal regressions also run the real SQL repository against an isolated PGlite Postgres engine, without deployment credentials: additive schema preservation, journal isolation, duplicate and concurrent creation, transaction rollback, simultaneous saves, and separate creation quotas.

Verification includes 70 automated tests, a production build, strict TypeScript, ESLint, and formatting checks. The password-journal flow also passed 68 isolated HTTP checks using synthetic records, covering CRUD and export separation, exact passwords, duplicate races, origin checks, tampered sessions, and rate limits. Browser checks at 320px, 390px, and 1024px in both color modes cover confirmation, cancellation, long passwords, connection errors, creation conflicts, pending submission, and existing-password sign-in. These checks use fake credentials and do not read production journal records.

Earlier manual checks covered the logging and management flow, backdating, correction, deletion, and 20-day history loading. Production HTTP checks confirmed that missing configuration blocks data reads and writes and returns a generic setup screen.

`npm run build` produces a production build. To run that build locally, configure the production database and authentication variables, then use `npm start`. Like the development command, it listens on `127.0.0.1` by default.

### Source map

| Location                                | Responsibility                                                         |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `src/app/(journal)/`                    | Protected routes for today, history, medications, and goals.           |
| `src/app/login/`                        | Private sign-in and setup guidance.                                    |
| `src/components/login-form.tsx`         | Password lookup and explicit new-journal confirmation.                 |
| `src/components/journal-pages.tsx`      | Daily dashboard, history summaries, management pages, and preferences. |
| `src/components/intake-form.tsx`        | Intake creation and correction.                                        |
| `src/components/manage-forms.tsx`       | Medication and goal forms.                                             |
| `src/components/responsive-modal.tsx`   | Mobile drawer and desktop dialog behavior.                             |
| `src/components/journal-background.tsx` | System appearance and the journal's Grainient settings.                |
| `src/components/grainient.tsx`          | Adapted React Bits WebGL background renderer.                          |
| `src/components/ui/`                    | Local shadcn/ui components.                                            |
| `src/lib/domain.ts`                     | Shared types, 06:00 calendar rules, totals, and goal selection.        |
| `src/lib/server/journal-repository.ts`  | Repeatable Postgres schema, atomic creation, and scoped persistence.   |
| `src/lib/server/journal-service.ts`     | Password lookup, duplicate detection, and journal creation policy.     |
| `src/lib/server/passwords.ts`           | Exact-password validation and salted scrypt verifiers.                 |
| `src/lib/server/`                       | Authentication, validated API helpers, and storage.                    |
| `src/app/api/`                          | Authenticated journal endpoints, export, and sign-in/out.              |
| `src/app/globals.css`                   | System theme, colors, ambient animation, and shared visual styles.     |

The app starts with an empty journal. It includes no demo medication, suggested doses, medication equivalence calculations, automated reductions, or reminders to take medication.
