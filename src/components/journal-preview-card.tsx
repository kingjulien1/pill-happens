"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  CalendarRange,
  Clock3,
  FlaskConical,
  Link2,
} from "lucide-react";
import { MedicationCardBase } from "@/components/medication-card-base";
import { MedicationGlyph } from "@/components/medication-icon";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { JournalPreviewArtwork } from "@/components/journal-preview-artwork";
import { rememberJournalDestination } from "@/components/journal-drafts";
import { formatDay, formatDose, type AppData } from "@/lib/domain";
import { getMedicationColor } from "@/lib/medication-appearance";
import type { JournalLibraryEntry } from "@/lib/journal-library";
import type { JournalPreviewReference } from "@/lib/journal-preview-references";
import styles from "./journal-preview-card.module.css";

const PALETTES = [
  { name: "rose", accent: "#f472b6", complement: "#c4b5fd" },
  { name: "lilac", accent: "#a78bfa", complement: "#f9a8d4" },
  { name: "iris", accent: "#818cf8", complement: "#7dd3fc" },
  { name: "apricot", accent: "#fb923c", complement: "#fda4af" },
  { name: "orchid", accent: "#e879f9", complement: "#a5b4fc" },
  { name: "aqua", accent: "#22d3ee", complement: "#c4b5fd" },
] as const;

/** The page identity gives quiet variety without hydration or edit-time randomness. */
function pagePalette(id: string) {
  let hash = 2166136261;
  for (const character of id)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return PALETTES[(hash >>> 0) % PALETTES.length];
}

function ReferenceChip({
  item,
  data,
}: {
  item: JournalPreviewReference;
  data: AppData;
}) {
  const reference = item.reference;
  let icon: ReactNode;
  let pigment = "var(--journal-complement)";
  let kind: string;
  let detail: string | undefined;
  switch (reference.kind) {
    case "medication": {
      const medication = data.medications.find(
        (value) => value.id === reference.id,
      );
      if (medication) pigment = getMedicationColor(medication.color).hex;
      if (medication) detail = `${formatDose(medication.strengthMg)} mg`;
      icon = (
        <span
          className={styles.medicationGlyph}
          style={{ transform: `rotate(${medication?.iconRotation ?? 0}deg)` }}
        >
          <MedicationGlyph
            icon={medication?.icon}
            className={styles.medicationGlyph}
          />
        </span>
      );
      kind = "Medication";
      break;
    }
    case "ingredient":
      icon = <FlaskConical />;
      kind = "Active ingredient";
      break;
    case "category":
      icon = <MedicationIndicatorMark kind={reference.category} size={18} />;
      kind = "Medication category";
      break;
    case "intake":
      icon = <Clock3 />;
      kind = "Logged intake";
      break;
    case "day":
      icon = <CalendarDays />;
      kind = "Tracking day";
      break;
    case "week":
      icon = <CalendarRange />;
      kind = "Tracking week";
      break;
    case "reflection":
      icon = <BookOpenText />;
      kind = "Journal page";
      break;
  }
  return (
    <a
      href={item.href}
      className={styles.reference}
      data-journal-preview-reference={reference.kind}
      style={{ "--reference-color": pigment } as CSSProperties}
      aria-label={`${kind}: ${item.label}${detail ? `, ${detail}` : ""}`}
      title={`${kind} · ${item.label}${detail ? ` · ${detail}` : ""}`}
      onClick={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.defaultPrevented
        )
          return;
        rememberJournalDestination(item.href.split(/[?#]/u)[0]);
      }}
    >
      <span className={styles.referenceIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.referenceName}>{item.label}</span>
      {detail && <span className={styles.referenceDetail}>{detail}</span>}
    </a>
  );
}

/** Metadata-only preview: written titles and excerpts belong exclusively in the reader. */
export function JournalPreviewCard({
  entry,
  references,
  data,
  readerOpen,
  onRead,
}: {
  entry: JournalLibraryEntry;
  references: readonly JournalPreviewReference[];
  data: AppData;
  readerOpen: boolean;
  onRead: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const palette = pagePalette(entry.id);
  const fullDate = formatDay(entry.day, { year: "numeric" });
  return (
    <MedicationCardBase
      color="lilac"
      className={styles.card}
      leadingArtwork={<JournalPreviewArtwork paused={readerOpen} />}
      background={<span className={styles.background} aria-hidden="true" />}
      style={
        {
          "--journal-accent": palette.accent,
          "--journal-complement": palette.complement,
          "--entry-color": palette.accent,
        } as CSSProperties
      }
      data-card-entry
      data-journal-entry={entry.id}
      data-journal-palette={palette.name}
      data-journal-entry-words={entry.words}
      data-journal-read
      aria-label={`Read journal for ${fullDate}, ${entry.words.toLocaleString("en")} words, ${entry.readingMinutes} minute read`}
      aria-haspopup="dialog"
      onClick={onRead}
      artworkControls={
        references.length ? (
          <div className={styles.references} data-journal-preview-links>
            <div className={styles.referenceHeading}>
              <span>
                <Link2 aria-hidden="true" /> Linked Here
              </span>
              <span>
                <b>{references.length}</b>{" "}
                {references.length === 1 ? "reference" : "references"}
              </span>
            </div>
            <div
              className={styles.referenceRail}
              role="list"
              aria-label={`References from ${fullDate}`}
            >
              {references.map((item) => (
                <span key={item.key} role="listitem">
                  <ReferenceChip item={item} data={data} />
                </span>
              ))}
            </div>
          </div>
        ) : null
      }
    >
      <div className={styles.details}>
        <div className={styles.heading}>
          <time dateTime={entry.day} title={fullDate}>
            {formatDay(entry.day, { weekday: "short", month: "short" })}
          </time>
          <span className={styles.open} aria-hidden="true">
            Read <ArrowUpRight />
          </span>
        </div>
        <div className={styles.metadata}>
          <span>
            <strong>{entry.words.toLocaleString("en")}</strong> words
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <span>{entry.readingMinutes} min read</span>
        </div>
      </div>
    </MedicationCardBase>
  );
}
