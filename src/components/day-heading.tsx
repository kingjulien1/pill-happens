import { ActionIcon } from "@/components/action-icon";
import { formatDay } from "@/lib/domain";

/** The journal day, rather than a promotional headline, anchors the page. */
export function DayHeading({
  day,
  label = "Today",
}: {
  day: string;
  label?: "Today" | "Daily log";
}) {
  const weekday = formatDay(day, {
    weekday: "long",
    month: undefined,
    day: undefined,
  });
  const date = formatDay(day, { weekday: undefined, month: "long" });

  return (
    <header className="day-heading" data-day-heading data-day-key={day}>
      <div className="day-heading-context">
        <span className="day-heading-dot" aria-hidden="true" />
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-50">
          /
        </span>
        <span>06:00 reset</span>
      </div>
      <div className="day-heading-main">
        <span className="day-heading-icon">
          <ActionIcon name="calendar" className="size-10" weight="bold" />
        </span>
        <h1 className="min-w-0">
          <span className="sr-only">{label}, </span>
          <time dateTime={day} aria-label={formatDay(day, { year: "numeric" })}>
            <span className="day-heading-weekday">{weekday}</span>
            <span className="day-heading-date">
              <span>{date}</span>
              <span aria-hidden="true" className="day-heading-year-divider">
                /
              </span>
              <span className="day-heading-year">{day.slice(0, 4)}</span>
            </span>
          </time>
        </h1>
      </div>
    </header>
  );
}
