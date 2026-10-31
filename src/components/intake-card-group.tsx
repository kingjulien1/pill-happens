"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ActionIcon } from "@/components/action-icon";
import { IntakeCard } from "@/components/intake-card";
import type { Intake, Medication } from "@/lib/domain";
import type { IntakeGroup } from "@/lib/intake-groups";
import { getMedicationClasses } from "@/lib/medication-classification";

function stackLayout(
  entries: readonly Intake[],
  heights: Readonly<Record<string, number>>,
  collapsed: boolean,
) {
  const count = entries.length;
  const frontHeight = heights[entries[0].id] ?? 80;
  const openStep = Math.min(55, 330 / Math.max(count - 1, 1));
  const closeStep = Math.min(45, 270 / Math.max(count - 2, 1));
  const maxDelay = collapsed
    ? Math.max(count - 2, 0) * closeStep
    : (count - 1) * openStep;
  const layoutDuration = 420 + maxDelay;
  let expandedHeight = 0;
  let foldedBottom = frontHeight;
  const layouts: CSSProperties[] = [];
  for (const [depth, entry] of entries.entries()) {
    const naturalHeight = heights[entry.id] ?? 80;
    const expandedY = expandedHeight;
    expandedHeight += naturalHeight + (depth < count - 1 ? 8 : 0);
    const previewDepth = Math.min(depth, 6);
    const scale = collapsed ? 1 - previewDepth * 0.008 : 1;
    // Overlap complete, naturally sized cards. Reserve each real lower edge,
    // with enough reveal for the ordinary rounded corners to turn fully.
    if (depth > 0 && depth <= 6)
      foldedBottom = Math.max(foldedBottom + 24, naturalHeight * scale);
    const y = collapsed
      ? Math.max(0, foldedBottom - naturalHeight * scale)
      : expandedY;
    const delay =
      depth === 0
        ? 0
        : collapsed
          ? (count - 1 - depth) * closeStep
          : depth * openStep;
    layouts.push({
      "--stack-y": `${y}px`,
      "--stack-scale": scale,
      "--stack-face-height": `${naturalHeight}px`,
      "--stack-delay": `${delay}ms`,
      "--stack-layer": count - depth,
    } as CSSProperties);
  }
  const cardsHeight = collapsed ? foldedBottom : expandedHeight;
  return { layouts, cardsHeight, layoutDuration };
}

function StackSlot({
  entry,
  medication,
  depth,
  collapsed,
  day,
  timeZone,
  onEdit,
  layout,
  onNaturalHeight,
}: {
  entry: Intake;
  medication?: Medication;
  depth: number;
  collapsed: boolean;
  day: string;
  timeZone: string;
  onEdit: () => void;
  layout: CSSProperties;
  onNaturalHeight: (id: string, height: number) => void;
}) {
  const measure = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = measure.current?.querySelector<HTMLElement>(
      ".intake-card-content",
    );
    if (!content) return;
    // Measure unscaled content so every face keeps its natural dimensions as
    // notes wrap, medication details change, or the stack opens and closes.
    const updateHeight = () => {
      onNaturalHeight(entry.id, content.offsetHeight);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [entry.id, onNaturalHeight]);

  return (
    <div
      className="intake-stack-slot"
      role="listitem"
      data-stack-depth={depth}
      data-stack-rear={depth > 0}
      data-stack-collapsed={collapsed && depth > 0}
      data-stack-hidden={collapsed && depth > 6}
      style={layout}
    >
      <div
        ref={measure}
        className="intake-stack-measure"
        data-intake-entrance={entry.id}
        data-entrance-exposed={!collapsed || depth === 0}
        data-entrance-preview={collapsed && depth > 0 && depth <= 6}
      >
        <IntakeCard
          entry={entry}
          medication={medication}
          day={day}
          timeZone={timeZone}
          disabled={collapsed}
          shineEligible={!collapsed || depth === 0}
          onEdit={onEdit}
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
  const [expanded, setExpanded] = useState(false);
  const [moving, setMoving] = useState(false);
  const [naturalHeights, setNaturalHeights] = useState<Record<string, number>>(
    {},
  );
  const cardsId = useId();
  const cards = useRef<HTMLDivElement>(null);
  const grouped = group.entries.length > 1;
  const collapsed = grouped && !expanded;
  const count = group.entries.length;
  const { layouts, cardsHeight, layoutDuration } = stackLayout(
    group.entries,
    naturalHeights,
    collapsed,
  );
  const onNaturalHeight = useCallback((id: string, height: number) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setNaturalHeights((previous) =>
      previous[id] === height ? previous : { ...previous, [id]: height },
    );
  }, []);

  useEffect(() => {
    if (!moving) return;
    // Keep delayed children moving through rapid reversals. A container's
    // shortened reversal can finish before the last card's delayed movement.
    const timer = setTimeout(() => setMoving(false), layoutDuration + 100);
    return () => clearTimeout(timer);
  }, [collapsed, layoutDuration, moving]);
  const containsBenzodiazepine = group.entries.some((entry) =>
    medications.some(
      (medication) =>
        medication.id === entry.medicationId &&
        medication.isBenzodiazepine === true,
    ),
  );
  const containsOpioid = group.entries.some((entry) =>
    medications.some(
      (medication) =>
        medication.id === entry.medicationId && medication.isOpioid === true,
    ),
  );
  const classes = getMedicationClasses({
    isBenzodiazepine: containsBenzodiazepine,
    isOpioid: containsOpioid,
  });
  const classificationContext = classes.length
    ? `, includes medications marked as ${classes.join(" and ")}`
    : "";

  return (
    <div
      className="intake-group"
      data-intake-group={group.id}
      data-group-size={count}
      data-expanded={!collapsed}
      data-stack-moving={moving}
      data-contains-benzodiazepine={containsBenzodiazepine || undefined}
      data-contains-opioid={containsOpioid || undefined}
    >
      <div
        id={cardsId}
        ref={cards}
        className="intake-group-cards"
        role="list"
        aria-label="Intake entries"
        inert={collapsed}
        aria-hidden={collapsed || undefined}
        style={
          {
            height: `${cardsHeight}px`,
            "--stack-layout-duration": `${layoutDuration}ms`,
          } as CSSProperties
        }
      >
        {group.entries.map((entry, depth) => (
          <StackSlot
            key={entry.id}
            entry={entry}
            medication={medications.find(
              (item) => item.id === entry.medicationId,
            )}
            depth={depth}
            collapsed={collapsed}
            day={day}
            timeZone={timeZone}
            onEdit={() => onEdit(entry)}
            layout={layouts[depth]}
            onNaturalHeight={onNaturalHeight}
          />
        ))}
      </div>
      {grouped && (
        <button
          type="button"
          className="intake-group-toggle"
          aria-expanded={!collapsed}
          aria-controls={cardsId}
          aria-label={`${
            collapsed
              ? `Show ${count} intakes grouped by consecutive gaps of 13 minutes or less, starting with ${group.entries[0].medicationName}`
              : `Collapse ${count} intakes taken together`
          }${classificationContext}`}
          onClick={(event) => {
            setMoving(true);
            setExpanded((value) => !value);
            // Keyboard users can enter the newly disclosed list immediately.
            // Pointer users keep the first tap solely as a disclosure action.
            if (collapsed && event.detail === 0) {
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
              <strong>{count}</strong> Entries
              <span className="intake-group-context">
                {" / "}
                {collapsed ? "Taken Together" : "Collapse"}
              </span>
            </span>
            <ActionIcon name="expand" className="intake-group-chevron" />
          </span>
        </button>
      )}
    </div>
  );
}
