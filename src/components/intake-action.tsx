"use client";

import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import type { PillCounts } from "@/lib/pill-counts";
import { formatDose } from "@/lib/domain";
import { PrimaryButton } from "@/components/primary-button";
import {
  getIntakeActionThemeStyle,
  INTAKE_ACTION_GEOMETRY,
} from "@/lib/action-button-system";
import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import { useIntakeDock } from "@/components/use-intake-dock";
import { useJournalWorkspace } from "@/components/journal-drafts";

// Temporary visibility switch: set true to restore the unchanged amounts bar.
const SHOW_INTAKE_AMOUNTS = false;

const mobileQuery = "(max-width: 767px)";
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

/** One entrance survives responsive portal moves; ambient paint keeps its own clock. */
function useIntakeActionEntrance() {
  const phase = useRef<"pending" | "running" | "done">("pending");
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((node: HTMLDivElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let firstFrame = 0;
    let secondFrame = 0;
    let disposed = false;
    let observer: IntersectionObserver | null = null;
    let visible = typeof IntersectionObserver !== "function";
    let start = () => {};
    const cancelFrames = () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
    const settle = () => {
      if (disposed) return;
      cancelFrames();
      observer?.disconnect();
      observer = null;
      phase.current = "done";
      node.dataset.intakeEntryState = "done";
    };
    const onEnd = (event: AnimationEvent) => {
      if (
        event.animationName === "intake-entry-footer" &&
        event.target === node.querySelector('[data-intake-entry-part="footer"]')
      )
        settle();
    };
    const onCancel = (event: AnimationEvent) => {
      if (event.animationName.startsWith("intake-entry-")) settle();
    };
    const onVisibility = () => {
      if (document.hidden) settle();
    };
    const onMotion = () => {
      if (reduced.matches) settle();
    };

    node.addEventListener("pointerdown", settle, true);
    node.addEventListener("focusin", settle);
    node.addEventListener("animationend", onEnd);
    node.addEventListener("animationcancel", onCancel);
    reduced.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);

    if (phase.current !== "pending" || reduced.matches || document.hidden) {
      // Once started, a desktop/mobile DOM replacement settles rather than replays.
      settle();
    } else {
      node.dataset.intakeEntryState = "pending";
      start = () => {
        if (
          disposed ||
          phase.current !== "pending" ||
          firstFrame ||
          !visible ||
          !getPageEntryReadiness()
        )
          return;
        // Let the initial desktop-to-mobile hydration relocation finish first.
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => {
            firstFrame = 0;
            secondFrame = 0;
            if (
              disposed ||
              phase.current !== "pending" ||
              !visible ||
              !getPageEntryReadiness()
            )
              return;
            observer?.disconnect();
            observer = null;
            phase.current = "running";
            node.dataset.intakeEntryState = "running";
          });
        });
      };
      // Desktop actions follow the log: save their entrance for first sight.
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver(
          (entries) => {
            visible = entries.some(
              (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2,
            );
            start();
          },
          { threshold: 0.2 },
        );
        observer.observe(node);
      } else start();
    }

    const unsubscribeEntry = subscribePageEntryReadiness(start);
    // Subscribe before rechecking: readiness can change during portal relocation.
    start();
    cleanup.current = () => {
      disposed = true;
      unsubscribeEntry();
      cancelFrames();
      observer?.disconnect();
      observer = null;
      node.removeEventListener("pointerdown", settle, true);
      node.removeEventListener("focusin", settle);
      node.removeEventListener("animationend", onEnd);
      node.removeEventListener("animationcancel", onCancel);
      reduced.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

function ActionCount({
  kind,
  quantity,
  name,
}: {
  kind: "pills" | "benzodiazepine" | "opioid" | "stimulant";
  quantity: number;
  name: string;
}) {
  const value = formatDose(quantity);
  const description = `${name}: ${value} ${quantity === 1 ? "pill" : "pills"} from recorded tablet and capsule quantities, including fractions.`;
  return (
    <span
      className="intake-action-metric"
      data-count-part={kind}
      data-count-total={quantity}
      role="img"
      aria-label={description}
      title={description}
    >
      <MedicationIndicatorMark
        kind={kind}
        className="intake-action-count-icon"
        aria-hidden="true"
      />
      <span data-count-value aria-hidden="true">
        <strong data-count-number>{value}</strong>
      </span>
    </span>
  );
}

function CountSeparator() {
  return (
    <span
      className="intake-action-count-separator motion-safe:animate-bounce"
      data-intake-count-separator
      aria-hidden="true"
    />
  );
}

export function IntakeAction({
  onClick,
  pillCounts,
  opioidCount,
  stimulantCount,
}: {
  onClick: () => void;
  pillCounts: PillCounts;
  opioidCount: number;
  stimulantCount: number;
}) {
  const { rememberDestination } = useJournalWorkspace();
  const dockRef = useRef<HTMLDivElement>(null);
  const entryRoot = useIntakeActionEntrance();
  const mobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  useIntakeDock(dockRef, mobile);
  const action = (
    <div
      ref={entryRoot}
      className="intake-action-content pointer-events-auto"
      data-intake-entry-root
    >
      <div
        className="intake-action-summary"
        hidden={!SHOW_INTAKE_AMOUNTS}
        data-intake-action-summary
        data-intake-entry-part="summary"
      >
        <div
          className="intake-action-summary-row"
          data-intake-action-summary-row
          role="group"
          aria-label="Today's tablet and capsule totals"
        >
          <ActionCount
            kind="pills"
            quantity={pillCounts.pills}
            name="All medications"
          />
          <span className="intake-action-categories">
            <ActionCount
              kind="benzodiazepine"
              quantity={pillCounts.benzos}
              name="Benzodiazepines"
            />
            <span className="intake-action-category">
              <CountSeparator />
              <ActionCount
                kind="opioid"
                quantity={opioidCount}
                name="Opioids and opiates"
              />
            </span>
            <span className="intake-action-category">
              <CountSeparator />
              <ActionCount
                kind="stimulant"
                quantity={stimulantCount}
                name="Stimulants"
              />
            </span>
          </span>
        </div>
      </div>
      <div
        className="intake-action-entry-button"
        data-intake-entry-part="button"
      >
        <div className="intake-action-shell">
          <PrimaryButton
            type="button"
            surface="accent"
            radius={INTAKE_ACTION_GEOMETRY.radius}
            style={{
              ...getIntakeActionThemeStyle(),
              height: INTAKE_ACTION_GEOMETRY.height,
              minHeight: INTAKE_ACTION_GEOMETRY.height,
            }}
            data-intake-paint="charcoal-mint"
            onClick={onClick}
            className="intake-primary-cta pointer-events-auto w-full"
          >
            <span className="intake-primary-row">
              <span className="intake-primary-copy">
                <span className="intake-primary-label">
                  <IntakeLogSymbol variant="pills" />
                  Log Intake
                </span>
                <span className="intake-primary-dot" aria-hidden="true">
                  ·
                </span>
                <span className="intake-primary-aside">Jot it!</span>
              </span>
              <ActionIcon name="next" className="intake-primary-next" />
            </span>
          </PrimaryButton>
        </div>
      </div>
      <p
        className="intake-action-note"
        data-intake-action-note
        data-intake-entry-part="footer"
      >
        <Link
          href="/journal"
          onNavigate={() => rememberDestination("/journal")}
        >
          Your journal, your pace.
        </Link>
      </p>
    </div>
  );

  if (mobile) {
    // Animated page wrappers can anchor fixed elements; the body portal avoids that.
    return createPortal(
      <div
        ref={dockRef}
        className="intake-dock"
        role="region"
        aria-label="Intake actions"
      >
        <div className="intake-dock-inner">{action}</div>
      </div>,
      document.body,
    );
  }

  return <div className="intake-action-desktop">{action}</div>;
}
