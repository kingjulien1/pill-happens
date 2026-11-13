"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  CalendarDays,
  CalendarRange,
  Clock3,
  FlaskConical,
  MoonStar,
  NotebookPen,
  Sun,
} from "lucide-react";
import { MedicationGlyph } from "@/components/medication-icon";
import { MedicationChoiceIcon } from "@/components/medication-choice-icon";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { rememberJournalDestination } from "@/components/journal-drafts";
import { formatDay, formatDose, shiftDayKey, toLocalInput } from "@/lib/domain";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getJournalMentionCategories,
  normalizeJournalMentionText,
  type JournalMentionReference,
  type JournalReferenceCatalog,
} from "@/lib/journal-mentions";
import {
  getMedicationCategory,
  getMedicationCategories,
  type MedicationCategory,
} from "@/lib/medication-categories";
import { getMedicationType } from "@/lib/medication-types";
import { INTAKE_ROUTES } from "@/lib/intake-routes";
import { reflectionStats } from "@/lib/reflection-writing";
import styles from "./journal-reference.module.css";

type ReferenceProps = {
  href: string;
  reference: JournalMentionReference;
  catalog: JournalReferenceCatalog;
  children: ReactNode;
  title?: string;
};

/** All parts remain phrasing content, including when a reference sits inside a paragraph. */
function ReferenceLink({
  href,
  reference,
  title,
  children,
  pigment,
  label,
  unavailable = false,
}: {
  href: string;
  reference: JournalMentionReference;
  title: string;
  children: ReactNode;
  pigment: string;
  label: string;
  unavailable?: boolean;
}) {
  return (
    <a
      href={href}
      title={title}
      aria-label={label}
      className={styles.reference}
      style={{ "--reference-pigment": pigment } as CSSProperties}
      data-journal-reference={reference.kind}
      data-reference-unavailable={unavailable || undefined}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.defaultPrevented
        )
          return;
        rememberJournalDestination(href.split(/[?#]/u)[0]);
      }}
    >
      {children}
    </a>
  );
}
function Categories({ categories }: { categories: MedicationCategory[] }) {
  return categories.length ? (
    <span className={styles.categories} data-journal-reference-categories>
      {categories.map((category) => (
        <MedicationIndicatorMark
          key={category}
          kind={category}
          size={16}
          title={getMedicationCategory(category).label}
        />
      ))}
    </span>
  ) : null;
}
function Symbol({
  children,
  category = false,
}: {
  children: ReactNode;
  category?: boolean;
}) {
  return (
    <span
      className={styles.symbol}
      aria-hidden="true"
      data-reference-symbol
      data-reference-category-symbol={category || undefined}
    >
      <span className={styles.symbolArtwork}>{children}</span>
    </span>
  );
}
function MedicationCount({ amount }: { amount: number }) {
  return (
    <span className={styles.count} data-reference-count>
      {countLabel(amount, "med")}
      <span className={styles.separator} aria-hidden="true">
        /
      </span>
    </span>
  );
}
const shortDate = (day: string) =>
  formatDay(day, { weekday: "short", month: "short" });
const countLabel = (
  amount: number,
  singular: string,
  plural = `${singular}s`,
) => `${amount.toLocaleString("en")} ${amount === 1 ? singular : plural}`;

/** Medication identity uses the current library; recorded doses keep their own snapshot. */
export function MedicationJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "medication" }>;
  },
) {
  const medication = props.catalog.medications.get(props.reference.id);
  const categories = getJournalMentionCategories(
    medication ? [medication] : [],
    props.reference,
  );
  const strength = medication
    ? `${formatDose(medication.strengthMg)} mg`
    : "No longer in your library";
  const name = medication?.name;
  const detail = [
    strength,
    medication?.activeIngredient?.trim(),
    medication?.archived ? "Archived" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ReferenceLink
      {...props}
      pigment={
        medication
          ? getMedicationColor(medication.color).hex
          : "var(--palette-lilac)"
      }
      title={
        props.title ??
        (medication
          ? `${name} · ${detail}`
          : "This medication is no longer in your library.")
      }
      label={
        medication
          ? `Medication: ${name}, ${detail}`
          : "Medication no longer available"
      }
      unavailable={!medication}
    >
      <Symbol>
        <span
          className={styles.medicationGlyph}
          style={{ transform: `rotate(${medication?.iconRotation ?? 0}deg)` }}
        >
          <MedicationGlyph icon={medication?.icon} className={styles.glyph} />
        </span>
      </Symbol>
      <span className={styles.copy}>
        <span className={styles.name} data-reference-name>
          {name ?? props.children}
        </span>
        <span className={styles.detail} data-reference-detail>
          {detail}
        </span>
      </span>
      <Categories categories={categories} />
    </ReferenceLink>
  );
}

/** The canonical Markdown remains an ingredient link; its live destination is the most-used match. */
export function IngredientJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "ingredient" }>;
  },
) {
  const matches =
    props.catalog.ingredients.get(
      normalizeJournalMentionText(props.reference.ingredient),
    ) ?? [];
  // The catalog orders each ingredient group by recorded usage, with a stable saved-order tie break.
  const preferred = matches[0];
  const name =
    preferred?.activeIngredient?.trim() || props.reference.ingredient;
  const count = countLabel(matches.length, "medication");
  return (
    <ReferenceLink
      {...props}
      href={
        preferred
          ? `/medications/${encodeURIComponent(preferred.id)}#active-ingredient`
          : props.href
      }
      pigment="var(--palette-lilac)"
      title={
        props.title ??
        `${name} · Active ingredient · ${count}${preferred ? ` · Open ${preferred.name}` : " · No matching medication"}`
      }
      label={`Active ingredient: ${name}, ${count}${preferred ? `, open ${preferred.name}` : ", no matching medication"}`}
      unavailable={!preferred}
    >
      <Symbol>
        <FlaskConical className={styles.glyph} strokeWidth={2.2} />
      </Symbol>
      <span className={styles.copy}>
        <MedicationCount amount={matches.length} />
        <span className={styles.name} data-reference-name>
          {name}
        </span>
      </span>
      <Categories
        categories={getJournalMentionCategories(matches, props.reference)}
      />
    </ReferenceLink>
  );
}

export function CategoryJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "category" }>;
  },
) {
  const category = getMedicationCategory(props.reference.category);
  const count = countLabel(
    props.catalog.categories.get(props.reference.category)?.length ?? 0,
    "medication",
  );
  return (
    <ReferenceLink
      {...props}
      pigment="var(--palette-rose)"
      title={props.title ?? `${category.label} · ${count} in your library`}
      label={`Medication category: ${category.label}, ${count}`}
    >
      <Symbol category>
        <MedicationIndicatorMark
          kind={props.reference.category}
          size={24}
          aria-hidden="true"
        />
      </Symbol>
      <span className={styles.copy}>
        <MedicationCount
          amount={
            props.catalog.categories.get(props.reference.category)?.length ?? 0
          }
        />
        <span className={styles.name} data-reference-name>
          {category.label}
        </span>
      </span>
    </ReferenceLink>
  );
}

/** An intake is an individual recorded event, not today's medication definition. */
export function IntakeJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "intake" }>;
  },
) {
  const intake = props.catalog.intakes.get(props.reference.id);
  const medication = intake
    ? props.catalog.medications.get(intake.medicationId)
    : undefined;
  let time = "—";
  if (intake) {
    try {
      time = toLocalInput(intake.takenAt, props.catalog.timezone).slice(11, 16);
    } catch {
      /* Keep a missing legacy timestamp honest. */
    }
  }
  const name = intake?.medicationName || medication?.name;
  const route =
    INTAKE_ROUTES.find((item) => item.value === intake?.route)?.label ??
    "Route not specified";
  const amount = intake
    ? `${formatDose(intake.quantity * intake.strengthMg)} mg`
    : "Intake no longer available";
  const quantity = intake
    ? `${formatDose(intake.quantity)} ${getMedicationType(intake.medicationForm ?? medication?.form ?? "other").units}`
    : "";
  return (
    <ReferenceLink
      {...props}
      pigment={
        medication
          ? getMedicationColor(medication.color).hex
          : "var(--palette-apricot)"
      }
      title={
        props.title ??
        (intake
          ? `${name} · ${shortDate(props.reference.day)}, ${time} · ${amount} · ${quantity} · ${route}`
          : "This intake is no longer in your journal.")
      }
      label={
        intake
          ? `Logged intake: ${name}, ${time}, ${shortDate(props.reference.day)}, ${amount}, ${route}`
          : "Intake no longer available"
      }
      unavailable={!intake}
    >
      <Symbol>
        <Clock3 className={styles.glyph} strokeWidth={2.2} />
      </Symbol>
      <span className={styles.copy}>
        <span className={styles.name} data-reference-name>
          <span className={styles.time}>{time}</span>
          <span className={styles.dot}>·</span>
          {name ?? props.children}
        </span>
        <span className={styles.detail} data-reference-detail>
          <span className={styles.strength}>{amount}</span>
        </span>
      </span>
      <Categories categories={getMedicationCategories(medication)} />
      {intake && (
        <span className={styles.route} title={route} aria-label={route}>
          <MedicationChoiceIcon
            kind="route"
            value={intake.route ?? "unspecified"}
          />
        </span>
      )}
    </ReferenceLink>
  );
}

/** Saved-entry counts are descriptive only; there are no inferred health conclusions. */
export function DayJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "day" }>;
  },
) {
  const day = props.catalog.days.get(props.reference.day);
  const counts = day
    ? [
        day.intakes ? countLabel(day.intakes, "intake") : "",
        day.checkIns ? countLabel(day.checkIns, "check-in") : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "No entries";
  const compactCounts = day
    ? [
        day.intakes ? countLabel(day.intakes, "log") : "",
        day.checkIns ? countLabel(day.checkIns, "note") : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "No entries";
  return (
    <ReferenceLink
      {...props}
      pigment="var(--palette-iris)"
      title={
        props.title ??
        `${formatDay(props.reference.day, { year: "numeric" })} · ${counts}`
      }
      label={`${formatDay(props.reference.day, { year: "numeric" })}, ${counts}`}
    >
      <Symbol>
        <CalendarDays className={styles.glyph} strokeWidth={2.2} />
      </Symbol>
      <span className={styles.copy}>
        <time
          className={styles.name}
          dateTime={props.reference.day}
          data-reference-name
        >
          {shortDate(props.reference.day)}
        </time>
        <span className={styles.detail} data-reference-detail>
          <NotebookPen size={11} strokeWidth={2.1} aria-hidden="true" />
          {compactCounts || "No entries"}
        </span>
      </span>
    </ReferenceLink>
  );
}

export function WeekJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "week" }>;
  },
) {
  const week = props.catalog.weeks.get(props.reference.weekStart);
  const end = week?.end ?? shiftDayKey(props.reference.weekStart, 6);
  const range = `${formatDay(props.reference.weekStart, { weekday: undefined, month: "short" })}–${formatDay(end, { weekday: undefined, month: "short" })}`;
  const counts = week
    ? `${countLabel(week.days.length, "recorded day")} · ${countLabel(week.intakes, "intake")}`
    : "No recorded days";
  return (
    <ReferenceLink
      {...props}
      pigment="var(--palette-mint)"
      title={props.title ?? `${range} · ${counts}`}
      label={`Week of ${formatDay(props.reference.weekStart, { year: "numeric" })}, ${counts}`}
    >
      <Symbol>
        <CalendarRange className={styles.glyph} strokeWidth={2.2} />
      </Symbol>
      <span className={styles.copy}>
        <span className={styles.name} data-reference-name>
          {range}
        </span>
        <span className={styles.detail} data-reference-detail>
          {week
            ? `${countLabel(week.days.length, "day")} · ${countLabel(week.intakes, "log")}`
            : "No entries"}
        </span>
      </span>
    </ReferenceLink>
  );
}

export function ReflectionJournalReference(
  props: ReferenceProps & {
    reference: Extract<JournalMentionReference, { kind: "reflection" }>;
  },
) {
  const reflection = props.catalog.reflections.get(
    `${props.reference.day}:${props.reference.period}`,
  );
  const stats = reflection?.note.trim()
    ? reflectionStats(reflection.note)
    : null;
  const morning = props.reference.period === "morning";
  const Icon = morning ? Sun : MoonStar;
  const period = morning ? "Morning" : "Evening";
  const counts = stats
    ? `${countLabel(stats.words, "word")} · ~${stats.readingMinutes || 1} min read`
    : "No saved writing";
  return (
    <ReferenceLink
      {...props}
      pigment={morning ? "var(--palette-apricot)" : "var(--palette-lilac)"}
      title={
        props.title ??
        `${period} journal · ${formatDay(props.reference.day, { year: "numeric" })} · ${counts}`
      }
      label={`${period} journal, ${shortDate(props.reference.day)}, ${counts}`}
      unavailable={!stats}
    >
      <Symbol>
        <Icon className={styles.glyph} strokeWidth={2.2} />
      </Symbol>
      <span className={styles.copy}>
        <span className={styles.name} data-reference-name>
          {period}
          <span className={styles.dot}>·</span>
          {shortDate(props.reference.day)}
        </span>
        <span className={styles.detail} data-reference-detail>
          {stats
            ? `${countLabel(stats.words, "word")} · ~${stats.readingMinutes || 1}m`
            : "No writing"}
        </span>
      </span>
    </ReferenceLink>
  );
}

export function JournalReference(props: ReferenceProps) {
  switch (props.reference.kind) {
    case "medication":
      return (
        <MedicationJournalReference {...props} reference={props.reference} />
      );
    case "ingredient":
      return (
        <IngredientJournalReference {...props} reference={props.reference} />
      );
    case "category":
      return (
        <CategoryJournalReference {...props} reference={props.reference} />
      );
    case "intake":
      return <IntakeJournalReference {...props} reference={props.reference} />;
    case "day":
      return <DayJournalReference {...props} reference={props.reference} />;
    case "week":
      return <WeekJournalReference {...props} reference={props.reference} />;
    case "reflection":
      return (
        <ReflectionJournalReference {...props} reference={props.reference} />
      );
  }
}
