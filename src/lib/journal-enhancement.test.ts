import assert from "node:assert/strict";
import test from "node:test";
import {
  journalEnhancementReferences,
  JournalEnhancementValidationError,
  validateJournalEnhancement,
  type JournalEnhancementInput,
} from "./journal-enhancement";

const input: JournalEnhancementInput = {
  note: "i took 2 mg Diazepam and didnt sleep good. kinda tired lol.",
  day: "2026-11-14",
  timezone: "Europe/Vienna",
  medications: [
    { id: "diazepam", name: "Diazepam", activeIngredient: "Diazepam" },
    { id: "bromazepam", name: "Bromazepam" },
  ],
  allowedReferences: [
    { label: "Diazepam", href: "/medications?medication=diazepam" },
  ],
};
const summary = "A tired little update";
const validate = (note: string, body: string, title = summary) =>
  validateJournalEnhancement({ ...input, note }, { body, summary: title });
const rejects = (note: string, body: string, code?: string, title = summary) =>
  assert.throws(
    () => validate(note, body, title),
    (error: unknown) =>
      error instanceof JournalEnhancementValidationError &&
      (!code || error.code === code),
  );

test("minimal grammar repair preserves informal voice and builds a yearless date heading", () => {
  const result = validateJournalEnhancement(input, {
    body: "i took 2 mg [Diazepam](/medications?medication=diazepam) and didn't sleep well. kinda tired lol.",
    summary,
  });
  assert.equal(
    result.markdown,
    "# Sat, Nov 14 -- A tired little update\n\ni took 2 mg [Diazepam](/medications?medication=diazepam) and didn't sleep well. kinda tired lol.",
  );
  assert.equal(result.summary, summary);
  assert.doesNotMatch(result.markdown.split("\n")[0], /2026/u);
});

test("an unchanged informal body is a valid conservative result", () => {
  assert.ok(validate(input.note, input.note).markdown.endsWith(input.note));
  assert.ok(
    validate("nah. not today lol", "nah. not today lol").markdown.endsWith(
      "nah. not today lol",
    ),
  );
});

test("number spelling, dose units, and drug-to-dose association are protected", () => {
  for (const [before, after] of [
    ["I took 0.5 mg Diazepam.", "I took 0,5 mg Diazepam."],
    ["I took 2 mg Diazepam.", "I took 2 mcg Diazepam."],
    [
      "I took 2 mg Diazepam and 5 mg Bromazepam.",
      "I took 5 mg Diazepam and 2 mg Bromazepam.",
    ],
    ["I took 2 mg Diazepam at 20:30.", "I took 2 mg Diazepam at 21:30."],
    ["I took half a tablet.", "I took 0.5 tablets."],
  ])
    rejects(before, after, "facts");
});

test("contraction repair works while negation scope and uncertainty stay protected", () => {
  assert.ok(
    validate("i didnt take 2 mg Diazepam.", "i didn't take 2 mg Diazepam."),
  );
  assert.ok(
    validate("I didn't take 2 mg Diazepam.", "I did not take 2 mg Diazepam."),
  );
  rejects("Maybe I took 2 mg Diazepam.", "I took 2 mg Diazepam.", "facts");
  rejects(
    "I was not anxious. I took 2 mg Diazepam.",
    "I was anxious. I did not take 2 mg Diazepam.",
    "facts",
  );
});

test("known medication and ingredient names cannot disappear or be newly introduced", () => {
  rejects("I mentioned Diazepam.", "I mentioned a medication.", "facts");
  rejects("I mentioned my day.", "I mentioned Bromazepam.", "facts");
  const ingredientInput = {
    ...input,
    note: "The ingredient was Lorazepam.",
    medications: [
      { id: "one", name: "Example", activeIngredient: "Lorazepam" },
    ],
  };
  assert.throws(
    () =>
      validateJournalEnhancement(ingredientInput, {
        body: "The ingredient was different.",
        summary,
      }),
    JournalEnhancementValidationError,
  );
});

test("new clinical recommendations or made-up summary numbers are rejected", () => {
  rejects("A quiet day.", "A quiet day. I should taper.", "facts");
  rejects("A quiet day.", "A quiet day.", "facts", "A safe taper");
  rejects("A quiet day.", "A quiet day.", "facts", "3 quiet moments");
});

test("existing URLs, labels, reference definitions, code and HTML cannot be corrupted", () => {
  const note =
    'A [source](https://example.test/info "Title").\n\n`2 mg`\n\n```txt\nkeep Exactly\n```\n\n[ref]: https://example.test/ref\n\nA [reference][ref].\n\n<small>Original</small>';
  assert.ok(validate(note, note));
  for (const after of [
    note.replace("example.test/info", "other.test/info"),
    note.replace("[source]", "[changed]"),
    note.replace("keep Exactly", "keep exactly"),
    note.replace("<small>Original</small>", "<small>Changed</small>"),
    note.replace("example.test/ref", "other.test/ref"),
  ])
    rejects(note, after);
});

test("leading indentation and final hard-break spaces remain authored Markdown", () => {
  const code = "    2 mg\n    Keep Exactly";
  assert.ok(validate(code, code).markdown.endsWith(code));
  assert.ok(
    validate(
      `# Sat, Nov 14 -- Small summary\n\n${code}`,
      code,
      "Small summary",
    ).markdown.endsWith(code),
  );
  rejects(code, "2 mg\nKeep Exactly");
  assert.ok(
    validate("An ordinary line.  ", "An ordinary line.  ").markdown.endsWith(
      ".  ",
    ),
  );
});

test("only exact existing labels can gain links to supplied internal references", () => {
  const note = "Diazepam was mentioned.";
  assert.ok(
    validate(
      note,
      "[Diazepam](/medications?medication=diazepam) was mentioned.",
    ),
  );
  rejects(
    note,
    "[Diazepam](https://example.test) was mentioned.",
    "references",
  );
  rejects(
    note,
    "[Diazepam](/medications?medication=other) was mentioned.",
    "references",
  );
  rejects(
    note,
    "![Diazepam](/medications?medication=diazepam) was mentioned.",
    "references",
  );
  rejects(
    note,
    "[@Diazepam](/medications?medication=diazepam) was mentioned.",
    "references",
  );
  const marked = "@Diazepam was mentioned.";
  assert.ok(
    validate(
      marked,
      "[@Diazepam](/medications?medication=diazepam) was mentioned.",
    ),
  );
  rejects(
    marked,
    "[Diazepam](/medications?medication=diazepam) was mentioned.",
    "references",
  );
  rejects("A quiet day.", "A quiet day. https://example.test", "references");
  assert.deepEqual(
    journalEnhancementReferences({
      ...input,
      allowedReferences: [
        ...input.allowedReferences!,
        ...input.allowedReferences!,
        { label: "Absent", href: "/medications?medication=absent" },
        { label: "Diazepam", href: "https://example.test" },
        { label: "Diazepam", href: "/not-a-journal-route" },
      ],
    }),
    input.allowedReferences,
  );
  assert.deepEqual(
    journalEnhancementReferences({
      ...input,
      allowedReferences: [
        { label: "Diazepam", href: "/medications?medication=one" },
        { label: "Diazepam", href: "/medications?medication=two" },
      ],
    }),
    [],
  );
  rejects(
    "Diazepam then Diazepam.",
    "[Diazepam](/medications?medication=diazepam) then [Diazepam](/medications?medication=diazepam).",
    "references",
  );
});

test("explicit day, week and category references use only their allowed destinations", () => {
  const note = "I thought about /yesterday and /thisweek and @benzo.";
  const allowedReferences = [
    { label: "/yesterday", href: "/history/2026-11-13" },
    { label: "/thisweek", href: "/history/weeks/2026-11-09" },
    { label: "@benzo", href: "/medications/categories/benzodiazepine" },
  ];
  const refs = journalEnhancementReferences({
    ...input,
    note,
    allowedReferences,
  });
  assert.equal(refs.length, 3);
  const body =
    "I thought about [/yesterday](/history/2026-11-13) and [/thisweek](/history/weeks/2026-11-09) and [@benzo](/medications/categories/benzodiazepine).";
  assert.ok(
    validateJournalEnhancement(
      { ...input, note, allowedReferences },
      { body, summary },
    ),
  );
});

test("authored headings survive; only the same-day dated heading loses its year", () => {
  const body = "## The messy bit\n\nI felt tired.";
  assert.ok(validate(body, body));
  rejects(body, "## A nicer title\n\nI felt tired.", "structure");
  const old = "# Saturday, November 14, 2026 -- Small summary\n\nI felt tired.";
  assert.equal(
    validate(old, "I felt tired.", "Small summary").markdown,
    "# Sat, Nov 14 -- Small summary\n\nI felt tired.",
  );
  assert.ok(validate(old, "I felt tired.", "Feeling tired"));
  const changed =
    "# Sat, Nov 14 -- Easy day\n\nThe morning felt easy. The night was difficult.";
  assert.ok(
    validate(
      changed,
      "The morning felt easy. The night was difficult.",
      "An easy morning, a difficult night",
    ),
  );
  assert.ok(
    validate(
      "# My messy title\n\nI felt tired.",
      "## My messy title\n\nI felt tired.",
    ),
  );
  rejects(
    "# My messy title\n\nI felt tired.",
    "# My messy title\n\nI felt tired.",
    "structure",
  );
  rejects("# My messy title\n\nI felt tired.", "I felt tired.", "structure");
  rejects("# Sat I took 2 mg\n\nI felt tired.", "I felt tired.");
  rejects("# Fri, Nov 13 -- Yesterday\n\nI felt tired.", "I felt tired.");
});

test("short notes gain no gratuitous sections; long notes gain at most two headings and two separators", () => {
  rejects("A small thought.", "## My day\n\nA small thought.", "structure");
  const note = Array.from(
    { length: 100 },
    (_, index) => `word${String.fromCharCode(97 + (index % 20))}`,
  ).join(" ");
  assert.ok(validate(note, `## Not much to add\n\n${note}`));
  assert.ok(validate(note, `## First\n\n---\n\n## Second\n\n---\n\n${note}`));
  rejects(note, `## First\n\n## Second\n\n## Third\n\n${note}`, "structure");
  rejects(note, `---\n\n---\n\n---\n\n${note}`, "structure");
  rejects(note, `### Smaller heading\n\n${note}`, "structure");
});

test("long entries allow proportionate selective emphasis but no added strikethrough", () => {
  const note = "one two three four five six ".repeat(100).trim();
  const selected =
    "**one** _two_ **three** _four_ **five** six" +
    note.slice("one two three four five six".length);
  assert.ok(validate(note, selected));
  rejects(note, selected.replace("six", "_six_"), "structure");
  rejects(note, note.replace("one", "~~one~~"), "structure");
});

test("over-formatting, wholesale rewriting and invalid/oversized input fail safely", () => {
  rejects(
    "one two three four five six",
    "**one** *two* ~~three~~ four five six",
    "structure",
  );
  rejects(
    "I had a really ordinary day and wrote a little context to remember it.",
    "An adventurous afternoon followed a hectic morning filled with surprising events.",
    "rewrite",
  );
  for (const invalid of [
    { ...input, note: "" },
    { ...input, note: "x".repeat(100_001) },
    { ...input, day: "2026-02-31" },
    { ...input, timezone: "not/a-timezone" },
  ])
    assert.throws(
      () => validateJournalEnhancement(invalid, { body: input.note, summary }),
      JournalEnhancementValidationError,
    );
  rejects(input.note, input.note, "structure", "# A decorated summary");
});

test("negation context and the order of otherwise unchanged paragraphs cannot be reversed", () => {
  rejects("I was sad, not happy.", "I was happy, not sad.", "facts");
  const first = "The morning was quiet and I wrote down how it felt.";
  const second = "Later the afternoon became busy and I kept a little context.";
  rejects(`${first}\n\n${second}`, `${second}\n\n${first}`, "rewrite");
});

test("number-dense long entries retain all facts without a quadratic context scan", () => {
  const note = "2 mg, a little context. ".repeat(3000).trim();
  assert.ok(validate(note, note).markdown.endsWith(note));
});
