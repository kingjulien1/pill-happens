import { formatDay, formatDose, toLocalInput } from "./domain";
import { getMedicationType } from "./medication-types";
import { INTAKE_ROUTES } from "./intake-routes";
import type { NotificationPreviewRecord } from "./notification-change-preview";

export type IntakeSnapshot = Extract<
  NotificationPreviewRecord,
  { kind: "intake" }
>;
export type IntakeUpdateField =
  "time" | "quantity" | "strength" | "form" | "route" | "name";
export type IntakeUpdateRow = {
  field: IntakeUpdateField;
  label: string;
  before: string;
  after: string;
};

function quantity(record: IntakeSnapshot) {
  const type = getMedicationType(record.form);
  return `${formatDose(record.quantity)} ${record.quantity === 1 ? type.unit : type.units}`;
}

function time(
  record: IntakeSnapshot,
  includeYear: boolean,
  distinguishInstant: boolean,
) {
  const local = toLocalInput(record.takenAt, record.timeZone);
  const date = formatDay(local.slice(0, 10), {
    weekday: undefined,
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  });
  const clock = distinguishInstant
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: record.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
        timeZoneName: "shortOffset",
      }).format(new Date(record.takenAt))
    : local.slice(11);
  return `${clock} · ${date}`;
}

/** One confirmed edit, not an invented timeline of earlier mutations. */
export function intakeUpdatePreview(
  before: IntakeSnapshot,
  after: IntakeSnapshot,
  medicationChanged?: boolean,
) {
  // Older saved notices predate the identity flag; their recorded names are
  // the available indication of a switch. New edits use the actual ID comparison.
  const switched = medicationChanged ?? before.name !== after.name;
  const rows: IntakeUpdateRow[] = [];
  const add = (
    field: IntakeUpdateField,
    label: string,
    oldValue: string,
    newValue: string,
  ) => rows.push({ field, label, before: oldValue, after: newValue });
  if (!switched) {
    if (before.name !== after.name)
      add("name", "Name", before.name, after.name);
    if (Date.parse(before.takenAt) !== Date.parse(after.takenAt)) {
      const oldLocal = toLocalInput(before.takenAt, before.timeZone);
      const newLocal = toLocalInput(after.takenAt, after.timeZone);
      const year = oldLocal.slice(0, 4) !== newLocal.slice(0, 4);
      const repeated = oldLocal === newLocal;
      add(
        "time",
        "Time",
        time(before, year, repeated),
        time(after, year, repeated),
      );
    }
    if (before.quantity !== after.quantity)
      add("quantity", "Amount", quantity(before), quantity(after));
    if (before.strengthMg !== after.strengthMg)
      add(
        "strength",
        "Strength",
        `${formatDose(before.strengthMg)} mg`,
        `${formatDose(after.strengthMg)} mg`,
      );
    if (before.form !== after.form)
      add(
        "form",
        "Type",
        before.form ? getMedicationType(before.form).label : "Not set",
        after.form ? getMedicationType(after.form).label : "Not set",
      );
    if ((before.route ?? "unspecified") !== (after.route ?? "unspecified")) {
      const route = (record: IntakeSnapshot) =>
        INTAKE_ROUTES.find(
          (item) => item.value === (record.route ?? "unspecified"),
        )!.label;
      add("route", "Route", route(before), route(after));
    }
  }
  const oldDose = `${formatDose(before.quantity * before.strengthMg)} mg`;
  const newDose = `${formatDose(after.quantity * after.strengthMg)} mg`;
  return {
    switched,
    rows,
    total:
      !switched && oldDose !== newDose
        ? { before: oldDose, after: newDose }
        : undefined,
  };
}
