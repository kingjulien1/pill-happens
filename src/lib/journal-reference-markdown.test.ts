import assert from "node:assert/strict";
import test from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";
import { emptyData, type Medication } from "./domain";
import {
  createJournalReferenceAliases,
  findTypedJournalReferences,
  remarkJournalReferences,
} from "./journal-reference-markdown";

const today = "2026-11-10";
function data() {
  const library = emptyData();
  const med = (
    id: string,
    name: string,
    strengthMg: number,
    activeIngredient: string,
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
  library.medications = [
    med("r", "Ritalin", 10, "Methylphenidate"),
    med("v5", "Valium", 5, "Diazepam"),
    med("v10", "Valium", 10, "DIAZEPAM"),
    med("l", "Levomethasan Substitution", 40, "Levomethadone"),
    med("c", "Crème Forte", 0.25, "Acétyl Salt"),
  ];
  return library;
}
const aliases = createJournalReferenceAliases(data());
function refs(value: string) {
  return findTypedJournalReferences(value, aliases, today);
}
async function renderTree(source: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkJournalReferences, { aliases, today });
  return (await processor.run(processor.parse(source) as Root, {
    value: source,
  })) as Root;
}
function links(tree: Root) {
  const output: string[] = [];
  const visit = (node: Root | RootContent) => {
    if (node.type === "link") output.push(node.url);
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(tree);
  return output;
}

test("exact manually typed medication, ingredient and multiword references resolve without changing source", () => {
  const source =
    "I noted @Ritalin and @Levomethasan Substitution, then @Methylphenidate.";
  assert.deepEqual(
    refs(source).map((r) => r.href),
    [
      "/medications?medication=r",
      "/medications?medication=l",
      "/medications?ingredient=Methylphenidate",
    ],
  );
  assert.equal(
    source.slice(refs(source)[1].start, refs(source)[1].end),
    "@Levomethasan Substitution",
  );
  assert.equal(refs("@creme   FORTE")[0].href, "/medications?medication=c");
  assert.equal(
    refs("@acétyl salt")[0].href,
    "/medications?ingredient=Ac%C3%A9tyl+Salt",
  );
});

test("duplicate names require a unique explicit strength; ingredient groups stay unambiguous", () => {
  assert.deepEqual(refs("@Valium helped"), []);
  for (const value of ["@Valium 5 mg", "@Valium · 5 mg", "@Valium 5mg"])
    assert.equal(refs(value)[0].href, "/medications?medication=v5");
  assert.equal(refs("@DIAZEPAM")[0].href, "/medications?ingredient=Diazepam");
  const duplicates = data();
  duplicates.medications.push({
    ...duplicates.medications[1],
    id: "same-strength",
  });
  assert.deepEqual(
    findTypedJournalReferences(
      "@Valium 5 mg",
      createJournalReferenceAliases(duplicates),
      today,
    ),
    [],
  );
});

test("ambiguous longer names and names shared by a medication and an ingredient are never guessed", () => {
  const library = data();
  library.medications.push(
    { ...library.medications[0], id: "r2", name: "Ritalin Extra" },
    { ...library.medications[0], id: "r3", name: "Ritalin Extra" },
    { ...library.medications[0], id: "ingredient", name: "Methylphenidate" },
  );
  const local = createJournalReferenceAliases(library);
  assert.deepEqual(
    findTypedJournalReferences("@Ritalin Extra", local, today),
    [],
  );
  assert.deepEqual(
    findTypedJournalReferences("@Methylphenidate", local, today),
    [],
  );
});

test("typed date variants resolve strictly, with no future or malformed date truncation", () => {
  for (const value of [
    "/2026-11-09",
    "/09.11.2026",
    "/9/11/2026",
    "/9 Nov 2026",
    "/November 9, 2026",
    "/9 Nov",
  ])
    assert.equal(refs(value)[0]?.href, "/history/2026-11-09", value);
  for (const value of [
    "/2026-02-30",
    "/2027-11-09",
    "/9 Nov 2027",
    "/9/11/2027",
    "/2026-11-091",
  ])
    assert.deepEqual(refs(value), [], value);
});

test("name boundaries preserve emails, partial names, domains and compounds", () => {
  for (const value of [
    "friend@Ritalin",
    "@Ritalinx",
    "@Ritalin.example",
    "@Ritalin-extra",
    "@Ritalin/extra",
    "@Ritalin_10",
  ])
    assert.deepEqual(refs(value), [], value);
  assert.equal(refs("(@Ritalin), @Ritalin! @Ritalin helped.").length, 3);
});

test("Markdown enrichment skips code, existing links/images, escapes, entities and email autolinks", async () => {
  const source = [
    "@Ritalin and @Levomethasan Substitution.",
    "`@Ritalin`",
    "```md\n@Ritalin\n```",
    "    @Ritalin",
    "[@Ritalin](https://example.com)",
    "[@Ritalin][ref]",
    "![something @Ritalin](https://example.com/image.png)",
    String.raw`\@Ritalin and @Diazepam`,
    "&#64;Ritalin &commat;Ritalin &#x40;Ritalin and /9 Nov.",
    "person@ritalin.example",
    "<https://example.com/@Ritalin>",
    "[ref]: https://example.com/other",
  ].join("\n\n");
  const tree = await renderTree(source);
  const internal = links(tree).filter((href) => href.startsWith("/"));
  assert.deepEqual(internal, [
    "/medications?medication=r",
    "/medications?medication=l",
    "/medications?ingredient=Diazepam",
    "/history/2026-11-09",
  ]);
  assert.ok(links(tree).includes("https://example.com"));
  assert.ok(links(tree).includes("https://example.com/@Ritalin"));
});

test("enrichment works inside emphasis and lists and preserves ordinary encoded text", async () => {
  const source = "**@Ritalin** &amp; @Crème Forte\n\n- /9 Nov\n- @Diazepam";
  assert.deepEqual(links(await renderTree(source)), [
    "/medications?medication=r",
    "/medications?medication=c",
    "/history/2026-11-09",
    "/medications?ingredient=Diazepam",
  ]);
  assert.equal((await renderTree(source)).type, "root");
});

test("unknown strengths and unfinished explicit years never silently resolve a shorter reference", () => {
  for (const value of [
    "@Ritalin 20 mg",
    "/9 Nov 202",
    "/9.11.202",
    "/9/11/202",
  ])
    assert.deepEqual(refs(value), [], value);
});

test("yearless typed dates stay anchored to their check-in day when reread in later years", () => {
  const source = "Remember /9 Nov and /31 Dec.";
  const entryDay = "2026-11-10";
  const original = findTypedJournalReferences(
    source,
    aliases,
    entryDay,
    entryDay,
  );
  const later = findTypedJournalReferences(
    source,
    aliases,
    "2028-12-01",
    entryDay,
  );
  assert.deepEqual(later, original);
  assert.deepEqual(
    later.map((reference) => reference.href),
    ["/history/2026-11-09", "/history/2025-12-31"],
  );
  // Explicit years can still reference another past day while editing an old entry.
  assert.equal(
    findTypedJournalReferences(
      "/12 Nov 2027",
      aliases,
      "2028-12-01",
      entryDay,
    )[0]?.href,
    "/history/2027-11-12",
  );
  for (const invalidAnchor of ["", "not-a-day", "2029-01-01"])
    assert.deepEqual(
      findTypedJournalReferences("/9 Nov", aliases, today, invalidAnchor),
      refs("/9 Nov"),
    );
});

test("typed references use @ exclusively for medications, ingredients and categories; / for calendar links", () => {
  assert.deepEqual(
    refs(
      "@stimulants @Benzo @sleep-aid @Methylphenidate /Today /Yesterday /ThisWeek /LastWeek /2020-W53",
    ).map((item) => item.href),
    [
      "/medications/categories/stimulant",
      "/medications/categories/benzodiazepine",
      "/medications/categories/sleep-aid",
      "/medications?ingredient=Methylphenidate",
      "/history/2026-11-10",
      "/history/2026-11-09",
      "/history/weeks/2026-11-09",
      "/history/weeks/2026-11-02",
      "/history/weeks/2020-12-28",
    ],
  );
  for (const source of [
    "@Today",
    "@2026-11-09",
    "/Ritalin",
    "/Stimulant",
    "@tablets",
    "@drops",
    "@ Name",
    "@ Ritalin",
    "/ Today",
    "/\tToday",
  ])
    assert.deepEqual(refs(source), [], source);
});

test("day journal shortcuts resolve either period without consuming surrounding prose", () => {
  const source =
    "Try /Today.Morning, /Yesterday/Evening and /2026-11-08.morning. /MorningJournal!";
  assert.deepEqual(
    refs(source).map((item) => item.href),
    [
      "/journal/2026-11-10/morning",
      "/journal/2026-11-09/evening",
      "/journal/2026-11-08/morning",
      "/journal/2026-11-10/morning",
    ],
  );
  assert.deepEqual(
    refs(
      "/Today.morningish /ThisWeek.Morning /Tomorrow.Evening /2026-W54 /2021-W53",
    ),
    [],
  );
});

test("typed relative day, week and journal references keep their saved entry's date across years", () => {
  const source =
    "/Today /Yesterday /ThisWeek /LastWeek /Today.Morning /Yesterday.Evening";
  const original = findTypedJournalReferences(source, aliases, today, today);
  const later = findTypedJournalReferences(
    source,
    aliases,
    "2028-12-01",
    today,
  );
  assert.deepEqual(later, original);
  assert.deepEqual(
    later.map((item) => item.href),
    [
      "/history/2026-11-10",
      "/history/2026-11-09",
      "/history/weeks/2026-11-09",
      "/history/weeks/2026-11-02",
      "/journal/2026-11-10/morning",
      "/journal/2026-11-09/evening",
    ],
  );
  assert.equal(
    findTypedJournalReferences("/Today", aliases, "2028-12-01", "invalid")[0]
      .href,
    "/history/2028-12-01",
  );
});

test("slash code, entities, escapes, URLs, ordinary paths and links remain untouched", async () => {
  const source = [
    "/Today and /2026-W46.",
    "`/Today` /Yesterday",
    "```\n/Today @stimulant\n```",
    String.raw`\/Today and /Today.Morning`,
    "&sol;Today &#47;Today &#x2f;Today /LastWeek",
    "https://example.test/Today ordinary/Today",
    "[/Today](/history/2026-11-08)",
    "<https://example.test/Today>",
    "![label /Today](/img.png)",
  ].join("\n\n");
  assert.deepEqual(
    links(await renderTree(source)).filter((item) => item.startsWith("/")),
    [
      "/history/2026-11-10",
      "/history/weeks/2026-11-09",
      "/history/2026-11-09",
      "/journal/2026-11-10/morning",
      "/history/weeks/2026-11-02",
      "/history/2026-11-08",
    ],
  );
});

test("all existing portable Markdown destinations stay unchanged during enrichment", async () => {
  const destinations = [
    "/medications?medication=deleted",
    "/medications?ingredient=Unknown",
    "/history/2025-01-01",
    "/medications/categories/stimulant",
    "/history/2026-11-09?intake=legacy",
    "/journal/2026-11-09/morning",
    "/history/weeks/2026-11-09",
  ];
  const source = destinations
    .map((href) => `[@Ritalin /Today](${href})`)
    .join("\n\n");
  assert.deepEqual(links(await renderTree(source)), destinations);
  assert.equal(
    source,
    destinations.map((href) => `[@Ritalin /Today](${href})`).join("\n\n"),
  );
});

test("category alias collisions remain ambiguous and user-entered HTML/Markdown names remain data", async () => {
  const library = data();
  library.medications.push(
    { ...library.medications[0], id: "ambiguous", name: "Stimulant" },
    { ...library.medications[0], id: "unsafe", name: "A <script> [dose]" },
  );
  const local = createJournalReferenceAliases(library);
  assert.deepEqual(findTypedJournalReferences("@Stimulant", local, today), []);
  assert.equal(
    findTypedJournalReferences("@A <script> [dose]", local, today)[0]?.href,
    "/medications?medication=unsafe",
  );
  assert.deepEqual(
    findTypedJournalReferences("@unknown /NoSuchDay", local, today),
    [],
  );
});

test("invalid explicit calendar tokens never truncate into a plausible shorter reference", () => {
  for (const source of [
    "/9 Nov 202",
    "/9 Nov 2027",
    "/9/11/2027",
    "/9/11/202",
    "/2026-11-091",
    "/2026-W461",
    "/Today.extra",
    "/Todayish",
    "/ThisWeek/extra",
    "/2026-11-09/morning-extra",
  ])
    assert.deepEqual(refs(source), [], source);
});
