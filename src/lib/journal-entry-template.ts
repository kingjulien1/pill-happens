import { formatDay } from "./domain";

/** Format the explicit tracking day, never the device's current calendar date. */
export function formatJournalEntryHeading(day: string): string {
  return `# ${formatDay(day, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} --`;
}

/** One empty writing line follows the H1; opening it does not commit a draft. */
export function createJournalEntryTemplate(day: string) {
  const value = `${formatJournalEntryHeading(day)}\n`;
  return {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
  };
}
