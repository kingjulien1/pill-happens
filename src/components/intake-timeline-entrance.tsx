"use client";

import {
  getPageEntryReadiness,
  subscribePageEntryReadiness,
} from "@/lib/page-entry-readiness";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { INTAKE_DOCK_RESIZE_EVENT } from "@/components/use-intake-dock";
import {
  reserveTimelineCardEntryDelays,
  resetCardEntryDelaysIfIdle,
} from "@/lib/card-entry-timing";
import {
  INTAKE_GROUP_ENTRANCE_MS,
  intakeGroupEntranceStart,
  nextIntakeGroupEntranceState,
  type IntakeGroupEntranceState,
} from "@/lib/intake-group-entrance";

const ENTRY =
  "[data-intake-entrance], [data-daily-check-in], .empty-intake-card";
const disclosureEvent = "pill:intake-stack-disclose";

/** Release entrance effects before either disclosure direction moves the timeline. */
export function settleIntakeGroupEntrance(root: HTMLElement) {
  root.dispatchEvent(new Event(disclosureEvent, { bubbles: true }));
}

/** One DOM-ordered entrance owner for the entire daily log, including check-ins. */
export function IntakeTimelineEntrance({
  children,
  className = "intake-timeline",
  ...props
}: ComponentProps<"div">) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());
  const seenGroups = useRef(new Set<string>());

  useLayoutEffect(() => {
    const timeline = root.current;
    if (!timeline) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const watched = new Set<HTMLElement>();
    const queued = new Set<HTMLElement>();
    const active = new Set<HTMLElement>();
    const motionCandidates = new Set<HTMLElement>();
    const rearClocks = new WeakMap<Element, number>();
    const faceStarts = new WeakMap<HTMLElement, number>();
    const groupTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const groupStarts = new Map<
      HTMLElement,
      { at: number; timer: ReturnType<typeof setTimeout> }
    >();
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    let motionFrame = 0;
    let settleFrame = 0;
    let scrollFrame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = reduced.matches;
    let disposed = false;
    let entryPauseAt: number | null = null;
    let revealInsets = { top: 0, bottom: 0 };

    // React development replay cleans up painted effects between setup passes.
    // Only a genuinely finished group should survive that pass as "done".
    for (const group of timeline.querySelectorAll<HTMLElement>(
      '[data-intake-group][data-grouped="true"]',
    ))
      group.dataset.groupEntryState = seenGroups.current.has(
        group.dataset.intakeGroup ?? "",
      )
        ? "done"
        : "pending";

    const isIntake = (node: HTMLElement) =>
      node.hasAttribute("data-intake-entrance");
    const identity = (node: HTMLElement) =>
      isIntake(node)
        ? node.dataset.intakeEntrance
        : node.hasAttribute("data-daily-check-in")
          ? `check-in:${node.dataset.checkInDay}:${node.dataset.checkInPeriod}`
          : "empty-log";
    const phase = (node: HTMLElement) =>
      isIntake(node) ? node.dataset.entranceState : node.dataset.cardEntryState;
    const setPhase = (node: HTMLElement, state: string) => {
      if (isIntake(node)) node.dataset.entranceState = state;
      else node.dataset.cardEntryState = state;
    };
    const stackFor = (node: HTMLElement) => {
      const group = node.closest<HTMLElement>("[data-intake-group]");
      return group?.dataset.grouped === "true" ? group : null;
    };
    const layoutNode = (node: HTMLElement) =>
      node.closest<HTMLElement>("[data-check-in-slot]") ??
      node.parentElement ??
      node;
    const exposedFace = (node: HTMLElement) =>
      !node.closest('[hidden], [aria-hidden="true"]') &&
      (!isIntake(node) ||
        node.dataset.entranceExposed === "true" ||
        node.dataset.entrancePreview === "true");
    const inPhysicalViewport = (node: HTMLElement) => {
      if (
        !exposedFace(node) ||
        node.parentElement?.dataset.stackHidden === "true"
      )
        return false;
      const bounds = layoutNode(node).getBoundingClientRect();
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.bottom > 0 &&
        bounds.top < window.innerHeight &&
        bounds.right > 0 &&
        bounds.left < window.innerWidth
      );
    };
    const stackMoving = () =>
      timeline.querySelector('[data-stack-moving="true"]') !== null;

    const cancelGroupStart = (group: HTMLElement) => {
      const reservation = groupStarts.get(group);
      if (reservation) clearTimeout(reservation.timer);
      groupStarts.delete(group);
    };
    const finishGroup = (group: HTMLElement, remember = true) => {
      cancelGroupStart(group);
      group.dataset.groupEntryState = "done";
      const id = group.dataset.intakeGroup;
      if (remember && id) seenGroups.current.add(id);
      const timer = groupTimers.get(group);
      if (timer !== undefined) clearTimeout(timer);
      groupTimers.delete(group);
    };
    const syncGroups = () => {
      for (const group of groupStarts.keys())
        if (!timeline.contains(group)) cancelGroupStart(group);
      for (const [group, timer] of groupTimers) {
        if (!timeline.contains(group)) {
          clearTimeout(timer);
          groupTimers.delete(group);
        }
      }
      for (const group of timeline.querySelectorAll<HTMLElement>(
        '[data-intake-group][data-grouped="true"]',
      )) {
        const current = (group.dataset.groupEntryState ??
          "pending") as IntakeGroupEntranceState;
        const faces = Array.from(
          group.querySelectorAll<HTMLElement>(ENTRY),
        ).map((node) => ({
          exposed: exposedFace(node),
          state: phase(node),
          startsAt: faceStarts.get(node),
        }));
        const now = performance.now();
        const ready = getPageEntryReadiness() && !document.hidden;
        const next = nextIntakeGroupEntranceState({
          current,
          faces,
          now,
          ready,
          settle:
            !observer ||
            reduced.matches ||
            (document.hidden && current === "running") ||
            group.dataset.stackMoving === "true",
        });
        if (next === "done") finishGroup(group);
        else if (next !== current) {
          cancelGroupStart(group);
          group.dataset.groupEntryState = next;
          // animationend is authoritative; this backstop releases controls if
          // the effect is interrupted by a browser/layout change without it.
          const timer = setTimeout(() => {
            groupTimers.delete(group);
            if (!disposed && getPageEntryReadiness()) finishGroup(group);
          }, INTAKE_GROUP_ENTRANCE_MS + 100);
          groupTimers.set(group, timer);
        } else if (next === "pending") {
          const at = ready ? intakeGroupEntranceStart(faces) : null;
          if (at === null) cancelGroupStart(group);
          else if (groupStarts.get(group)?.at !== at) {
            cancelGroupStart(group);
            const timer = setTimeout(
              () => {
                groupStarts.delete(group);
                if (!disposed && timeline.contains(group)) syncGroups();
              },
              Math.max(0, Math.ceil(at - now)),
            );
            groupStarts.set(group, { at, timer });
          }
        } else if (
          next === "running" &&
          !groupTimers.has(group) &&
          getPageEntryReadiness()
        ) {
          // A refresh curtain paused the backstop. Once ready, release any
          // effect that was canceled during the pause rather than hiding it.
          finishGroup(group);
        }
      }
    };

    const finish = (node: HTMLElement): void => {
      const wasDone = phase(node) === "done";
      const id = identity(node);
      if (id) seen.current.add(id);
      if (!wasDone) setPhase(node, "done");
      observer?.unobserve(node);
      watched.delete(node);
      active.delete(node);
      queued.delete(node);
      motionCandidates.delete(node);
      faceStarts.delete(node);
      if (!wasDone)
        queueMicrotask(() => {
          if (disposed) return;
          resetCardEntryDelaysIfIdle(timeline);
          sync();
        });
    };

    const settleFace = finish;
    const settleMovingFaces = () => {
      for (const node of motionCandidates) {
        if (
          !timeline.contains(node) ||
          !exposedFace(node) ||
          phase(node) === "done"
        ) {
          motionCandidates.delete(node);
          continue;
        }
        if (inPhysicalViewport(node)) settleFace(node);
      }
    };
    const stopMotionWatch = () => {
      cancelAnimationFrame(motionFrame);
      motionFrame = 0;
    };
    const watchMotion = () => {
      motionFrame = 0;
      if (disposed || document.hidden || reduced.matches || !stackMoving()) {
        if (!disposed) sync();
        return;
      }
      settleMovingFaces();
      if (motionCandidates.size)
        motionFrame = requestAnimationFrame(watchMotion);
    };

    const flush = () => {
      frame = 0;
      if (!getPageEntryReadiness() || document.hidden) return;
      // A previously queued batch must not start fading while another group
      // moves it. Keep offscreen faces queued for their normal later entrance.
      if (stackMoving()) {
        settleMovingFaces();
        return;
      }
      // One readiness boundary and one DOM query keep check-ins and stack
      // layers in order, independent of IntersectionObserver callback order.
      const candidates = Array.from(
        timeline.querySelectorAll<HTMLElement>(ENTRY),
      ).filter((node) => {
        const id = identity(node);
        if (
          !id ||
          seen.current.has(id) ||
          phase(node) !== "pending" ||
          !exposedFace(node)
        )
          return false;
        const bounds = layoutNode(node).getBoundingClientRect();
        const inBand =
          bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.bottom >= revealInsets.top - 1 &&
          bounds.top <= window.innerHeight - revealInsets.bottom + 1;
        if (!inBand) {
          queued.delete(node);
          observer?.unobserve(node);
          observer?.observe(node);
        }
        return inBand;
      });
      if (reduced.matches) {
        for (const node of candidates) finish(node);
        return;
      }
      const batchStart = performance.now();
      const delays = reserveTimelineCardEntryDelays(
        timeline,
        candidates,
        stackFor,
        (node) => node.parentElement?.dataset.stackHead === "true",
        rearClocks,
      );
      for (const [index, node] of candidates.entries()) {
        const id = identity(node);
        if (!id) continue;
        const preview = node.dataset.entrancePreview === "true";
        seen.current.add(id);
        queued.delete(node);
        const rear = Number(node.parentElement?.dataset.stackDepth ?? 0) > 0;
        const delay = `${delays[index]}ms`;
        faceStarts.set(node, batchStart + delays[index]);
        observer?.unobserve(node);
        watched.delete(node);
        node.style.setProperty(
          isIntake(node) ? "--intake-enter-delay" : "--card-entry-delay",
          delay,
        );
        if (node.parentElement?.dataset.stackRear === "false")
          node
            .closest<HTMLElement>("[data-intake-group]")
            ?.style.setProperty("--intake-enter-delay", delay);
        setPhase(node, "running");
        if (isIntake(node))
          node.dataset.entranceKind = preview
            ? "preview"
            : rear
              ? "rear"
              : "card";
        active.add(node);
      }
      syncGroups();
    };

    const scheduleFlush = () => {
      if (
        getPageEntryReadiness() &&
        !document.hidden &&
        settled &&
        queued.size &&
        !frame &&
        !stackMoving()
      )
        frame = requestAnimationFrame(flush);
    };

    const createObserver = () => {
      if (typeof IntersectionObserver !== "function") return null;
      const shell = timeline.closest(".with-intake-dock");
      // The mobile action dock sits over the viewport. Its existing layout
      // reserve also includes the safe area, so entrances wait until clear of it.
      const viewportHeight = window.innerHeight;
      const travel = Math.min(56, Math.max(24, viewportHeight * 0.08));
      const dock =
        shell && window.matchMedia("(max-width: 767px)").matches
          ? Math.max(12, parseFloat(getComputedStyle(shell).paddingBottom) || 0)
          : 12;
      // A little actual travel inside the usable viewport precedes a reveal.
      // Keep a visible observation band even on short landscape windows, and
      // use intersection rather than a ratio so very tall notes can still enter.
      const bottom = Math.min(
        dock + travel,
        Math.max(0, viewportHeight - travel - 96),
      );
      revealInsets = { top: travel, bottom };
      return new IntersectionObserver(
        (entries, source) => {
          if (source !== observer) return;
          for (const entry of entries) {
            const node = entry.target as HTMLElement;
            if (stackMoving() && inPhysicalViewport(node)) {
              settleFace(node);
              continue;
            }
            if (
              !entry.isIntersecting ||
              entry.intersectionRect.width <= 0 ||
              entry.intersectionRect.height <= 0
            ) {
              // A fast scroll during the initial pause must not consume an
              // unseen card's one entrance after it has already left the band.
              queued.delete(node);
              continue;
            }
            if (!exposedFace(node) || phase(node) !== "pending") continue;
            if (document.hidden) {
              queued.delete(node);
              continue;
            }
            if (reduced.matches) {
              finish(node);
              continue;
            }
            queued.add(node);
          }
          scheduleFlush();
        },
        {
          threshold: [0, 0.01],
          rootMargin: `-${travel}px 0px -${bottom}px 0px`,
        },
      );
    };
    observer = createObserver();

    const sync = (): void => {
      if (disposed) return;
      const moving = stackMoving();
      for (const node of [...watched, ...active, ...motionCandidates]) {
        if (!timeline.contains(node)) {
          observer?.unobserve(node);
          watched.delete(node);
          queued.delete(node);
          active.delete(node);
          motionCandidates.delete(node);
        }
      }
      // Removed main faces must not leave future slots alive behind rear tails.
      resetCardEntryDelaysIfIdle(timeline);
      for (const node of timeline.querySelectorAll<HTMLElement>(ENTRY)) {
        if (!exposedFace(node)) motionCandidates.delete(node);
        else if (moving && phase(node) !== "done") {
          if (inPhysicalViewport(node)) {
            settleFace(node);
            continue;
          }
          motionCandidates.add(node);
        }
        // Remembered disclosure is layout, not proof that this document has
        // already shown a face. Real disclosure settles faces in onDisclosure.
        const id = identity(node);
        if (!exposedFace(node)) {
          observer?.unobserve(node);
          watched.delete(node);
          queued.delete(node);
          if (active.has(node) || (id !== undefined && seen.current.has(id)))
            finish(node);
          else setPhase(node, "idle");
          continue;
        }
        if (!observer || reduced.matches || !id || seen.current.has(id)) {
          if (!active.has(node) || reduced.matches) finish(node);
          observer?.unobserve(node);
          watched.delete(node);
          continue;
        }
        if (document.hidden) {
          setPhase(node, "pending");
          observer.unobserve(node);
          watched.delete(node);
          queued.delete(node);
          continue;
        }
        if (!watched.has(node) && !queued.has(node)) {
          setPhase(node, "pending");
          watched.add(node);
          observer.observe(node);
        }
      }
      if (moving && !document.hidden && !reduced.matches) {
        if (motionCandidates.size && !motionFrame)
          motionFrame = requestAnimationFrame(watchMotion);
      } else {
        stopMotionWatch();
        motionCandidates.clear();
        scheduleFlush();
      }
      syncGroups();
    };

    const onEnd = (event: AnimationEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.dataset.intakeGroupEntrancePart === "control"
      ) {
        const group = event.target.closest<HTMLElement>("[data-intake-group]");
        if (group) finishGroup(group);
        return;
      }
      if (
        (event.animationName === "card-entry-arrive" ||
          event.animationName === "intake-card-arrive" ||
          event.animationName === "intake-preview-arrive") &&
        event.target instanceof HTMLElement &&
        event.target.matches(ENTRY)
      )
        finish(event.target);
    };
    const onInteraction = (event: FocusEvent | PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const node = event.target.closest<HTMLElement>(ENTRY);
      const group = event.target.closest<HTMLElement>("[data-intake-group]");
      if (group) finishGroup(group);
      // Interaction releases visible faces immediately. An opening group also
      // releases its capped children in sync, before the next paint.
      if (!node) {
        for (const member of group?.querySelectorAll<HTMLElement>(ENTRY) ?? [])
          if (exposedFace(member)) {
            finish(member);
          }
        return;
      }
      if (phase(node) !== "done") finish(node);
    };
    const onVisibility = () => {
      if (!document.hidden) {
        sync();
        return;
      }
      stopMotionWatch();
      for (const node of active) finish(node);
      for (const node of watched) observer?.unobserve(node);
      watched.clear();
      queued.clear();
      syncGroups();
    };
    const onDisclosure = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const group = event.target.closest<HTMLElement>("[data-intake-group]");
      if (!group || !timeline.contains(group)) return;
      finishGroup(group);
      // Settle the complete target group AND visible neighbors before React
      // moves their layout. A seen ID may still have delayed child entrances.
      for (const node of timeline.querySelectorAll<HTMLElement>(ENTRY))
        if (group.contains(node) || inPhysicalViewport(node)) settleFace(node);
    };
    const onResize = () => {
      observer?.disconnect();
      for (const node of queued) watched.add(node);
      queued.clear();
      observer = createObserver();
      for (const node of watched) observer?.observe(node);
      sync();
    };
    const settleOffscreenArrivals = () => {
      scrollFrame = 0;
      // A fast swipe can abandon starts already reserved by this viewport batch.
      // Release them rather than making the next visible batch wait for empty slots.
      for (const node of active) if (!inPhysicalViewport(node)) finish(node);
    };
    const onScroll = () => {
      if (!scrollFrame && active.size)
        scrollFrame = requestAnimationFrame(settleOffscreenArrivals);
    };
    const mutations = new MutationObserver(sync);
    mutations.observe(timeline, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-entrance-exposed",
        "data-entrance-preview",
        "data-entrance-parent",
        "data-stack-moving",
        "data-stack-stage",
        "data-expanded",
        "hidden",
        "data-check-in-day",
        "data-check-in-period",
      ],
    });
    timeline.addEventListener("animationend", onEnd);
    timeline.addEventListener("animationcancel", onEnd);
    timeline.addEventListener("focusin", onInteraction);
    timeline.addEventListener("pointerdown", onInteraction, true);
    timeline.addEventListener(disclosureEvent, onDisclosure);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(INTAKE_DOCK_RESIZE_EVENT, onResize);
    reduced.addEventListener("change", sync);
    const unsubscribeEntry = subscribePageEntryReadiness(() => {
      if (!getPageEntryReadiness()) {
        entryPauseAt ??= performance.now();
        for (const group of groupStarts.keys()) cancelGroupStart(group);
        return;
      }
      if (entryPauseAt !== null) {
        // CSS pauses delayed card entrances behind the curtain. Keep the local
        // frame beat on that same paused clock rather than spending it hidden.
        const paused = performance.now() - entryPauseAt;
        for (const node of active) {
          const startsAt = faceStarts.get(node);
          if (startsAt !== undefined) faceStarts.set(node, startsAt + paused);
        }
        entryPauseAt = null;
      }
      sync();
      scheduleFlush();
    });
    sync();
    if (!settled) {
      // Natural card measurements settle during layout/ResizeObserver updates.
      // Keep two measurement frames, then only a brief 60ms settling pause.
      settleFrame = requestAnimationFrame(() => {
        settleFrame = requestAnimationFrame(() => {
          settleTimer = setTimeout(() => {
            settled = true;
            scheduleFlush();
          }, 60);
        });
      });
    }
    return () => {
      disposed = true;
      unsubscribeEntry();
      cancelAnimationFrame(frame);
      stopMotionWatch();
      cancelAnimationFrame(settleFrame);
      cancelAnimationFrame(scrollFrame);
      if (settleTimer !== null) clearTimeout(settleTimer);
      mutations.disconnect();
      observer?.disconnect();
      timeline.removeEventListener("animationend", onEnd);
      timeline.removeEventListener("animationcancel", onEnd);
      timeline.removeEventListener("focusin", onInteraction);
      timeline.removeEventListener("pointerdown", onInteraction, true);
      timeline.removeEventListener(disclosureEvent, onDisclosure);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(INTAKE_DOCK_RESIZE_EVENT, onResize);
      reduced.removeEventListener("change", sync);
      for (const node of timeline.querySelectorAll<HTMLElement>(ENTRY))
        setPhase(node, "done");
      for (const group of timeline.querySelectorAll<HTMLElement>(
        '[data-intake-group][data-grouped="true"]',
      ))
        finishGroup(group, false);
      for (const timer of groupTimers.values()) clearTimeout(timer);
      groupTimers.clear();
      for (const group of groupStarts.keys()) cancelGroupStart(group);
      resetCardEntryDelaysIfIdle(timeline);
    };
  }, []);

  return (
    <div {...props} ref={root} className={className} data-log-entry-scope>
      {children}
    </div>
  );
}
