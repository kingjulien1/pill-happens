# Project design review — November 22, 2026

The review covered every page family, the shared controls, navigation, and the main
and nested dialogs. Layout checks used the actual client components with isolated,
synthetic records, including long medication/ingredient names and empty journals.
No production journal records were read or edited.

## Changes

- **Page openings:** collection pages and both guides share the responsive
  `--page-heading-size` scale. Title, context, icon, and action columns now yield
  predictably on narrow screens. Long context remains available through its title
  and the full detail content. Today and dated timelines retain their date-led
  opening; the medication header retains its deliberately compact bottle layout.
- **Detail pages:** medication, category, and week summaries use a compact
  artwork/copy grid instead of a large vertically stacked hero. At the narrowest
  width the description spans the row. Category summaries show the saved
  medication count instead of repeating the category heading. Definition rows,
  section headings, links, and supporting text use consistent spacing and sizing.
- **Goals:** medication identity, maximum, status, recorded progress, dates, and
  notes have distinct, ordered areas. Medication names link to their details.
  Progress has an accessible description that retains the actual recorded amount,
  including when the visual bar reaches its limit. Amounts remain medication-specific.
- **Empty states:** `PageEmptyState` replaces separate collection/detail treatments
  with a shared surface, optional icon, readable heading, and restrained copy.
  Missing milestones now have a page heading too. Journal empty-state instructions
  are no longer repeated immediately in a second footnote.
- **Forms:** general medication, goal, preferences, and sign-in controls use a
  44px height and matching label treatment. Editable phone text remains 16px;
  desktop text is 14px. Medication type and category controls share their height,
  text scale, and label alignment; their column has more usable width. The
  intentionally compact intake/check-in fields keep their existing geometry.
- **Dialogs:** intake and check-in date/context rows use the full header width,
  independently of the reset/close controls. This reduces avoidable wrapping
  without changing the heading, date, description, fade, or scroll behavior.
  Plain leading icons on satin actions now use the face's primary contrast color;
  this fixes the pale Markdown icon on the writing button.
- **Reading and search:** Markdown headings retain their visual hierarchy while
  rendering below the surrounding page heading. Saved Markdown is untouched.
  Journal search uses readable phone text, a larger clear target, and the shared
  empty state. Detail-page navigation/actions have consistent touch clearance.
- **Past-day navigation:** narrow screens place Previous/Next together and the
  add action below. The previous three-item row overflowed at 320px. Wider screens
  retain the compact horizontal arrangement.
- **Supporting surfaces:** explicit local color variables keep detail and milestone
  borders/shadows tied to their intended pigments rather than falling back to
  text color in the tested browser. The medication appearance panel uses its
  semantic edge instead of a bright white highlight.
- **Public screens:** the sleep-image handoff, error boundary, and 404 use a shared status layout,
  theme colors, and the existing main action. Sign-in and offline headings follow
  the same type family. The handoff still follows the existing import flow.

## Deliberate differences

The 510px timeline, 760px collections, and wider guide reading shell remain.
The Today top controls/date, intake/check-in card artwork and borders, main action
geometry, notification layouts, and the root background retain their established
appearance. Reading surfaces use panel text roles; copy directly over the ambient
canvas uses the canvas text pair. Compact intake controls and data-dense guide
specimens do not inherit the general form-control height.

No runtime dependencies, polling, animation loops, API calls, or expensive derived
calculations were added. This pass uses CSS and existing components; modal locking,
draft persistence, saved records, and notification lifecycle behavior are preserved.

## Coverage and verification

Reviewed routes: Today; medication library, medication detail, and category detail;
Goals; History, individual days, and week detail; Journal and Morning/Evening entry
pages; Streaks and milestone detail; Getting Started; Developer Guide; sign-in;
404; the error boundary; the sleep-image handoff; and the standalone offline page.

Browser checks used Chromium at 320, 390, 768, and 1100px in light and dark modes:

- 152 populated-page cases, including long names, past-day navigation, and both
  journal periods. No document-width overflow or duplicate page-level headings.
- 72 empty/missing-record page cases and six no-medication intake states.
- 48 main dialog cases: create/edit intake, Morning/Evening, create/edit medication,
  goal, and preferences. No viewport-width overflow or nonzero initial scroll.
- 44 nested surface cases: navigation, appearance, journal reader, writing editor,
  sleep export help, medication type/categories, and guide contents. Journal search
  empty/recovery states were exercised in the same runs.
- Eight default intake skeleton states and a normal-motion mobile touch check for
  dialog scrolling, background locking, dismissal, and navigation.
- Eight error-screen cases verify the responsive layout and the existing Retry callback.

Intentionally scrollable guide code blocks and tables retain their local scrolling.
Visual and interaction checks used synthetic data and an isolated browser profile;
they do not constitute physical iPhone/PWA or macOS Safari testing.

Validation commands: `npm test`, `npm run lint`, `npm run typecheck`, and
`npm run build`. The existing suite passed all 1,169 tests. Generated theme/palette
checks ensure the offline theme and application source remain in sync.
