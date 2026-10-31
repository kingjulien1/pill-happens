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
import { IntakeCard } from "@/components/intake-card";
import { usePersistentIntakeStackView } from "@/components/journal-drafts";
import { toLocalInput, type Intake, type Medication } from "@/lib/domain";
import type { IntakeGroup } from "@/lib/intake-groups";
import { getMedicationClasses } from "@/lib/medication-classification";
import {
  EMPTY_INTAKE_STACK_VIEW,
  foldIntakeStackSteps,
  layoutIntakeStacks,
  normalizeIntakeStackView,
  promoteIntakeStack,
  showIntakeStackChildren,
  type IntakeStackFace,
  type IntakeStackStage,
  type IntakeStackStep,
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
  pending: IntakeStackStep[];
  moving: boolean;
  folding: boolean;
  serial: number;
  phase: number;
  triggerId?: string;
};

function initialDisplay(view = EMPTY_INTAKE_STACK_VIEW): StackDisplay {
  return {
    view,
    from: view,
    stage: "idle",
    pending: [],
    moving: false,
    folding: false,
    serial: 0,
    phase: 0,
  };
}

function settleDisplay(current: StackDisplay): StackDisplay {
  const view = current.pending.at(-1)?.view ?? current.view;
  return {
    ...current,
    view,
    from: view,
    pending: [],
    moving: false,
    folding: false,
    stage: "idle",
    phase: 0,
    serial: current.serial + 1,
  };
}

function StackSlot({
  entry,
  medication,
  face,
  day,
  timeZone,
  controls,
  onActivate,
  onNaturalHeight,
}: {
  entry: Intake;
  medication?: Medication;
  face: IntakeStackFace;
  day: string;
  timeZone: string;
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
            face.head
              ? undefined
              : `Open a stack starting with ${entry.medicationName} at ${time}`
          }
          controls={face.head ? undefined : controls}
          expanded={face.head ? undefined : false}
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
    triggerId: display.triggerId,
  });
  const count = group.entries.length;
  const grouped = count > 1;
  const open = view.heads.length > 1 || view.expanded.length > 0;
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
          if (reduced || document.hidden) return settleDisplay(current);
          const [next, ...pending] = current.pending;
          if (!next) return settleDisplay(current);
          return {
            ...current,
            from: current.view,
            view: next.view,
            stage: next.stage,
            pending,
            serial: current.serial + 1,
            phase: current.phase + 1,
          };
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

  const activate = (entry: Intake, face: IntakeStackFace) => {
    if (face.head) {
      // Keep the selected full head in place while its editor owns focus.
      setDisplay((current) =>
        current.moving
          ? {
              ...current,
              view,
              from: view,
              pending: [],
              moving: false,
              folding: false,
              stage: "idle",
              phase: 0,
              serial: current.serial + 1,
            }
          : current,
      );
      if (display.moving) remembered.saveView(view);
      onEdit(entry);
      return;
    }
    const from = view;
    const target = promoteIntakeStack(group.entries, from, entry.id);
    setDisplay((current) => {
      return {
        view: target,
        from,
        stage: reduced ? "idle" : "open",
        pending: [],
        moving: !reduced,
        folding: false,
        serial: current.serial + 1,
        phase: reduced ? 0 : 1,
        triggerId: entry.id,
      };
    });
    remembered.saveView(target);
    setAnnouncement(
      `Stack opened at ${toLocalInput(entry.takenAt, timeZone).slice(11)}. Press the card again to edit.`,
    );
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
      className="intake-group"
      data-intake-group={group.id}
      data-group-size={count}
      data-expanded={open}
      data-stack-moving={display.moving}
      data-stack-head-count={view.heads.length}
      data-stack-folding={display.folding}
      data-stack-stage={display.stage}
      data-stack-phase={display.phase}
      data-contains-benzodiazepine={
        classes.includes("benzodiazepine") || undefined
      }
      data-contains-opioid={classes.includes("opioid") || undefined}
    >
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
              controls={cardsId}
              onActivate={() => activate(entry, face)}
              onNaturalHeight={onNaturalHeight}
            />
          );
        })}
      </div>
      {grouped && (
        <>
          <button
            type="button"
            className="intake-group-toggle"
            aria-expanded={open}
            aria-controls={cardsId}
            aria-label={`${open && !display.folding ? "Fold" : "Show"} ${count} intakes grouped by consecutive gaps of 13 minutes or less${classificationContext}`}
            onClick={(event) => {
              const showing = display.folding || !open;
              const from = view;
              const steps = showing
                ? []
                : foldIntakeStackSteps(group.entries, from);
              const target = showing
                ? showIntakeStackChildren(group.entries, from)
                : (steps.at(-1)?.view ?? from);
              setDisplay((current) => {
                if (showing) {
                  return {
                    view: target,
                    from,
                    stage: reduced ? "idle" : "open",
                    pending: [],
                    moving: !reduced,
                    folding: false,
                    serial: current.serial + 1,
                    phase: reduced ? 0 : 1,
                  };
                }
                const [first, ...pending] = steps;
                if (!first) return settleDisplay(current);
                if (reduced) {
                  const final = steps.at(-1)!;
                  return {
                    ...current,
                    view: final.view,
                    from: final.view,
                    stage: "idle",
                    pending: [],
                    moving: false,
                    folding: false,
                    serial: current.serial + 1,
                    phase: 0,
                  };
                }
                return {
                  view: first.view,
                  from,
                  stage: first.stage,
                  pending,
                  moving: true,
                  folding: true,
                  serial: current.serial + 1,
                  phase: 1,
                };
              });
              // Queue local motion first, then synchronously save final intent.
              // A reload never resumes an intermediate frame or a fold timer.
              remembered.saveView(target);
              setAnnouncement(
                showing
                  ? `${count} intakes shown. Select a row to make it a stack head.`
                  : `${count} intakes folding back into one stack.`,
              );
              if (showing && event.detail === 0) {
                requestAnimationFrame(() => {
                  cards.current
                    ?.querySelector<HTMLButtonElement>("[data-intake-card]")
                    ?.focus({ preventScroll: true });
                });
              }
            }}
          >
            <span className="intake-group-label">
              <span>
                {open && !display.folding ? "Fold" : "Show"}{" "}
                <strong>{count}</strong> intakes
              </span>
              <span className="intake-group-chevron-frame" aria-hidden="true">
                <ActionIcon
                  name="expand"
                  weight="regular"
                  className="intake-group-chevron"
                />
              </span>
            </span>
          </button>
          <span className="sr-only" role="status">
            {announcement}
          </span>
        </>
      )}
    </div>
  );
}
