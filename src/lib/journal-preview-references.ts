import { DAILY_JOURNAL_MAX_LENGTH } from "@/lib/daily-journal";
import type { Definition, Root, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

import {
  formatDay,
  isValidDayKey,
  shiftDayKey,
  toLocalInput,
  type AppData,
} from "./domain";
import { getMedicationCategory } from "./medication-categories";
import {
  createJournalReferenceCatalog,
  normalizeJournalMentionText,
  parseJournalMentionHref,
  type JournalMentionReference,
  type JournalReferenceCatalog,
} from "./journal-mentions";
import {
  createJournalReferenceAliases,
  remarkJournalReferences,
} from "./journal-reference-markdown";

export type JournalPreviewReference = Readonly<{
  key: string;
  /** Live entity metadata only; an authored link label never becomes a prose excerpt. */
  label: string;
  href: string;
  reference: JournalMentionReference;
}>;

const parser = unified().use(remarkParse).use(remarkGfm);
const skipped = new Set([
  "image",
  "imageReference",
  "code",
  "inlineCode",
  "html",
  "definition",
]);
const shortDate = (day: string) =>
  formatDay(day, { weekday: "short", month: "short" });
const safeLabel = (value: string, fallback: string) => {
  const label = value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const characters = Array.from(label);
  return characters.length
    ? characters.length > 64
      ? `${characters.slice(0, 63).join("")}…`
      : label
    : fallback;
};

/** Alternate local URLs for one entity produce one chip at its first occurrence. */
function referenceKey(reference: JournalMentionReference) {
  switch (reference.kind) {
    case "medication":
      return `medication:${reference.id}`;
    case "ingredient":
      return `ingredient:${normalizeJournalMentionText(reference.ingredient)}`;
    case "category":
      return `category:${reference.category}`;
    case "intake":
      return `intake:${reference.id}`;
    case "day":
      return `day:${reference.day}`;
    case "week":
      return `week:${reference.weekStart}`;
    case "reflection":
      return `reflection:${reference.day}`;
  }
}

function referenceLabel(
  reference: JournalMentionReference,
  catalog: JournalReferenceCatalog,
) {
  switch (reference.kind) {
    case "medication":
      return safeLabel(
        catalog.medications.get(reference.id)?.name ?? "",
        "Medication",
      );
    case "ingredient": {
      const medication = catalog.ingredients.get(
        normalizeJournalMentionText(reference.ingredient),
      )?.[0];
      return safeLabel(medication?.activeIngredient ?? "", "Active Ingredient");
    }
    case "category":
      return getMedicationCategory(reference.category).label;
    case "day":
      return shortDate(reference.day);
    case "week":
      return `${formatDay(reference.weekStart, { weekday: undefined, month: "short" })}–${formatDay(shiftDayKey(reference.weekStart, 6), { weekday: undefined, month: "short" })}`;
    case "reflection":
      return `Journal · ${shortDate(reference.day)}`;
    case "intake": {
      const intake = catalog.intakes.get(reference.id);
      if (!intake) return "Logged Intake";
      const name =
        intake.medicationName ||
        catalog.medications.get(intake.medicationId)?.name;
      let time = "";
      try {
        time = toLocalInput(intake.takenAt, catalog.timezone).slice(11, 16);
      } catch {
        /* Invalid legacy timestamps have no invented clock value. */
      }
      return safeLabel(
        [name, time].filter(Boolean).join(" · "),
        "Logged Intake",
      );
    }
  }
}

/** Reuse this factory for a list: aliases and live catalog are built just once. */
export function createJournalPreviewReferenceExtractor(
  data: AppData | null,
  today?: string,
) {
  const aliases = createJournalReferenceAliases(data);
  // A supplied day makes the catalog deterministic; no system clock is read.
  const catalog = createJournalReferenceCatalog(
    data,
    isValidDayKey(today ?? "") ? today : "2000-01-01",
  );
  return (value: string, day: string): readonly JournalPreviewReference[] => {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > DAILY_JOURNAL_MAX_LENGTH ||
      !isValidDayKey(day)
    )
      return [];
    const tree = parser.parse(value) as Root;
    const definitions = new Map<string, Definition>();
    const collectDefinitions = (node: Root | RootContent) => {
      if (node.type === "definition" && !definitions.has(node.identifier))
        definitions.set(node.identifier, node);
      if ("children" in node)
        for (const child of node.children) collectDefinitions(child);
    };
    collectDefinitions(tree);
    // This is the reader's exact render-only transformer, including escaped/entity
    // shielding, explicit-strength ambiguity rules and entry-relative calendars.
    remarkJournalReferences({
      aliases,
      today: isValidDayKey(today ?? "") ? today! : day,
      referenceDay: day,
    })(tree, { value });
    const seen = new Set<string>(),
      result: JournalPreviewReference[] = [];
    const add = (href: string) => {
      const reference = parseJournalMentionHref(href);
      if (!reference) return;
      const key = referenceKey(reference);
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        key,
        label: referenceLabel(reference, catalog),
        href,
        reference,
      });
    };
    const visit = (node: Root | RootContent) => {
      if (skipped.has(node.type)) return;
      if (node.type === "link") {
        add(node.url);
        return;
      }
      if (node.type === "linkReference") {
        const definition = definitions.get(node.identifier);
        if (definition) add(definition.url);
        return;
      }
      if ("children" in node) for (const child of node.children) visit(child);
    };
    visit(tree);
    return result;
  };
}

/** A source-derived reference index; no journal title, excerpt, or bare-prose lookup. */
export function journalPreviewReferences({
  value,
  day,
  data,
  today,
}: {
  value: string;
  day: string;
  data: AppData | null;
  today?: string;
}): readonly JournalPreviewReference[] {
  return createJournalPreviewReferenceExtractor(data, today)(value, day);
}
