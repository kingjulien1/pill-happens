"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { ActionIcon } from "@/components/action-icon";
import { HistoryDayCard } from "@/components/history-day-card";
import { useIntakeGroupSurface } from "@/components/use-intake-group-surface";
import type { AppData } from "@/lib/domain";
import type { HistoryWeek } from "@/lib/history-weeks";
import {
  INTAKE_GROUP_SPACING_PX,
  layoutIntakeStacks,
  type IntakeStackFace,
  type IntakeStackStage,
  type IntakeStackView,
} from "@/lib/intake-stack-layout";
import styles from "./history-week-group.module.css";
import spacingStyles from "./intake-group-spacing.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const reducedServerSnapshot = () => true;

type WeekDisplay = {
  open: boolean;
  from: boolean;
  stage: IntakeStackStage;
  moving: boolean;
  serial: number;
};

function initialDisplay(open: boolean): WeekDisplay {
  return { open, from: open, stage: "idle", moving: false, serial: 0 };
}

function settleDisplay(display: WeekDisplay): WeekDisplay {
  return {
    ...display,
    from: display.open,
    stage: "idle",
    moving: false,
    serial: display.serial + 1,
  };
}

function stackView(id: string, open: boolean): IntakeStackView {
  return { heads: [id], expanded: open ? [id] : [] };
}

function formatWeekDay(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

function HistoryWeekSlot({
  data,
  day,
  face,
  collapsed,
  onNaturalHeight,
}: {
  data: AppData;
  day: string;
  face: IntakeStackFace;
  collapsed: boolean;
  onNaturalHeight: (day: string, height: number) => void;
}) {
  const measure = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const card = measure.current?.querySelector<HTMLElement>(
      "[data-history-day-link]",
    );
    if (!card) return;
    // offsetHeight measures the natural face, independent of its stack scale.
    const updateHeight = () => onNaturalHeight(day, card.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, [day, onNaturalHeight]);

  return (
    <div
      className="intake-stack-slot"
      role="listitem"
      data-stack-depth={face.depth}
      data-stack-order={face.order}
      data-stack-head={face.head}
      data-stack-head-id={face.headId}
      data-stack-rear={!face.head}
      data-stack-collapsed={collapsed && !face.head}
      data-stack-hidden={face.hidden}
      aria-hidden={(collapsed && !face.head) || face.hidden || undefined}
      style={
        {
          "--stack-y": `${face.y}px`,
          "--stack-scale": face.scale,
          "--stack-face-height": `${face.height}px`,
          "--stack-delay": `${face.delay}ms`,
          "--stack-layer": face.layer,
        } as CSSProperties
      }
    >
      <div ref={measure} className="intake-stack-measure">
        {/* Keep the same link and artwork mounted through every disclosure. */}
        <HistoryDayCard data={data} day={day} entryAnimation={false} />
      </div>
    </div>
  );
}

export function HistoryWeekGroup({
  data,
  week,
  expanded,
  onExpandedChange,
}: {
  data: AppData;
  week: HistoryWeek;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const count = week.days.length;
  const grouped = count > 1;
  const desiredOpen = grouped && expanded;
  const [display, setDisplay] = useState(() => initialDisplay(desiredOpen));
  const [naturalHeights, setNaturalHeights] = useState<Record<string, number>>(
    {},
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedSnapshot,
    reducedServerSnapshot,
  );
  const headingId = useId();
  const cardsId = useId();
  const cards = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const keyboardReveal = useRef(false);
  const { groupRef, labelRef } = useIntakeGroupSurface(grouped);
  // Keep external intent changes in the same commit as their moving faces.
  if (desiredOpen !== display.open) {
    setDisplay({
      open: desiredOpen,
      from: reduced ? desiredOpen : display.open,
      stage: reduced ? "idle" : desiredOpen ? "open" : "close",
      moving: !reduced,
      serial: display.serial + 1,
    });
  }
  const head = week.days[0] ?? week.id;
  const entries = week.days.map((id) => ({ id }));
  const open = grouped && display.open;
  const collapsed = grouped && !open;
  const layout = layoutIntakeStacks({
    entries,
    heights: naturalHeights,
    view: stackView(head, open),
    from: stackView(head, display.from),
    stage: display.moving ? display.stage : "idle",
  });
  const onNaturalHeight = useCallback((day: string, height: number) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setNaturalHeights((previous) =>
      previous[day] === height ? previous : { ...previous, [day]: height },
    );
  }, []);

  useLayoutEffect(() => {
    if (!desiredOpen && cards.current?.contains(document.activeElement))
      toggle.current?.focus({ preventScroll: true });
  }, [desiredOpen]);

  useLayoutEffect(() => {
    if (!open || !keyboardReveal.current) return;
    keyboardReveal.current = false;
    cards.current
      ?.querySelector<HTMLAnchorElement>("[data-history-day-link]")
      ?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!display.moving) return;
    const serial = display.serial;
    const timer = setTimeout(
      () =>
        setDisplay((current) =>
          current.serial === serial ? settleDisplay(current) : current,
        ),
      reduced || document.hidden ? 0 : layout.duration + 60,
    );
    return () => clearTimeout(timer);
  }, [display.moving, display.serial, layout.duration, reduced]);

  useEffect(() => {
    const settleHidden = () => {
      if (document.hidden)
        setDisplay((current) =>
          current.moving ? settleDisplay(current) : current,
        );
    };
    document.addEventListener("visibilitychange", settleHidden);
    return () => document.removeEventListener("visibilitychange", settleHidden);
  }, []);

  const changeOpen = (showing: boolean, keyboard: boolean) => {
    keyboardReveal.current = showing && keyboard;
    if (!showing && cards.current?.contains(document.activeElement))
      toggle.current?.focus({ preventScroll: true });
    onExpandedChange(showing);
  };
  const crossesYear = week.start.slice(0, 4) !== week.end.slice(0, 4);
  const crossesMonth = week.start.slice(0, 7) !== week.end.slice(0, 7);
  const shortStart = formatWeekDay(week.start, {
    weekday: "short",
    day: "numeric",
    month: crossesMonth ? "short" : undefined,
    year: crossesYear ? "numeric" : undefined,
  });
  const shortEnd = formatWeekDay(week.end, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: crossesYear ? "numeric" : undefined,
  });
  const fullRange = [week.start, week.end]
    .map((day) =>
      formatWeekDay(day, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    )
    .join(" to ");
  const weekLabel = `Week ${week.weekNumber}, ${week.weekYear}`;
  const disclosureLabel = `${open ? "Collapse" : "Reveal"} ${count} days in ${weekLabel}, ${fullRange}`;
  const announcement = display.serial
    ? open
      ? `All ${count} days shown.`
      : `${count} days folded together.`
    : "";

  return (
    <section
      className={styles.week}
      aria-labelledby={headingId}
      data-card-entry
      data-history-week={week.id}
      data-history-week-size={count}
      data-history-week-expanded={open}
      data-week-number={week.weekNumber}
      data-week-year={week.weekYear}
      data-week-start={week.start}
      data-week-end={week.end}
    >
      <h2
        id={headingId}
        className={styles.heading}
        aria-label={`${weekLabel}, ${fullRange}`}
        title={fullRange}
      >
        <span className={styles.label} aria-hidden="true">
          Week <strong>{week.weekNumber}</strong>
          <span className={styles.year}>/ {week.weekYear}</span>
        </span>
        <span className={styles.range} aria-hidden="true">
          <time dateTime={week.start}>{shortStart}</time>
          <span className={styles.rangeSeparator}>–</span>
          <time dateTime={week.end}>{shortEnd}</time>
        </span>
      </h2>
      <div
        ref={groupRef}
        className={`intake-group ${spacingStyles.base} ${spacingStyles.group}`}
        style={
          {
            "--intake-group-space": `${INTAKE_GROUP_SPACING_PX}px`,
          } as CSSProperties
        }
        data-history-week-stack={week.id}
        data-group-size={count}
        data-grouped={grouped}
        data-expanded={open}
        data-stack-moving={display.moving}
        data-stack-folding={display.moving && display.stage === "close"}
        data-stack-stage={display.stage}
      >
        {grouped && (
          <div className="intake-group-glass" aria-hidden="true">
            <div className="intake-group-blur" />
            <div className="intake-group-gradient" />
          </div>
        )}
        <div
          id={cardsId}
          ref={cards}
          className="intake-group-cards"
          role="list"
          aria-label={`Daily logs in ${weekLabel}`}
          aria-hidden={collapsed || undefined}
          inert={collapsed}
          style={
            {
              height: `${layout.height}px`,
              "--stack-layout-duration": `${layout.duration}ms`,
              "--stack-height-delay": `${layout.heightDelay}ms`,
              "--stack-height-duration": `${layout.heightDuration}ms`,
            } as CSSProperties
          }
        >
          {week.days.map((day, index) => (
            <HistoryWeekSlot
              key={day}
              data={data}
              day={day}
              face={layout.frames[index]}
              collapsed={collapsed}
              onNaturalHeight={onNaturalHeight}
            />
          ))}
        </div>
        {grouped && (
          <>
            {/* A sibling overlay reveals the stack without nesting controls in links. */}
            <button
              type="button"
              className={styles.revealOverlay}
              hidden={!collapsed}
              tabIndex={-1}
              aria-hidden="true"
              aria-label={disclosureLabel}
              onClick={() => changeOpen(true, false)}
              data-history-week-reveal
            />
            <div className="intake-group-footer">
              <button
                ref={toggle}
                type="button"
                className="intake-group-toggle"
                aria-expanded={open}
                aria-controls={cardsId}
                aria-label={disclosureLabel}
                data-history-week-toggle
                onClick={(event) => changeOpen(!open, event.detail === 0)}
              >
                <span ref={labelRef} className="intake-group-label">
                  <span
                    className="intake-group-control-paint"
                    aria-hidden="true"
                  >
                    <span className="intake-group-blur" />
                  </span>
                  <span
                    className="intake-group-chevron-frame"
                    aria-hidden="true"
                  >
                    <ActionIcon
                      name="expand"
                      weight="regular"
                      className="intake-group-chevron"
                    />
                  </span>
                  <span className="intake-group-copy" aria-hidden="true">
                    <span className="intake-group-verb">
                      <span data-current={!open}>Reveal</span>
                      <span data-current={open}>Collapse</span>
                    </span>
                    <strong>{count}</strong>
                    <span>days</span>
                  </span>
                  <span
                    className="intake-group-chevron-frame"
                    aria-hidden="true"
                  >
                    <ActionIcon
                      name="expand"
                      weight="regular"
                      className="intake-group-chevron"
                    />
                  </span>
                </span>
              </button>
            </div>
            <span className="sr-only" role="status">
              {announcement}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
