/** A forward-only scan keeps incomplete HTML/comments from rescanning long notes. */
function textWithoutHtml(value: string) {
  const tokens =
    /<!--|<((?:https?:\/\/|mailto:)[^<>\n]+)>|<\/?[A-Za-z][^<>]*>/gi;
  const pieces: string[] = [];
  let from = 0;
  let token: RegExpExecArray | null;
  while ((token = tokens.exec(value))) {
    pieces.push(value.slice(from, token.index));
    if (token[0] === "<!--") {
      const close = value.indexOf("-->", tokens.lastIndex);
      if (close === -1) return pieces.join("");
      from = close + 3;
      tokens.lastIndex = from;
      continue;
    }
    const rawText = /^<(script|style)(?=[\s/>])/i.exec(token[0]);
    if (rawText) {
      const closing = new RegExp(`</${rawText[1]}[ \\t\\r\\n]*>`, "gi");
      closing.lastIndex = tokens.lastIndex;
      if (!closing.exec(value)) return pieces.join("");
      from = closing.lastIndex;
      tokens.lastIndex = from;
      continue;
    }
    if (token[1]) pieces.push(token[1]);
    from = tokens.lastIndex;
  }
  pieces.push(value.slice(from));
  return pieces.join("");
}

/** Lightweight reading statistics; Markdown rendering is deferred to the preview. */
export function reflectionStats(value: string) {
  let inFence = false;
  let fenceCharacter = "";
  let fenceLength = 0;
  let headings = 0;
  const contentLines: string[] = [];
  for (const line of value.split("\n")) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (inFence) {
      if (
        fence &&
        fence[1][0] === fenceCharacter &&
        fence[1].length >= fenceLength &&
        /^[ \t]*$/.test(fence[2])
      ) {
        inFence = false;
        contentLines.push("");
      } else contentLines.push(line);
      continue;
    }
    if (fence && (fence[1][0] !== "`" || !fence[2].includes("`"))) {
      inFence = true;
      fenceCharacter = fence[1][0];
      fenceLength = fence[1].length;
      contentLines.push("");
      continue;
    }
    if (/^ {0,3}#{1,6}\s+\S/.test(line)) headings++;
    contentLines.push(line);
  }
  const plain = textWithoutHtml(contentLines.join("\n"))
    // A malformed candidate stops at the next opener instead of scanning the
    // remaining note again for every unmatched bracket or destination.
    .replace(/!?\[([^[\]\n]*)\]\((?:\\[^\n]|[^()[\]\n\\])*\)/g, "$1")
    .replace(/^ {0,3}\[[^[\]\n]+\]:[^\n]*$/gm, "")
    .replace(
      /^[ \t]{0,3}(?:#{1,6}[ \t]+|>[ \t]?|[-+*][ \t]+(?:\[[ xX]\][ \t]*)?|\d+[.)][ \t]+)/gm,
      "",
    )
    .replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, "")
    .replace(/^[ \t]*\|?(?:[ \t]*:?-+:?[ \t]*\|)+[ \t]*:?-*:?[ \t]*$/gm, "")
    .replace(/\\([\\`*_[\]{}()#+.!>|~-])/g, "$1")
    .replace(/[*_`~|]/g, "")
    .trim();
  const words =
    plain.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  const collapsed = plain.replace(/\s+/g, " ");
  const excerptCharacters = Array.from(collapsed);
  const excerpt =
    excerptCharacters.length > 180
      ? `${excerptCharacters.slice(0, 177).join("").trimEnd()}…`
      : collapsed;
  return {
    words,
    characters: value.length,
    paragraphs: plain
      ? plain.split(/\n\s*\n/).filter((part) => part.trim()).length
      : 0,
    headings,
    readingMinutes: words ? Math.ceil(words / 220) : 0,
    excerpt,
  };
}

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "heading"
  | "bullet"
  | "numbered"
  | "quote"
  | "link"
  | "code"
  | "strike"
  | "task"
  | "rule";

type MarkdownSourceRange = {
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  scaffold?: boolean;
};
type MarkdownSourceLine = {
  start: number;
  end: number;
  blank: boolean;
  formats: Set<MarkdownFormat>;
};
const trackedFormats = [
  "bold",
  "italic",
  "strike",
  "heading",
  "bullet",
  "numbered",
  "task",
  "quote",
  "link",
  "code",
] as const;
const lineFormats = [
  "heading",
  "bullet",
  "numbered",
  "task",
  "quote",
  "code",
] as const;

/** A source index, built once per value; caret changes only query its ranges. */
export type MarkdownFormatRanges = {
  length: number;
  byFormat: Record<MarkdownFormat, MarkdownSourceRange[]>;
  lines: MarkdownSourceLine[];
  nonblank: number[];
  lineCounts: Record<(typeof lineFormats)[number], number[]>;
};

function sourceLineIndex(lines: readonly { start: number }[], offset: number) {
  let low = 0;
  let high = lines.length;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].start <= offset) low = middle;
    else high = middle;
  }
  return low;
}

/**
 * Index common Markdown source syntax without rendering or touching the DOM.
 * This deliberately stays conservative for malformed/unsupported syntax. Code
 * spans/fences shield their contents from emphasis and link recognition. All
 * offsets retain the textarea's UTF-16 convention, including emoji selections.
 */
export function buildMarkdownFormatRanges(value: string): MarkdownFormatRanges {
  const byFormat: Record<MarkdownFormat, MarkdownSourceRange[]> = {
    bold: [],
    italic: [],
    strike: [],
    heading: [],
    bullet: [],
    numbered: [],
    task: [],
    quote: [],
    link: [],
    code: [],
    rule: [],
  };
  const lines: MarkdownSourceLine[] = [];
  const excluded = new Uint8Array(value.length);
  const escaped = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "\\") {
      if (index + 1 < value.length) escaped[++index] = 1;
    }
  }
  let fence: {
    character: string;
    length: number;
    start: number;
    contentStart: number;
  } | null = null;
  let position = 0;
  do {
    const newline = value.indexOf("\n", position);
    const end = newline === -1 ? value.length : newline;
    const text = value.slice(position, end).replace(/\r$/, "");
    const formats = new Set<MarkdownFormat>();
    let body = text;
    // A quoted list can carry both its container and its list format.
    let quote: RegExpExecArray | null;
    while ((quote = /^ {0,3}>[ \t]?/.exec(body))) {
      formats.add("quote");
      body = body.slice(quote[0].length);
    }
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(body);
    if (fence) {
      formats.add("code");
      excluded.fill(1, position, newline === -1 ? end : end + 1);
      if (
        marker &&
        marker[1][0] === fence.character &&
        marker[1].length >= fence.length &&
        /^[ \t]*$/.test(marker[2])
      ) {
        byFormat.code.push({
          start: fence.start,
          end,
          contentStart: fence.contentStart,
          contentEnd: position,
        });
        fence = null;
      }
    } else if (marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
      formats.add("code");
      excluded.fill(1, position, newline === -1 ? end : end + 1);
      fence = {
        character: marker[1][0],
        length: marker[1].length,
        start: position,
        contentStart: newline === -1 ? end : end + 1,
      };
    } else {
      if (/^ {0,3}#{1,6}(?:[ \t]+|$)/.test(body)) formats.add("heading");
      const rule =
        /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(
          body,
        );
      if (!rule) {
        if (/^[ \t]*[-+*][ \t]+\[[ xX]\](?:[ \t]+|$)/.test(body))
          formats.add("task");
        else if (/^[ \t]*[-+*][ \t]+/.test(body)) formats.add("bullet");
        if (/^[ \t]*\d{1,9}[.)][ \t]+/.test(body)) formats.add("numbered");
      }
    }
    lines.push({ start: position, end, blank: !text.trim(), formats });
    if (newline === -1) break;
    position = end + 1;
  } while (position <= value.length);
  if (fence) {
    byFormat.code.push({
      start: fence.start,
      end: value.length,
      contentStart: fence.contentStart,
      contentEnd: value.length,
    });
  }

  // Matching delimiter runs are indexed once; unmatched runs never rescan the
  // remainder of a long note. Blank lines and fences split inline paragraphs.
  const codeRuns: { start: number; end: number; paragraph: number }[] = [];
  let paragraph = 0;
  let lineIndex = 0;
  for (let index = 0; index < value.length; index++) {
    while (
      lineIndex + 1 < lines.length &&
      lines[lineIndex + 1].start <= index
    ) {
      lineIndex++;
      if (lines[lineIndex].blank || lines[lineIndex].formats.has("code"))
        paragraph++;
    }
    if (excluded[index] || value[index] !== "`") continue;
    const start = index;
    while (value[index + 1] === "`" && !excluded[index + 1]) index++;
    codeRuns.push({ start, end: index + 1, paragraph });
  }
  const nextRun = new Int32Array(codeRuns.length).fill(-1);
  const lastRun = new Map<string, number>();
  for (let index = codeRuns.length - 1; index >= 0; index--) {
    const run = codeRuns[index];
    const key = `${run.paragraph}:${run.end - run.start}`;
    nextRun[index] = lastRun.get(key) ?? -1;
    lastRun.set(key, index);
  }
  for (let index = 0; index < codeRuns.length; index++) {
    const run = codeRuns[index];
    if (escaped[run.start] || excluded[run.start]) continue;
    const closing = nextRun[index];
    if (closing === -1) continue;
    const close = codeRuns[closing];
    byFormat.code.push({
      start: run.start,
      end: close.end,
      contentStart: run.end,
      contentEnd: close.start,
    });
    excluded.fill(1, run.start, close.end);
    index = closing;
  }

  // Pair parentheses before links so repeated incomplete destinations stay O(n).
  const parentheses = new Int32Array(value.length).fill(-1);
  const openingParentheses: number[] = [];
  for (let index = 0; index < value.length; index++) {
    if (excluded[index] || escaped[index]) continue;
    if (value[index] === "(") openingParentheses.push(index);
    else if (value[index] === ")") {
      const start = openingParentheses.pop();
      if (start !== undefined) parentheses[start] = index;
    }
  }
  const labelStarts: number[] = [];
  const destinations: [number, number][] = [];
  const blockBreaks = [0];
  for (const line of lines)
    blockBreaks.push(
      blockBreaks.at(-1)! + Number(line.blank || line.formats.has("code")),
    );
  for (let index = 0; index < value.length; index++) {
    if (excluded[index] || escaped[index]) continue;
    if (value[index] === "[") labelStarts.push(index);
    else if (value[index] === "]") {
      const start = labelStarts.pop();
      const closing = parentheses[index + 1];
      if (
        start !== undefined &&
        value[index + 1] === "(" &&
        closing >= 0 &&
        blockBreaks[sourceLineIndex(lines, closing) + 1] ===
          blockBreaks[sourceLineIndex(lines, start)] &&
        !(value[start - 1] === "!" && !escaped[start - 1])
      ) {
        byFormat.link.push({
          start,
          end: closing + 1,
          contentStart: start + 1,
          contentEnd: closing,
        });
        destinations.push([index + 1, closing + 1]);
        index = closing;
      }
    } else if (value[index] === "\n" && value[index + 1] === "\n")
      labelStarts.length = 0;
  }
  for (const [start, end] of destinations) excluded.fill(1, start, end);
  const autolinks = /<(?:https?:\/\/|mailto:)[^<>\n]+>/g;
  let autolink: RegExpExecArray | null;
  while ((autolink = autolinks.exec(value))) {
    if (excluded[autolink.index] || escaped[autolink.index]) continue;
    byFormat.link.push({
      start: autolink.index,
      end: autolinks.lastIndex,
      contentStart: autolink.index + 1,
      contentEnd: autolinks.lastIndex - 1,
    });
    excluded.fill(1, autolink.index, autolinks.lastIndex);
  }

  type Delimiter = {
    start: number;
    remaining: number;
    original: number;
    canClose: boolean;
  };
  const stacks: Record<string, Delimiter[]> = { "*": [], _: [], "~": [] };
  const whitespace = (character: string) => !character || /\s/u.test(character);
  const punctuation = (character: string) => /[\p{P}\p{S}]/u.test(character);
  let emphasisLine = 0;
  for (let index = 0; index < value.length; index++) {
    while (
      emphasisLine + 1 < lines.length &&
      lines[emphasisLine + 1].start <= index
    ) {
      const previous = lines[emphasisLine++];
      if (
        lines[emphasisLine].blank ||
        lines[emphasisLine].formats.has("code") ||
        previous.formats.has("code")
      )
        for (const stack of Object.values(stacks)) stack.length = 0;
    }
    if (excluded[index] || escaped[index] || !stacks[value[index]]) continue;
    const character = value[index];
    const start = index;
    while (value[index + 1] === character && !escaped[index + 1]) index++;
    const length = index - start + 1;
    const previous = value[start - 1] ?? "";
    const next = value[index + 1] ?? "";
    const left =
      !whitespace(next) &&
      (!punctuation(next) || whitespace(previous) || punctuation(previous));
    const right =
      !whitespace(previous) &&
      (!punctuation(previous) || whitespace(next) || punctuation(next));
    const canOpen =
      character === "_" ? left && (!right || punctuation(previous)) : left;
    const canClose =
      character === "_" ? right && (!left || punctuation(next)) : right;
    // The formatter intentionally leaves an empty pair ready for typing. Treat
    // its center caret as active, without mislabelling a selected thematic rule.
    if (!canOpen && !canClose) {
      const scaffoldKind =
        character === "*" && length === 4
          ? "bold"
          : character === "_" && length === 2
            ? "italic"
            : character === "~" && length === 4
              ? "strike"
              : null;
      if (scaffoldKind)
        byFormat[scaffoldKind].push({
          start,
          end: index + 1,
          contentStart: start + length / 2,
          contentEnd: start + length / 2,
          scaffold: true,
        });
    }
    let remaining = length;
    let consumed = 0;
    const stack = stacks[character];
    while (canClose && remaining && stack.length) {
      const opener = stack[stack.length - 1];
      // CommonMark's rule of three avoids intraword ambiguous delimiter runs.
      if (
        character !== "~" &&
        (canOpen || opener.canClose) &&
        (opener.original + length) % 3 === 0 &&
        (opener.original % 3 !== 0 || length % 3 !== 0)
      ) {
        stack.pop();
        continue;
      }
      const count = Math.min(opener.remaining, remaining) >= 2 ? 2 : 1;
      const kind =
        character === "~" ? "strike" : count === 2 ? "bold" : "italic";
      const contentStart = opener.start + opener.remaining;
      const contentEnd = start + consumed;
      byFormat[kind].push({
        start: contentStart - count,
        end: contentEnd + count,
        contentStart,
        contentEnd,
      });
      opener.remaining -= count;
      remaining -= count;
      consumed += count;
      if (!opener.remaining) stack.pop();
    }
    if (canOpen && remaining)
      stack.push({
        start: start + consumed,
        remaining,
        original: length,
        canClose,
      });
  }
  for (const ranges of Object.values(byFormat))
    ranges.sort((a, b) => a.start - b.start);
  const nonblank = [0];
  const lineCounts: MarkdownFormatRanges["lineCounts"] = {
    heading: [0],
    bullet: [0],
    numbered: [0],
    task: [0],
    quote: [0],
    code: [0],
  };
  for (const line of lines) {
    nonblank.push(nonblank.at(-1)! + Number(!line.blank));
    for (const kind of lineFormats)
      lineCounts[kind].push(
        lineCounts[kind].at(-1)! +
          Number(!line.blank && line.formats.has(kind)),
      );
  }
  return { length: value.length, byFormat, lines, nonblank, lineCounts };
}

/** Active means the whole source selection shares a format, never last clicked. */
export function activeMarkdownFormats(
  index: MarkdownFormatRanges,
  selectionStart: number,
  selectionEnd: number,
): ReadonlySet<MarkdownFormat> {
  const start = Math.max(
    0,
    Math.min(index.length, Math.trunc(selectionStart) || 0),
  );
  const end = Math.max(
    start,
    Math.min(index.length, Math.trunc(selectionEnd) || 0),
  );
  const active = new Set<MarkdownFormat>();
  for (const kind of trackedFormats) {
    for (const range of index.byFormat[kind]) {
      if (range.start > start) break;
      if (
        (start >= range.contentStart && end <= range.contentEnd) ||
        (!range.scaffold &&
          start < end &&
          start === range.start &&
          end === range.end)
      ) {
        active.add(kind);
        break;
      }
    }
  }
  const first = sourceLineIndex(index.lines, start);
  const last = sourceLineIndex(index.lines, end > start ? end - 1 : end);
  if (start === end) {
    for (const kind of index.lines[first].formats) active.add(kind);
  } else {
    const nonblank = index.nonblank[last + 1] - index.nonblank[first];
    if (nonblank)
      for (const kind of lineFormats)
        if (
          index.lineCounts[kind][last + 1] - index.lineCounts[kind][first] ===
          nonblank
        )
          active.add(kind);
  }
  return active;
}

export type MarkdownEdit = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/** Selection offsets follow textarea/JS UTF-16 offsets, including emoji. */
export function applyMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  kind: MarkdownFormat,
): MarkdownEdit {
  const start = Math.max(
    0,
    Math.min(value.length, Math.trunc(selectionStart) || 0),
  );
  const end = Math.max(
    start,
    Math.min(value.length, Math.trunc(selectionEnd) || 0),
  );
  const selected = value.slice(start, end);
  const replace = (
    from: number,
    to: number,
    text: string,
    a: number,
    b = a,
  ): MarkdownEdit => ({
    value: value.slice(0, from) + text + value.slice(to),
    selectionStart: from + a,
    selectionEnd: from + b,
  });
  const wrap = (marker: string): MarkdownEdit => {
    if (
      selected.length >= marker.length * 2 &&
      selected.startsWith(marker) &&
      selected.endsWith(marker)
    ) {
      const inner = selected.slice(marker.length, -marker.length);
      return replace(start, end, inner, 0, inner.length);
    }
    if (
      start >= marker.length &&
      value.slice(start - marker.length, start) === marker &&
      value.slice(end, end + marker.length) === marker
    ) {
      return replace(
        start - marker.length,
        end + marker.length,
        selected,
        0,
        selected.length,
      );
    }
    return replace(
      start,
      end,
      `${marker}${selected}${marker}`,
      marker.length,
      marker.length + selected.length,
    );
  };
  if (kind === "bold") return wrap("**");
  if (kind === "italic") return wrap("_");
  if (kind === "strike") return wrap("~~");
  if (kind === "link") {
    if (/^https?:\/\/\S+$/i.test(selected)) {
      const destination = selected.replace(/[\\()]/g, "\\$&");
      return replace(start, end, `[link text](${destination})`, 1, 10);
    }
    const label = (selected || "link text")
      .replace(/\s*\n\s*/g, " ")
      .replace(/[\\[\]]/g, "\\$&");
    const text = `[${label}](https://)`;
    return replace(start, end, text, label.length + 3, text.length - 1);
  }
  if (kind === "code") {
    const before = value.slice(0, start);
    const after = value.slice(end);
    const leftSpan = /(`+)( ?)$/.exec(before);
    const rightSpan = /^( ?)(`+)/.exec(after);
    if (
      leftSpan &&
      rightSpan &&
      leftSpan[1] === rightSpan[2] &&
      leftSpan[2] === rightSpan[1] &&
      !(selected.match(/`+/g) ?? []).some(
        (run) => run.length === leftSpan[1].length,
      )
    ) {
      return replace(
        start - leftSpan[0].length,
        end + rightSpan[0].length,
        selected,
        0,
        selected.length,
      );
    }
    if (!selected.includes("\n")) {
      const firstRun = /^`+/.exec(selected)?.[0];
      const lastRun = /`+$/.exec(selected)?.[0];
      if (
        firstRun &&
        firstRun === lastRun &&
        selected.length >= firstRun.length * 2
      ) {
        let inner = selected.slice(firstRun.length, -firstRun.length);
        if (
          !(inner.match(/`+/g) ?? []).some(
            (run) => run.length === firstRun.length,
          )
        ) {
          if (inner.startsWith(" ") && inner.endsWith(" ") && /\S/.test(inner))
            inner = inner.slice(1, -1);
          return replace(start, end, inner, 0, inner.length);
        }
      }
    }
    const openingFence = /(^|\n)(`{3,}|~{3,})[^\n]*\n$/.exec(before);
    const closingFence = /^(\n?)(`{3,}|~{3,})[ \t]*(?=\n|$)/.exec(after);
    if (
      openingFence &&
      closingFence &&
      openingFence[2][0] === closingFence[2][0] &&
      closingFence[2].length >= openingFence[2].length
    ) {
      const from = start - openingFence[0].length + openingFence[1].length;
      return replace(
        from,
        end + closingFence[0].length,
        selected,
        0,
        selected.length,
      );
    }
    if (selected.includes("\n")) {
      const lines = selected.split("\n");
      const closingIndex = lines.length - (lines.at(-1) === "" ? 2 : 1);
      const firstFence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[0]);
      const lastFence = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(
        lines[closingIndex] ?? "",
      );
      if (
        firstFence &&
        lastFence &&
        closingIndex > 0 &&
        firstFence[1][0] === lastFence[1][0] &&
        lastFence[1].length >= firstFence[1].length &&
        (firstFence[1][0] !== "`" || !firstFence[2].includes("`"))
      ) {
        const inner =
          lines.slice(1, closingIndex).join("\n") +
          (lines.at(-1) === "" ? "\n" : "");
        return replace(start, end, inner, 0, inner.length);
      }
    }
    if (!selected.includes("\n")) {
      const runs = selected.match(/`+/g) ?? [];
      const marker = "`".repeat(
        Math.max(0, ...runs.map((run) => run.length)) + 1,
      );
      if (
        selected.startsWith("`") ||
        selected.endsWith("`") ||
        (selected.startsWith(" ") &&
          selected.endsWith(" ") &&
          /\S/.test(selected))
      ) {
        return replace(
          start,
          end,
          `${marker} ${selected} ${marker}`,
          marker.length + 1,
          marker.length + 1 + selected.length,
        );
      }
      return wrap(marker);
    }
    const runs = selected.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(2, ...runs.map((run) => run.length)) + 1);
    const prefix = `${start && value[start - 1] !== "\n" ? "\n" : ""}${fence}\n`;
    const suffix = `${selected.endsWith("\n") ? "" : "\n"}${fence}${end < value.length && value[end] !== "\n" ? "\n" : ""}`;
    return replace(
      start,
      end,
      prefix + selected + suffix,
      prefix.length,
      prefix.length + selected.length,
    );
  }
  if (kind === "rule") {
    const prefix =
      value.slice(0, end).endsWith("\n\n") || end === 0
        ? ""
        : value[end - 1] === "\n"
          ? "\n"
          : "\n\n";
    const text = `${prefix}---\n\n`;
    return replace(end, end, text, text.length);
  }

  const from = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextNewline = value.indexOf("\n", last);
  const to = nextNewline === -1 ? value.length : nextNewline;
  const lines = value.slice(from, to).split("\n");
  const patterns = {
    heading: /^([ \t]{0,3})## /,
    bullet: /^([ \t]*)[-+*] /,
    numbered: /^([ \t]*)\d+[.)] /,
    quote: /^([ \t]*)> ?/,
    task: /^([ \t]*)[-+*] \[[ xX]\] /,
  };
  const pattern = patterns[kind];
  const remove =
    lines.every((line) => !line.trim() || pattern.test(line)) &&
    lines.some((line) => pattern.test(line));
  let number = 0;
  const updated = lines
    .map((line) => {
      if (remove) return line.replace(pattern, "$1");
      if (!line.trim() && lines.length > 1) return line;
      number++;
      const prefix =
        kind === "heading"
          ? "## "
          : kind === "bullet"
            ? "- "
            : kind === "numbered"
              ? `${number}. `
              : kind === "quote"
                ? "> "
                : "- [ ] ";
      if (kind === "heading")
        return line.replace(/^([ \t]{0,3})(?:#{1,6} )?/, `$1${prefix}`);
      if (kind === "task" && pattern.test(line)) return line;
      return line.replace(pattern, "$1").replace(/^([ \t]*)/, `$1${prefix}`);
    })
    .join("\n");
  if (start === end) {
    const firstDelta = updated.split("\n")[0].length - lines[0].length;
    const caret = Math.max(0, start - from + firstDelta);
    return replace(from, to, updated, caret);
  }
  return replace(from, to, updated, 0, updated.length);
}
