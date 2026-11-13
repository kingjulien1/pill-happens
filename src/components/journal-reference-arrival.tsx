"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useJournal } from "@/components/journal-provider";
import { useJournalWorkspace } from "@/components/journal-drafts";
import { toast } from "@/components/ui/journal-toast";
import { canCheckIn } from "@/lib/daily-check-in";
import { isValidDayKey } from "@/lib/domain";
import {
  getPageEntryReadiness,
  getServerPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";
import {
  intakeReferenceDestination,
  JOURNAL_REFERENCE_REVEAL_EVENT,
  referenceScrollTop,
} from "@/lib/journal-reference-navigation";
import styles from "./journal-reference-arrival.module.css";

/** Reveal and locate a requested record after restoration and the loading curtain. */
export function JournalReferenceArrival() {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { data, now } = useJournal();
  const { ready, dialog, closeDialog, openDialog } = useJournalWorkspace();
  const entryReady = useSyncExternalStore(
    subscribePageEntryReadiness,
    getPageEntryReadiness,
    getServerPageEntryReadiness,
  );
  const clock = useRef(now);
  useLayoutEffect(() => {
    clock.current = now;
  }, [now]);
  const single = (key: string) => {
    const values = params.getAll(key);
    return values.length === 1 &&
      values[0].length <= 160 &&
      !/[\u0000-\u001f\u007f]/u.test(values[0])
      ? values[0]
      : "";
  };
  const intake = single("intake");
  const medication =
    path === "/medications" && !params.has("ingredient")
      ? single("medication")
      : "";
  const period = single("checkin");
  const checkin = period === "morning" || period === "evening" ? period : "";
  const query = params.toString();
  const visit = `${path}?${query}`;
  const processed = useRef("");
  const closedVisit = useRef("");
  const cleanupHighlight = useRef<() => void>(() => {});
  const status = useRef<HTMLSpanElement>(null);

  useEffect(() => () => cleanupHighlight.current(), [visit]);

  useLayoutEffect(() => {
    if (
      !ready ||
      !data ||
      (!intake && !medication) ||
      closedVisit.current === visit
    )
      return;
    closedVisit.current = visit;
    // Opening a reference is an explicit navigation intent. Closing a restored
    // editor keeps its independent draft, rather than hiding the requested card.
    if (dialog) closeDialog(dialog);
  }, [ready, data, intake, medication, visit, dialog, closeDialog]);

  useEffect(() => {
    if (
      !data ||
      !ready ||
      !entryReady ||
      (!intake && !medication && !checkin) ||
      processed.current === visit
    )
      return;
    let frame = 0;
    let disposed = false;
    let expires = performance.now() + 6000;
    let lastRequest = -Infinity;
    let stableFrames = 0;
    let lastTop: number | null = null;
    const finishMissing = (message: string) => {
      processed.current = visit;
      if (status.current) status.current.textContent = message;
      toast.info(message);
    };
    const seek = () => {
      frame = 0;
      if (disposed || document.hidden || !getPageEntryReadiness()) return;
      const current = clock.current;
      if (!current) return;
      if (performance.now() >= expires) {
        finishMissing(
          "The linked record could not be located. You can still browse this page.",
        );
        return;
      }
      if (intake) {
        const destination = intakeReferenceDestination(data, intake, current);
        if (!destination) {
          finishMissing("This intake is no longer available in your journal.");
          return;
        }
        if (path !== destination.split("?")[0]) {
          router.replace(destination, { scroll: false });
          return;
        }
      }
      if (checkin && !intake && !medication) {
        const date = /^\/history\/(\d{4}-\d{2}-\d{2})$/.exec(path)?.[1];
        // Today links use an explicit dated URL from the reader, so no relative
        // day can drift while a saved journal is open.
        if (!date || !isValidDayKey(date)) return;
        processed.current = visit;
        if (canCheckIn(date, current, data.settings.timezone, checkin))
          openDialog({ kind: "check-in", day: date, period: checkin });
        else
          finishMissing(
            checkin === "evening"
              ? "Evening Check-In opens at 17:00 for this journal day."
              : "This check-in is not available yet.",
          );
        return;
      }
      const attribute = intake
        ? "data-intake-card"
        : "data-medication-library-card";
      const target = [
        ...document.querySelectorAll<HTMLElement>(`[${attribute}]`),
      ].find((node) => node.getAttribute(attribute) === (intake || medication));
      if (!target) {
        if (performance.now() < expires) frame = requestAnimationFrame(seek);
        else
          finishMissing(
            intake
              ? "This intake could not be located."
              : "This medication is no longer available in your library.",
          );
        return;
      }
      const group = target.closest<HTMLElement>("[data-intake-group]");
      if (
        group?.dataset.grouped === "true" &&
        group.dataset.expanded !== "true"
      ) {
        if (performance.now() - lastRequest > 120) {
          lastRequest = performance.now();
          document.dispatchEvent(
            new CustomEvent(JOURNAL_REFERENCE_REVEAL_EVENT, {
              detail: { id: intake },
            }),
          );
        }
        frame = requestAnimationFrame(seek);
        return;
      }
      if (group?.dataset.stackMoving === "true") {
        frame = requestAnimationFrame(seek);
        return;
      }
      const bounds = target.getBoundingClientRect();
      if (lastTop === null || Math.abs(bounds.top - lastTop) > 0.5)
        stableFrames = 0;
      else stableFrames++;
      lastTop = bounds.top;
      if (stableFrames < 3 && performance.now() < expires) {
        frame = requestAnimationFrame(seek);
        return;
      }
      processed.current = visit;
      const action =
        target.querySelector<HTMLButtonElement>("[data-intake-card-action]") ??
        target;
      action.focus({ preventScroll: true });
      const viewport = window.visualViewport;
      const dock =
        document.documentElement.dataset.intakeDocked === "true"
          ? parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--intake-dock-height",
              ),
            ) || 0
          : 0;
      const height = viewport?.height ?? innerHeight;
      const top = referenceScrollTop({
        top: target.getBoundingClientRect().top,
        height: target.offsetHeight,
        scrollY,
        viewportHeight: height,
        viewportOffset: viewport?.offsetTop ?? 0,
        dockHeight: dock,
        maxScroll: document.documentElement.scrollHeight - height,
      });
      window.scrollTo({
        top,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      cleanupHighlight.current();
      target.classList.add(styles.highlight);
      target.dataset.referenceHighlighted = "true";
      const cleanup = () => {
        target.classList.remove(styles.highlight);
        delete target.dataset.referenceHighlighted;
        clearTimeout(timer);
      };
      const timer = setTimeout(cleanup, 4200);
      cleanupHighlight.current = cleanup;
      if (status.current)
        status.current.textContent = intake
          ? "Linked intake revealed and highlighted."
          : "Linked medication highlighted.";
    };
    const visible = () => {
      if (!document.hidden && !disposed && processed.current !== visit) {
        expires = performance.now() + 6000;
        if (!frame) frame = requestAnimationFrame(seek);
      }
    };
    frame = requestAnimationFrame(seek);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [
    data,
    ready,
    entryReady,
    intake,
    medication,
    checkin,
    path,
    visit,
    router,
    openDialog,
  ]);

  return (
    <span
      ref={status}
      className="sr-only"
      role="status"
      data-journal-reference-arrival
    />
  );
}
