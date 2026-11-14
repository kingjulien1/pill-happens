import assert from "node:assert/strict";
import test from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";
import { emptyData, type Medication } from "./domain";
import { parseJournalMentionHref } from "./journal-mentions";
import {
  createJournalReferenceAliases,
  remarkJournalReferences,
} from "./journal-reference-markdown";
import {
  createJournalPreviewReferenceExtractor,
  journalPreviewReferences,
} from "./journal-preview-references";

const today = "2026-11-10",
  day = "2026-11-09";
function data() {
  const state = emptyData();
  const medication = (
    id: string,
    name: string,
    strengthMg: number,
    activeIngredient?: string,
  ): Medication => ({
    id,
    name,
    strengthMg,
    activeIngredient,
    color: "rose",
    form: "tablet",
    archived: false,
    createdAt: "2026-10-01T12:00:00Z",
  });
  state.medications = [
    medication("r", "Ritalin", 10, "Methylphenidate"),
    medication("v5", "Valium", 5, "Diazepam"),
    medication("v10", "Valium", 10, "DIAZEPAM"),
    {
      ...medication("b", "Bromazepam", 1.5),
      archived: true,
      categories: ["benzodiazepine"],
    },
    medication("c", "Crème Forte", 0.25, "Acétyl Salt"),
  ];
  state.intakes = [
    {
      id: "dose",
      medicationId: "r",
      medicationName: "Ritalin",
      medicationForm: "tablet",
      strengthMg: 10,
      quantity: 1,
      takenAt: "2026-11-09T08:15:00Z",
      createdAt: "2026-11-09T09:00:00Z",
      note: "",
    },
  ];
  return state;
}
const extract = (value: string, state = data()) =>
  journalPreviewReferences({ value, day, data: state, today });

test("authored internal links and typed markers retain first-occurrence order across all reference kinds", () => {
  const value =
    "[An authored day](/history/2026-11-08), @Ritalin, @benzo, /ThisWeek, [A dose](/history/2026-11-09?intake=dose), @Methylphenidate and /Yesterday.Morning.";
  const references = extract(value);
  assert.deepEqual(
    references.map(({ key }) => key),
    [
      "day:2026-11-08",
      "medication:r",
      "category:benzodiazepine",
      "week:2026-11-09",
      "intake:dose",
      "ingredient:methylphenidate",
      "reflection:2026-11-08:morning",
    ],
  );
  assert.deepEqual(
    references.map(({ label }) => label),
    [
      "Sun, Nov 8",
      "Ritalin",
      "Benzodiazepine",
      "Nov 9–Nov 15",
      "Ritalin · 09:15",
      "Methylphenidate",
      "Morning · Sun, Nov 8",
    ],
  );
  for (const { href, reference } of references)
    assert.deepEqual(parseJournalMentionHref(href), reference);
});

test("full, collapsed and shortcut reference-style links resolve definitions and respect first-definition wins", () => {
  const value = [
    "[The first entry][Mixed ID] then [Past][] and [Drug].",
    "[mixed id]: /medications/r",
    "[MIXED ID]: /medications/b",
    "[Past]: /history/2026-11-08",
    "[Drug]: /medications/b",
    "[Missing][no-definition] and [Unused].",
    "[Unused]: https://example.test",
  ].join("\n\n");
  assert.deepEqual(
    extract(value).map(({ key, href }) => ({ key, href })),
    [
      { key: "medication:r", href: "/medications/r" },
      { key: "day:2026-11-08", href: "/history/2026-11-08" },
      { key: "medication:b", href: "/medications/b" },
    ],
  );
});

test("semantic duplicates share one chip, including path/query medication URLs and ingredient casing", () => {
  const value =
    "[One](/medications/r), @Ritalin, [Again](/medications?medication=r), @DIAZEPAM, [Same ingredient](/medications?ingredient=diazepam), [Dose](/history/2026-11-08?intake=dose), [Moved dose](/history/2026-11-09?intake=dose).";
  const references = extract(value);
  assert.deepEqual(
    references.map(({ key }) => key),
    ["medication:r", "ingredient:diazepam", "intake:dose"],
  );
  assert.equal(references[0].href, "/medications/r");
  assert.equal(references[2].href, "/history/2026-11-08?intake=dose");
});

test("bare prose is never scanned for names, categories or calendar words", () => {
  assert.deepEqual(
    extract(
      "# My private title\n\nRitalin, Valium, Methylphenidate, benzos and yesterday were part of an ordinary week.",
    ),
    [],
  );
  assert.deepEqual(
    extract(
      "[Ritalin](https://example.test/@Ritalin) and <https://example.test/@Ritalin> and person@Ritalin.example",
    ),
    [],
  );
});

test("code, image references, raw HTML and definitions do not create preview references", () => {
  const value = [
    "`@Ritalin and [link](/medications/r)`",
    "```md\n@Ritalin\n[link](/medications/r)\n```",
    "    @Ritalin and /Yesterday",
    "![@Ritalin](/medications/r)",
    "![@Ritalin][image]",
    "[image]: /medications/r",
    "<div>\n@Ritalin\n[link](/medications/r)\n</div>",
    "<!-- @Ritalin and [link](/medications/r) -->",
    '<a href="/medications/r">Ritalin</a>',
    "[unused]: /medications/b",
  ].join("\n\n");
  assert.deepEqual(extract(value), []);
});

test("escaped and entity-authored markers retain the reader's literal shielding", () => {
  const value =
    String.raw`\@Ritalin and \/Yesterday. ` +
    "&#64;Ritalin &commat;Ritalin &#x40;Ritalin &#47;Yesterday &sol;Yesterday, then @Bromazepam.";
  assert.deepEqual(
    extract(value).map(({ key }) => key),
    ["medication:b"],
  );
});

test("typed ambiguity, explicit strengths and archived medications follow the actual reader aliases", () => {
  const value =
    "@Valium, @Valium 5 mg, @Valium 10mg, @Ritalin 20 mg, @Bromazepam and @acétyl salt.";
  assert.deepEqual(
    extract(value).map(({ key }) => key),
    [
      "medication:v5",
      "medication:v10",
      "medication:b",
      "ingredient:acetyl salt",
    ],
  );
  const ambiguous = data();
  ambiguous.medications.push({
    ...ambiguous.medications[0],
    id: "another",
    name: "Methylphenidate",
  });
  assert.deepEqual(extract("@Methylphenidate", ambiguous), []);
  ambiguous.medications.push({
    ...ambiguous.medications[0],
    id: "same",
    name: "Ritalin",
  });
  assert.deepEqual(extract("@Ritalin 10 mg", ambiguous), []);
});

test("historical relative dates and yearless dates stay anchored to the entry day", () => {
  const value = "/Today, /Yesterday, /ThisWeek and /31 Dec.";
  const original = journalPreviewReferences({
    value,
    day: "2026-01-02",
    data: data(),
    today: "2026-01-02",
  });
  const later = journalPreviewReferences({
    value,
    day: "2026-01-02",
    data: data(),
    today: "2028-12-01",
  });
  assert.deepEqual(later, original);
  assert.deepEqual(
    original.map(({ key }) => key),
    ["day:2026-01-02", "day:2026-01-01", "week:2025-12-29", "day:2025-12-31"],
  );
  assert.deepEqual(
    extract("/2027-11-09 /2026-02-30 /9 Nov 202 /2026-11-091"),
    [],
  );
  assert.equal(
    extract("[An explicitly authored future day](/history/2027-11-09)")[0]
      .reference.kind,
    "day",
  );
});

test("unknown or unsafe URLs are skipped instead of being interpreted as internal routes", () => {
  const urls = [
    "https://example.test/history/2026-11-09",
    "//example.test/medications/r",
    "javascript:alert(1)",
    "/medications/r#details",
    "/medications?medication=r&extra=x",
    "/medications?medication=..",
    "/medications/%2Fr",
    "/medications/%",
    "/history/2026-02-30",
    "/history/weeks/2026-11-10",
    "/medications/categories/not-a-category",
    "/unrelated",
  ];
  assert.deepEqual(
    extract(urls.map((href) => `[Label](${href})`).join("\n\n")),
    [],
  );
});

test("labels contain only bounded canonical metadata, never misleading or oversized authored prose", () => {
  const privateText =
    "A very private description that must not become a preview ".repeat(80);
  const references = extract(
    `[${privateText}](/medications/r) [${privateText}](/medications/missing) [${privateText}](/medications?ingredient=An+unknown+private+thought) [${privateText}](/history/2026-11-09?intake=missing)`,
  );
  assert.deepEqual(
    references.map(({ label }) => label),
    ["Ritalin", "Medication", "Active Ingredient", "Logged Intake"],
  );
  assert.ok(references.every(({ label }) => !label.includes("private")));
  const longName = data();
  longName.medications[0].name =
    "A genuinely long saved medication name ".repeat(10);
  const label = extract("[Short label](/medications/r)", longName)[0].label;
  assert.equal(Array.from(label).length, 64);
  assert.ok(label.endsWith("…"));
});

test("missing live data stays honest while explicit calendar/category links remain useful", () => {
  const references = journalPreviewReferences({
    value:
      "[Missing med](/medications/r) [Known category](/medications/categories/benzodiazepine) /Yesterday",
    day,
    data: null,
    today,
  });
  assert.deepEqual(
    references.map(({ label }) => label),
    ["Medication", "Benzodiazepine", "Sun, Nov 8"],
  );
  assert.deepEqual(
    journalPreviewReferences({ value: "@Ritalin", day, data: null, today }),
    [],
  );
});

test("the reusable extractor is deterministic and never changes saved data or Markdown", () => {
  const state = data(),
    source =
      "**@Ritalin** and /Yesterday.\n\n- @benzo\n\n| A |\n|---|\n| @Bromazepam |";
  const original = JSON.stringify(state);
  const getReferences = createJournalPreviewReferenceExtractor(state, today);
  const first = getReferences(source, day);
  assert.deepEqual(getReferences(source, day), first);
  assert.deepEqual(
    first,
    journalPreviewReferences({ value: source, day, data: state, today }),
  );
  assert.equal(JSON.stringify(state), original);
  assert.equal(
    source,
    "**@Ritalin** and /Yesterday.\n\n- @benzo\n\n| A |\n|---|\n| @Bromazepam |",
  );
  assert.deepEqual(getReferences("", day), []);
  assert.deepEqual(getReferences("[Day](/history/2026-11-09)", "invalid"), []);
  assert.deepEqual(getReferences("x".repeat(100_001), day), []);
});

test("mixed Markdown extraction agrees with the reader's transformed internal link order", () => {
  const state = data();
  const value =
    "@Ritalin, **@Bromazepam**, /Yesterday.\n\n[Category](/medications/categories/opioid) [Ref][week]\n\n[week]: /history/weeks/2026-11-02\n\n`@Valium 5 mg` ![image](/medications/v10) [external @Valium](https://example.test)";
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.parse(value) as Root;
  remarkJournalReferences({
    aliases: createJournalReferenceAliases(state),
    today,
    referenceDay: day,
  })(tree, { value });
  const links: string[] = [];
  const definitions = new Map(
    tree.children
      .filter((node) => node.type === "definition")
      .map((node) => [node.identifier, node.url]),
  );
  const visit = (node: Root | RootContent) => {
    if (
      [
        "image",
        "imageReference",
        "code",
        "inlineCode",
        "html",
        "definition",
      ].includes(node.type)
    )
      return;
    const href =
      node.type === "link"
        ? node.url
        : node.type === "linkReference"
          ? definitions.get(node.identifier)
          : undefined;
    if (href && parseJournalMentionHref(href)) links.push(href);
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(tree);
  assert.deepEqual(
    extract(value, state).map(({ href }) => href),
    links,
  );
});
