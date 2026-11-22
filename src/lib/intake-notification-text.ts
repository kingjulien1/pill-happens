import { formatDay, formatDose, toLocalInput } from "./domain";
import { getMedicationType } from "./medication-types";
import { INTAKE_ROUTES } from "./intake-routes";
import type {
  NotificationChangePreview,
  NotificationPreviewRecord,
} from "./notification-change-preview";

type IntakeSnapshot = Extract<NotificationPreviewRecord, { kind: "intake" }>;

function amount(record: IntakeSnapshot) {
  const type = getMedicationType(record.form);
  const unit = record.quantity === 1 ? type.unit : type.units;
  return `${formatDose(record.quantity)} ${unit} × ${formatDose(record.strengthMg)} mg`;
}

function route(record: IntakeSnapshot) {
  return (
    INTAKE_ROUTES.find((item) => item.value === record.route)?.label ??
    "Not specified"
  );
}

function when(record: IntakeSnapshot) {
  try {
    const local = toLocalInput(record.takenAt, record.timeZone);
    const day = local.slice(0, 10);
    const time = local.slice(11);
    const date = formatDay(day, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return { day, time, date, text: `${time} · ${date}` };
  } catch (error) {
    // A display-only snapshot must not turn a confirmed save into a failed UI
    // submission. Keep the caller's generic confirmation if dates are invalid.
    if (error instanceof RangeError) return;
    throw error;
  }
}

/** Header copy comes only from confirmed snapshots, including restored notices.
 * Changed fields lead the single-line detail; unchanged context follows them. */
export function intakeNotificationText(preview: NotificationChangePreview) {
  const { before, after } = preview;
  if (after?.kind !== "intake" || (before && before.kind !== "intake")) return;

  const currentTime = when(after);
  const previousTime = before ? when(before) : undefined;
  if (!currentTime || (before && !previousTime)) return;
  if (!Number.isFinite(after.quantity * after.strengthMg)) return;
  const currentAmount = amount(after);
  const changes: string[] = [];
  const context: string[] = [];
  if (before && before.name !== after.name)
    changes.push(`${before.name} → ${after.name}`);

  if (
    before &&
    (before.quantity !== after.quantity ||
      before.strengthMg !== after.strengthMg ||
      before.form !== after.form)
  ) {
    // When only quantity changes, retain its old value without repeating the
    // same unit and strength on both sides of the comparison.
    const previous =
      before.strengthMg === after.strengthMg && before.form === after.form
        ? formatDose(before.quantity)
        : amount(before);
    changes.push(`${previous} → ${currentAmount}`);
  } else context.push(currentAmount);

  if (
    before &&
    previousTime &&
    Date.parse(before.takenAt) !== Date.parse(after.takenAt)
  ) {
    const previous = previousTime;
    if (previous.day !== currentTime.day) {
      const date = (day: string) =>
        formatDay(day, {
          weekday: undefined,
          month: "short",
          day: "numeric",
          ...(previous.day.slice(0, 4) !== currentTime.day.slice(0, 4)
            ? { year: "numeric" as const }
            : {}),
        });
      changes.push(
        `${date(previous.day)} ${previous.time} → ${date(currentTime.day)} ${currentTime.time}`,
      );
    } else if (previous.time !== currentTime.time) {
      changes.push(
        `${previous.time} → ${currentTime.time} · ${currentTime.date}`,
      );
    } else {
      // Repeated DST clock times or changed seconds must not produce an
      // apparently identical before/after clock comparison.
      changes.push(`Time adjusted · ${currentTime.text}`);
    }
  } else context.push(currentTime.text);

  if (
    before &&
    (before.route ?? "unspecified") !== (after.route ?? "unspecified")
  )
    changes.push(`${route(before)} → ${route(after)}`);
  else if (after.route && after.route !== "unspecified")
    context.push(route(after));

  const dose = formatDose(after.quantity * after.strengthMg);
  return {
    heading: before
      ? `${dose} mg intake updated for ${after.name}.`
      : `${dose} mg recorded for ${after.name}.`,
    message: [...changes, ...context].join(" · "),
  };
}
