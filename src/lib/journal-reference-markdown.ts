import type { Root, RootContent, Text } from "mdast";
import { formatDose, type AppData } from "./domain";
import { MEDICATION_CATEGORIES } from "./medication-categories";
import {
  normalizeJournalMentionText,
  parseJournalCalendarReference,
  journalCalendarHref,
  parseJournalMentionHref,
} from "./journal-mentions";

export type TypedJournalReference = {
  start: number;
  end: number;
  label: string;
  href: string;
};
export type JournalReferenceAliases = Map<string, Set<string>>;

/** Build once per hydrated library, including archived records and explicit strengths. */
export function createJournalReferenceAliases(data: AppData | null) {
  const aliases: JournalReferenceAliases = new Map();
  const add = (label: string, href: string) => {
    const key = normalizeJournalMentionText(label);
    if (!key || key.length > 160 || !parseJournalMentionHref(href)) return;
    const destinations = aliases.get(key) ?? new Set<string>();
    destinations.add(href);
    aliases.set(key, destinations);
  };
  // Ingredient aliases share one canonical destination even when case differs.
  const ingredients = new Map<string, string>();
  for (const medication of data?.medications ?? []) {
    const href = `/medications?${new URLSearchParams({ medication: medication.id })}`;
    add(medication.name, href);
    const strength = `${formatDose(medication.strengthMg)} mg`;
    add(`${medication.name} ${strength}`, href);
    add(`${medication.name} · ${strength}`, href);
    add(`${medication.name} ${strength.replace(" ", "")}`, href);
    const ingredient = medication.activeIngredient?.trim();
    if (ingredient) {
      const key = normalizeJournalMentionText(ingredient);
      if (!ingredients.has(key)) ingredients.set(key, ingredient);
    }
  }
  for (const ingredient of ingredients.values())
    add(ingredient, `/medications?${new URLSearchParams({ ingredient })}`);
  for (const category of MEDICATION_CATEGORIES) {
    const href = `/medications/categories/${category.value}`;
    for (const label of [
      category.value,
      category.label,
      category.shortLabel,
      ...category.aliases,
    ])
      add(label, href);
  }
  return aliases;
}

const startBoundary = /[\s([{"'“‘>*_~\p{Ps}\p{Pi}]/u;
const endBoundary = /[\s,.;:!?)}\]"'”’\p{Pe}\p{Pf}]/u;

/** Exact names only: ambiguous longer aliases always block a shorter match. */
export function findTypedJournalReferences(
  value: string,
  aliases: JournalReferenceAliases,
  today: string,
  referenceDay?: string,
): TypedJournalReference[] {
  const references: TypedJournalReference[] = [];
  for (let at = 0; at < value.length; at++) {
    const trigger = value[at];
    if (
      (trigger !== "@" && trigger !== "/") ||
      (at > 0 && !startBoundary.test(value[at - 1]))
    )
      continue;
    const tail = value.slice(at + 1, at + 162).split(/[\r\n@]/u, 1)[0];
    // A marker followed immediately by whitespace is always ordinary prose.
    if (!tail || /^\s/u.test(tail)) continue;
    if (trigger === "/") {
      // Take the whole explicit date/year before considering a shorter alias.
      // Otherwise a malformed 9 Nov 202 could silently turn into last year's Nov 9.
      const date =
        /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}([./])\d{1,2}(?:\1\d{4})?\.?|\d{1,2}\s*[a-zA-Z]{3,9}\.?(?:,?\s*\d{4})?|[a-zA-Z]{3,9}\.?\s*\d{1,2}(?:,?\s*\d{4})?)/u.exec(
          tail,
        )?.[0];
      const named =
        /^(?:daybeforeyesterday|twodaysago|yesterday|today|this[-_]?week|last[-_]?week|morning(?:-?journal|-?reflection)?|evening(?:-?journal|-?reflection)?|\d{4}-?w\d{1,2})/iu.exec(
          tail,
        )?.[0];
      const base = date ?? named;
      if (!base) continue;
      const suffix =
        /^(?:[./:]|\s+)(morning|evening)(?:-?journal|-?reflection)?/iu.exec(
          tail.slice(base.length),
        )?.[0] ?? "";
      const label = base + suffix;
      const after = tail[label.length];
      if (after && !endBoundary.test(after)) continue;
      if (after === "." && /[\p{L}\p{N}]/u.test(tail[label.length + 1] ?? ""))
        continue;
      if (/^(?:[./]\d|,?\s+\d)/u.test(tail.slice(label.length))) continue;
      const reference = parseJournalCalendarReference(
        label,
        today,
        referenceDay,
      );
      if (!reference) continue;
      references.push({
        start: at,
        end: at + label.length + 1,
        label: `/${label}`,
        href: journalCalendarHref(reference),
      });
      at += label.length;
      continue;
    }
    for (let length = Math.min(tail.length, 160); length > 0; length--) {
      const label = tail.slice(0, length);
      if (/\s$/u.test(label)) continue;
      const after = value[at + length + 1];
      if (after && !endBoundary.test(after)) continue;
      if (after === "." && /[\p{L}\p{N}]/u.test(value[at + length + 2] ?? ""))
        continue;
      const matches = aliases.get(normalizeJournalMentionText(label));
      if (!matches) continue;
      if (/^\s*(?:·\s*)?\d+(?:[.,]\d+)?\s*mg\b/iu.test(tail.slice(length)))
        break;
      if (matches.size === 1) {
        const href = [...matches][0];
        const kind = parseJournalMentionHref(href)?.kind;
        if (
          kind === "medication" ||
          kind === "ingredient" ||
          kind === "category"
        ) {
          references.push({
            start: at,
            end: at + length + 1,
            label: `@${label}`,
            href,
          });
          at += length;
        }
      }
      break;
    }
  }
  return references;
}

/** Map decoded markers back to literal source; escapes and HTML entities stay prose. */
function literalMarkers(raw: string): { marker: string; allowed: boolean }[] {
  const markers: { marker: string; allowed: boolean }[] = [];
  for (let index = 0; index < raw.length; index++) {
    if (raw[index] === "&") {
      const entity = /^&(?:commat|sol|#0*(64|47)|#x0*(40|2f));/iu.exec(
        raw.slice(index),
      );
      if (entity) {
        const slash = /^&(?:sol|#0*47|#x0*2f);$/iu.test(entity[0]);
        markers.push({ marker: slash ? "/" : "@", allowed: false });
        index += entity[0].length - 1;
        continue;
      }
    }
    if (raw[index] !== "@" && raw[index] !== "/") continue;
    let escapes = 0;
    for (let before = index - 1; raw[before] === "\\"; before--) escapes++;
    markers.push({ marker: raw[index], allowed: escapes % 2 === 0 });
  }
  return markers;
}

/** Render-only enrichment: source Markdown, drafts and API writes are untouched. */
export function remarkJournalReferences(options: {
  aliases: JournalReferenceAliases;
  today: string;
  referenceDay?: string;
}) {
  return (tree: Root, file: { value: unknown }) => {
    const source = String(file.value);
    const skip = new Set([
      "link",
      "linkReference",
      "image",
      "imageReference",
      "code",
      "inlineCode",
      "html",
      "definition",
    ]);
    const visit = (node: Root | RootContent) => {
      if (skip.has(node.type) || !("children" in node)) return;
      const children = node.children as RootContent[];
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (child.type !== "text") {
          visit(child);
          continue;
        }
        const text = child as Text;
        if (!/[@/]/u.test(text.value)) continue;
        const start = text.position?.start.offset,
          end = text.position?.end.offset;
        if (start === undefined || end === undefined) continue;
        const raw = source.slice(start, end);
        const markers = literalMarkers(raw);
        const decoded = [...text.value.matchAll(/[@/]/gu)];
        if (
          decoded.length !== markers.length ||
          decoded.some((match, index) => match[0] !== markers[index].marker)
        )
          continue;
        const enabled = new Set(
          decoded
            .filter((_, index) => markers[index].allowed)
            .map((match) => match.index),
        );
        const matches = findTypedJournalReferences(
          text.value,
          options.aliases,
          options.today,
          options.referenceDay,
        ).filter((match) => enabled.has(match.start));
        if (!matches.length) continue;
        const replacement: RootContent[] = [];
        let cursor = 0;
        for (const match of matches) {
          if (match.start > cursor)
            replacement.push({
              type: "text",
              value: text.value.slice(cursor, match.start),
            });
          replacement.push({
            type: "link",
            url: match.href,
            children: [{ type: "text", value: match.label }],
          });
          cursor = match.end;
        }
        if (cursor < text.value.length)
          replacement.push({ type: "text", value: text.value.slice(cursor) });
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
    };
    visit(tree);
  };
}
