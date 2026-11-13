import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMarkdownFormat,
  activeMarkdownFormats,
  buildMarkdownFormatRanges,
  reflectionStats,
  type MarkdownEdit,
} from "./reflection-writing";

function activeAt(value: string, start: number, end = start) {
  return activeMarkdownFormats(buildMarkdownFormatRanges(value), start, end);
}

test("active inline formats follow the source caret and complete selections", () => {
  const value = "before **bright** after";
  const index = buildMarkdownFormatRanges(value);
  assert.equal(activeMarkdownFormats(index, 10, 10).has("bold"), true);
  assert.equal(activeMarkdownFormats(index, 9, 15).has("bold"), true);
  assert.equal(activeMarkdownFormats(index, 7, 17).has("bold"), true);
  assert.equal(activeMarkdownFormats(index, 0, 0).has("bold"), false);
  assert.equal(activeMarkdownFormats(index, 17, 17).has("bold"), false);
  assert.equal(activeMarkdownFormats(index, 9, 20).has("bold"), false);
  assert.equal(activeAt("_soft_", 3).has("italic"), true);
  assert.equal(activeAt("*soft*", 3).has("italic"), true);
  assert.equal(activeAt("__strong__", 4).has("bold"), true);
  assert.equal(activeAt("~~gone~~", 4).has("strike"), true);
  assert.equal(activeAt("***both***", 4).has("bold"), true);
  assert.equal(activeAt("***both***", 4).has("italic"), true);
  assert.equal(activeAt("word_with_underscores", 8).has("italic"), false);
});

test("active inline syntax excludes escapes, code contents and blank paragraph crossings", () => {
  assert.equal(activeAt("\\*\\*literal\\*\\*", 6).has("bold"), false);
  assert.equal(activeAt("\\**literal**", 6).has("bold"), false);
  assert.equal(activeAt("**before\n \nafter**", 5).has("bold"), false);
  for (const value of ["`**literal**`", "`` ~~literal~~ ` ticks ``"]) {
    const active = activeAt(value, value.indexOf("literal") + 2);
    assert.equal(active.has("code"), true);
    assert.equal(active.has("bold"), false);
    assert.equal(active.has("strike"), false);
  }
  const crossing = "**before\n```\ninside\n```\nafter**";
  assert.equal(activeAt(crossing, 5).has("bold"), false);
  assert.equal(activeAt("`unclosed", 4).has("code"), false);
});

test("fenced code tracks matching delimiter characters, lengths and unclosed fences", () => {
  const value = "````md\n**inside**\n```\n_still inside_\n````\n**outside**";
  for (const word of ["inside", "still"]) {
    const active = activeAt(value, value.indexOf(word) + 2);
    assert.equal(active.has("code"), true);
    assert.equal(active.has("bold"), false);
    assert.equal(active.has("italic"), false);
  }
  const outside = activeAt(value, value.indexOf("outside") + 2);
  assert.equal(outside.has("code"), false);
  assert.equal(outside.has("bold"), true);
  assert.equal(activeAt("~~~\n# literal\n```\nmore", 18).has("code"), true);
  assert.equal(activeAt("~~~\nline\n~~~\nplain", 16).has("code"), false);
  assert.equal(activeAt("```\n\n```", 4, 5).has("code"), true);
});

test("line active states cover all nonblank touched lines without including the next line", () => {
  const value = "- one\n\n- two\nplain";
  assert.equal(activeAt(value, 3).has("bullet"), true);
  assert.equal(activeAt(value, 0, 13).has("bullet"), true);
  assert.equal(activeAt(value, 0, value.length).has("bullet"), false);
  assert.equal(activeAt(value, 6).has("bullet"), false);
  assert.equal(activeAt("## Heading", 5).has("heading"), true);
  assert.equal(activeAt("###### Heading", 9).has("heading"), true);
  assert.equal(activeAt("1. first\n2. next", 3, 16).has("numbered"), true);
  const quotedTask = activeAt("> - [x] task", 9);
  assert.equal(quotedTask.has("quote"), true);
  assert.equal(quotedTask.has("task"), true);
  assert.equal(quotedTask.has("bullet"), false);
  assert.equal(activeAt("* * *", 2).has("bullet"), false);
  assert.equal(activeAt("---", 2).has("rule"), false);
});

test("links identify labels and destinations without treating images or URL punctuation as emphasis", () => {
  const value = "[**label**](https://example.test/a(b)_c_) after";
  assert.equal(activeAt(value, 5).has("link"), true);
  assert.equal(activeAt(value, 5).has("bold"), true);
  assert.equal(activeAt(value, value.indexOf("_c_") + 1).has("link"), true);
  assert.equal(activeAt(value, value.indexOf("_c_") + 1).has("italic"), false);
  assert.equal(activeAt(value, 0, value.indexOf(" after")).has("link"), true);
  assert.equal(
    activeAt("![image](https://example.test)", 4).has("link"),
    false,
  );
  assert.equal(
    activeAt("`[literal](https://example.test)`", 5).has("link"),
    false,
  );
  assert.equal(activeAt("<https://example.test>", 8).has("link"), true);
  assert.equal(activeAt("[unclosed](https://", 5).has("link"), false);
  assert.equal(activeAt("[first\n \nlast](url)", 3).has("link"), false);
  assert.equal(
    activeAt("[first\n```\ninside\n```\nlast](url)", 3).has("link"),
    false,
  );
});

test("formatter selections, empty scaffolds and Unicode remain compatible with active states", () => {
  for (const kind of ["bold", "italic", "strike", "code"] as const) {
    const edit = applyMarkdownFormat("a 😀 b", 2, 4, kind);
    assert.equal(
      activeAt(edit.value, edit.selectionStart, edit.selectionEnd).has(kind),
      true,
    );
    const undone = applyMarkdownFormat(
      edit.value,
      edit.selectionStart,
      edit.selectionEnd,
      kind,
    );
    assert.equal(
      activeAt(undone.value, undone.selectionStart, undone.selectionEnd).has(
        kind,
      ),
      false,
    );
  }
  for (const kind of ["bold", "italic"] as const) {
    const edit = applyMarkdownFormat("", 0, 0, kind);
    assert.equal(activeAt(edit.value, edit.selectionStart).has(kind), true);
  }
  // Four tildes alone are a Markdown fence, even if inserted by the empty
  // strikethrough action. Active state reflects source rather than click history.
  assert.equal(activeAt("~~~~", 2).has("code"), true);
  assert.equal(activeAt("~~~~", 2).has("strike"), false);
  assert.equal(activeAt("a_😀_b", 2, 4).has("italic"), false);
  assert.equal(activeAt("****", 0, 4).has("bold"), false);
  assert.doesNotThrow(() => activeAt("**word**", -Infinity, Infinity));
});

test("large malformed notes are indexed without repeated remainder rescans", () => {
  for (const value of [
    "[x](".repeat(20_000),
    "`".repeat(100_000),
    "*_a ".repeat(20_000),
  ]) {
    const index = buildMarkdownFormatRanges(value);
    assert.equal(index.length, value.length);
    assert.equal(
      activeMarkdownFormats(index, value.length, value.length).has("rule"),
      false,
    );
  }
});

function selected(edit: MarkdownEdit) {
  assert.ok(edit.selectionStart >= 0);
  assert.ok(edit.selectionEnd >= edit.selectionStart);
  assert.ok(edit.selectionEnd <= edit.value.length);
  return edit.value.slice(edit.selectionStart, edit.selectionEnd);
}

test("inline formatting preserves UTF-16 emoji selections and toggles both inner and full marker selections", () => {
  for (const [kind, marker] of [
    ["bold", "**"],
    ["italic", "_"],
    ["strike", "~~"],
  ] as const) {
    const edit = applyMarkdownFormat("a😀b", 1, 3, kind);
    assert.equal(edit.value, `a${marker}😀${marker}b`);
    assert.equal(selected(edit), "😀");
    const undone = applyMarkdownFormat(
      edit.value,
      edit.selectionStart,
      edit.selectionEnd,
      kind,
    );
    assert.equal(undone.value, "a😀b");
    assert.equal(selected(undone), "😀");
    const whole = applyMarkdownFormat(
      `${marker}word${marker}`,
      0,
      marker.length * 2 + 4,
      kind,
    );
    assert.equal(whole.value, "word");
    assert.equal(selected(whole), "word");
  }
});

test("empty caret formatting inserts reusable marker pairs and clamps unsupported offsets", () => {
  const edit = applyMarkdownFormat("", 0, 0, "bold");
  assert.deepEqual(edit, { value: "****", selectionStart: 2, selectionEnd: 2 });
  assert.equal(applyMarkdownFormat(edit.value, 2, 2, "bold").value, "");
  const clamped = applyMarkdownFormat("abc", -100, Infinity, "italic");
  assert.equal(clamped.value, "_abc_");
  assert.equal(selected(clamped), "abc");
  const reversed = applyMarkdownFormat("abc", 2, 1, "bold");
  assert.equal(reversed.value, "ab****c");
  assert.equal(selected(reversed), "");
});

test("line formatting at offset zero never skips or duplicates a leading newline", () => {
  const result = applyMarkdownFormat("\nfirst", 0, 0, "heading");
  assert.deepEqual(result, {
    value: "## \nfirst",
    selectionStart: 3,
    selectionEnd: 3,
  });
  const all = applyMarkdownFormat("\nfirst\nsecond", 0, 13, "bullet");
  assert.equal(all.value, "\n- first\n- second");
  assert.equal(selected(all), all.value);
});

test("a selection ending at a newline formats only its selected lines and retains a toggleable selection", () => {
  const value = "one\ntwo\nthree";
  const edit = applyMarkdownFormat(value, 0, 8, "bullet");
  assert.equal(edit.value, "- one\n- two\nthree");
  assert.equal(selected(edit), "- one\n- two");
  const undone = applyMarkdownFormat(
    edit.value,
    edit.selectionStart,
    edit.selectionEnd,
    "bullet",
  );
  assert.equal(undone.value, value);
  assert.equal(selected(undone), "one\ntwo");
});

test("mixed line selections avoid duplicate markers and preserve checked tasks", () => {
  for (const [kind, value, expected] of [
    ["bullet", "- one\ntwo", "- one\n- two"],
    ["numbered", "7. one\ntwo\n\nthree", "1. one\n2. two\n\n3. three"],
    ["quote", "> one\ntwo", "> one\n> two"],
    ["task", "- [x] one\ntwo", "- [x] one\n- [ ] two"],
    ["heading", "### one\ntwo", "## one\n## two"],
  ] as const) {
    const edit = applyMarkdownFormat(value, 0, value.length, kind);
    assert.equal(edit.value, expected);
    assert.equal(selected(edit), expected);
  }
  assert.equal(
    applyMarkdownFormat("- [x] one\n- [ ] two", 0, 20, "task").value,
    "one\ntwo",
  );
});

test("line prefixes move an emoji caret with its original text and keep indentation", () => {
  const edit = applyMarkdownFormat("  😀 hello\nnext", 4, 4, "quote");
  assert.equal(edit.value, "  > 😀 hello\nnext");
  assert.equal(edit.selectionStart, 6);
  assert.equal(selected(edit), "");
  const undone = applyMarkdownFormat(
    edit.value,
    edit.selectionStart,
    edit.selectionEnd,
    "quote",
  );
  assert.equal(undone.value, "  😀 hello\nnext");
  assert.equal(undone.selectionStart, 4);
});

test("inline code toggles before choosing delimiters and preserves literal backticks and edge spaces", () => {
  for (const value of [
    "word",
    "a`b",
    "`literal`",
    "two``ticks",
    " surrounded ",
  ]) {
    const edit = applyMarkdownFormat(value, 0, value.length, "code");
    // A complete existing code span is toggled off, rather than nested.
    if (value === "`literal`") {
      assert.equal(edit.value, "literal");
      continue;
    }
    assert.equal(selected(edit), value);
    const undone = applyMarkdownFormat(
      edit.value,
      edit.selectionStart,
      edit.selectionEnd,
      "code",
    );
    assert.equal(undone.value, value);
    assert.equal(selected(undone), value);
  }
  const literal = applyMarkdownFormat("`", 0, 1, "code");
  assert.equal(literal.value, "`` ` ``");
  assert.equal(selected(literal), "`");
  assert.equal(
    applyMarkdownFormat(
      literal.value,
      literal.selectionStart,
      literal.selectionEnd,
      "code",
    ).value,
    "`",
  );
  assert.equal(applyMarkdownFormat("`` a`b ``", 0, 9, "code").value, "a`b");
});

test("multiline code chooses a safe fence and toggles the retained content selection", () => {
  const value = "first\n```\nlast";
  const edit = applyMarkdownFormat(value, 0, value.length, "code");
  assert.equal(edit.value, "````\nfirst\n```\nlast\n````");
  assert.equal(selected(edit), value);
  const undone = applyMarkdownFormat(
    edit.value,
    edit.selectionStart,
    edit.selectionEnd,
    "code",
  );
  assert.equal(undone.value, value);
  assert.equal(selected(undone), value);
  assert.equal(
    applyMarkdownFormat("```ts\nfirst\nlast\n```", 0, 22, "code").value,
    "first\nlast",
  );
  const midline = applyMarkdownFormat(
    "before first\nlast after",
    7,
    17,
    "code",
  );
  assert.equal(midline.value, "before \n```\nfirst\nlast\n```\n after");
  assert.equal(selected(midline), "first\nlast");
});

test("links retain the intended editable selection and escape problematic labels and URL punctuation", () => {
  const url = "https://example.test/a(b)";
  const edit = applyMarkdownFormat(url, 0, url.length, "link");
  assert.equal(edit.value, "[link text](https://example.test/a\\(b\\))");
  assert.equal(selected(edit), "link text");
  const label = applyMarkdownFormat("a [label]\nnext", 0, 14, "link");
  assert.equal(label.value, "[a \\[label\\] next](https://)");
  assert.equal(selected(label), "https://");
  const empty = applyMarkdownFormat("", 0, 0, "link");
  assert.equal(empty.value, "[link text](https://)");
  assert.equal(selected(empty), "https://");
});

test("horizontal rules remain separate blocks and leave the caret ready for new writing", () => {
  for (const [value, expected] of [
    ["", "---\n\n"],
    ["one", "one\n\n---\n\n"],
    ["one\n", "one\n\n---\n\n"],
    ["one\n\n", "one\n\n---\n\n"],
  ]) {
    const edit = applyMarkdownFormat(value, value.length, value.length, "rule");
    assert.equal(edit.value, expected);
    assert.equal(edit.selectionStart, expected.length);
    assert.equal(selected(edit), "");
  }
});

test("statistics ignore Markdown scaffolding while retaining Unicode words and meaningful paragraphs", () => {
  assert.deepEqual(reflectionStats("  \n\t"), {
    words: 0,
    characters: 4,
    paragraphs: 0,
    headings: 0,
    readingMinutes: 0,
    excerpt: "",
  });
  const note =
    "# Today\n\n**Café** and [friends](https://example.test).\n\n- [x] A small win.";
  const stats = reflectionStats(note);
  assert.equal(stats.words, 7);
  assert.equal(stats.headings, 1);
  assert.equal(stats.paragraphs, 3);
  assert.equal(stats.characters, note.length);
  assert.equal(stats.excerpt, "Today Café and friends. A small win.");
  assert.equal(reflectionStats("word ".repeat(220)).readingMinutes, 1);
  assert.equal(reflectionStats("word ".repeat(221)).readingMinutes, 2);
});

test("heading statistics respect fence characters, lengths and valid closing lines", () => {
  const note =
    "# Visible\n\n````md\n## Inside\n```\n### Still inside\n```` not a closing fence\n#### Also inside\n````\n\n## Visible again";
  assert.equal(reflectionStats(note).headings, 2);
  assert.equal(
    reflectionStats("~~~\n# Inside\n```\n## Still inside\n~~~\n# Outside")
      .headings,
    1,
  );
});

test("excerpts do not append an ellipsis without truncation or split emoji surrogate pairs", () => {
  const shortEmoji = "😀".repeat(91);
  assert.equal(reflectionStats(shortEmoji).excerpt, shortEmoji);
  const excerpt = reflectionStats("😀".repeat(200)).excerpt;
  assert.equal(excerpt, `${"😀".repeat(177)}…`);
  assert.equal(Array.from(excerpt).length, 178);
  assert.equal(reflectionStats("x".repeat(181)).excerpt, `${"x".repeat(177)}…`);
});

test("statistics retain ordinary HTML text and autolinks while omitting comments and raw script/style blocks", () => {
  const note =
    "Before <b>bold</b> <SCRIPT>not counted</SCRIPT> after <!-- hidden --> end <style>unclosed content";
  const stats = reflectionStats(note);
  assert.equal(stats.words, 4);
  assert.equal(stats.excerpt, "Before bold after end");
  assert.equal(
    reflectionStats(
      "Contact <mailto:reader@example.test> or <https://example.test/path>.",
    ).excerpt,
    "Contact mailto:reader@example.test or https://example.test/path.",
  );
  assert.equal(
    reflectionStats("A heart <3 remains.").excerpt,
    "A heart <3 remains.",
  );
  assert.equal(
    reflectionStats("Visible <!-- unclosed comment").excerpt,
    "Visible",
  );
});

test("100,000-character malformed Markdown and HTML stay bounded instead of rescanning every opener", () => {
  const fixtures = [
    "[".repeat(100_000),
    "[x](".repeat(25_000),
    "[\n".repeat(50_000),
    "<".repeat(100_000),
    "<tag".repeat(25_000),
    "<!--".repeat(25_000),
    "<script>".repeat(12_500),
    "<style>".repeat(14_286).slice(0, 100_000),
    "<https://".repeat(11_112).slice(0, 100_000),
  ];
  for (const note of fixtures) {
    assert.equal(note.length, 100_000);
    const start = performance.now();
    const stats = reflectionStats(note);
    const elapsed = performance.now() - start;
    assert.equal(stats.characters, 100_000);
    assert.ok(
      elapsed < 1_000,
      `Malformed prefix ${JSON.stringify(note.slice(0, 10))} took ${elapsed.toFixed(0)}ms`,
    );
  }
  assert.equal(reflectionStats("<script>".repeat(12_500)).words, 0);
  assert.equal(reflectionStats("<!--".repeat(25_000)).paragraphs, 0);
});
