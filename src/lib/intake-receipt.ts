import { dayKey, formatDay, toLocalInput } from "./domain";
import { INTAKE_ROUTES } from "./intake-routes";
import { getMedicationType } from "./medication-types";
import type { NotificationChangePreview } from "./notification-change-preview";
import type { IntakeSnapshot } from "./intake-update-preview";

type ReceiptLink = { label: string; href: string };
export type IntakeReceiptDestinations = {
  entry: ReceiptLink & { kind: "entry" | "day" | "today" };
  medication: ReceiptLink;
};

export function isIntakeReceipt(preview?: NotificationChangePreview) {
  return (
    preview?.after?.kind === "intake" &&
    (!preview.before || preview.before.kind === "intake")
  );
}

/** Keep the caller's exact destinations, especially its highlighted intake ID. */
export function intakeReceiptDestinations(
  links: readonly ReceiptLink[] = [],
): IntakeReceiptDestinations {
  const days = links.filter((link) =>
    /^\/history\/\d{4}-\d{2}-\d{2}(?:[?#]|$)/.test(link.href),
  );
  const highlighted = days.find((link) => /[?&]intake=[^&#]+/.test(link.href));
  const day = highlighted ?? days[0];
  const today = links.find((link) => /^\/(?:[?#]|$)/.test(link.href));
  return {
    entry: day
      ? { ...day, kind: highlighted ? "entry" : "day" }
      : { ...(today ?? { label: "Daily log", href: "/" }), kind: "today" },
    medication: links.find((link) =>
      /^\/medications(?:[/?#]|$)/.test(link.href),
    ) ?? { label: "Medications", href: "/medications" },
  };
}

export function intakeReceiptMeta(record: IntakeSnapshot) {
  const local = toLocalInput(record.takenAt, record.timeZone);
  const calendarDay = local.slice(0, 10);
  const trackingDay = dayKey(record.takenAt, record.timeZone);
  return {
    weekday: formatDay(calendarDay, {
      weekday: "long",
      month: undefined,
      day: undefined,
    }),
    date: formatDay(calendarDay, {
      weekday: undefined,
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    clock: local.slice(11),
    trackingDay,
    trackingDate: formatDay(trackingDay, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    previousCalendarDay: trackingDay !== calendarDay,
    route: INTAKE_ROUTES.find(
      (route) => route.value === (record.route ?? "unspecified"),
    )!.label,
    form: record.form ? getMedicationType(record.form).label : "Not specified",
  };
}
