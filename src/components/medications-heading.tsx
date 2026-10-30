"use client";

import { FirstAidKitIcon } from "@phosphor-icons/react/dist/ssr/FirstAidKit";
import { StackIcon } from "@phosphor-icons/react/dist/ssr/Stack";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/ssr/FolderOpen";
import { FolderSimpleIcon } from "@phosphor-icons/react/dist/ssr/FolderSimple";
import { ActionIcon } from "@/components/action-icon";
import { Toggle } from "@/components/ui/toggle";
import { getMedicationColor } from "@/lib/medication-appearance";
import type { Medication } from "@/lib/domain";

export function MedicationsHeading({
  medications,
}: {
  medications: Medication[];
}) {
  const activeCount = medications.filter(
    (medication) => !medication.archived,
  ).length;

  return (
    <header className="canvas-copy mb-6" data-medications-heading>
      <div
        className="flex min-w-0 items-center justify-between gap-2 sm:gap-3"
        data-medications-title-row
      >
        <div className="flex min-w-0 items-center gap-2">
          <FirstAidKitIcon
            weight="bold"
            aria-hidden="true"
            focusable="false"
            className="size-[22px] shrink-0 text-foreground"
          />
          <h1 className="medications-page-title">Medications</h1>
          <span className="medications-heading-context inline-flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span aria-hidden="true">·</span>
            Kit
          </span>
        </div>
        <span
          className="medications-total"
          aria-label={`${medications.length} saved ${medications.length === 1 ? "medication" : "medications"}, ${activeCount} active`}
          role="img"
          data-medications-total
        >
          <span aria-hidden="true" className="medications-total-art">
            <StackIcon
              focusable="false"
              weight="bold"
              className="size-4 shrink-0"
            />
            {medications.length > 0 && (
              <span className="medications-total-palette">
                {medications.slice(0, 3).map((medication) => (
                  <span
                    key={medication.id}
                    style={{
                      backgroundColor: getMedicationColor(medication.color).hex,
                    }}
                  />
                ))}
              </span>
            )}
          </span>
          <span aria-hidden="true" className="medications-total-copy">
            <span className="medications-total-saved">
              <strong>{medications.length}</strong> Saved
            </span>
            <span className="medications-total-active">
              <strong>{activeCount}</strong> Active
            </span>
          </span>
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Keep names, strengths, and familiar symbols together. Your defaults make
        each intake quicker to log.
      </p>
    </header>
  );
}

export function MedicationListHeading({
  archived,
  count,
  onArchivedChange,
}: {
  archived: boolean;
  count: number;
  onArchivedChange: (archived: boolean) => void;
}) {
  return (
    <div
      className="canvas-copy mb-4 flex min-w-0 items-center justify-between gap-3"
      data-medications-list-heading
    >
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        <ActionIcon
          name={archived ? "archive" : "sparkle"}
          className="size-4"
        />
        <h2 className="text-sm font-medium">
          {archived ? "Archived" : "Active"}
        </h2>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{count}</span>
          <span className="hidden min-[360px]:inline">
            {count === 1 ? "medication" : "medications"}
          </span>
        </span>
      </div>
      <span className="sr-only" role="status">
        {count} {archived ? "archived" : "active"}{" "}
        {count === 1 ? "medication" : "medications"}.
      </span>
      <Toggle
        pressed={archived}
        onPressedChange={onArchivedChange}
        aria-label="Active / Archive Medications"
        aria-description="Switch between active and archived medication lists. Pressed shows the archive."
        aria-controls="medication-library-list"
        className="medication-archive-toggle h-11 shrink-0 rounded-xl p-0"
        data-medications-filter
      >
        <span aria-hidden="true" className="medication-archive-face">
          <span className="medication-archive-icons">
            <FolderOpenIcon weight="bold" className="medication-archive-open" />
            <FolderSimpleIcon
              weight="bold"
              className="medication-archive-closed"
            />
          </span>
          <span className="medication-archive-labels">
            <span className="medication-archive-active">Active</span>
            <span className="medication-archive-archived">Archive</span>
          </span>
          <span className="medication-archive-indicator" />
        </span>
      </Toggle>
    </div>
  );
}
