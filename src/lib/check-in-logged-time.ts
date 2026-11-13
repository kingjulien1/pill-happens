import { isValidDayKey, toLocalInput } from "./domain";

/** A real, positive epoch-millisecond instant in the supported calendar. */
export function isCheckInOpenedTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 253_402_300_799_999
  );
}

/** The first saved timestamp, displayed in the journal's timezone. */
export function getCheckInLoggedTime(
  createdAt: string | undefined,
  timeZone: string,
) {
  // A date or timezone-less legacy value cannot establish a logging instant.
  if (typeof createdAt !== "string") return null;
  const timestamp =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      createdAt,
    );
  if (!timestamp || !isValidDayKey(timestamp[1])) return null;

  try {
    const local = toLocalInput(createdAt, timeZone);
    const time = local.slice(11);
    return {
      time,
      dateTime: createdAt,
      label: `Logged ${local.slice(0, 10)} at ${time} · ${timeZone}`,
    };
  } catch {
    // Invalid legacy values/settings stay editable without inventing a time.
    return null;
  }
}

/** Latest successful journal save; old records may only have their creation time. */
export function getCheckInUpdatedTime(
  checkIn: { updatedAt?: string; createdAt?: string } | undefined,
  timeZone: string,
) {
  const logged =
    getCheckInLoggedTime(checkIn?.updatedAt, timeZone) ??
    getCheckInLoggedTime(checkIn?.createdAt, timeZone);
  return logged
    ? { ...logged, label: logged.label.replace(/^Logged /, "Last updated ") }
    : null;
}

/** First observed opening on this device, never inferred from a saved entry. */
export function getCheckInOpenedTime(
  openedAt: number | undefined,
  timeZone: string,
) {
  if (!isCheckInOpenedTimestamp(openedAt)) return null;
  const logged = getCheckInLoggedTime(
    new Date(openedAt).toISOString(),
    timeZone,
  );
  return logged
    ? {
        ...logged,
        label: `${logged.label.replace(/^Logged /, "First recorded opening ")} · On this device`,
      }
    : null;
}
