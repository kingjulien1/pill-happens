import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, emptyData, type AppData, type Medication } from "./domain";
import type { DailyCheckIn } from "./daily-check-in";
import { MEDICATION_CATEGORY_VALUES } from "./medication-categories";
import {
  applyJournalMention,
  createJournalReferenceCatalog,
  decodeJournalReferenceId,
  getJournalMentionToken,
  getJournalMentionCategories,
  normalizeJournalMentionText,
  parseJournalMentionDate,
  parseJournalCalendarReference,
  journalCalendarHref,
  parseJournalMentionHref,
  searchJournalMentions,
  type JournalMention,
} from "./journal-mentions";

test("encoded route IDs decode exactly once and retain the same strict entity boundary", () => {
  for (const id of ["med-1", "qa-méd.v1", "a&b", "薬-1"])
    assert.equal(decodeJournalReferenceId(encodeURIComponent(id)), id);
  for (const segment of [
    "%E0%A4%A",
    "%2e%2e",
    "%252e%252e",
    "%2Fapi",
    "%00",
    "",
  ])
    assert.equal(decodeJournalReferenceId(segment), null);
});

const today = "2026-11-10";
const medication = (
  id: string,
  name: string,
  strengthMg: number,
  activeIngredient = "Diazepam",
  archived = false,
): Medication => ({
  id,
  name,
  strengthMg,
  activeIngredient,
  archived,
  color: "amber",
  form: "tablet",
  createdAt: "2026-10-01T12:00:00Z",
});
const checkIn = (day: string): DailyCheckIn => ({
  day,
  note: "A synthetic reflection.",
  moods: [],
  energy: null,
  stress: null,
  sleepHours: null,
  helped: "",
  createdAt: `${day}T19:00:00Z`,
  updatedAt: `${day}T19:00:00Z`,
});
function fixture(): AppData {
  const data = emptyData();
  data.medications = [
    medication("v5", "Valium", 5),
    medication("v10", "Valium", 10, "diazepam", true),
    medication("rit", "Ritalin", 10, "Methylphenidate"),
    medication("creme", "Crème Forte", 0.25, "Acétyl (test) [salt]"),
  ];
  data.intakes = [
    ...["2026-11-09T12:00:00Z", "2026-11-09T14:00:00Z"].map(
      (takenAt, index) => ({
        id: `i${index}`,
        medicationId: "v10",
        medicationName: "Valium",
        strengthMg: 10,
        quantity: 1,
        takenAt,
        createdAt: takenAt,
        note: "",
      }),
    ),
    {
      id: "i3",
      medicationId: "rit",
      medicationName: "Ritalin",
      strengthMg: 10,
      quantity: 1,
      // Vienna05:30 belongs to the preceding tracking day.
      takenAt: "2026-11-10T04:30:00Z",
      createdAt: "2026-11-10T04:30:00Z",
      note: "",
    },
  ];
  data.dailyCheckIns = [
    checkIn("2026-11-08"),
    checkIn(today),
    checkIn("2026-11-11"),
  ];
  return data;
}
const pick: JournalMention = {
  key: "medication:v5",
  kind: "medication",
  label: "Valium · 5 mg",
  detail: "5 mg · Diazepam",
  href: "/medications?medication=v5",
};

test("boundary tokens preserve UTF-16 carets and distinguish medication/calendar triggers", () => {
  for (const prefix of ["", "I took ", "🙂 ", "A thought: ", "**", "> "])
    assert.deepEqual(
      getJournalMentionToken(`${prefix}@Levo`, prefix.length + 5),
      {
        start: prefix.length,
        trigger: "@",
        end: prefix.length + 5,
        query: "Levo",
      },
    );
  assert.deepEqual(getJournalMentionToken("@", 1), {
    start: 0,
    trigger: "@",
    end: 1,
    query: "",
  });
  assert.equal(getJournalMentionToken("@Valium", 0), null);
});

test("selections, invalid carets, long queries, newline and escaped/email/URL ats stay ordinary text", () => {
  for (const [value, caret] of [
    ["person@Valium", 13],
    ["https://example.test/@Valium", 27],
    ["\\@Valium", 8],
    ["@old\nnew", 8],
    ["@@Valium", 8],
    [`@${"x".repeat(161)}`, 162],
    ["@Valium; other", 14],
  ] as const)
    assert.equal(getJournalMentionToken(value, caret), null, value);
  for (const caret of [-1, NaN, Infinity, 1.5, 99])
    assert.equal(getJournalMentionToken("@Val", caret), null);
  assert.equal(getJournalMentionToken("@Valium", 1, 5), null);
});

test("complete or unfinished code, fenced blocks, links and autolinks shield the @ source", () => {
  for (const source of [
    "`@Valium`",
    "`@Valium",
    "``code ` @Valium``",
    "```md\n@Valium\n```",
    "~~~\n@Valium",
    "> ```md\n> @Valium\n> ```",
    "    @Valium",
    "\t@Valium",
    "[See @Valium](/medications)",
    "[unfinished @Valium",
    "[label](https://test/ @Valium)",
    "<https://test/ @Valium>",
  ]) {
    const caret = source.indexOf("@Valium") + "@Valium".length;
    assert.equal(getJournalMentionToken(source, caret), null, source);
  }
  const source = "`old @literal` and @Valium";
  assert.equal(getJournalMentionToken(source, source.length)?.query, "Valium");
  const afterFence = "```md\nold\n```\n@Valium";
  assert.equal(
    getJournalMentionToken(afterFence, afterFence.length)?.query,
    "Valium",
  );
  const afterLink = "[old](https://test/`literal) and @Valium";
  assert.equal(
    getJournalMentionToken(afterLink, afterLink.length)?.query,
    "Valium",
  );
});

test("completing in the middle consumes the current word suffix but preserves later prose", () => {
  const source = "Before @Valium after";
  const token = getJournalMentionToken(source, source.indexOf("ium"))!;
  assert.equal(token.query, "Val");
  assert.equal(token.replacementEnd, source.indexOf(" after"));
  const inserted = applyJournalMention(source, token, pick)!;
  assert.equal(
    inserted.value,
    "Before [@Valium · 5 mg](/medications?medication=v5) after",
  );
  assert.equal(inserted.value.slice(inserted.selectionStart), " after");
  const atSpace = getJournalMentionToken("@Valium after", 7)!;
  assert.equal(atSpace.replacementEnd, undefined);
});

test("all explicit supported dates resolve strictly to past Gregorian days", () => {
  for (const value of [
    "2026-11-09",
    "09.11.2026",
    "9.11.2026",
    "09/11/2026",
    "9 Nov 2026",
    "9Nov2026",
    "November 9, 2026",
    "Nov9 2026",
  ])
    assert.equal(parseJournalMentionDate(value, today), "2026-11-09", value);
  for (const value of [
    "2026-02-29",
    "31.04.2026",
    "13/13/2026",
    "9.11/2026",
    today,
    "2026-11-11",
    "11/12/2026",
  ])
    assert.equal(parseJournalMentionDate(value, today), null, value);
  assert.equal(parseJournalMentionDate("2026-11-09", "invalid"), null);
});

test("yearless dates mean the most recent past occurrence, including leap-year century gaps", () => {
  for (const value of ["9.11", "09.11.", "9/11", "Nov 9", "9 November"])
    assert.equal(parseJournalMentionDate(value, today), "2026-11-09", value);
  assert.equal(parseJournalMentionDate("10.11", today), "2025-11-10");
  assert.equal(parseJournalMentionDate("11.11", today), "2025-11-11");
  assert.equal(parseJournalMentionDate("29 Feb", "2103-01-01"), "2096-02-29");
  assert.equal(parseJournalMentionDate("29.02.2024", today), "2024-02-29");
  assert.equal(parseJournalMentionDate("February 30", today), null);
});

test("empty @ balances medications, deduplicated ingredients and manual categories", () => {
  const data = fixture();
  const snapshot = JSON.stringify(data);
  const results = searchJournalMentions(data, "", today);
  assert.ok(results.length <= 12);
  assert.deepEqual(
    new Set(results.map((item) => item.kind)),
    new Set(["medication", "ingredient", "category"]),
  );
  const medications = results.filter((item) => item.kind === "medication");
  assert.equal(medications[0].medication?.id, "v10");
  assert.match(medications[0].label, /10 mg/);
  assert.match(medications[0].detail, /Archived/);
  assert.match(
    medications.find((item) => item.medication?.id === "v5")!.label,
    /5 mg/,
  );
  const diazepam = results.filter(
    (item) =>
      item.kind === "ingredient" &&
      normalizeJournalMentionText(item.label) === "diazepam",
  );
  assert.equal(diazepam.length, 1);
  assert.equal(diazepam[0].detail, "2 medications · 1 archived");
  const calendar = searchJournalMentions(data, "", today, "/");
  assert.deepEqual(
    calendar.filter((item) => item.kind === "day").map((item) => item.href),
    ["/history/2026-11-10", "/history/2026-11-09", "/history/2026-11-08"],
  );
  assert.match(
    calendar.find((item) => item.href === "/history/2026-11-09")!.detail,
    /3 intakes/,
  );
  assert.equal(
    JSON.stringify(data),
    snapshot,
    "search never mutates journal data",
  );
});

test("matching folds accents/case/spacing, includes medication ingredients and useful partial dates", () => {
  const data = fixture();
  assert.equal(
    normalizeJournalMentionText("  MÉTHyl  PHENIDATE "),
    "methyl phenidate",
  );
  assert.ok(
    searchJournalMentions(data, "creme", today).some(
      (item) => item.medication?.id === "creme",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "diazepam", today).some(
      (item) => item.medication?.id === "v10",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "methphen", today).some(
      (item) => item.medication?.id === "rit",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "9 N", today, "/").some(
      (item) => item.href === "/history/2026-11-09",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "Ritalin", today).some(
      (item) => item.kind === "ingredient" && item.label === "Methylphenidate",
    ),
  );
});

test("direct medication and ingredient labels outrank equally close related-name aliases", () => {
  const data = fixture();
  const medications = searchJournalMentions(data, "Val", today);
  assert.equal(medications[0].kind, "medication");
  assert.equal(
    medications[0].medication?.id,
    "v10",
    "usage breaks direct-name ties",
  );
  assert.ok(
    medications.findIndex((item) => item.medication?.id === "v5") <
      medications.findIndex((item) => item.kind === "ingredient"),
    "both direct Valium matches appear before the related Diazepam alias",
  );
  const ingredients = searchJournalMentions(data, "Dia", today);
  assert.equal(ingredients[0].kind, "ingredient");
  assert.equal(normalizeJournalMentionText(ingredients[0].label), "diazepam");
  assert.ok(ingredients.some((item) => item.medication?.id === "v10"));
  const exactMedication = searchJournalMentions(data, "Ritalin", today);
  assert.equal(exactMedication[0].medication?.id, "rit");
  assert.ok(exactMedication.some((item) => item.kind === "ingredient"));
});

test("explicit days can link empty days, including today; future days are rejected", () => {
  const data = fixture();
  const empty = searchJournalMentions(data, "07.11.2026", today, "/");
  assert.equal(empty[0].href, "/history/2026-11-07");
  assert.equal(empty[0].detail, "No entries");
  assert.equal(
    searchJournalMentions(data, today, today, "/")[0].href,
    `/history/${today}`,
  );
  assert.ok(
    searchJournalMentions(data, "2026-11-11", today, "/").every(
      (item) => item.kind !== "day",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "not-a-match-at-all", today).length === 0,
  );
  assert.deepEqual(searchJournalMentions(data, "x".repeat(161), today), []);
});

test("a crowded library still leaves room for ingredients and manual categories", () => {
  const data = fixture();
  data.medications.push(
    ...Array.from({ length: 30 }, (_, index) =>
      medication(`other-${index}`, `Other ${index}`, 1, `Ingredient ${index}`),
    ),
  );
  const results = searchJournalMentions(data, "", today);
  assert.equal(results.length, 12);
  for (const kind of ["medication", "ingredient", "category"])
    assert.ok(results.filter((item) => item.kind === kind).length >= 2);
  assert.equal(new Set(results.map((item) => item.key)).size, results.length);
});

test("strict href parsing accepts encoded references and rejects foreign, malformed or extra query content", () => {
  assert.deepEqual(parseJournalMentionHref("/medications?medication=v5"), {
    kind: "medication",
    id: "v5",
  });
  const ingredient = "Acétyl (test) [salt]";
  assert.deepEqual(
    parseJournalMentionHref(
      `/medications?${new URLSearchParams({ ingredient })}`,
    ),
    { kind: "ingredient", ingredient },
  );
  assert.deepEqual(parseJournalMentionHref("/history/2024-02-29"), {
    kind: "day",
    day: "2024-02-29",
  });
  for (const href of [
    "https://evil.test/medications?medication=v5",
    "//evil.test/medications?medication=v5",
    "/medications",
    "/medications?medication=",
    "/medications?ingredient=+",
    "/medications?medication=v5&ingredient=Diazepam",
    "/medications?medication=v5&",
    "/medications?medication=v5&medication=v10",
    "/medications?x=v5",
    "/medications?medication=v5#",
    "/medications?medication=%00",
    "/medications?medication=%ff",
    "/medications?medication=%",
    "/medications?medication=a+b",
    "/medications?ingredient=Diazepam%0a",
    "/history/2026-02-29",
    "/history/2026-11-09?x=1",
    "/history/2026-11-09#x",
    "/medications?ingredient=" + "x".repeat(161),
    " /history/2026-11-09",
  ])
    assert.equal(parseJournalMentionHref(href), null, href);
});

test("insertion escapes source labels and keeps links portable, selections precise and suffix spacing natural", () => {
  for (const [source, suffix] of [
    ["@Val", " "],
    ["@Val, next", ", next"],
    ["@Val next", " next"],
  ]) {
    const token = getJournalMentionToken(source, 4)!;
    const result = applyJournalMention(source, token, pick)!;
    assert.equal(
      result.value,
      `[@Valium · 5 mg](/medications?medication=v5)${suffix}`,
    );
    assert.equal(result.selectionStart, result.selectionEnd);
    assert.equal(
      result.value.slice(result.selectionStart),
      suffix.trim() ? suffix : "",
    );
    assert.equal(
      getJournalMentionToken(result.value, result.value.indexOf("Valium") + 3),
      null,
    );
  }
  const special: JournalMention = {
    ...pick,
    label: "A [B](C) <D> *dose* \\ test",
  };
  const inserted = applyJournalMention(
    "@A",
    getJournalMentionToken("@A", 2)!,
    special,
  )!;
  assert.match(
    inserted.value,
    /A \\\[B\\\]\\\(C\\\) \\<D\\> \\\*dose\\\* \\\\ test/,
  );
});

test("stale tokens, foreign hrefs, mismatched sources and overflow never overwrite the draft", () => {
  const source = "Before @Val after";
  const token = getJournalMentionToken(source, 11)!;
  assert.equal(
    applyJournalMention(source.replace("@Val", "@Rit"), token, pick),
    null,
  );
  assert.equal(
    applyJournalMention(source, token, { ...pick, href: "https://evil.test" }),
    null,
  );
  assert.equal(
    applyJournalMention(source, token, { ...pick, kind: "day" }),
    null,
  );
  assert.equal(applyJournalMention(source, token, pick, source.length), null);
  for (const limit of [-1, 4.5, NaN, Infinity])
    assert.equal(applyJournalMention(source, token, pick, limit), null);
  const inserted = applyJournalMention(source, token, pick)!;
  assert.equal(
    applyJournalMention(source, token, pick, inserted.value.length)?.value,
    inserted.value,
  );
});

test("bad legacy timestamps do not prevent valid medication or check-in-only suggestions", () => {
  const data = fixture();
  data.intakes.push({ ...data.intakes[0], id: "bad", takenAt: "not-a-date" });
  assert.ok(
    searchJournalMentions(data, "", today, "/").some(
      (item) => item.href === "/history/2026-11-08",
    ),
  );
  assert.ok(
    searchJournalMentions(data, "Valium", "invalid").some(
      (item) => item.kind === "medication",
    ),
  );
});

test("linked medication categories follow current IDs and explicit labels without inferred classification", () => {
  const med = medication("current", "Valium", 5);
  med.categories = [...MEDICATION_CATEGORY_VALUES];
  const reference = parseJournalMentionHref("/medications?medication=current");
  assert.deepEqual(
    getJournalMentionCategories([med], reference),
    MEDICATION_CATEGORY_VALUES,
  );
  assert.deepEqual(
    getJournalMentionCategories([{ ...med, categories: [] }], reference),
    [],
  );
  assert.deepEqual(
    getJournalMentionCategories(
      [{ ...med, categories: ["sleep-aid"] }],
      reference,
    ),
    ["sleep-aid"],
  );
  assert.deepEqual(getJournalMentionCategories([], reference), []);
  assert.deepEqual(
    getJournalMentionCategories(
      [medication("different", "Valium", 5)],
      reference,
    ),
    [],
  );
  assert.deepEqual(
    getJournalMentionCategories(
      [{ ...med, categories: undefined, isBenzodiazepine: true }],
      reference,
    ),
    ["benzodiazepine"],
  );
  assert.deepEqual(
    getJournalMentionCategories([med], { kind: "day", day: "2026-11-09" }),
    [],
  );
  assert.deepEqual(getJournalMentionCategories([med], null), []);
});

test("linked ingredient categories union exact normalized matches including archived medication metadata", () => {
  const first: Medication = {
    ...medication("a", "A", 5, "Acétyl Salt"),
    categories: ["sleep-aid", "antidepressant"],
  };
  const second: Medication = {
    ...medication("b", "B", 10, "  ACETYL   SALT  ", true),
    categories: ["sleep-aid", "other"],
  };
  const prefixOnly: Medication = {
    ...medication("c", "C", 10, "Acétyl Salt extended"),
    categories: ["antibiotic"],
  };
  const sameNameOnly: Medication = {
    ...medication("d", "Acétyl Salt", 1, "Unrelated"),
    categories: ["opioid"],
  };
  const legacy = {
    ...medication("e", "E", 1, "Acetyl Salt"),
    isBenzodiazepine: true,
  };
  const medications = [first, second, prefixOnly, sameNameOnly, legacy];
  const reference = { kind: "ingredient", ingredient: "acetyl salt" } as const;
  assert.deepEqual(getJournalMentionCategories(medications, reference), [
    "benzodiazepine",
    "antidepressant",
    "sleep-aid",
    "other",
  ]);
  assert.deepEqual(
    getJournalMentionCategories([prefixOnly, sameNameOnly], reference),
    [],
  );
  assert.deepEqual(
    getJournalMentionCategories(medications, {
      kind: "ingredient",
      ingredient: "  ",
    }),
    [],
  );
  assert.deepEqual(getJournalMentionCategories([], reference), []);
  assert.deepEqual(first.categories, ["sleep-aid", "antidepressant"]);
});

test("reference catalogs count saved tracking-day entries without excerpts or invalid legacy dates", () => {
  const data = fixture();
  data.intakes.push({ ...data.intakes[0], id: "invalid", takenAt: "invalid" });
  const catalog = createJournalReferenceCatalog(data);
  assert.deepEqual(catalog.days.get("2026-11-09"), { intakes: 3, checkIns: 0 });
  assert.deepEqual(catalog.days.get("2026-11-08"), { intakes: 0, checkIns: 1 });
  assert.equal(catalog.days.has("invalid"), false);
  assert.equal(catalog.ingredients.get("diazepam")?.length, 2);
  assert.equal(catalog.medications.get("v10")?.archived, true);
  assert.equal(createJournalReferenceCatalog(null).days.size, 0);
});

test("both autocomplete triggers close on whitespace without changing the user's prose", () => {
  for (const source of [
    "@ Name",
    "/ Today",
    "@Valium ",
    "/Yesterday \t",
    "@Val\nium",
    "/\tToday",
  ]) {
    assert.equal(getJournalMentionToken(source, source.length), null, source);
  }
  for (const [source, query] of [
    ["/Today", "Today"],
    ["/9/11", "9/11"],
    ["/2026-W46", "2026-W46"],
    ["/Yesterday.Morning", "Yesterday.Morning"],
  ]) {
    assert.deepEqual(getJournalMentionToken(source, source.length), {
      start: 0,
      end: source.length,
      trigger: "/",
      query,
    });
  }
  assert.equal(getJournalMentionToken("ordinary/path", 13), null);
  assert.equal(getJournalMentionToken("https://example.test/Today", 26), null);
});

test("calendar tokens have the same code, Markdown link and escape shielding as medications", () => {
  for (const source of [
    "`/Today`",
    "```\n/Today\n```",
    "[see /Today](/history)",
    "[unfinished /Today",
    "<https://example.test/Today>",
    String.raw`\/Today`,
    "    /Today",
  ]) {
    const offset = source.indexOf("/Today") + 6;
    assert.equal(getJournalMentionToken(source, offset), null, source);
  }
});

test("@ offers manual categories and ingredients but never dosage forms, dates or flattened intakes", () => {
  const data = fixture();
  data.medications[0].categories = ["benzodiazepine", "sleep-aid"];
  const results = searchJournalMentions(data, "", today, "@");
  assert.ok(
    results.every((item) =>
      ["medication", "ingredient", "category"].includes(item.kind),
    ),
  );
  assert.equal(
    searchJournalMentions(data, "benzos", today, "@").find(
      (item) => item.kind === "category",
    )?.category,
    "benzodiazepine",
  );
  assert.ok(
    searchJournalMentions(data, "tablets", today, "@").every(
      (item) => item.label !== "Tablet" && !item.href.includes("/types/"),
    ),
  );
  assert.deepEqual(searchJournalMentions(data, "Today", today, "@"), []);
  assert.ok(
    searchJournalMentions(data, "", today, "/").every((item) =>
      ["day", "week"].includes(item.kind),
    ),
  );
  assert.deepEqual(searchJournalMentions(data, "Valium", today, "/"), []);
});

test("current-day intake children use the journal timezone's 06:00 boundary across midnight and DST", () => {
  const data = fixture();
  const now = "2026-03-29T02:40:00Z"; // Vienna04:40 after the spring DST jump.
  const trackingDay = dayKey(now, data.settings.timezone);
  assert.equal(trackingDay, "2026-03-28");
  data.intakes = [
    "2026-03-28T23:10:00Z",
    "2026-03-29T02:30:00Z",
    "2026-03-29T04:00:00Z",
    "invalid",
  ].map((takenAt, index) => ({
    ...data.intakes[0],
    id: `dst-${index}`,
    medicationId: "v5",
    takenAt,
  }));
  const results = searchJournalMentions(data, "Valium", trackingDay, "@", now);
  const children = results.find(
    (item) => item.medication?.id === "v5",
  )?.children;
  assert.deepEqual(
    children?.map((item) => item.intake?.id),
    ["dst-1", "dst-0"],
  );
  assert.match(children![0].label, /04:30/);
  assert.equal(children![0].href, "/history/2026-03-28?intake=dst-1");
  assert.ok(results.every((item) => item.kind !== "intake"));
  assert.equal(
    searchJournalMentions(data, "Valium", trackingDay, "@", "invalid").find(
      (item) => item.medication?.id === "v5",
    )?.children,
    undefined,
  );
  const autumn = "2026-10-25T04:30:00Z";
  assert.equal(dayKey(autumn, data.settings.timezone), "2026-10-24");
});

test("day journal children include short nonempty morning and legacy evening writing without flattening", () => {
  const data = fixture();
  data.dailyCheckIns = [
    { ...checkIn(today), period: "morning", note: "A tiny note." },
    { ...checkIn(today), note: "Evening words." },
    { ...checkIn("2026-11-09"), period: "morning", note: "   " },
  ];
  const results = searchJournalMentions(data, "Today", today, "/");
  assert.deepEqual(
    results[0].children?.map((item) => item.href),
    [`/journal/${today}/morning`, `/journal/${today}/evening`],
  );
  assert.ok(results.every((item) => item.kind !== "reflection"));
  assert.equal(
    searchJournalMentions(data, "Today.Morning", today, "/")[0].href,
    `/journal/${today}/morning`,
  );
  assert.ok(
    searchJournalMentions(data, "2026-11-09.Morning", today, "/").every(
      (item) => item.kind !== "reflection",
    ),
  );
});

test("calendar aliases resolve current days, stable relative weeks, ISO rollovers and real dates", () => {
  for (const [query, anchor, href] of [
    ["Today", today, `/history/${today}`],
    ["Yesterday", today, "/history/2026-11-09"],
    ["DayBeforeYesterday", today, "/history/2026-11-08"],
    ["Today.Morning", today, `/journal/${today}/morning`],
    ["Yesterday/Evening", today, "/journal/2026-11-09/evening"],
    ["Morning", today, `/journal/${today}/morning`],
    ["ThisWeek", "2021-01-01", "/history/weeks/2020-12-28"],
    ["LastWeek", "2021-01-01", "/history/weeks/2020-12-21"],
    ["2020-W53", today, "/history/weeks/2020-12-28"],
    ["2026-11-10", today, `/history/${today}`],
    ["29 Feb", "2103-01-01", "/history/2096-02-29"],
  ]) {
    const result = parseJournalCalendarReference(query, anchor);
    assert.ok(result, query);
    assert.equal(journalCalendarHref(result), href, query);
  }
  for (const query of [
    " Today",
    "2026-W54",
    "2021-W53",
    "2026-W00",
    "2027-W01",
    "2026-02-29",
    "Tomorrow",
    "ThisWeek.Morning",
    "9 Nov 202",
  ])
    assert.equal(parseJournalCalendarReference(query, today), null, query);
  assert.deepEqual(
    parseJournalCalendarReference("Today", "2028-12-01", today),
    { kind: "day", day: today },
  );
});

test("all portable reference destinations parse strictly and traversal never becomes an entity ID", () => {
  for (const [href, reference] of [
    [
      "/medications/categories/stimulant",
      { kind: "category", category: "stimulant" },
    ],
    ["/medications/v5", { kind: "medication", id: "v5" }],
    [
      "/history/2026-11-09?intake=i%3A1",
      { kind: "intake", day: "2026-11-09", id: "i:1" },
    ],
    ["/history/weeks/2026-11-09", { kind: "week", weekStart: "2026-11-09" }],
    [
      "/journal/2026-11-09/morning",
      { kind: "reflection", day: "2026-11-09", period: "morning" },
    ],
  ] as const)
    assert.deepEqual(parseJournalMentionHref(href), reference, href);
  for (const href of [
    "javascript:alert(1)",
    "/medications/categories/tablet",
    "/medications/categories/unknown",
    "/history/weeks/2026-11-10",
    "/journal/2026-02-29/morning",
    "/journal/2026-11-09/night",
    "/history/2026-11-09?intake=x&intake=y",
    "/history/2026-11-09?intake=..",
    "/history/2026-11-09?intake=%2f..",
    "/history/2026-11-09?intake=%252f",
    "/medications/%2e%2e",
    "/medications?medication=%2f..",
    "/medications?medication=%5c..",
    "/medications?medication=%23x",
    "/medications/a%00b",
    "/medications/a%C2%85b",
    "/medications/a%E2%80%8Bb",
    "/medications/a%5Db",
    "/history/2026-11-09?intake=%",
    "/medications/a?extra=1",
  ])
    assert.equal(parseJournalMentionHref(href), null, href);
});

test("calendar insertion preserves the correct trigger and all reference kinds obey the draft length guard", () => {
  const source = "/Today, then more";
  const token = getJournalMentionToken(source, 6)!;
  const mention: JournalMention = {
    key: "day:test",
    kind: "day",
    label: "Today",
    detail: "",
    href: `/history/${today}`,
  };
  assert.equal(
    applyJournalMention(source, token, mention)?.value,
    `[/Today](/history/${today}), then more`,
  );
  assert.equal(
    applyJournalMention(
      "@Today",
      getJournalMentionToken("@Today", 6)!,
      mention,
    ),
    null,
  );
  const data = fixture();
  for (const trigger of ["@", "/"] as const) {
    const source = trigger;
    const token = getJournalMentionToken(source, 1)!;
    for (const item of searchJournalMentions(data, "", today, trigger)) {
      const result = applyJournalMention(source, token, item);
      assert.ok(result, item.href);
      assert.equal(
        applyJournalMention(source, token, item, result.value.length - 1),
        null,
      );
      assert.equal(
        applyJournalMention(source, token, item, result.value.length)?.value,
        result.value,
      );
    }
  }
});

test("the live catalog resolves missing records safely and sorts ingredient targets by actual usage", () => {
  const data = fixture();
  data.medications[0].categories = ["benzodiazepine"];
  const catalog = createJournalReferenceCatalog(data, today);
  assert.equal(catalog.ingredients.get("diazepam")?.[0].id, "v10");
  assert.equal(catalog.categories.get("benzodiazepine")?.[0].id, "v5");
  assert.equal(catalog.intakes.get("i3")?.medicationId, "rit");
  assert.equal(catalog.intakes.get("missing"), undefined);
  assert.equal(catalog.reflections.get(`${today}:evening`)?.day, today);
  assert.equal(catalog.reflections.get(`${today}:morning`), undefined);
  assert.equal(catalog.weeks.get("2026-11-09")?.intakes, 3);
  assert.equal(catalog.timezone, "Europe/Vienna");
  assert.equal(catalog.today, today);
  assert.equal(createJournalReferenceCatalog(null, today).ingredients.size, 0);
});
