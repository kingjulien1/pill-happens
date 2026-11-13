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
import { JOURNAL_REFERENCE_REVEAL_EVENT } from "@/lib/journal-reference-navigation";
import { useIntakeGroupSurface } from "@/components/use-intake-group-surface";
import { IntakeCard } from "@/components/intake-card";
import { settleIntakeGroupEntrance } from "@/components/intake-timeline-entrance";
import { useIntakeStackGroupControl } from "@/components/intake-stack-controller";
import { usePersistentIntakeStackView } from "@/components/journal-drafts";
import { toLocalInput, type Intake, type Medication } from "@/lib/domain";
import type { IntakeGroup } from "@/lib/intake-groups";
import { getIntakeGroupGradient } from "@/lib/intake-group-palette";
import { getMedicationClasses } from "@/lib/medication-classification";
import entranceStyles from "@/components/intake-group-entrance.module.css";
import spacingStyles from "@/components/intake-group-spacing.module.css";
import {
  EMPTY_INTAKE_STACK_VIEW,
  INTAKE_GROUP_SPACING_PX,
  foldIntakeStack,
  layoutIntakeStacks,
  normalizeIntakeStackView,
  showIntakeStackChildren,
  type IntakeStackFace,
  type IntakeStackStage,
  type IntakeStackView,
} from "@/lib/intake-stack-layout";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const reducedServerSnapshot = () => true;

type StackDisplay = {
  view: IntakeStackView;
  from: IntakeStackView;
  stage: IntakeStackStage;
  moving: boolean;
  serial: number;
};

function initialDisplay(view = EMPTY_INTAKE_STACK_VIEW): StackDisplay {
  return {
    view,
    from: view,
    stage: "idle",
    moving: false,
    serial: 0,
  };
}

function settleDisplay(current: StackDisplay): StackDisplay {
  const view = current.view;
  return {
    ...current,
    view,
    from: view,
    moving: false,
    stage: "idle",
    serial: current.serial + 1,
  };
}

function StackSlot({
  entry,
  medication,
  face,
  day,
  timeZone,
  collapsed,
  count,
  controls,
  onActivate,
  onNaturalHeight,
}: {
  entry: Intake;
  medication?: Medication;
  face: IntakeStackFace;
  day: string;
  timeZone: string;
  collapsed: boolean;
  count: number;
  controls: string;
  onActivate: () => void;
  onNaturalHeight: (id: string, height: number) => void;
}) {
  const measure = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const content = measure.current?.querySelector<HTMLElement>(
      ".intake-card-content",
    );
    if (!content) return;
    const updateHeight = () => onNaturalHeight(entry.id, content.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [entry.id, onNaturalHeight]);

  const exposed = face.head || face.expanded;
  const time = toLocalInput(entry.takenAt, timeZone).slice(11);
  return (
    <div
      className="intake-stack-slot"
      role="listitem"
      data-stack-depth={face.depth}
      data-stack-order={face.order}
      data-stack-head={face.head}
      data-stack-head-id={face.headId}
      data-stack-rear={!face.head}
      data-stack-collapsed={!face.expanded && !face.head}
      data-stack-hidden={face.hidden}
      aria-hidden={face.hidden || undefined}
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
      <div
        ref={measure}
        className="intake-stack-measure"
        data-intake-entrance={entry.id}
        data-entrance-parent={face.headId}
        data-entrance-exposed={exposed}
        data-entrance-preview={!exposed && !face.hidden}
      >
        <IntakeCard
          entry={entry}
          medication={medication}
          day={day}
          timeZone={timeZone}
          disabled={face.hidden}
          shineEligible={exposed}
          onEdit={onActivate}
          actionLabel={
            collapsed
              ? `Reveal all ${count} intakes in this group; ${entry.medicationName} at ${time}`
              : undefined
          }
          controls={collapsed ? controls : undefined}
          expanded={collapsed ? false : undefined}
        />
      </div>
    </div>
  );
}

export function IntakeCardGroup({
  group,
  medications,
  day,
  timeZone,
  onEdit,
}: {
  group: IntakeGroup;
  medications: Medication[];
  day: string;
  timeZone: string;
  onEdit: (entry: Intake) => void;
}) {
  const remembered = usePersistentIntakeStackView(day, group.entries);
  const [display, setDisplay] = useState(() => initialDisplay(remembered.view));
  const [announcement, setAnnouncement] = useState("");
  const [naturalHeights, setNaturalHeights] = useState<Record<string, number>>(
    {},
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    reducedSnapshot,
    reducedServerSnapshot,
  );
  const cardsId = useId();
  const cards = useRef<HTMLDivElement>(null);
  const view = normalizeIntakeStackView(
    group.entries,
    display.moving ? display.view : remembered.view,
  );
  const layout = layoutIntakeStacks({
    entries: group.entries,
    heights: naturalHeights,
    view,
    from: display.from,
    stage: display.moving ? display.stage : "idle",
  });
  const count = group.entries.length;
  const grouped = count > 1;
  const open = view.expanded.length > 0;
  const collapsed = grouped && !open;
  const { groupRef, labelRef } = useIntakeGroupSurface(grouped);
  const onNaturalHeight = useCallback((id: string, height: number) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setNaturalHeights((previous) =>
      previous[id] === height ? previous : { ...previous, [id]: height },
    );
  }, []);

  useEffect(() => {
    if (!display.moving) return;
    const serial = display.serial;
    const timer = setTimeout(
      () => {
        setDisplay((current) => {
          if (current.serial !== serial) return current;
          return settleDisplay(current);
        });
      },
      reduced ? 0 : layout.duration + 60,
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

  const applyOpen = (showing: boolean, bulk: boolean) => {
    if (cards.current) settleIntakeGroupEntrance(cards.current);
    const from = view;
    const target = showing
      ? showIntakeStackChildren(group.entries, from)
      : foldIntakeStack(group.entries, from);
    setDisplay((current) => ({
      view: target,
      from: reduced ? target : from,
      stage: reduced ? "idle" : showing ? "open" : "close",
      moving: !reduced,
      serial: current.serial + 1,
    }));
    // Store final intent immediately, without saving animation frames or timers.
    remembered.saveView(target);
    if (!bulk)
      setAnnouncement(
        showing
          ? `All ${count} intakes shown. Select an intake to edit.`
          : `${count} intakes folded together.`,
      );
  };
  const changeOpen = useIntakeStackGroupControl({
    day,
    id: group.id,
    controls: cardsId,
    enabled: grouped,
    open,
    onChange: applyOpen,
  });

  useEffect(() => {
    const revealReference = (event: Event) => {
      if (!(event instanceof CustomEvent) || !grouped || open) return;
      const id = event.detail?.id;
      if (
        typeof id === "string" &&
        group.entries.some((entry) => entry.id === id)
      )
        changeOpen(true);
    };
    document.addEventListener(JOURNAL_REFERENCE_REVEAL_EVENT, revealReference);
    return () =>
      document.removeEventListener(
        JOURNAL_REFERENCE_REVEAL_EVENT,
        revealReference,
      );
  }, [group.entries, grouped, open, changeOpen]);

  const activate = (entry: Intake) => {
    if (collapsed) {
      changeOpen(true);
      return;
    }
    setDisplay((current) =>
      current.moving ? settleDisplay(current) : current,
    );
    onEdit(entry);
  };

  const classes = getMedicationClasses({
    isBenzodiazepine: group.entries.some((entry) =>
      medications.some(
        (medication) =>
          medication.id === entry.medicationId &&
          medication.isBenzodiazepine === true,
      ),
    ),
    isOpioid: group.entries.some((entry) =>
      medications.some(
        (medication) =>
          medication.id === entry.medicationId && medication.isOpioid === true,
      ),
    ),
  });
  const classificationContext = classes.length
    ? `, includes medications marked as ${classes.join(" and ")}`
    : "";

  return (
    <div
      ref={groupRef}
      className={`intake-group ${entranceStyles.group} ${spacingStyles.base} ${spacingStyles.group}`}
      style={
        grouped
          ? ({
              "--intake-group-space": `${INTAKE_GROUP_SPACING_PX}px`,
              "--intake-group-gradient": getIntakeGroupGradient(
                group.entries,
                medications,
              ),
            } as CSSProperties)
          : undefined
      }
      onClick={(event) => {
        const target = event.target;
        if (
          collapsed &&
          target instanceof Element &&
          !target.closest("button, a, input, select, textarea, [role=button]")
        )
          changeOpen(true);
      }}
      data-intake-group={group.id}
      data-group-size={count}
      data-grouped={grouped}
      data-group-entry-state={grouped ? "pending" : undefined}
      data-expanded={open}
      data-stack-moving={display.moving}
      data-stack-head-count={view.heads.length}
      data-stack-folding={display.moving && display.stage === "close"}
      data-stack-stage={display.stage}
      data-contains-benzodiazepine={
        classes.includes("benzodiazepine") || undefined
      }
      data-contains-opioid={classes.includes("opioid") || undefined}
    >
      {grouped && (
        <div
          className={`intake-group-glass ${entranceStyles.surface}`}
          aria-hidden="true"
        >
          <div className="intake-group-blur" />
          <div className="intake-group-gradient" />
        </div>
      )}
      <div
        id={cardsId}
        ref={cards}
        className="intake-group-cards"
        role="list"
        aria-label="Intake entries"
        style={
          {
            height: `${layout.height}px`,
            "--stack-layout-duration": `${layout.duration}ms`,
            "--stack-height-delay": `${layout.heightDelay}ms`,
            "--stack-height-duration": `${layout.heightDuration}ms`,
          } as CSSProperties
        }
      >
        {group.entries.map((entry, index) => {
          const face = layout.frames[index];
          return (
            <StackSlot
              key={entry.id}
              entry={entry}
              medication={medications.find(
                (item) => item.id === entry.medicationId,
              )}
              face={face}
              day={day}
              timeZone={timeZone}
              collapsed={collapsed}
              count={count}
              controls={cardsId}
              onActivate={() => activate(entry)}
              onNaturalHeight={onNaturalHeight}
            />
          );
        })}
      </div>
      {grouped && (
        <>
          <div
            className={`intake-group-footer ${entranceStyles.control}`}
            data-intake-group-entrance-part="control"
          >
            <button
              type="button"
              className="intake-group-toggle"
              aria-expanded={open}
              aria-controls={cardsId}
              aria-label={`${open ? "Collapse" : "Reveal"} ${count} intakes grouped by consecutive gaps of 13 minutes or less${classificationContext}`}
              onClick={(event) => {
                const showing = !open;
                changeOpen(showing);
                if (showing && event.detail === 0) {
                  requestAnimationFrame(() => {
                    cards.current
                      ?.querySelector<HTMLButtonElement>(
                        "[data-intake-card-action]",
                      )
                      ?.focus({ preventScroll: true });
                  });
                }
              }}
            >
              <span ref={labelRef} className="intake-group-label">
                <span className="intake-group-control-paint" aria-hidden="true">
                  <span className="intake-group-blur" />
                </span>
                <span
                  className={`intake-group-chevron-frame ${entranceStyles.chevron}`}
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
                  <span>intakes</span>
                </span>
                <span
                  className={`intake-group-chevron-frame ${entranceStyles.chevron}`}
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
  );
}
