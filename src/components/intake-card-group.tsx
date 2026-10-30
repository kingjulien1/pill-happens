"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ActionIcon } from "@/components/action-icon";
import { IntakeCard } from "@/components/intake-card";
import type { Intake, Medication } from "@/lib/domain";
import type { IntakeGroup } from "@/lib/intake-groups";

function StackSlot({
  entry,
  medication,
  depth,
  collapsed,
  day,
  timeZone,
  onEdit,
}: {
  entry: Intake;
  medication?: Medication;
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
    // Notes and wrapping metadata can make cards different heights, even
    // within one stack. Measure each one for instant, unclipped disclosure.
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
    >
      <div
        ref={measure}
        className="intake-stack-measure"
        data-intake-entrance={entry.id}
        data-entrance-exposed={!collapsed || depth === 0}
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
  const cardsId = useId();
  const cards = useRef<HTMLDivElement>(null);
  const grouped = group.entries.length > 1;
  const collapsed = grouped && !expanded;
  const count = group.entries.length;
  const containsBenzodiazepine = group.entries.some((entry) =>
    medications.some(
      (medication) =>
        medication.id === entry.medicationId &&
        medication.isBenzodiazepine === true,
    ),
  );
  const classificationContext = containsBenzodiazepine
    ? ", includes a medication marked as a benzodiazepine"
    : "";

  return (
    <div
      className="intake-group"
      data-intake-group={group.id}
      data-group-size={count}
      data-expanded={!collapsed}
      data-contains-benzodiazepine={containsBenzodiazepine || undefined}
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
          aria-label={`${
            collapsed
              ? `Show ${count} intakes grouped by consecutive gaps of 13 minutes or less, starting with ${group.entries[0].medicationName}`
              : `Collapse ${count} intakes taken together`
          }${classificationContext}`}
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
