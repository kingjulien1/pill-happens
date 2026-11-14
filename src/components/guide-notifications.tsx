import type { ReactNode } from "react";
import { DeveloperCode } from "@/components/developer-code";
import { developerSource } from "@/lib/developer-guide";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-notifications.module.css";

const contract = `import type { ReactNode } from "react";
import type { ExternalToast } from "sonner";

export type JournalToastKind =
  | "success" | "error" | "info"
  | "warning" | "loading" | "update";

export type JournalNotificationDetails = {
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

type IntakeInput = Pick<Intake,
  "medicationId" | "quantity" | "takenAt" | "route"
>;

export function useNotifiedIntake() {
  const { mutate } = useJournal();
  return async (input: IntakeInput) => {
    const saved = await mutate("intakes", input, "POST");
    // Success and Undo follow the confirmed response, never an optimistic guess.
    toast.success("Your intake is saved in the journal.", {
      heading: "Intake saved",
      variant: "intake-saved",
      details: {
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
        tap away. The collapsed card contains its summary and countdown;
        expanding reveals context, links and actions. Use the shared journal
        facade for every application notice.
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
            <strong>5.5s</strong> active countdown
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
        geometry and native swipes; the inner journal component owns reading
        state and its staged exit. Keep those transform owners separate when
        changing motion.
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
            "Summary, labelled details, countdown, actions and asynchronous Undo outcomes.",
          ],
          [
            <Source
              key="clock"
              path="src/lib/journal-notification-lifecycle.ts"
            />,
            "Monotonic clock, exit registry and one-attempt Undo settlement.",
          ],
          [
            <span key="art">
              <Source path="src/components/ui/sonner.tsx">sonner.tsx</Source> +{" "}
              <Source path="src/components/ui/sonner.css">sonner.css</Source>
            </span>,
            "Host configuration, shared artwork, theme values and CSS phase hooks.",
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
            "5,500ms · CheckCheck; Star Check only for intake-saved.",
          ],
          [
            <code key="error">toast.error</code>,
            "Action failed",
            "5,500ms · X.",
          ],
          [
            <code key="info">toast.info</code>,
            "Journal notice",
            "5,500ms · Lightbulb.",
          ],
          [
            <code key="warning">toast.warning</code>,
            "Please review",
            "5,500ms · TriangleAlert.",
          ],
          [
            <code key="loading">toast.loading</code>,
            "In progress",
            "Always infinite · RefreshCcw; no swipe, Escape or Cancel.",
          ],
          [
            <code key="update">toast.update</code>,
            "Update available",
            "5,500ms unless overridden · Sparkles.",
          ],
        ]}
      />
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
        paragraphs use kind-specific context. Footer copy and all actions appear
        inside expanded details. <code>duration</code>, <code>id</code>,
        styling, action/cancel and callbacks originate in{" "}
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
            "Paragraphs → facts → links → error → footer/actions. Missing paragraphs use default context; [] opts out.",
          ],
          [
            "undo",
            "Await one attempt per click. Defaults: Undo → Undoing… → Undone; success rests 450ms. Failure stays inline or opens a detached error.",
          ],
          [
            "variant",
            "Only intake-saved is registered; it selects the saved-intake Star Check.",
          ],
          [
            "id",
            "String or number. Reusing it replaces the notice, resets the clock and cancels stale exit work.",
          ],
          [
            "duration",
            "5,500ms active time by default; Infinity hides the line. Loading always forces Infinity.",
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
        for a newly saved intake; edits use general Success.
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

      <Heading id="clock">Reading Clock &amp; Interaction</Heading>
      <p>
        Finite notices spend only active reading time. The monotonic clock
        samples every <strong>50ms</strong>; the line interpolates over{" "}
        <strong>60ms</strong>. Expansion, focus, non-touch hover, a held
        pointer, hidden document, rear position, invisible or unmounted host,
        swiping, removal, pending Undo and exit each pause independently. Every
        active reason must clear before counting resumes. Infinite notices hide
        the line. The clock starts with host readiness; it does not wait for
        artwork to settle.
      </p>
      <p>
        The real summary button supports Enter/Space and exposes expanded,
        controls, labelled-by and described-by relationships. Closed details are
        inert and hidden from accessibility APIs; expanded details form a
        labelled region with a <code>min(55dvh, 340px)</code> scroll cap. Scroll
        reads vertically without starting a swipe. Sonner retains left/right/up
        dismissal and its Alt+T focus shortcut. Escape from focused content
        dismisses eligible notices. Pending Undo blocks pointer swipe starts and
        Escape; it does not trap focus. Inline failure uses{" "}
        <code>role=&quot;alert&quot;</code>.
      </p>

      <Heading id="motion">Motion Phases &amp; Timing</Heading>
      <ReferenceTable
        label="Timing Ownership"
        headings={["State / Effect", "Timing", "Behavior"]}
        rows={[
          [
            "Main artwork",
            "1,320ms + 40ms delay",
            "One spin/unfurl and settle; glyph fade 480ms + 100ms.",
          ],
          [
            "Finish response",
            "Ring 420ms + 900ms",
            "Four sparks: 410ms, delayed 890ms + 12ms per index.",
          ],
          [
            "Plate unfold",
            "850ms + 100/130ms",
            "Separate rear plates finish at their resting tilts.",
          ],
          [
            "Idle loops",
            "Bell 1s; Loading 2.4s",
            "Bell rings for 0.5s, rests for 0.5s; pauses follow reading state.",
          ],
          [
            <code key="collapse">collapsing</code>,
            "280ms",
            "Close expanded details first; detail opacity uses 190ms.",
          ],
          [
            <code key="anticipate">anticipate</code>,
            "120ms",
            "Move down 2px, grow to 1.008; begin 300ms icon reversal.",
          ],
          [
            <code key="depart">depart</code>,
            "210ms",
            "Move up 54px, shrink to .96 and fade; then dismiss native item.",
          ],
          [
            "Reduced motion",
            "80ms final budget",
            "CSS animations/transitions disabled; collapse/anticipation delays skipped.",
          ],
        ]}
      />
      <p>
        Custom exit budgets total <strong>330ms collapsed</strong> or{" "}
        <strong>610ms expanded</strong>, followed by Sonner’s own unmount
        window. Native swipes use Sonner’s directional exit instead. Do not
        assert exact DOM-removal time from the custom budget. Hover styling is
        limited to desktop fine-hover pointers; mobile has none.
      </p>

      <Heading id="visuals">Visual Reference &amp; Alpha Math</Heading>
      <p>
        The compact summary starts at <strong>69px</strong>; long copy may
        increase it. The host is top-center,{" "}
        <code>min(460px, 100vw − 32px)</code> wide, with three visible notices
        and a 10px gap. Mobile side offsets are 16px and top offsets include the
        safe area. The opaque surface mixes the canvas with 24% black in light
        mode or 24% white in dark mode, so rear content cannot leak through.
      </p>
      <ReferenceTable
        label="Exact Presentation Values"
        headings={["Element", "Value / Reason"]}
        rows={[
          [
            "Artwork scale",
            "1.225×: 40→49px frame; 34→41.65px tile; 18→22.05px glyph.",
          ],
          [
            "Main text / context",
            "14px, weight 650 / 10px, weight 600; 8px heading-meta gaps.",
          ],
          [
            "Short secondary copy",
            "Light: .78 × 7/12 = .455 alpha. Dark: .90 × 7/12 = .525 alpha.",
          ],
          [
            "Expanded details",
            "Retain .78 light / .90 dark for longer reading.",
          ],
          [
            "Inward frame",
            "4px muted rim at 50%, over inset 6px Pink 500 at 56%; second band extends 2px inward.",
          ],
          [
            "Artwork / bell",
            "Pure black/white tile and opposite glyph; intake-saved alone uses Emerald 400 Star Check. Bell Check is decorative.",
          ],
        ]}
      />
      <p>
        Error, Warning and Update adjust their accent/rim variables.
        AppearanceToaster follows the resolved appearance context. These values
        describe the current presentation; they do not certify every
        text/background combination for contrast.
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
            "Show Undone for 450ms, then exit. No second mutation runs automatically.",
          ],
        ]}
      />

      <Heading id="testing">Tests &amp; Integration Checklist</Heading>
      <p>
        <Source path="src/lib/journal-notification-lifecycle.test.ts">
          Lifecycle tests
        </Source>{" "}
        cover overlapping pauses, monotonic/indefinite time, pre-mount
        dismissal, stale generations and detached Undo outcomes.{" "}
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
          Test rear/hidden pauses and Undo failure during an exit, after
          dismissal or after replacement.
        </li>
        <li>
          Keep outer stack transforms, inner exit motion and artwork transforms
          independent.
        </li>
      </ul>
    </article>
  );
}
