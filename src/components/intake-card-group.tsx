"use client";

import {
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

function StackSlot({
  entry,
  medication,
  index,
  depth,
  collapsed,
  day,
  timeZone,
  onEdit,
}: {
  entry: Intake;
  medication?: Medication;
  index: number;
  depth: number;
  collapsed: boolean;
  day: string;
  timeZone: string;
  onEdit: () => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = measure.current;
    if (!content) return;
    // Measure layout height, not the animated transform. Notes and wrapping
    // metadata may make each card a different height, even within one stack.
    const updateHeight = () => {
      slot.current?.style.setProperty(
        "--stack-card-height",
        `${content.offsetHeight}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={slot}
      className="intake-stack-slot"
      role="listitem"
      data-stack-rear={depth > 0}
      data-stack-collapsed={collapsed && depth > 0}
      style={
        {
          "--stack-inset": `${Math.min(depth, 4)}%`,
          "--stack-order": index,
        } as CSSProperties
      }
    >
      <div ref={measure} className="intake-stack-measure">
        <IntakeCard
          entry={entry}
          medication={medication}
          index={index}
          day={day}
          timeZone={timeZone}
          disabled={collapsed}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
}

export function IntakeCardGroup({
  group,
  medications,
  startIndex,
  day,
  timeZone,
  onEdit,
}: {
  group: IntakeGroup;
  medications: Medication[];
  startIndex: number;
  day: string;
  timeZone: string;
  onEdit: (entry: Intake) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cardsId = useId();
  const cards = useRef<HTMLDivElement>(null);
  const grouped = group.entries.length > 1;
  const collapsed = grouped && !expanded;
  const count = group.entries.length;

  return (
    <div
      className="intake-group"
      data-intake-group={group.id}
      data-group-size={count}
      data-expanded={!collapsed}
    >
      <div
        id={cardsId}
        ref={cards}
        className="intake-group-cards"
        role="list"
        aria-label="Intake entries"
        inert={collapsed}
        aria-hidden={collapsed || undefined}
      >
        {group.entries.map((entry, depth) => (
          <StackSlot
            key={entry.id}
            entry={entry}
            medication={medications.find(
              (item) => item.id === entry.medicationId,
            )}
            index={startIndex + depth}
            depth={depth}
            collapsed={collapsed}
            day={day}
            timeZone={timeZone}
            onEdit={() => onEdit(entry)}
          />
        ))}
      </div>
      {grouped && (
        <button
          type="button"
          className="intake-group-toggle"
          aria-expanded={!collapsed}
          aria-controls={cardsId}
          aria-label={
            collapsed
              ? `Show ${count} entries recorded together, starting with ${group.entries[0].medicationName}`
              : `Collapse ${count} entries recorded together`
          }
          onClick={(event) => {
            setExpanded(collapsed);
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
                {collapsed ? "Saved Together" : "Collapse"}
              </span>
            </span>
            <ActionIcon name="expand" className="intake-group-chevron" />
          </span>
        </button>
      )}
    </div>
  );
}
