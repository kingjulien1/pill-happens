import {
  DAILY_REFLECTION_MAX_LENGTH,
  getCheckInPeriod,
  type DailyCheckIn,
  type DailyCheckInPeriod,
} from "./daily-check-in";
import {
  dayKey,
  formatDay,
  formatDose,
  isValidDayKey,
  shiftDayKey,
  type Intake,
  type AppData,
  type Medication,
} from "./domain";
import { groupHistoryWeeks } from "./history-weeks";
import { sortMedicationsByUsage } from "./medication-usage";
import {
  getMedicationCategories,
  MEDICATION_CATEGORIES,
  MEDICATION_CATEGORY_VALUES,
  normalizeMedicationCategories,
  type MedicationCategory,
} from "./medication-categories";

export type JournalMentionToken = {
  start: number;
  trigger: "@" | "/";
  /** The caret, in the textarea's UTF-16 coordinates. */
  end: number;
  query: string;
  /** Consume a word's remaining suffix when completing from its middle. */
  replacementEnd?: number;
};

export type JournalMention = {
  key: string;
  kind: JournalMentionReference["kind"];
  label: string;
  detail: string;
  href: string;
  medication?: Medication;
  category?: MedicationCategory;
  intake?: Intake;
  day?: string;
  period?: DailyCheckInPeriod;
  /** Related records are revealed separately; they never crowd the initial results. */
  children?: JournalMention[];
};

export type JournalMentionReference =
  | { kind: "medication"; id: string }
  | { kind: "ingredient"; ingredient: string }
  | { kind: "day"; day: string }
  | { kind: "category"; category: MedicationCategory }
  | { kind: "intake"; id: string; day: string }
  | { kind: "week"; weekStart: string }
  | { kind: "reflection"; day: string; period: DailyCheckInPeriod };

/** Resolve live manual labels without adding metadata to portable Markdown links. */
export function getJournalMentionCategories(
  medications: readonly Medication[],
  reference: JournalMentionReference | null,
): MedicationCategory[] {
  if (!reference) return [];
  if (reference.kind === "category") return [reference.category];
  if (reference.kind === "medication")
    return getMedicationCategories(
      medications.find((medication) => medication.id === reference.id),
    );
  if (reference.kind !== "ingredient") return [];
  const ingredient = normalizeJournalMentionText(reference.ingredient);
  if (!ingredient) return [];
  return normalizeMedicationCategories(
    medications.flatMap((medication) =>
      normalizeJournalMentionText(medication.activeIngredient ?? "") ===
      ingredient
        ? getMedicationCategories(medication)
        : [],
    ),
  );
}

const QUERY_LIMIT = 160;
const RESULT_LIMIT = 12;
const fragmentCharacter = /[\p{L}\p{N}\p{M}._/-]/u;

/** The same fold is used for suggestion deduplication and linked library filters. */
export function normalizeJournalMentionText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

/** Scan source, including unfinished syntax, without parsing HTML or touching the DOM. */
function mentionIsShielded(value: string, offset: number) {
  const prefix = value.slice(0, offset);
  let fence: { character: string; length: number } | null = null;
  let inlineTicks = 0;
  let brackets = 0;
  let destinationDepth = 0;
  let angle = false;
  const lines = prefix.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].replace(/\r$/, "");
    let body = line;
    while (/^ {0,3}>[ \t]?/.test(body))
      body = body.replace(/^ {0,3}>[ \t]?/, "");
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(body);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence.character &&
        marker[1].length >= fence.length &&
        /^[ \t]*$/.test(marker[2])
      )
        fence = null;
      continue;
    }
    if (marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
      fence = { character: marker[1][0], length: marker[1].length };
      continue;
    }
    if (lineIndex === lines.length - 1 && /^(?: {4}|\t)/.test(body))
      return true;
    if (!line.trim()) {
      inlineTicks = 0;
      brackets = 0;
      destinationDepth = 0;
      angle = false;
      continue;
    }
    for (let index = 0; index < line.length; index++) {
      const character = line[index];
      if (character === "\\") {
        index++;
        continue;
      }
      if (destinationDepth) {
        if (character === "(") destinationDepth++;
        if (character === ")") destinationDepth--;
        continue;
      }
      if (angle) {
        if (character === ">") angle = false;
        continue;
      }
      if (character === "`") {
        let length = 1;
        while (line[index + length] === "`") length++;
        if (!inlineTicks) inlineTicks = length;
        else if (length === inlineTicks) inlineTicks = 0;
        index += length - 1;
        continue;
      }
      if (inlineTicks) continue;
      if (character === "<") {
        angle = true;
        continue;
      }
      if (character === "[") brackets++;
      if (character === "]" && brackets) {
        brackets--;
        if (!brackets && line[index + 1] === "(") {
          destinationDepth = 1;
          index++;
        }
      }
    }
  }
  return Boolean(fence || inlineTicks || brackets || destinationDepth || angle);
}

/** Only an unresolved @ or / token at a collapsed caret can open suggestions. */
export function getJournalMentionToken(
  value: string,
  start: number,
  end = start,
): JournalMentionToken | null {
  if (
    !Number.isInteger(start) ||
    start !== end ||
    start < 0 ||
    start > value.length
  )
    return null;
  // Date queries may themselves contain slashes: start at the latest *boundary*
  // trigger rather than mistaking 9/11 for a second autocomplete invocation.
  let at = start - 1;
  while (at >= 0) {
    if (
      (value[at] === "@" || value[at] === "/") &&
      (!value[at - 1] || /[\s([{"'“‘>*_~\p{Ps}\p{Pi}]/u.test(value[at - 1]))
    )
      break;
    at--;
  }
  if (at < 0 || at >= start || start - at - 1 > QUERY_LIMIT) return null;
  const before = value[at - 1];
  if (before && !/[\s([{"'“‘>*_~\p{Ps}\p{Pi}]/u.test(before)) return null;
  let slashes = 0;
  for (let index = at - 1; value[index] === "\\"; index--) slashes++;
  if (slashes % 2 || mentionIsShielded(value, at)) return null;
  const query = value.slice(at + 1, start);
  if (/[\s@`<>\[\]{}!?:;=|\\]/u.test(query)) return null;
  let replacementEnd = start;
  if (
    start > at + 1 &&
    fragmentCharacter.test(value[start - 1]) &&
    fragmentCharacter.test(value[start] ?? "")
  )
    while (
      replacementEnd < value.length &&
      fragmentCharacter.test(value[replacementEnd])
    )
      replacementEnd++;
  return {
    start: at,
    trigger: value[at] as "@" | "/",
    end: start,
    query,
    ...(replacementEnd > start ? { replacementEnd } : {}),
  };
}

/** Entity IDs are opaque single segments, never paths, fragments or Markdown syntax. */
export function validReferenceId(value: string) {
  return Boolean(
    value &&
    value.length <= 160 &&
    value !== "." &&
    value !== ".." &&
    !/[\s/\\?#%[\]()<>\p{Cc}\p{Cf}]/u.test(value),
  );
}

/** Decode a URL/Next route segment exactly once before treating it as an ID. */
export function decodeJournalReferenceId(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return validReferenceId(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/** Accept only local entity links produced by the mention picker. */
export function parseJournalMentionHref(
  href: string,
): JournalMentionReference | null {
  if (/[\s\\#\p{Cc}\p{Cf}]/u.test(href)) return null;
  const category = /^\/medications\/categories\/([a-z-]+)$/.exec(href)?.[1];
  if (category)
    return MEDICATION_CATEGORY_VALUES.includes(category as MedicationCategory)
      ? { kind: "category", category: category as MedicationCategory }
      : null;
  const week = /^\/history\/weeks\/(\d{4}-\d{2}-\d{2})$/.exec(href)?.[1];
  if (week)
    return isValidDayKey(week) &&
      new Date(`${week}T12:00:00Z`).getUTCDay() === 1
      ? { kind: "week", weekStart: week }
      : null;
  const reflection = /^\/journal\/(\d{4}-\d{2}-\d{2})\/(morning|evening)$/.exec(
    href,
  );
  if (reflection)
    return isValidDayKey(reflection[1])
      ? {
          kind: "reflection",
          day: reflection[1],
          period: reflection[2] as DailyCheckInPeriod,
        }
      : null;
  const dayMatch = /^\/history\/(\d{4}-\d{2}-\d{2})(?:\?intake=([^&]+))?$/.exec(
    href,
  );
  if (dayMatch) {
    if (!isValidDayKey(dayMatch[1])) return null;
    if (!dayMatch[2]) return { kind: "day", day: dayMatch[1] };
    try {
      const id = new URLSearchParams(`intake=${dayMatch[2]}`).get("intake")!;
      decodeURIComponent(dayMatch[2]);
      return validReferenceId(id)
        ? { kind: "intake", id, day: dayMatch[1] }
        : null;
    } catch {
      return null;
    }
  }
  const medicationPath = /^\/medications\/([^/?]+)$/.exec(href)?.[1];
  if (medicationPath) {
    try {
      const id = decodeURIComponent(medicationPath);
      return validReferenceId(id) ? { kind: "medication", id } : null;
    } catch {
      return null;
    }
  }
  if (!/^\/medications\?(?:medication|ingredient)=[^&]+$/.test(href))
    return null;
  try {
    decodeURIComponent(href.slice(href.indexOf("?") + 1));
    const entries = [...new URLSearchParams(href.slice(href.indexOf("?") + 1))];
    if (entries.length !== 1) return null;
    const [key, value] = entries[0];
    if (
      !value ||
      value !== value.trim() ||
      value.length > 160 ||
      /[\p{Cc}\p{Cf}]/u.test(value)
    )
      return null;
    if (key === "medication" && validReferenceId(value))
      return { kind: "medication", id: value };
    if (key === "ingredient") return { kind: "ingredient", ingredient: value };
    return null;
  } catch {
    return null;
  }
}

const months = new Map(
  [
    ["jan", "january"],
    ["feb", "february"],
    ["mar", "march"],
    ["apr", "april"],
    ["may"],
    ["jun", "june"],
    ["jul", "july"],
    ["aug", "august"],
    ["sep", "sept", "september"],
    ["oct", "october"],
    ["nov", "november"],
    ["dec", "december"],
  ].flatMap((names, index) => names.map((name) => [name, index + 1] as const)),
);

/** Explicit dates must be past; a yearless date means its most recent past occurrence. */
export function parseJournalMentionDate(
  query: string,
  today: string,
  includeToday = false,
) {
  if (!isValidDayKey(today)) return null;
  const source = normalizeJournalMentionText(query);
  if (/^\d{4}-\d{2}-\d{2}$/.test(source))
    return isValidDayKey(source) &&
      (includeToday ? source <= today : source < today)
      ? source
      : null;
  let day: number;
  let month: number;
  let year: number | null = null;
  const numeric = /^(\d{1,2})([./])(\d{1,2})(?:\2(\d{4}))?$/.exec(source);
  const trailingDot = /^(\d{1,2})\.(\d{1,2})\.$/.exec(source);
  const dayFirst = /^(\d{1,2})\s*([a-z]{3,9})\.?(?:,?\s*(\d{4}))?$/.exec(
    source,
  );
  const monthFirst = /^([a-z]{3,9})\.?\s*(\d{1,2})(?:,?\s*(\d{4}))?$/.exec(
    source,
  );
  if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[3]);
    year = numeric[4] === undefined ? null : Number(numeric[4]);
  } else if (trailingDot) {
    day = Number(trailingDot[1]);
    month = Number(trailingDot[2]);
  } else if (dayFirst && months.has(dayFirst[2])) {
    day = Number(dayFirst[1]);
    month = months.get(dayFirst[2])!;
    year = dayFirst[3] === undefined ? null : Number(dayFirst[3]);
  } else if (monthFirst && months.has(monthFirst[1])) {
    day = Number(monthFirst[2]);
    month = months.get(monthFirst[1])!;
    year = monthFirst[3] === undefined ? null : Number(monthFirst[3]);
  } else return null;
  const key = (candidate: number) =>
    `${String(candidate).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (year !== null) {
    const explicit = key(year);
    return isValidDayKey(explicit) &&
      (includeToday ? explicit <= today : explicit < today)
      ? explicit
      : null;
  }
  const thisYear = Number(today.slice(0, 4));
  // Eight years also covers the Gregorian century gap between leap days.
  for (
    let candidate = thisYear;
    candidate >= Math.max(0, thisYear - 8);
    candidate--
  ) {
    const inferred = key(candidate);
    if (
      isValidDayKey(inferred) &&
      (includeToday ? inferred <= today : inferred < today)
    )
      return inferred;
  }
  return null;
}

function matchScore(query: string, ...values: string[]) {
  if (!query) return 0;
  let best = Infinity;
  for (const text of values) {
    const value = normalizeJournalMentionText(text);
    if (value === query) best = Math.min(best, 0);
    else if (value.startsWith(query)) best = Math.min(best, 1);
    else if (value.split(" ").some((word) => word.startsWith(query)))
      best = Math.min(best, 2);
    else if (value.includes(query)) best = Math.min(best, 3);
    else if (query.length >= 3) {
      let next = 0;
      for (const character of value) if (character === query[next]) next++;
      if (next === query.length) best = Math.min(best, 4);
    }
  }
  return best;
}

function medicationHref(id: string) {
  return `/medications?${new URLSearchParams({ medication: id })}`;
}

function ingredientHref(ingredient: string) {
  return `/medications?${new URLSearchParams({ ingredient })}`;
}

export type JournalCalendarReference = Extract<
  JournalMentionReference,
  { kind: "day" | "week" | "reflection" }
>;

function safeShiftDay(day: string, offset: number) {
  try {
    return shiftDayKey(day, offset);
  } catch {
    return null;
  }
}

function mondayForDay(day: string) {
  const start = groupHistoryWeeks([day])[0]?.start;
  return start && isValidDayKey(start) ? start : null;
}

/** Resolve relative names against a stable entry day; explicit years use today's limit. */
export function parseJournalCalendarReference(
  query: string,
  today: string,
  referenceDay?: string,
): JournalCalendarReference | null {
  if (!isValidDayKey(today) || !query || /^\s/u.test(query)) return null;
  const anchor =
    referenceDay && isValidDayKey(referenceDay) && referenceDay <= today
      ? referenceDay
      : today;
  let source = normalizeJournalMentionText(query);
  let period: DailyCheckInPeriod | undefined;
  const suffix =
    /(?:[./:]|\s+)(morning|evening)(?:-?journal|-?reflection)?$/u.exec(source);
  if (suffix) {
    period = suffix[1] as DailyCheckInPeriod;
    source = source.slice(0, suffix.index);
  } else if (/^(morning|evening)(?:-?journal|-?reflection)?$/u.test(source)) {
    period = source.startsWith("morning") ? "morning" : "evening";
    source = "today";
  }
  const compact = source.replace(/[\s_-]/gu, "");
  const relativeDays: Record<string, number> = {
    today: 0,
    yesterday: -1,
    daybeforeyesterday: -2,
    twodaysago: -2,
  };
  let day: string | null = null;
  if (Object.hasOwn(relativeDays, compact)) {
    try {
      day = shiftDayKey(anchor, relativeDays[compact]);
    } catch {
      return null;
    }
  } else if (compact === "thisweek" || compact === "lastweek") {
    if (period) return null;
    const monday = mondayForDay(anchor);
    if (!monday) return null;
    try {
      return {
        kind: "week",
        weekStart: shiftDayKey(monday, compact === "lastweek" ? -7 : 0),
      };
    } catch {
      return null;
    }
  } else {
    const iso = /^(\d{4})-?w(\d{1,2})$/iu.exec(source);
    if (iso) {
      if (period || Number(iso[2]) < 1 || Number(iso[2]) > 53) return null;
      const year = Number(iso[1]);
      const jan4 = `${iso[1]}-01-04`;
      const firstMonday = mondayForDay(jan4);
      if (!firstMonday) return null;
      try {
        const weekStart = shiftDayKey(firstMonday, (Number(iso[2]) - 1) * 7);
        const actual = groupHistoryWeeks([weekStart])[0];
        return actual?.weekYear === year &&
          actual.weekNumber === Number(iso[2]) &&
          weekStart <= today
          ? { kind: "week", weekStart }
          : null;
      } catch {
        return null;
      }
    }
    const hasYear = /\d{4}/u.test(source);
    day = parseJournalMentionDate(source, hasYear ? today : anchor, true);
  }
  if (!day || day > today) return null;
  return period ? { kind: "reflection", day, period } : { kind: "day", day };
}

export function journalCalendarHref(reference: JournalCalendarReference) {
  return reference.kind === "week"
    ? `/history/weeks/${reference.weekStart}`
    : reference.kind === "reflection"
      ? `/journal/${reference.day}/${reference.period}`
      : `/history/${reference.day}`;
}

type ScoredMention = { mention: JournalMention; score: number; order: number };

function reflectionChildren(data: AppData, day: string): JournalMention[] {
  return (["morning", "evening"] as const).flatMap((period) => {
    const reflection = data.dailyCheckIns?.find(
      (item) =>
        item.day === day &&
        getCheckInPeriod(item) === period &&
        item.note.trim(),
    );
    return reflection
      ? [
          {
            key: `reflection:${day}:${period}`,
            kind: "reflection" as const,
            label: `${period === "morning" ? "Morning" : "Evening"} journal`,
            detail: `${reflection.note.trim().split(/\s+/u).length} words · Saved writing`,
            href: `/journal/${day}/${period}`,
            day,
            period,
          },
        ]
      : [];
  });
}

/** Search loaded data only. The supplied day must already use the journal's 06:00 boundary. */
export function searchJournalMentions(
  data: AppData,
  query: string,
  today: string,
  trigger: "@" | "/" = "@",
  now: Date | string = new Date(),
): JournalMention[] {
  const search = normalizeJournalMentionText(query);
  if (search.length > QUERY_LIMIT || /^\s/u.test(query)) return [];
  const candidates: ScoredMention[] = [];
  const medications = sortMedicationsByUsage(data.medications, data.intakes);
  const add = (mention: JournalMention, score: number, order: number) => {
    if (Number.isFinite(score) && parseJournalMentionHref(mention.href))
      candidates.push({ mention, score, order });
  };
  if (trigger === "@") {
    const nameCounts = new Map<string, number>();
    for (const medication of medications) {
      const key = normalizeJournalMentionText(medication.name);
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
    const ingredientGroups = new Map<
      string,
      { label: string; medications: Medication[] }
    >();
    const nowMs = new Date(now).getTime();
    const currentIntakes = new Map<string, Intake[]>();
    for (const intake of data.intakes) {
      try {
        if (
          !Number.isFinite(nowMs) ||
          Date.parse(intake.takenAt) > nowMs ||
          dayKey(intake.takenAt, data.settings.timezone) !== today
        )
          continue;
        const group = currentIntakes.get(intake.medicationId) ?? [];
        group.push(intake);
        currentIntakes.set(intake.medicationId, group);
      } catch {
        /* Invalid legacy timestamps are skipped individually. */
      }
    }
    for (const [order, medication] of medications.entries()) {
      const ingredient = medication.activeIngredient?.trim() ?? "";
      const strength = `${formatDose(medication.strengthMg)} mg`;
      const score = Math.min(
        matchScore(search, medication.name, `${medication.name} ${strength}`),
        matchScore(search, ingredient) + 0.5,
      );
      const duplicate =
        (nameCounts.get(normalizeJournalMentionText(medication.name)) ?? 0) > 1;
      const children = (currentIntakes.get(medication.id) ?? [])
        .sort(
          (a, b) =>
            Date.parse(b.takenAt) - Date.parse(a.takenAt) ||
            a.id.localeCompare(b.id),
        )
        .flatMap((intake): JournalMention[] => {
          const href = `/history/${today}?${new URLSearchParams({ intake: intake.id })}`;
          if (!parseJournalMentionHref(href)) return [];
          const time = new Intl.DateTimeFormat("en-GB", {
            timeZone: data.settings.timezone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(new Date(intake.takenAt));
          return [
            {
              key: `intake:${intake.id}`,
              kind: "intake",
              label: `${medication.name} · ${time}`,
              detail: `${formatDose(intake.quantity * intake.strengthMg)} mg · ${time}`,
              href,
              medication,
              intake,
              day: today,
            },
          ];
        });
      add(
        {
          key: `medication:${medication.id}`,
          kind: "medication",
          label: `${medication.name}${duplicate ? ` · ${strength}` : ""}`,
          detail: [strength, ingredient, medication.archived ? "Archived" : ""]
            .filter(Boolean)
            .join(" · "),
          href: medicationHref(medication.id),
          medication,
          ...(children.length ? { children } : {}),
        },
        score,
        order,
      );
      if (ingredient) {
        const key = normalizeJournalMentionText(ingredient);
        const group = ingredientGroups.get(key) ?? {
          label: ingredient,
          medications: [],
        };
        group.medications.push(medication);
        ingredientGroups.set(key, group);
      }
    }
    for (const [order, [key, group]] of [...ingredientGroups].entries()) {
      const archived = group.medications.filter((item) => item.archived).length;
      const count = group.medications.length;
      add(
        {
          key: `ingredient:${key}`,
          kind: "ingredient",
          label: group.label,
          detail: `${count} ${count === 1 ? "medication" : "medications"}${archived ? (archived === count ? " · Archived" : ` · ${archived} archived`) : ""}`,
          href: ingredientHref(group.label),
        },
        Math.min(
          matchScore(search, group.label),
          matchScore(search, ...group.medications.map((item) => item.name)) +
            0.5,
        ),
        order,
      );
    }
    for (const [order, category] of MEDICATION_CATEGORIES.entries()) {
      const count = medications.filter((medication) =>
        getMedicationCategories(medication).includes(category.value),
      ).length;
      add(
        {
          key: `category:${category.value}`,
          kind: "category",
          label: category.label,
          category: category.value,
          detail: `Category · ${count} ${count === 1 ? "medication" : "medications"}`,
          href: `/medications/categories/${category.value}`,
        },
        matchScore(
          search,
          category.value,
          category.label,
          category.shortLabel,
          ...category.aliases,
        ),
        order,
      );
    }
  } else {
    if (!isValidDayKey(today)) return [];
    const catalog = createJournalReferenceCatalog(data, today);
    const days = new Map([...catalog.days].filter(([key]) => key <= today));
    days.set(today, days.get(today) ?? { intakes: 0, checkIns: 0 });
    const exact = parseJournalCalendarReference(query, today);
    if (exact?.kind === "day" || exact?.kind === "reflection")
      days.set(exact.day, days.get(exact.day) ?? { intakes: 0, checkIns: 0 });
    const sortedDays = [...days].sort(([a], [b]) => b.localeCompare(a));
    for (const [order, [day, counts]] of sortedDays.entries()) {
      const label = formatDay(day, {
        weekday: "short",
        month: "short",
        year: "numeric",
      });
      const [year, month, date] = day.split("-");
      const aliases = [
        day,
        label,
        formatDay(day, { weekday: "long", month: "long", year: "numeric" }),
        `${Number(date)}.${Number(month)}.${year}`,
        `${date}/${month}/${year}`,
        `${Number(date)} ${formatDay(day, { weekday: undefined, month: "short", day: undefined })}`,
        `${Number(date)} ${formatDay(day, { weekday: undefined, month: "long", day: undefined })}`,
        formatDay(day, { weekday: undefined, month: "short" }),
        formatDay(day, { weekday: undefined, month: "long" }),
        ...(day === today ? ["Today"] : []),
        ...(day === safeShiftDay(today, -1) ? ["Yesterday"] : []),
      ];
      const detail =
        [
          counts.intakes
            ? `${counts.intakes} ${counts.intakes === 1 ? "intake" : "intakes"}`
            : "",
          counts.checkIns
            ? `${counts.checkIns} ${counts.checkIns === 1 ? "check-in" : "check-ins"}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || "No entries";
      const children = reflectionChildren(data, day);
      add(
        {
          key: `day:${day}`,
          kind: "day",
          label,
          detail,
          href: `/history/${day}`,
          day,
          ...(children.length ? { children } : {}),
        },
        exact?.kind === "day" && exact.day === day
          ? -2
          : matchScore(search, ...aliases),
        order,
      );
      // Journal results are direct only when explicitly requested, otherwise children stay collapsed.
      for (const child of children) {
        if (
          exact?.kind === "reflection" &&
          child.period === exact.period &&
          day === exact.day
        )
          add(child, -3, order);
      }
    }
    const weekKeys = new Set(
      [...catalog.weeks.keys()].filter((day) => day <= today),
    );
    const thisWeek = mondayForDay(today);
    if (thisWeek) weekKeys.add(thisWeek);
    if (exact?.kind === "week") weekKeys.add(exact.weekStart);
    for (const [order, weekStart] of [...weekKeys].sort().reverse().entries()) {
      const week = groupHistoryWeeks([weekStart])[0];
      const recorded = catalog.weeks.get(weekStart);
      add(
        {
          key: `week:${weekStart}`,
          kind: "week",
          label: `Week ${week.weekNumber} · ${week.weekYear}`,
          detail: `${formatDay(weekStart, { weekday: undefined, month: "short" })}–${formatDay(week.end, { weekday: undefined, month: "short" })} · ${recorded?.days.filter((day) => day <= today).length ?? 0} days with entries`,
          href: `/history/weeks/${weekStart}`,
          day: weekStart,
        },
        exact?.kind === "week" && exact.weekStart === weekStart
          ? -2
          : matchScore(
              search,
              `Week ${week.weekNumber}`,
              `${week.weekYear}-W${String(week.weekNumber).padStart(2, "0")}`,
              ...(weekStart === thisWeek ? ["ThisWeek", "This Week"] : []),
              ...(thisWeek && weekStart === safeShiftDay(thisWeek, -7)
                ? ["LastWeek", "Last Week"]
                : []),
            ),
        order,
      );
    }
  }
  candidates.sort(
    (a, b) =>
      a.score - b.score ||
      a.order - b.order ||
      a.mention.key.localeCompare(b.mention.key),
  );
  const selected = new Set<string>();
  const kinds =
    trigger === "@"
      ? ["medication", "ingredient", "category"]
      : ["day", "week", "reflection"];
  for (const kind of kinds)
    for (const item of candidates
      .filter((item) => item.mention.kind === kind)
      .slice(0, 4))
      selected.add(item.mention.key);
  for (const item of candidates) {
    if (selected.size >= RESULT_LIMIT) break;
    selected.add(item.mention.key);
  }
  return candidates
    .filter((item) => selected.has(item.mention.key))
    .slice(0, RESULT_LIMIT)
    .map((item) => item.mention);
}

function escapeMentionLabel(value: string) {
  return value
    .replace(/[\r\n\u0000-\u001f\u007f]+/gu, " ")
    .replace(/([\\`*_{}\[\]()#+\-.!|>~<>])/g, "\\$1");
}

/** Insert ordinary portable Markdown, preserving surrounding source and a stable caret. */
export function applyJournalMention(
  value: string,
  token: JournalMentionToken,
  mention: JournalMention,
  maxLength = DAILY_REFLECTION_MAX_LENGTH,
) {
  const current = getJournalMentionToken(value, token.end);
  const reference = parseJournalMentionHref(mention.href);
  if (
    !current ||
    current.start !== token.start ||
    current.trigger !== token.trigger ||
    current.query !== token.query ||
    current.replacementEnd !== token.replacementEnd ||
    !reference ||
    reference.kind !== mention.kind ||
    (token.trigger === "@") !==
      ["medication", "ingredient", "category", "intake"].includes(
        reference.kind,
      ) ||
    !Number.isSafeInteger(maxLength) ||
    maxLength < 0
  )
    return null;
  const label = escapeMentionLabel(mention.label.trim());
  if (!label) return null;
  const replacementEnd = token.replacementEnd ?? token.end;
  const tail = value.slice(replacementEnd);
  const space = tail && /^[\s,.;:!?)}\]]/u.test(tail) ? "" : " ";
  const inserted = `[${token.trigger}${label}](${mention.href})${space}`;
  const next = value.slice(0, token.start) + inserted + tail;
  if (next.length > maxLength) return null;
  const caret = token.start + inserted.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}

/** Derive once from hydrated data, never fetch from inside a rendered reference. */
export function createJournalReferenceCatalog(
  data: AppData | null,
  today?: string,
) {
  const timezone = data?.settings.timezone ?? "Europe/Vienna";
  const medications = new Map(
    (data ? sortMedicationsByUsage(data.medications, data.intakes) : []).map(
      (medication) => [medication.id, medication],
    ),
  );
  const ingredients = new Map<string, Medication[]>();
  const categories = new Map<MedicationCategory, Medication[]>(
    MEDICATION_CATEGORY_VALUES.map((category) => [category, []]),
  );
  const intakes = new Map<string, Intake>();
  const reflections = new Map<string, DailyCheckIn>();
  const days = new Map<string, { intakes: number; checkIns: number }>();
  for (const medication of medications.values()) {
    const key = normalizeJournalMentionText(medication.activeIngredient ?? "");
    if (key)
      ingredients.set(key, [...(ingredients.get(key) ?? []), medication]);
    for (const category of getMedicationCategories(medication))
      categories.get(category)!.push(medication);
  }
  for (const intake of data?.intakes ?? []) {
    try {
      const key = dayKey(intake.takenAt, timezone);
      if (!isValidDayKey(key)) continue;
      intakes.set(intake.id, intake);
      const count = days.get(key) ?? { intakes: 0, checkIns: 0 };
      count.intakes++;
      days.set(key, count);
    } catch {
      /* Invalid legacy timestamps do not invent a linked day. */
    }
  }
  for (const checkIn of data?.dailyCheckIns ?? []) {
    if (!isValidDayKey(checkIn.day)) continue;
    reflections.set(`${checkIn.day}:${getCheckInPeriod(checkIn)}`, checkIn);
    const count = days.get(checkIn.day) ?? { intakes: 0, checkIns: 0 };
    count.checkIns++;
    days.set(checkIn.day, count);
  }
  const weeks = new Map(
    groupHistoryWeeks([...days.keys()])
      .filter((week) => isValidDayKey(week.start) && isValidDayKey(week.end))
      .map((week) => [
        week.start,
        {
          ...week,
          intakes: week.days.reduce(
            (total, day) => total + (days.get(day)?.intakes ?? 0),
            0,
          ),
          checkIns: week.days.reduce(
            (total, day) => total + (days.get(day)?.checkIns ?? 0),
            0,
          ),
        },
      ]),
  );
  let currentDay = today;
  if (!currentDay || !isValidDayKey(currentDay)) {
    try {
      currentDay = dayKey(new Date(), timezone);
    } catch {
      currentDay = "";
    }
  }
  return {
    medications,
    ingredients,
    categories,
    intakes,
    reflections,
    days,
    weeks,
    timezone,
    today: currentDay,
  };
}
export type JournalReferenceCatalog = ReturnType<
  typeof createJournalReferenceCatalog
>;
