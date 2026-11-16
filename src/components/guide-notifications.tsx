import type { ReactNode } from "react";
import { DeveloperCode } from "@/components/developer-code";
import { developerSource } from "@/lib/developer-guide";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-notifications.module.css";

const contract = `import type { ReactNode } from "react";
import type { ExternalToast } from "sonner";
import type { NotificationChangePreview } from "@/lib/notification-change-preview";

export type JournalToastKind =
  | "success" | "error" | "info"
  | "warning" | "loading" | "update";

export type JournalNotificationDetails = {
  preview?: NotificationChangePreview;
  paragraphs?: ReactNode[];
  facts?: { label: ReactNode; value: ReactNode }[];
  links?: { label: string; href: string }[];
  footer?: ReactNode;
};

export type JournalNotificationUndo = {
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  onUndo: () => Promise<void> | void;
};

export type JournalToastOptions = ExternalToast & {
  heading?: ReactNode;
  details?: JournalNotificationDetails;
  undo?: JournalNotificationUndo;
  variant?: "intake-saved";
};`;

const basic = `"use client";

import { toast } from "@/components/ui/journal-toast";

export function showJournalNotice() {
  return toast.info("Your saved entries are unchanged.", {
    heading: "A quick note",
    details: {
      paragraphs: ["Open this notice whenever you need more context."],
      facts: [{ label: "Scope", value: "This journal" }],
      links: [{ label: "Read the guide", href: "/guide" }],
      footer: "Reading pauses the notification timer.",
    },
  });
}`;

const intake = `"use client";

import { useJournal } from "@/components/journal-provider";
import { toast } from "@/components/ui/journal-toast";
import type { Intake } from "@/lib/domain";
import {
  intakeNotificationSnapshot,
  savedNotificationRecord,
} from "@/lib/notification-change-preview";

type IntakeInput = Pick<Intake,
  "medicationId" | "quantity" | "takenAt" | "route"
>;

export function useNotifiedIntake() {
  const { data, mutate } = useJournal();
  return async (input: IntakeInput) => {
    if (!data) throw new Error("The journal is still loading.");
    const saved = await mutate("intakes", input, "POST");
    const record = savedNotificationRecord(
      data.intakes, saved.data.intakes, saved.entityId,
    );
    const medication = saved.data.medications.find(
      (item) => item.id === record?.medicationId,
    );
    // Preview and Undo follow the confirmed response, never an optimistic guess.
    toast.success("Your intake is saved in the journal.", {
      heading: "Intake saved",
      variant: "intake-saved",
      details: {
        ...(record ? {
          preview: {
            after: intakeNotificationSnapshot(
              record, medication, saved.data.settings.timezone,
            ),
          },
        } : {}),
        paragraphs: ["Undo removes only this newly saved intake."],
        links: [{ label: "Open Daily Log", href: "/" }],
        footer: "Other entries stay as they are.",
      },
      ...(saved.undo ? {
        undo: { label: "Undo Intake", onUndo: saved.undo },
      } : {}),
    });
    return saved;
  };
}`;

const preview = `import type { Medication } from "@/lib/domain";
import {
  medicationNotificationSnapshot,
  type NotificationChangePreview,
} from "@/lib/notification-change-preview";

// confirmedAfter comes from saved.data, not an optimistic form value.
export function medicationEditPreview(
  before: Medication,
  confirmedAfter: Medication,
): NotificationChangePreview {
  return {
    before: {
      kind: "medication",
      medication: medicationNotificationSnapshot(before),
    },
    after: {
      kind: "medication",
      medication: medicationNotificationSnapshot(confirmedAfter),
    },
  };
}`;

const updates = `"use client";

import { toast } from "@/components/ui/journal-toast";

export async function runWithNotice(operation: () => Promise<void>) {
  const id = toast.loading("Waiting for the confirmed result…", {
    heading: "Checking for updates",
  });
  try {
    await operation(); // This operation must reject on failure.
    toast.success("The latest result is ready.", {
      id,
      heading: "All caught up",
    });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Please try again.", {
      id,
      heading: "Refresh unsuccessful",
    });
  }
}`;

const persistent = `"use client";

import { toast } from "@/components/ui/journal-toast";

export function showUpdateNotice(reloadIfReady: () => boolean) {
  return toast.update("Finish your current entry before reloading.", {
    id: "pwa-update",
    heading: "App update ready",
    duration: Infinity,
    action: {
      label: "Reload",
      onClick(event) {
        // The caller checks its current worker/draft state and starts reload.
        if (!reloadIfReady()) event.preventDefault();
      },
    },
    cancel: { label: "Later", onClick() {} },
    details: {
      paragraphs: ["A new version is ready when you are."],
      footer: "Reload and Later are available here after expanding the notice.",
    },
  });
}`;

const dismissal = `"use client";

import { toast } from "@/components/ui/journal-toast";

export function showThenDismissNotice() {
  const id = toast.info("A short-lived example.");
  toast.dismiss(id); // Safe even before the card mounts.
}

export function dismissAllJournalNotices() {
  toast.dismiss(); // Each managed card finishes its own exit.
}`;

const statusBadge = `import {
  NotificationStatusBadge,
  type NotificationStatus,
} from "@/components/ui/notification-status-badge";

export function NoticeStatus({ status }: { status: NotificationStatus }) {
  return <NotificationStatusBadge status={status} />;
}`;

const checks = `node --import tsx --test src/lib/journal-notification-lifecycle.test.ts
node --import tsx --test src/lib/server/journal-undo.test.ts
npm run lint
npm run typecheck`;

function Source({ path, children }: { path: string; children?: ReactNode }) {
  return (
    <a
      href={developerSource(path)}
      target="_blank"
      rel="noreferrer"
      className={styles.sourceLink}
    >
      {children ?? <code>{path}</code>}
    </a>
  );
}

function Heading({
  id,
  children,
  level = 2,
}: {
  id: string;
  children: string;
  level?: 2 | 3;
}) {
  const Tag = level === 2 ? "h3" : "h4";
  return (
    <Tag
      id={`notifications-${id}`}
      data-guide-outline-level={level}
      data-guide-outline-label={children}
    >
      {children}
    </Tag>
  );
}

function ReferenceTable({
  label,
  headings,
  rows,
}: {
  label: string;
  headings: string[];
  rows: ReactNode[][];
}) {
  return (
    <div
      className={styles.tableScroll}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table>
        <caption>{label}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Server-rendered reference; the optional child is the isolated, synthetic live playground. */
export function GuideNotifications({ children }: { children?: ReactNode }) {
  return (
    <article
      className={`${guideStyles.readingCard} ${styles.reference}`}
      data-notification-reference
    >
      <p className={styles.intro}>
        Notifications keep a short result in view and put the explanation one
        tap away. The collapsed card contains its summary and countdown; opening
        details reveals a saved-change preview or explanatory context, plus
        links and actions. When several cards are folded together, the first
        activation only fans the stack open; activate a card again for its
        details. A real Undo sits in the collapsed card header and moves to the
        action footer while details are open. Use the shared journal facade for
        every application notice.
      </p>
      <dl className={styles.overview}>
        <div>
          <dt>One Presentation</dt>
          <dd>
            <strong>6</strong> notice kinds
          </dd>
        </div>
        <div>
          <dt>Reading Time</dt>
          <dd>
            <strong>8.63s</strong> bar + 0.5s grace
          </dd>
        </div>
        <div>
          <dt>Server Undo</dt>
          <dd>
            <strong>15m</strong> receipt lifetime
          </dd>
        </div>
      </dl>
      {children}

      <Heading id="architecture">Architecture &amp; Ownership</Heading>
      <p>
        <Source path="src/components/appearance-provider.tsx">
          AppearanceToaster
        </Source>{" "}
        mounts the themed host once. Sonner owns its outer list items, stack
        geometry and native swipes. The adapter’s NotificationStackContext owns
        the explicit fan/reveal state; the inner journal component owns details,
        its independent reading clock and its staged exit. Keep those state and
        transform owners separate when changing motion.
      </p>
      <ReferenceTable
        label="Source Ownership"
        headings={["Source", "Responsibility"]}
        rows={[
          [
            <Source key="facade" path="src/components/ui/journal-toast.tsx" />,
            "Public methods, option translation, same-ID generations and dismissal routing.",
          ],
          [
            <Source
              key="content"
              path="src/components/ui/journal-notification.tsx"
            />,
            "Summary, labelled details, change previews, countdown, actions and asynchronous Undo outcomes.",
          ],
          [
            <span key="preview">
              <Source path="src/lib/notification-change-preview.ts">
                Snapshot helpers
              </Source>
              {" + "}
              <Source path="src/components/notification-change-preview.tsx">
                Preview renderer
              </Source>
            </span>,
            "Typed, immutable display snapshots and noninteractive before/after records; no receipt tokens or journal prose.",
          ],
          [
            <Source
              key="clock"
              path="src/lib/journal-notification-lifecycle.ts"
            />,
            "Independent monotonic clocks, exact progressive-speed integration, active completion grace, exit registry and one-attempt Undo settlement.",
          ],
          [
            <span key="art">
              <Source path="src/components/ui/sonner.tsx">sonner.tsx</Source> +{" "}
              <Source path="src/components/ui/sonner.css">sonner.css</Source>
            </span>,
            "Host configuration, NotificationStackContext reveal/collapse policy, shared artwork, theme values, countdown paint and CSS phase hooks.",
          ],
          [
            <span key="badge">
              <Source path="src/components/ui/notification-status-badge.tsx">
                Status badge
              </Source>
              {" + "}
              <Source path="src/components/ui/notification-status-badge.module.css">
                Scoped status paint
              </Source>
            </span>,
            "Reusable six-status label/icon registry and static, noninteractive Badge presentation.",
          ],
          [
            <Source
              key="provider"
              path="src/components/journal-provider.tsx"
            />,
            "Committed response, in-memory Undo callback and current journal state.",
          ],
          [
            <Source key="server" path="src/lib/server/journal-undo.ts" />,
            "Signed receipt validation and atomic reversal of one matching record.",
          ],
        ]}
      />

      <Heading id="api">Methods &amp; Options</Heading>
      <p>
        Import <code>toast</code> from{" "}
        <code>@/components/ui/journal-toast</code>. Each notification method
        accepts a message plus optional options and returns a string or number
        ID. Calling <code>toast()</code> or <code>toast.message()</code> selects
        Info. This facade exposes neither Sonner’s promise helper nor its custom
        renderer; application code does not need to construct notification JSX.
      </p>
      <ReferenceTable
        label="Six Notice Kinds"
        headings={["Method", "Default Heading", "Default Lifetime / Artwork"]}
        rows={[
          [
            <code key="success">toast.success</code>,
            "Change saved",
            "8.633s bar + 0.5s active grace · BellCheck.",
          ],
          [
            <code key="error">toast.error</code>,
            "Action failed",
            "8.633s bar + 0.5s active grace · CircleAlert.",
          ],
          [
            <code key="info">toast.info</code>,
            "Journal notice",
            "8.633s bar + 0.5s active grace · Lightbulb.",
          ],
          [
            <code key="warning">toast.warning</code>,
            "Please review",
            "8.633s bar + 0.5s active grace · TriangleAlert.",
          ],
          [
            <code key="loading">toast.loading</code>,
            "In progress",
            "Always infinite · RefreshCcw; no swipe, Escape or Cancel.",
          ],
          [
            <code key="update">toast.update</code>,
            "Update available",
            "8.633s bar + 0.5s active grace unless overridden · Sparkles.",
          ],
        ]}
      />
      <Heading id="status-badges" level={3}>
        Reusable Status Badges
      </Heading>
      <p>
        The heading uses <code>NotificationStatusBadge</code> instead of a plain
        kind label and separator dot. Its required <code>status</code> accepts
        the six notice kinds; optional <code>label</code> and{" "}
        <code>className</code> customize the display. Exported{" "}
        <code>NOTIFICATION_STATUS_REGISTRY</code> supplies each default label
        and Lucide symbol. A status describes the result; it never promises an
        Undo action.
      </p>
      <DeveloperCode
        label="Reusable Notification Status"
        language="tsx"
        code={statusBadge}
      />
      <ReferenceTable
        label="Status Badge Catalog"
        headings={["Status", "Label / Symbol", "Color Family"]}
        rows={[
          ["success", "Success / CircleCheck", "Emerald"],
          ["error", "Error / CircleAlert", "Rose"],
          ["warning", "Warning / TriangleAlert", "Amber"],
          ["info", "Info / Info", "Sky"],
          ["loading", "Loading / LoaderCircle", "Violet"],
          ["update", "Update / Sparkles", "Fuchsia"],
        ]}
      />
      <p>
        The shared shadcn Badge stays 18px high with 10px semibold text, a quiet
        colored fill and an inward edge. Its 9.5px icon inherits the text color
        inside a nested glyph wrapper, avoiding Badge’s direct-child SVG size
        rule. Icons are hidden from accessibility APIs; the visible labels
        remain readable. The badge has no keyboard target, hover effect or
        animation and is not a separate live region.
      </p>
      <Heading id="contract" level={3}>
        Exact Public Contract
      </Heading>
      <DeveloperCode
        label="Notification Options"
        language="tsx"
        code={contract}
      />
      <p>
        <code>heading</code> supplies the short title. The message supplies the
        summary unless <code>description</code> explicitly overrides it. Missing
        paragraphs use kind-specific context. Footer copy and action/cancel
        controls appear inside expanded details. A supplied Undo is a separate,
        compact labelled control in the collapsed header or expanded footer;
        activating it never toggles expansion. <code>duration</code>,{" "}
        <code>id</code>, styling, action/cancel and callbacks originate in{" "}
        <code>ExternalToast</code>; the facade deliberately owns the native
        timer, close-button and rendering fields. Loading ignores a finite
        duration.
      </p>
      <ReferenceTable
        label="Option Behavior"
        headings={["Option", "Meaning / Default"]}
        rows={[
          [
            "heading / message",
            "Short title plus collapsed summary. Uses the Default Heading above unless supplied.",
          ],
          [
            "description",
            "Overrides the message only when defined; ReactNode values such as 0 remain intact.",
          ],
          [
            "details",
            "A typed preview replaces paragraphs/facts and uses a short generated footer rather than caller prose. Otherwise show up to four compact facts, or one context paragraph when no facts exist; [] still opts out of paragraph fallback. Related links become labelled icon tools; caller-supplied footer context remains for notices without a preview, and action/cancel controls remain available.",
          ],
          [
            "details.preview",
            "A NotificationChangePreview with optional before/after records; omit either side when unavailable rather than inventing it.",
          ],
          [
            "undo",
            "One attempt per click. Accessible defaults: Undo change → Undoing change → Change undone. The same ready/pending/done control is in the collapsed header or expanded footer; failure stays inline or opens a detached error.",
          ],
          [
            "variant",
            "Only intake-saved is registered as saved-intake context. It shares the two-tone success BellCheck; it is not an Undo guarantee.",
          ],
          [
            "id",
            "String or number. Reusing it replaces the notice, resets the clock and cancels stale exit work.",
          ],
          [
            "duration",
            "Nominal full-speed budget: 22,000ms ÷ 3 by default. The progressive curve extends the default bar to about 8.633 active seconds, then adds 500ms of active grace before exit. Explicit finite budgets use the same curve; Infinity hides the rail and marker. Loading always forces Infinity.",
          ],
          [
            "dismissible: false",
            "Blocks swipe, Escape and Cancel. Timeout, programmatic dismissal and primary actions still work.",
          ],
          [
            "icon",
            "A custom ReactNode replaces default artwork; null omits the default glyph.",
          ],
          [
            "action / cancel",
            "Synchronous handlers inside expanded details. Action honors preventDefault; Cancel exits regardless when eligible.",
          ],
          [
            "onAutoClose / onDismiss",
            "Timeout / explicit dismissal or native swipe. Action, Cancel and successful Undo call neither.",
          ],
          [
            "Native overrides",
            "Facade owns duration Infinity, custom JSX and no close button. It renders description/icon/actions internally; other native options are forwarded.",
          ],
        ]}
      />

      <Heading id="examples">Integration Recipes</Heading>
      <p>
        Call the facade from client event handlers or confirmed operation
        outcomes, not during render. Do not announce save success automatically
        from a mount effect; rendering and Strict Mode replay do not confirm a
        committed write.
      </p>
      <Heading id="basic" level={3}>
        A Small Notice With Useful Context
      </Heading>
      <DeveloperCode label="Basic Journal Notice" language="tsx" code={basic} />

      <Heading id="intake" level={3}>
        A Confirmed Intake With Real Undo
      </Heading>
      <DeveloperCode
        label="Receipt-Backed Intake Save"
        language="tsx"
        code={intake}
      />
      <p>
        Call the returned function from validated form submission inside
        JournalProvider. Keep the caller’s rejection handling and draft
        preservation. The provider already reports ordinary mutation errors;
        avoid adding a duplicate error notice. Reserve <code>intake-saved</code>{" "}
        for a newly saved intake; edits use general Success. The preview is
        independently derived from the confirmed record, and Undo appears only
        when the provider supplied its callback.
      </p>

      <Heading id="previews" level={3}>
        Typed Change Previews, Without Private Prose
      </Heading>
      <p>
        <Source path="src/lib/notification-change-preview.ts">
          NotificationChangePreview
        </Source>{" "}
        is immutable presentation data with optional <code>before</code> and{" "}
        <code>after</code> records. Edits can show both sides; additions show
        the confirmed after-state, and removals show the captured before-state.
        Omit a missing side instead of manufacturing a comparison. The renderer
        is a static preview, never another form or an embedded live editor.
        Intake and medication snapshots reuse the actual MedicationCard,
        MedicationCardDose, category marks and artwork, including the original
        two-row layout and inward frame. The read-only base renders a plain
        container instead of a disabled editor button; presentation-only
        medication fields require no fabricated IDs or creation timestamps.
      </p>
      <ReferenceTable
        label="Preview Record Kinds"
        headings={["Kind", "Display Data"]}
        rows={[
          [
            "intake",
            "Saved medication name, quantity, strength, taken time, timezone, form/route and an optional medication display snapshot.",
          ],
          [
            "medication",
            "Name, optional ingredient, strength, default quantity, form, color, artwork/rotation, archived state and category labels.",
          ],
          [
            "check-in",
            "Tracking day/period, word count, moods, energy/stress values and scales, sleep duration and optional bedtime; no journal body.",
          ],
          [
            "goal",
            "Daily maximum and inclusive start/end dates, with optional medication display data.",
          ],
          ["timezone", "The saved IANA timezone identifier."],
        ]}
      />
      <p>
        Build after-state from the confirmed <code>saved.data</code>. A writing
        acknowledgement containing only a note and timestamp cannot establish a
        complete check-in snapshot on its own. Use{" "}
        <code>savedNotificationRecord</code> with the response entity ID;
        without one, it accepts only a single provably new record. Medication,
        intake, check-in and goal helpers copy the supported display fields,
        including fresh arrays for moods/categories. A preview must not contain
        record IDs, receipt tokens, callbacks or raw journal prose. Never decode
        an Undo receipt to populate a preview, and never pretend that a missing
        response or a failed mutation produced a saved after-state.
      </p>
      <DeveloperCode
        label="A Medication Edit Preview"
        language="tsx"
        code={preview}
      />
      <p>
        Preview content occupies the labelled, inert-when-closed details region.
        When present it replaces free-form paragraphs and facts, while relevant
        links and action/cancel controls remain available. A compact caption
        distinguishes Before/After, Saved or Removed without duplicating the
        notification message. Check-ins, goals and timezone changes use compact
        visual summaries; journal prose stays out of previews. Non-graphic
        notices show up to four facts, or one context paragraph when there are
        no facts. The playground above constructs both sides from invented
        records and its Undo only updates local React state; it never calls the
        journal API.
      </p>

      <Heading id="expanded-tools" level={3}>
        Expanded Actions &amp; Page Backdrop
      </Heading>
      <p>
        A short, inset separator introduces a centered footer of small icon
        tools. Existing destinations retain their native href and full
        accessible label: Entry, Medication, Check-In, Day, Goals, Today,
        Journal and Guide receive fitting symbols. Each tool has a 30px tonal
        tile, a 17px glyph and an 8.5px caption within a 52px-wide, at least
        47px-high target. Four usual intake actions fit a 320px viewport: Entry,
        Medication, the real Undo and Collapse. Undo uses the original callback,
        pending guard and failure handling; it is never inferred from a preview.
        Collapse returns focus to the summary before its details become inert.
        Following a normal destination link also collapses details without
        cancelling navigation; modified clicks keep their native new-tab
        behavior. A 9px footer at 50% ink alpha gives brief context. Typed
        previews use short record-specific copy or explain the real Undo.
        Notices without a preview may use caller-provided footer context. Caller
        prose, facts and footer remain suppressed when a typed preview is
        present; the old reading-paused filler is removed. Action/cancel
        controls retain their original behavior in a separate centered row when
        supplied.
      </p>
      <p>
        While a mounted, visible notification has expanded idle details and is
        either frontmost or in the native fanned stack, one fixed, aria-hidden
        sibling behind the toaster softly blurs the page by 4px and adds
        Mauve900 at 31% alpha. A scoped body :has selector checks the inner
        details state as well as the host’s front/fanned state; revealing a
        stack alone never opens this veil. It sits at z-index 999999998 below
        Sonner, fades over 220ms and never accumulates for multiple open
        notices. Folded rear, removed or exiting cards cannot leave it active.
        It has no pointer events, focus trap, scroll lock or modal semantics;
        the page and native toast gestures remain usable. Reduced motion removes
        the fade. The root canvas and notification surface colors are unchanged.
      </p>

      <Heading id="updates" level={3}>
        Replace Loading In Place
      </Heading>
      <DeveloperCode
        label="One ID, Confirmed Outcome"
        language="tsx"
        code={updates}
      />
      <p>
        A same-ID update creates a new generation, resets reading time and
        invalidates stale exit callbacks. For the actual journal refresh, follow{" "}
        <Source path="src/components/daily-reflection-editor.tsx">
          DailyReflectionEditor
        </Source>
        : provider <code>refresh()</code> communicates failure through committed
        error state, so resolution alone is not proof of success.
      </p>

      <Heading id="persistent" level={3}>
        Persistent Update Actions
      </Heading>
      <DeveloperCode
        label="Persistent Update With Guarded Action"
        language="tsx"
        code={persistent}
      />
      <p>
        Supply a synchronous guard that starts the worker-aware reload only when
        ready; the production implementation is in{" "}
        <Source path="src/components/pwa-provider.tsx">PwaProvider</Source>. An
        action calls its handler, then exits unless the event was prevented.
        Cancel calls its handler and exits regardless of preventDefault. These
        callbacks are synchronous; use <code>undo.onUndo</code> for a tracked
        asynchronous reversal.
      </p>

      <Heading id="dismiss" level={3}>
        Dismiss Through The Facade
      </Heading>
      <DeveloperCode
        label="Single And Bulk Dismissal"
        language="tsx"
        code={dismissal}
      />
      <p>
        Do not replace these calls with a direct Sonner import: managed cards
        need their collapse and exit sequence. Loading can still be dismissed
        programmatically. Timeout calls <code>onAutoClose</code>; explicit
        dismissal, Escape and native swipe call <code>onDismiss</code>. Action,
        Cancel and successful Undo call neither.
      </p>

      <Heading id="clock">
        Independent Countdown &amp; Stack Interaction
      </Heading>
      <p>
        A folded stack and a card’s details are separate states. In a
        multi-notification stack, the first click or keyboard activation on any
        card is consumed by the capture handler and only reveals the fan. It
        cannot also open details, follow a link or run Undo. The next activation
        reaches the chosen card normally. Outside press or Escape closes the
        fan; a count of one or zero clears its old reveal state. Sonner still
        owns the actual stack geometry, hover fan and swipes.
      </p>
      <p>
        Every finite notice runs its own monotonic clock from host readiness,
        including rear cards and notices beyond the currently visible stack.
        They never queue behind the front notice. Its own expanded details,
        focus, non-touch hover, held pointer and pending Undo pause only that
        notice; document hiding, unmounted/removal and exit guards also pause.
        All active reasons must clear before counting resumes. Infinite notices
        keep their existing persistent behavior and show neither rail nor
        final-seconds marker.
      </p>
      <p>
        The default nominal budget is <code>22_000 / 3</code> milliseconds,
        about 7.33 seconds at full speed. Above 30% remaining, the bar runs at
        full speed. Between 30% and 10%, speed decreases continuously to one
        half; the final 10% remains at half speed. The exact elapsed-time
        mapping makes the default bar last about{" "}
        <strong>8.633 active seconds</strong>. A separate{" "}
        <strong>500ms active grace</strong> keeps the card usable after the bar
        empties, before its existing staged exit. Holding or opening details
        pauses that grace too.
      </p>
      <p>
        Explicit finite durations are nominal budgets under the same curve. Bar
        time equals <code>duration × (0.9 + 0.4 × ln(2))</code>; grace is added
        afterward. The clock inverts the integrated speed curve instead of
        advancing progress by per-frame subtraction, so a long sample and many
        short samples agree. Its snapshot separates nominal remaining time,
        progress, true active time until the bar is empty, completion and grace
        remaining. The tiny 3/2/1 marker uses that true remaining time,
        excluding grace, so slowing the last segment never makes its numbers
        misleading.
      </p>
      <ReferenceTable
        label="Countdown Breakpoints"
        headings={["Remaining Bar", "Behavior"]}
        rows={[
          [
            "40% → 10%",
            "The existing gradient gradually mixes toward Rose500. Its pulse accelerates without resetting phase.",
          ],
          [
            "30% → 10%",
            "Speed eases from full to half, while a separate paint-only card glow begins a subtle breath.",
          ],
          [
            "10% → 0%",
            "Half-speed finish, full Rose urgency and the fastest restrained pulse.",
          ],
          [
            "Last 3 active seconds",
            "A small, noninteractive 3/2/1 marker appears half outside the upper-left corner.",
          ],
          [
            "Bar empty",
            "The marker spins/shrinks out; 500ms of active grace remains for a final action.",
          ],
        ]}
      />
      <p>
        The clock samples every <strong>50ms</strong>; the bar’s
        <code> inline-size</code> interpolates over <strong>60ms</strong>,
        preserving rounded endcaps. Color urgency runs from 40% to 10%; the card
        glow’s separate urgency starts at 30%. Their CSS animations keep a
        1,400ms base duration and use phase-preserving
        <code> updatePlaybackRate()</code> to reach an effective 520ms cycle.
        Arrival, width, urgency and card-exit motion have separate owners.
        Decorative visibility still pauses hidden or folded-rear effects;
        opening the native fan lets visible rear decorations run. Actual reading
        pauses also freeze urgency pulses and the tiny marker, while ordinary
        finite artwork retains its separate visibility policy.
      </p>
      <p>
        Pointer-down pauses immediately, with each pointer ID tracked
        separately. A hold of at least 350ms, movement beyond 8px or pointer
        cancellation suppresses the following click; a short tap reveals a
        folded stack first, or opens details when the stack is already revealed.
        Window release and cancellation, window blur and page hiding clear
        stranded holds. Releasing a held gesture clears non-keyboard focus so
        its timer can resume; keyboard-visible focus remains a reading pause.
        The card and its descendants disable text selection and touch callouts,
        without removing their accessible text or normal keyboard interaction.
      </p>
      <p>
        One gesture flag survives intermediate clicks until the last contact
        releases; the pointer map also covers active drags. Cancelled gestures
        reset Sonner’s offsets and use its drag-end cleanup, then release only
        the toaster’s interaction state. They never invoke the toast’s
        swipe-to-dismiss pointer-up path. A stale native swipe attribute cannot
        keep the reading clock paused after every contact has ended.
      </p>
      <p>
        The real summary button supports Enter/Space and exposes expanded,
        controls, labelled-by and described-by relationships. Closed details are
        inert and hidden from accessibility APIs; expanded details form a
        labelled region with a <code>min(55dvh, 340px)</code> scroll cap. Scroll
        reads vertically without starting a swipe. Sonner retains left/right/up
        dismissal and its Alt+T focus shortcut. Escape from focused content
        first closes an explicitly revealed multi-card fan; otherwise it
        dismisses eligible notices. Pending Undo blocks pointer swipe starts and
        dismissal; it does not trap focus. Inline failure uses{" "}
        <code>role=&quot;alert&quot;</code>.
      </p>

      <Heading id="motion">Motion Phases &amp; Timing</Heading>
      <ReferenceTable
        label="Timing Ownership"
        headings={["State / Effect", "Timing", "Behavior"]}
        rows={[
          [
            "Card arrival / finish ring",
            "860ms / 1,100ms + 350ms",
            "One finite card entrance, followed by an independent expanding finish ring.",
          ],
          [
            "Countdown entry",
            "780ms unfold + 140ms delay",
            "A separate elastic rail grows into place after card entry starts. A 650ms ignition glow at 200ms and 760ms travelling thread at 270ms settle into its live bar without delaying the clock.",
          ],
          [
            "Urgency pulse / tiny marker",
            "1,400ms → 520ms effective; marker 320ms in / 200ms out",
            "Phase-preserving pulse acceleration follows 40% → 10% urgency; the card’s paint-only breath begins at 30%. The last-three-seconds marker grows/fades in, then spins and shrinks away at zero. Reduced motion keeps a static rail and marker without pulses or rotation.",
          ],
          [
            "Main artwork / glyph",
            "1,320ms + 90ms / 720ms + 160ms",
            "The illustration unfurls and settles; a separate glyph transform keeps its reveal independent.",
          ],
          [
            "Halo / echo / flash",
            "760ms + 590ms / 900ms + 710ms / 620ms + 620ms",
            "Coordinated finite rings and a soft central flash answer the landing.",
          ],
          [
            "Sparks / plate unfold",
            "8 × 640ms + (640ms + 18ms/index) / 940ms + 120/180ms",
            "Eight staggered glints and separate rear-plate wrappers finish their entrance once; the inner plate faces own the later sway.",
          ],
          [
            "Rear-card sway",
            "8.8s loop after 1,660ms",
            "Both 7/6-size plates start together 250ms after the 90ms + 1,320ms artwork entrance. Each plate follows its own complementary 33-pose curved path on a linear clock: about 0.9px horizontal travel, up to 1.6px vertical travel and roughly 4° twists around the −18°/+15° base tilts. Matching neutral endpoints and seam-adjacent velocities prevent a loop reset; the main tile remains stationary.",
          ],
          [
            "Status motion",
            "Bell 4.8s after 1,660ms; Loading 2.4s",
            "The success bell rings continuously with fast → slow → fast pacing and matched neutral seam velocities. Both loops follow data-motion-paused independently of reading pauses; there is no idle bell interval.",
          ],
          [
            "BellRing accents",
            "4.8s envelope / 200ms twitch after 1,660ms",
            "Side curves are fully visible at 0–12% and 88–100%, fade at 12–18% and 82–88%, and stay hidden at 18–82%. Mirrored outward twitches add a small rotation and 0.7 → 1 → 0.7 opacity, exactly 24 times per bell cycle. They inherit the bell rotation, pause in phase when hidden or folded behind another card, and hide during reverse, static and reduced-motion states.",
          ],
          [
            "Undo feedback",
            "Pending spin 1s; completed check 240ms",
            "An in-flight reversal keeps its visible state; success holds the reading clock for the 450ms completed beat.",
          ],
          [
            <code key="collapse">collapsing</code>,
            "280ms",
            "Close expanded details first; detail opacity uses 190ms.",
          ],
          [
            <code key="anticipate">anticipate</code>,
            "180ms",
            "Pull down 12px and grow to 1.045 before the complete upward launch; artwork reverses over 300ms.",
          ],
          [
            <code key="depart">depart</code>,
            "360ms",
            "Launch past the viewport top using the measured --notification-exit-y; fade, then dismiss the native item.",
          ],
          [
            "Reduced motion",
            "80ms final budget",
            "CSS animations/transitions disabled; collapse/anticipation delays skipped.",
          ],
        ]}
      />
      <p>
        Custom exit budgets total <strong>540ms collapsed</strong> or{" "}
        <strong>820ms expanded</strong>, followed by Sonner’s own unmount
        window. Native swipes use Sonner’s directional exit instead. Do not
        assert exact DOM-removal time from the custom budget. Hover styling is
        limited to desktop fine-hover pointers; mobile has none.
      </p>

      <Heading id="visuals">Visual Reference &amp; Alpha Math</Heading>
      <p>
        The summary starts at <strong>77px</strong>; finite notices add a 16px
        root reserve above it for the countdown. Indefinite notices have neither
        a rail nor that reserve. Its independent Undo sits at the top right
        while collapsed and joins the centered footer while expanded, with a
        quiet icon tile and a short label underneath. Longer copy and expanded
        previews may increase the card height. The host is top-center,{" "}
        <code>min(460px, 100vw − 32px)</code> wide, with three visible notices
        and a 10px gap. Mobile side offsets are 16px and top offsets include the
        safe area. The entire card keeps
        <code> --toast-fuchsia-surface</code>: Fuchsia950 at 85% color alpha
        above a 64px standard/Safari backdrop blur. Page content behind it is
        softened while the notification’s own text and controls stay sharp.
        Reduced transparency uses an opaque same-hue surface. Every icon tile
        adds a separate Fuchsia900 layer at 69% alpha over its original base.
        There is no ambient background field; the late-countdown glow remains a
        separate paint-only overlay. This translucent surface is separate from
        the application canvas: opaque Plum/Black
        <code> #29213b</code> and three fixed, faint edge highlights beneath a
        uniform 45% Purple500 overlay. Semantic reading panels retain light/dark
        roles.
      </p>
      <ReferenceTable
        label="Exact Presentation Values"
        headings={["Element", "Value / Reason"]}
        rows={[
          [
            "Artwork scale",
            "49px illustration rail and 41.65px front tile; 48.5917px rear plates are exactly 7/6 of their former size, centered at approximately 0.2042px. The 27.5625px glyph uses 2.9 stroke for success and 2.8 for other kinds.",
          ],
          [
            "Main text / context",
            "14px, weight 650 heading beside an 18px status badge with 10px, weight 600 text and a 9.5px icon; 8px heading gap and 6px between heading and message.",
          ],
          [
            "Short secondary copy",
            "Both modes use readable light ink at 70% color alpha, without another element-opacity multiplier.",
          ],
          [
            "Expanded details",
            "Both modes use 88% ink alpha for longer reading.",
          ],
          [
            "Inward frame",
            "Matches intake geometry: a 4px outer band at 31.5% color alpha (37% less than its former 50%), followed by a separate 2px Pink 500 band at 56%. Both stay inside the card. A 2px outline offset by −6px places the inner band 4–6px inward without overlapping the outer tint, changing layout or occupying Sonner’s swipe/stack pseudo-elements. Existing rim pigments and 18px corners remain.",
          ],
          [
            "Surface / countdown",
            "Card uses Fuchsia950 at 85% alpha above 64px standard/Safari backdrop blur, with an opaque same-hue reduced-transparency fallback. Icon tiles add Fuchsia900 at 69% over their original bases. The 4px-high capped rail sits 10px from the top with 16px horizontal insets; only finite cards reserve 16px above their content. Its independent arrival wrapper preserves these final bounds.",
          ],
          [
            "Last-seconds marker",
            "19×14px, left11px/top−7px, 9px tabular secondary ink; no pointer events, layout growth or accessible countdown chatter. Hidden for infinite notices; its tiny glass base uses the existing Fuchsia surface.",
          ],
          [
            "Header Undo",
            "While collapsed: one transparent 44px target, aligned 10px from the top and 16px from the right. A borderless 28px tile holds a 17px, 2.25-stroke state icon and 9px label. While expanded: the same action moves to the centered 52px footer tool with a 30px tile and 8.5px caption; no duplicate header action.",
          ],
          [
            "Expanded backdrop / footer",
            "One pointer-free viewport veil: Mauve900 at 31%, 4px blur, 220ms fade. Footer divider uses 10% ink and stops 13px short of the card edges. Tools are centered with 12px gaps; the 9px footer uses 50% ink. No page lock or root-canvas change.",
          ],
          [
            "Artwork / bell",
            "Successful saves use a two-tone BellCheck: the bell, clapper and two installed Lucide BellRing curves use primary text ink; only .journal-toast-bell-check uses Emerald600 (oklch(59.6% 0.145 163.225)). The glyph retains 27.5625px sizing and 2.9 stroke. Its Fuchsia950 85% base now has a Fuchsia900 69% overlay. Other kinds keep their Mauve900 bases and status glyphs below the same overlay. The old corner bell, chevron and StarCheck shape remain absent.",
          ],
        ]}
      />
      <p>
        Successful saves use BellCheck; Error, Info, Warning, Loading and Update
        keep fitting status symbols on their Mauve tile. Their accents retain
        useful distinctions. AppearanceToaster follows the resolved appearance
        context. These values describe the current presentation; they do not
        certify every text/background combination for contrast.
      </p>

      <Heading id="undo">Safe Undo From Response To Server</Heading>
      <ol className={styles.steps}>
        <li>
          The mutation captures before/after snapshots inside the winning atomic
          write, including contention retries.
        </li>
        <li>
          Its response may include <code>_undo</code> with a signed token,
          expiry and optional entity ID. The provider strips that metadata from
          application state and exposes <code>saved.undo</code>.
        </li>
        <li>
          After an explicit click, the callback posts the token to{" "}
          <Source path="src/app/api/undo/route.ts">POST /api/undo</Source>.
          Authentication and same-origin mutation checks still apply.
        </li>
        <li>
          The server checks signature, journal scope and expiry, compares the
          current target against the signed after-state, then restores only its
          before-state. Unrelated edits survive.
        </li>
      </ol>
      <p>
        Receipts last <strong>15 wall-clock minutes</strong>; reading pauses do
        not extend that expiry. They are HMAC-signed with a domain-separated key
        derived from SESSION_SECRET, not encrypted: base64url payloads can
        contain record snapshots. Keep them out of URLs, analytics, logs and
        persistent client storage. They never enter the stored journal JSON.
        No-op changes, secrets shorter than 32 characters and oversized optional
        receipts omit Undo without turning a committed save into a reported
        failure.
      </p>
      <p>
        Undo supports intake, medication, goal, settings and a
        day/period-specific check-in. Removing a medication that gained linked
        records is refused; restoring an intake or goal requires its medication.
        Medication history is reconciled again. Repeating an undo is harmless
        when the target already equals its before-state; tokens are not a
        permanently consumed, one-use ledger. Receipt text is limited to
        1,500,000 characters and the JSON request to 2,000,000 bytes.
      </p>
      <Heading id="undo-errors" level={3}>
        Failure Outcomes &amp; Limits
      </Heading>
      <ReferenceTable
        label="Undo Outcomes"
        headings={["Case", "Result / Caller Behavior"]}
        rows={[
          [
            "400 invalid / 403 other journal",
            "Reject malformed or tampered signatures and cross-journal receipts; do not reconstruct a token.",
          ],
          [
            "410 expired / 400 rotated secret",
            "Expiry reports 410; a signature invalidated by secret rotation reports 400. Review or edit the current record.",
          ],
          [
            "409 newer change / linked record",
            "Keep the newer state intact. Do not restore a client-side snapshot over it.",
          ],
          [
            "Network or API failure",
            "Keep the expanded inline error; enable a deliberate retry. Never automatically replay a write.",
          ],
          [
            "Card closing, dismissed or replaced mid-Undo",
            "A late failure opens a fresh Undo unsuccessful notice; a late success leaves the replacement card alone.",
          ],
          [
            "Undo success",
            "Hold the completed icon/accessible label for 450ms with the reading clock paused, then exit. No second mutation runs automatically.",
          ],
        ]}
      />

      <Heading id="testing">Tests &amp; Integration Checklist</Heading>
      <p>
        <Source path="src/lib/journal-notification-lifecycle.test.ts">
          Lifecycle tests
        </Source>{" "}
        cover exact speed breakpoints, long-vs-partitioned elapsed time,
        independent clocks, overlapping pauses and completion grace,
        monotonic/indefinite time, pre-mount dismissal, stale generations and
        detached Undo outcomes.{" "}
        <Source path="src/lib/server/journal-undo.test.ts">Server tests</Source>{" "}
        cover record isolation, conflicts, signature/scope/expiry, check-in
        periods, dependency/payload limits, large Unicode writing and winning
        CAS snapshots, including a Postgres test fixture. Browser checks also
        need real focus, native pointer swipes, height/scroll and both themes.
      </p>
      <DeveloperCode
        label="Notification Verification"
        language="shell"
        code={checks}
      />
      <ul className={styles.checklist}>
        <li>
          Await confirmed mutations; offer Undo only when the response provides
          it.
        </li>
        <li>
          Keep the summary short and put record-specific context/actions in
          details.
        </li>
        <li>
          Reuse one ID for loading/result updates; clear abandoned persistent
          notices.
        </li>
        <li>
          Check 320px width, long copy, expanded scrolling, keyboard and reduced
          motion.
        </li>
        <li>
          Verify rear/invisible clocks continue independently, individual and
          hidden-document pauses preserve grace, and Undo failure remains safe
          during exit, after dismissal or after replacement.
        </li>
        <li>
          Check first-activation stack reveal without details, then independent
          detail opening, outside/Escape collapse and reset after one card
          remains.
        </li>
        <li>
          Keep outer stack transforms, inner exit motion, countdown entry and
          artwork transforms independent.
        </li>
      </ul>
    </article>
  );
}
