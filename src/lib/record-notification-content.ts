import { formatDay, formatDose } from "./domain";
import { intakeNotificationText } from "./intake-notification-text";
import { intakeReceiptMeta } from "./intake-receipt";
import { getMedicationType } from "./medication-types";
import { getMedicationColor } from "./medication-appearance";
import { getMedicationCategory } from "./medication-categories";
import { DAILY_MOODS } from "./daily-check-in";
import type {
  NotificationChangePreview,
  NotificationPreviewRecord,
} from "./notification-change-preview";

const moodLabels = new Map(DAILY_MOODS.map((mood) => [mood.value, mood.label]));

export type RecordNoticeChange = {
  label: string;
  before: string;
  after: string;
};
export type RecordNoticeContent = {
  heading: string;
  message: string;
  title: string;
  category: string;
  primary: string;
  secondary: string;
  guidance: string;
  operation: "saved" | "updated" | "removed";
  changes: RecordNoticeChange[];
};
const date = (day: string, full = false, year = full) =>
  formatDay(day, {
    weekday: full ? undefined : "short",
    month: full ? "long" : "short",
    day: "numeric",
    ...(year ? { year: "numeric" as const } : {}),
  });
const words = (value: number, singular: string) =>
  `${formatDose(value)} ${singular}${value === 1 ? "" : "s"}`;
const dose = (value: number) => `${formatDose(value)} mg`;
const range = (
  record: Extract<NotificationPreviewRecord, { kind: "goal" }>,
  full = false,
) => {
  const year =
    full ||
    Boolean(
      record.endsOn &&
      record.startsOn.slice(0, 4) !== record.endsOn.slice(0, 4),
    );
  return `${date(record.startsOn, full, year)} → ${record.endsOn ? date(record.endsOn, full, year) : "Open-ended"}`;
};

/** Compare only display facts. Equal snapshots never imply an unchanged save. */
export function recordNoticeChanges(
  preview: NotificationChangePreview,
): RecordNoticeChange[] {
  const { before: a, after: b } = preview;
  const rows: RecordNoticeChange[] = [];
  const add = (label: string, before: string, after: string) => {
    if (before !== after) rows.push({ label, before, after });
  };
  if (a?.kind === "medication" && b?.kind === "medication") {
    const x = a.medication,
      y = b.medication;
    add("Name", x.name, y.name);
    add("Strength", dose(x.strengthMg), dose(y.strengthMg));
    if (x.defaultQuantity !== y.defaultQuantity) {
      const amount = (medication: typeof x) => {
        const type = getMedicationType(medication.form);
        return `${formatDose(medication.defaultQuantity)} ${medication.defaultQuantity === 1 ? type.unit : type.units}`;
      };
      add("Default amount", amount(x), amount(y));
    }
    add(
      "Type",
      getMedicationType(x.form).label,
      getMedicationType(y.form).label,
    );
    add(
      "Active substance",
      x.activeIngredient || "Not recorded",
      y.activeIngredient || "Not recorded",
    );
    add(
      "Library",
      x.archived ? "Benched" : "In rotation",
      y.archived ? "Benched" : "In rotation",
    );
    add(
      "Color",
      getMedicationColor(x.color).label,
      getMedicationColor(y.color).label,
    );
    add(
      "Symbol",
      (x.icon || "pill").replaceAll("-", " "),
      (y.icon || "pill").replaceAll("-", " "),
    );
    add("Symbol angle", `${x.iconRotation ?? 0}°`, `${y.iconRotation ?? 0}°`);
    const categories = (values: typeof x.categories) =>
      [...values]
        .sort()
        .map((value) => getMedicationCategory(value).label)
        .join(", ") || "None";
    add("Categories", categories(x.categories), categories(y.categories));
  } else if (a?.kind === "check-in" && b?.kind === "check-in") {
    add("Writing length", words(a.words, "word"), words(b.words, "word"));
    const feelings = (values: typeof a.moods) =>
      [...values]
        .sort()
        .map((value) => moodLabels.get(value) ?? value)
        .join(", ") || "Not recorded";
    add("Feelings", feelings(a.moods), feelings(b.moods));
    const rating = (value: number | null, scale: number) =>
      value === null ? "Not rated" : `${value}/${scale}`;
    add(
      "Energy",
      rating(a.energy, a.energyScale),
      rating(b.energy, b.energyScale),
    );
    add(
      "Stress",
      rating(a.stress, a.stressScale),
      rating(b.stress, b.stressScale),
    );
    add(
      "Sleep",
      a.sleepHours === null ? "Not recorded" : `${formatDose(a.sleepHours)}h`,
      b.sleepHours === null ? "Not recorded" : `${formatDose(b.sleepHours)}h`,
    );
    add("Bedtime", a.bedtime || "Not recorded", b.bedtime || "Not recorded");
  } else if (a?.kind === "goal" && b?.kind === "goal") {
    add("Daily maximum", dose(a.dailyLimitMg), dose(b.dailyLimitMg));
    add("Date range", range(a, true), range(b, true));
  } else if (a?.kind === "timezone" && b?.kind === "timezone") {
    add(
      "Timezone",
      a.timeZone.replaceAll("_", " "),
      b.timeZone.replaceAll("_", " "),
    );
  }
  return rows;
}

/** Essential closed copy and expanded context from the confirmed record only. */
export function recordNotificationContent(
  preview: NotificationChangePreview,
): RecordNoticeContent | undefined {
  try {
    const { before, after } = preview;
    const record = after ?? before;
    if (!record || (before && after && before.kind !== after.kind)) return;
    const operation = !after ? "removed" : before ? "updated" : "saved";
    const changes = recordNoticeChanges(preview);
    const common: Pick<RecordNoticeContent, "operation" | "changes"> = {
      operation,
      changes,
    };
    if (record.kind === "intake") {
      const text = intakeNotificationText(after ? preview : { after: record });
      if (!text) return;
      const meta = intakeReceiptMeta(record);
      return {
        ...common,
        heading: after
          ? text.heading
          : `${dose(record.quantity * record.strengthMg)} removed for ${record.name}.`,
        message: text.message,
        title: after ? "Your intake, saved." : "Removed from this day.",
        category: "Intake",
        primary: meta.weekday,
        secondary: `${meta.date} · ${meta.clock}`,
        guidance:
          "The medication stays in your library. Daily totals now use the remaining entries.",
      };
    }
    if (record.kind === "medication") {
      const m = record.medication;
      const archived =
        before?.kind === "medication" &&
        after?.kind === "medication" &&
        before.medication.archived !== m.archived;
      const verb = !after
        ? "removed"
        : archived
          ? m.archived
            ? "benched"
            : "back in rotation"
          : before
            ? "updated"
            : "added";
      const first =
        changes.find((row) => row.label === "Strength") ?? changes[0];
      const type = getMedicationType(m.form);
      return {
        ...common,
        heading: `${m.name} ${verb}.`,
        message: archived
          ? m.archived
            ? "Hidden from new intakes · Past entries kept"
            : "Available for new intakes · Past entries kept"
          : first
            ? `${first.label}: ${first.before} → ${first.after}`
            : `${dose(m.strengthMg)} · ${type.label} · Default ${formatDose(m.defaultQuantity)} ${m.defaultQuantity === 1 ? type.unit : type.units}`,
        title: !after
          ? "Removed from your library."
          : archived
            ? m.archived
              ? "Out of the selector. Still in your history."
              : "Back in your intake selector."
            : before
              ? "Your library, in sync."
              : "Ready for your next log.",
        category: "Medication",
        primary: "Medication library",
        secondary: !after ? "Removed" : m.archived ? "Benched" : "In rotation",
        guidance: !after
          ? "The removed medication is shown here for reference. Open the library to review the items that remain."
          : archived
            ? m.archived
              ? "Benched medications keep their history. Choose Return to rotation to use this medication for a new intake."
              : "This medication is back in rotation. New intake entries can use its current settings."
            : before
              ? "Strength, name and type changes follow this medication into its past intake cards. Recorded quantities and times stay as entered."
              : "This adds a medication to your library; it does not record a dose. Its default amount is a starting point for new intake entries.",
      };
    }
    if (record.kind === "check-in") {
      const period = record.period === "morning" ? "Morning" : "Evening";
      const metrics = [date(record.day)];
      if (record.words) metrics.push(words(record.words, "word"));
      if (record.moods.length)
        metrics.push(words(record.moods.length, "feeling"));
      if (record.sleepHours !== null)
        metrics.push(`${formatDose(record.sleepHours)}h sleep`);
      else if (record.energy !== null)
        metrics.push(`Energy ${record.energy}/${record.energyScale}`);
      if (metrics.length === 1 && record.stress !== null)
        metrics.push(`Stress ${record.stress}/${record.stressScale}`);
      return {
        ...common,
        heading: `${period} check-in ${operation}.`,
        message: metrics.join(" · "),
        title: after
          ? `Your ${period.toLowerCase()}, kept together.`
          : `${period} check-in removed.`,
        category: "Check-in",
        primary: `${formatDay(record.day, { weekday: "long", month: undefined, day: undefined })} ${period}`,
        secondary: date(record.day, true),
        guidance: after
          ? "Open the check-in to continue writing or edit your answers. This is a short summary; your writing stays in the full check-in."
          : "The removed check-in is shown here for reference. Its day remains available in Past Days.",
      };
    }
    if (record.kind === "goal") {
      return {
        ...common,
        heading: `${dose(record.dailyLimitMg)} daily max ${operation}.`,
        message: `${record.medication?.name ? `${record.medication.name} · ` : ""}${range(record)}`,
        title: after
          ? "One daily reference."
          : "Maximum removed. Entries kept.",
        category: "Daily maximum",
        primary: "Applies from",
        secondary: date(record.startsOn, true),
        guidance:
          "Goals compare recorded totals for one medication with the maximum you entered. They are tracking references and do not change intake records.",
      };
    }
    return {
      ...common,
      heading: "Journal timezone updated.",
      message: `${record.timeZone.replaceAll("_", " ")} · Days begin at 06:00`,
      title: "Your journal, on local time.",
      category: "Timezone",
      primary: "Time display",
      secondary: "06:00 day boundary",
      guidance:
        "Saved instants stay the same. Displayed times and tracking days now follow this timezone, so an entry may appear on a different day.",
    };
  } catch (error) {
    if (error instanceof RangeError) return;
    throw error;
  }
}
