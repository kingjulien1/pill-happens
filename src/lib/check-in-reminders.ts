import { WHAT_HELPED_MAX_LENGTH } from "./daily-check-in";

/** Stable row identity belongs to the device draft, alongside the saved plain text. */
export type ReminderItem = { id: string; text: string };

export function serializeReminders(items: readonly ReminderItem[]): string {
  return items.map((item) => item.text).join("\n");
}

/**
 * Validate optional editor metadata independently from the rest of a check-in.
 * Older or damaged metadata can never hide the canonical text or its paragraphs.
 */
export function reminderItems(helped: string, raw?: unknown): ReminderItem[] {
  if (
    Array.isArray(raw) &&
    raw.length <= WHAT_HELPED_MAX_LENGTH + 1 &&
    raw.every(
      (item): item is ReminderItem =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        item.id.length <= 80 &&
        typeof item.text === "string" &&
        !item.text.includes("\n"),
    ) &&
    new Set(raw.map((item) => item.id)).size === raw.length &&
    serializeReminders(raw) === helped &&
    helped.length <= WHAT_HELPED_MAX_LENGTH
  ) {
    return raw.map(({ id, text }) => ({ id, text }));
  }
  // Split only on LF. Keeping CR characters preserves older CRLF text exactly.
  return helped === ""
    ? []
    : helped.split("\n").map((text, index) => ({ id: `saved-${index}`, text }));
}

export function remindersCount(helped: string): number {
  return helped.split("\n").filter((text) => text.trim().length > 0).length;
}
