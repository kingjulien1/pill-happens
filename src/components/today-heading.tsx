import { ActionIcon } from "@/components/action-icon";
import { formatDay } from "@/lib/domain";
import { streakMilestone } from "@/lib/logging-streak";

export function TodayHeading({
  day,
  current,
}: {
  day: string;
  current: number;
}) {
  const { next } = streakMilestone(current);
  const remaining = next - current;

  return (
    <header className="mb-6" data-today-heading>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xs font-medium whitespace-nowrap tabular-nums">
          <time
            dateTime={day}
            aria-label={formatDay(day, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          >
            {formatDay(day, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </time>
        </h1>
        <div
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium tabular-nums"
          data-current-streak={current}
          data-next-milestone={next}
          data-days-to-next={remaining}
          title={`Next milestone: ${next} consecutive logging days`}
        >
          <span className="sr-only">
            {current} consecutive logging {current === 1 ? "day" : "days"};{" "}
            {remaining} {remaining === 1 ? "day" : "days"} until the {next}
            -day streak milestone.
          </span>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            <ActionIcon
              name="sparkle"
              weight="fill"
              className="streak-counter-icon size-[22px]"
            />
            <span className="text-muted-foreground/60">·</span>
            <span>
              {current} {current === 1 ? "day" : "days"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground"
          >
            <span>/</span>
            <span>{remaining} to next</span>
          </span>
        </div>
      </div>
    </header>
  );
}
