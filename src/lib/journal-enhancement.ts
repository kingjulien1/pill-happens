import type { Root, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { DAILY_REFLECTION_MAX_LENGTH } from "./daily-check-in";
import { isValidDayKey, type Medication } from "./domain";
import { formatJournalEntryHeading } from "./journal-entry-template";
import { parseJournalMentionHref } from "./journal-mentions";

export type JournalEnhancementReference = { label: string; href: string };
export type JournalEnhancementInput = {
  note: string;
  day: string;
  timezone: string;
  medications?: readonly Pick<Medication, "id" | "name" | "activeIngredient">[];
  allowedReferences?: readonly JournalEnhancementReference[];
};
export type JournalEnhancementCandidate = { body: string; summary: string };
export type JournalEnhancementContent = { markdown: string; summary: string };
export type JournalEnhancementFailure =
  "input" | "structure" | "facts" | "references" | "rewrite";

/** Safe to record as a reason; neither journal text nor provider output is included. */
export class JournalEnhancementValidationError extends Error {
  constructor(public readonly code: JournalEnhancementFailure) {
    super(`Journal enhancement failed ${code} validation.`);
    this.name = "JournalEnhancementValidationError";
  }
}

const parser = unified().use(remarkParse).use(remarkGfm);
function fail(code: JournalEnhancementFailure): never {
  throw new JournalEnhancementValidationError(code);
}
const fold = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en");
const words = (value: string): string[] =>
  fold(value).match(/[\p{L}\p{M}]+(?:[’'][\p{L}\p{M}]+)*/gu) ?? [];
const numbers = (value: string): string[] =>
  value.match(/[+−-]?\p{N}+(?:[.,:/+-]\p{N}+)*/gu) ?? [];
const labelKey = (value: string) => fold(value).replace(/\s+/gu, " ").trim();
const trimBlankLines = (value: string) =>
  value.replace(/^(?:[\t ]*\r?\n)+/u, "").replace(/(?:\r?\n[\t ]*)+$/u, "");
const bag = (values: readonly string[]) => {
  const result = new Map<string, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
};
const sameBag = (left: readonly string[], right: readonly string[]) => {
  const a = bag(left),
    b = bag(right);
  return (
    a.size === b.size && [...a].every(([key, count]) => b.get(key) === count)
  );
};
const containsPhrase = (text: string, phrase: string) => {
  const source = ` ${words(text).join(" ")} `;
  const needle = words(phrase).join(" ");
  return needle.length > 0 && source.includes(` ${needle} `);
};
const phraseCount = (text: string, phrase: string) => {
  const source = words(text),
    target = words(phrase);
  if (!target.length) return 0;
  let count = 0;
  for (let at = 0; at <= source.length - target.length; at++)
    if (target.every((word, index) => source[at + index] === word)) count++;
  return count;
};
function literalLabelCount(text: string, label: string) {
  const source = fold(text),
    needle = fold(label).trim();
  if (!needle) return 0;
  let total = 0,
    from = 0;
  while (from < source.length) {
    const at = source.indexOf(needle, from);
    if (at < 0) break;
    const before = source[at - 1] ?? "",
      after = source[at + needle.length] ?? "";
    if (
      !/[\p{L}\p{M}\p{N}@/]/u.test(before) &&
      !/[\p{L}\p{M}\p{N}]/u.test(after)
    )
      total++;
    from = at + needle.length;
  }
  return total;
}

type Node = Root | RootContent;
function children(node: Node): readonly RootContent[] {
  return "children" in node ? (node.children as RootContent[]) : [];
}
function plain(node: Node): string {
  if (node.type === "definition") return "";
  if ("value" in node && typeof node.value === "string") return node.value;
  if (node.type === "image" || node.type === "imageReference")
    return node.alt ?? "";
  return children(node)
    .map(plain)
    .join(node.type === "root" ? "\n" : "");
}
function bodyPlain(node: Node): string {
  if (node.type === "heading") return "";
  if (!children(node).length) return plain(node);
  return children(node)
    .map(bodyPlain)
    .join(node.type === "root" ? "\n" : "");
}
function nodes(tree: Node): RootContent[] {
  return children(tree).flatMap((node) => [node, ...nodes(node)]);
}
function parse(value: string) {
  return parser.parse(value) as Root;
}
function htmlBlocks(tree: Root, source: string) {
  return tree.children
    .filter(
      (node) =>
        node.type === "html" ||
        nodes(node).some((child) => child.type === "html"),
    )
    .map((node) =>
      source.slice(node.position!.start.offset, node.position!.end.offset),
    );
}
function protectedMarkup(node: RootContent): string | null {
  if (node.type === "link" || node.type === "image")
    return JSON.stringify([node.type, node.url, node.title ?? "", plain(node)]);
  if (node.type === "definition")
    return JSON.stringify([
      node.type,
      node.identifier,
      node.url,
      node.title ?? "",
    ]);
  if (node.type === "linkReference" || node.type === "imageReference")
    return JSON.stringify([
      node.type,
      node.identifier,
      node.referenceType,
      plain(node),
    ]);
  if (node.type === "code")
    return JSON.stringify([
      node.type,
      node.lang ?? "",
      node.meta ?? "",
      node.value,
    ]);
  if (node.type === "inlineCode" || node.type === "html")
    return JSON.stringify([node.type, node.value]);
  return null;
}

/** Only an existing leading calendar H1 is replaced; ordinary authored headings stay. */
function sourceParts(note: string, day: string) {
  const tree = parse(note),
    first = tree.children[0];
  if (first?.type !== "heading" || first.depth !== 1)
    return { body: note, summary: "" };
  const title = plain(first);
  const date =
    /^(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?),?\s+([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?(?=\s+(?:--|—|–)(?:\s|$)|$)/iu.exec(
      title,
    );
  const calendar = new Date(`${day}T12:00:00.000Z`);
  const month = new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(calendar);
  const dated =
    (date &&
      date[1].slice(0, 3).toLowerCase() === month.toLowerCase() &&
      Number(date[2]) === calendar.getUTCDate() &&
      (!date[3] || Number(date[3]) === calendar.getUTCFullYear())) ||
    title === day ||
    title.startsWith(`${day} -- `) ||
    title.startsWith(`${day} — `) ||
    title.startsWith(`${day} – `);
  if (!dated) return { body: note, summary: "" };
  const summary = title
    .split(/\s+(?:--|—|–)\s*/u)
    .slice(1)
    .join(" -- ")
    .trim();
  const end = first.position?.end.offset;
  return typeof end === "number"
    ? {
        body: trimBlankLines(note.slice(end)),
        summary,
      }
    : { body: note, summary: "" };
}

/** A finite catalogue, restricted to exact internal destinations and names already written. */
export function journalEnhancementReferences(input: JournalEnhancementInput) {
  const text = plain(parse(input.note));
  const seen = new Set<string>();
  const references = (input.allowedReferences ?? [])
    .flatMap((reference) => {
      const kind = parseJournalMentionHref(reference.href)?.kind;
      if (!kind || /^[@/]/u.test(reference.label)) return [reference];
      const marker =
        kind === "medication" || kind === "ingredient" || kind === "category"
          ? "@"
          : "/";
      return [
        reference,
        { ...reference, label: `${marker}${reference.label}` },
      ];
    })
    .filter(({ label, href }) => {
      const key = `${labelKey(label)}\0${href}`;
      if (
        !label.trim() ||
        label.length > 200 ||
        href.length > 600 ||
        !parseJournalMentionHref(href) ||
        !literalLabelCount(text, label) ||
        seen.has(key)
      )
        return false;
      seen.add(key);
      return true;
    });
  const destinations = new Map<string, Set<string>>();
  for (const { label, href } of references) {
    const key = labelKey(label),
      targets = destinations.get(key) ?? new Set<string>();
    targets.add(href);
    destinations.set(key, targets);
  }
  return references
    .filter(({ label }) => destinations.get(labelKey(label))?.size === 1)
    .slice(0, 400);
}

export function validateJournalEnhancementInput(
  input: JournalEnhancementInput,
) {
  if (
    typeof input.note !== "string" ||
    !input.note.trim() ||
    input.note.length > DAILY_REFLECTION_MAX_LENGTH ||
    !isValidDayKey(input.day) ||
    typeof input.timezone !== "string" ||
    input.timezone.length > 100
  )
    fail("input");
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  } catch {
    fail("input");
  }
  return input;
}

const contractions: Record<string, string> = {
  cant: "can not",
  cannot: "can not",
  wont: "will not",
  dont: "do not",
  doesnt: "does not",
  didnt: "did not",
  wasnt: "was not",
  werent: "were not",
  isnt: "is not",
  arent: "are not",
  havent: "have not",
  hasnt: "has not",
  hadnt: "had not",
  couldnt: "could not",
  wouldnt: "would not",
  shouldnt: "should not",
};
function meaningWords(text: string) {
  return words(text).flatMap((word) => {
    const key = word.replace(/[’']/gu, "");
    return (contractions[key] ?? word).split(" ");
  });
}
function protectedMeaning(text: string) {
  return meaningWords(text).filter((word) =>
    /^(?:no|not|never|without|none|nothing|nobody|neither|nor|maybe|might|could|probably|possibly|perhaps|seems|seemed)$/u.test(
      word,
    ),
  );
}
function meaningContexts(text: string) {
  const terms = meaningWords(text).filter((word) => !contextFillers.has(word));
  return terms.flatMap((term, index) =>
    protectedMeaning(term).length
      ? [
          JSON.stringify([
            term,
            terms.slice(Math.max(0, index - 1), index),
            terms.slice(index + 1, index + 2),
          ]),
        ]
      : [],
  );
}
/** Stable, unique four-word anchors retain order without quadratic diffing of long entries. */
function preservesOrder(before: string[], after: string[]) {
  const anchors = new Map<string, number>();
  for (let index = 0; index <= before.length - 4; index++) {
    const key = before.slice(index, index + 4).join("\0");
    anchors.set(key, anchors.has(key) ? -1 : index);
  }
  let last = -1;
  for (let index = 0; index <= after.length - 4; index++) {
    const position = anchors.get(after.slice(index, index + 4).join("\0"));
    if (position === undefined || position < 0) continue;
    if (position < last) return false;
    last = position;
  }
  return true;
}
const cautionWords = new Set([
  "should",
  "must",
  "recommend",
  "recommended",
  "diagnosis",
  "diagnose",
  "safe",
  "dangerous",
  "withdrawal",
  "seizure",
  "taper",
  "reduce",
  "increase",
  "stop",
  "start",
  "avoid",
  "take",
  "dose",
  "prescribe",
  "treatment",
]);
const externalUrls = (text: string) =>
  text.match(/(?:https?:\/\/|www\.)[^\s<>"']+/giu) ?? [];
const contextFillers = new Set(
  "a an the of to at in on by for with and or but is am are was were be been being do did does have has had i me my it this that as then".split(
    " ",
  ),
);
/** Dose units and nearby content words cannot silently move between numbers. */
function numberContexts(text: string) {
  const result: string[] = [];
  for (const line of text.split("\n")) {
    const tokens = [
      ...line.matchAll(
        /[+−-]?\p{N}+(?:[.,:/+-]\p{N}+)*|[\p{L}\p{M}]+(?:[’'][\p{L}\p{M}]+)*/gu,
      ),
    ].map(([value]) =>
      /^[+−-]?\p{N}/u.test(value)
        ? { number: value, terms: [] as string[], before: [] as string[] }
        : {
            number: null,
            terms: meaningWords(value).filter(
              (word) => !contextFillers.has(word),
            ),
            before: [] as string[],
          },
    );
    let previous: string[] = [];
    for (const token of tokens) {
      if (token.number !== null) token.before = previous;
      else previous = [...previous, ...token.terms].slice(-2);
    }
    let following: string[] = [];
    for (let index = tokens.length - 1; index >= 0; index--) {
      const token = tokens[index];
      if (token.number !== null)
        result.push(JSON.stringify([token.number, token.before, following]));
      else following = [...token.terms, ...following].slice(0, 2);
    }
  }
  return result;
}

/** Reject rather than rewrite a questionable result. This is a guard, not semantic proof. */
export function validateJournalEnhancement(
  input: JournalEnhancementInput,
  candidate: JournalEnhancementCandidate,
): JournalEnhancementContent {
  validateJournalEnhancementInput(input);
  if (
    !candidate ||
    typeof candidate.body !== "string" ||
    typeof candidate.summary !== "string"
  )
    fail("structure");
  const body = trimBlankLines(candidate.body),
    summary = candidate.summary.trim();
  if (
    !body.trim() ||
    body.length > DAILY_REFLECTION_MAX_LENGTH ||
    !summary ||
    summary.length > 110 ||
    words(summary).length > 12 ||
    /[\r\n<>#`\[\]*_]/u.test(summary)
  )
    fail("structure");
  const source = sourceParts(input.note, input.day);
  const original = parse(source.body),
    enhanced = parse(body);
  const before = nodes(original),
    after = nodes(enhanced);
  const beforeText = bodyPlain(original),
    afterText = bodyPlain(enhanced);
  const beforeWords = words(beforeText),
    afterWords = words(afterText);
  if (
    !sameBag(numbers(beforeText), numbers(afterText)) ||
    !sameBag(numberContexts(beforeText), numberContexts(afterText)) ||
    !sameBag(meaningContexts(beforeText), meaningContexts(afterText)) ||
    !sameBag(protectedMeaning(beforeText), protectedMeaning(afterText))
  )
    fail("facts");
  const originalNumbers = new Set(numbers(plain(parse(input.note))));
  if (numbers(summary).some((number) => !originalNumbers.has(number)))
    fail("facts");
  for (const medication of input.medications ?? [])
    for (const name of [medication.name, medication.activeIngredient ?? ""]) {
      if (
        name.trim() &&
        (phraseCount(beforeText, name) !== phraseCount(afterText, name) ||
          (containsPhrase(summary, name) && !containsPhrase(input.note, name)))
      )
        fail("facts");
    }
  for (const word of cautionWords)
    if (
      afterWords.filter((value) => value === word).length >
        beforeWords.filter((value) => value === word).length ||
      (words(summary).includes(word) && !words(input.note).includes(word))
    )
      fail("facts");

  const oldMarkup = bag(
    before
      .map(protectedMarkup)
      .filter((value): value is string => value !== null),
  );
  const allowed = journalEnhancementReferences(input);
  const newLinkCounts = new Map<string, number>();
  for (const node of after) {
    const key = protectedMarkup(node);
    if (key === null) continue;
    const count = oldMarkup.get(key) ?? 0;
    if (count) {
      oldMarkup.set(key, count - 1);
      continue;
    }
    if (node.type !== "link") fail("references");
    const label = plain(node),
      alias = allowed.find(
        (reference) =>
          reference.href === node.url &&
          labelKey(reference.label) === labelKey(label),
      );
    if (!alias) fail("references");
    const used = (newLinkCounts.get(labelKey(label)) ?? 0) + 1;
    if (used > 1 || used > literalLabelCount(beforeText, label))
      fail("references");
    newLinkCounts.set(labelKey(label), used);
  }
  if (
    [...oldMarkup.values()].some((count) => count !== 0) ||
    !sameBag(htmlBlocks(original, source.body), htmlBlocks(enhanced, body)) ||
    !sameBag(externalUrls(beforeText), externalUrls(afterText))
  )
    fail("references");

  const oldHeadings = bag(
    before
      .filter((node) => node.type === "heading")
      .map((node) =>
        JSON.stringify([node.depth === 1 ? 2 : node.depth, plain(node)]),
      ),
  );
  let addedHeadings = 0;
  for (const node of after.filter((node) => node.type === "heading")) {
    const key = JSON.stringify([node.depth, plain(node)]),
      count = oldHeadings.get(key) ?? 0;
    if (count) oldHeadings.set(key, count - 1);
    else {
      if (node.depth !== 2) fail("structure");
      if (
        words(plain(node)).length > 12 ||
        numbers(plain(node)).some((number) => !originalNumbers.has(number))
      )
        fail("structure");
      addedHeadings++;
    }
  }
  if ([...oldHeadings.values()].some((count) => count !== 0)) fail("structure");
  const addedSeparators =
    after.filter((node) => node.type === "thematicBreak").length -
    before.filter((node) => node.type === "thematicBreak").length;
  if (
    addedHeadings > 2 ||
    addedSeparators < 0 ||
    addedSeparators > 2 ||
    (beforeWords.length < 80 && (addedHeadings || addedSeparators))
  )
    fail("structure");
  const marks = (list: RootContent[]) =>
    list.filter(
      (node) =>
        node.type === "strong" ||
        node.type === "emphasis" ||
        node.type === "delete",
    ).length;
  if (
    marks(after) - marks(before) >
      (beforeWords.length < 80
        ? 1
        : Math.min(5, Math.max(2, Math.ceil(beforeWords.length / 100)))) ||
    !sameBag(
      before.filter((node) => node.type === "delete").map(plain),
      after.filter((node) => node.type === "delete").map(plain),
    )
  )
    fail("structure");

  const oldWords = bag(beforeWords),
    newWords = bag(afterWords);
  const added = [...newWords].reduce(
    (total, [word, count]) =>
      total + Math.max(0, count - (oldWords.get(word) ?? 0)),
    0,
  );
  const removed = [...oldWords].reduce(
    (total, [word, count]) =>
      total + Math.max(0, count - (newWords.get(word) ?? 0)),
    0,
  );
  const budget = Math.max(3, Math.floor(beforeWords.length * 0.12));
  if (
    added > budget ||
    removed > budget ||
    !preservesOrder(meaningWords(beforeText), meaningWords(afterText)) ||
    afterWords.length < beforeWords.length * 0.85 ||
    afterWords.length > beforeWords.length * 1.15 + 3
  )
    fail("rewrite");
  const markdown = `${formatJournalEntryHeading(input.day)} ${summary}\n\n${body}`;
  if (markdown.length > DAILY_REFLECTION_MAX_LENGTH) fail("structure");
  return { markdown, summary };
}
