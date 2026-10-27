import { ActionIcon } from "@/components/action-icon";
import { formatDay } from "@/lib/domain";

export function TodayHeading({
  day,
  current,
  now,
  timeZone,
}: {
  day: string;
  current: number;
  now: Date;
  timeZone: string;
}) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);

  return (
    <header className="mb-[37px]" data-today-heading>
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex shrink-0 items-center gap-1 text-[13px] leading-none font-[550] whitespace-nowrap tabular-nums max-[359px]:text-[12.5px]">
          <ActionIcon
            name="date"
            weight="fill"
            className="streak-counter-icon size-[22px]"
          />
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
          <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground max-[359px]:text-[9px]">
            <span aria-hidden="true">/</span>
            <time
              dateTime={now.toISOString()}
              aria-label={`Current time: ${clock} (${timeZone})`}
              data-current-time
            >
              {clock}
            </time>
          </span>
        </h1>
        <div
          className="flex shrink-0 items-center gap-1 text-[13px] leading-none font-[550] whitespace-nowrap tabular-nums max-[359px]:text-[12.5px]"
          data-current-streak={current}
          title={`${current} consecutive logging ${current === 1 ? "day" : "days"}`}
        >
          <span className="sr-only">
            {current} consecutive logging {current === 1 ? "day" : "days"}.
          </span>
          <span aria-hidden="true" className="flex items-center gap-1">
            <ActionIcon
              name="sparkle"
              weight="fill"
              className="streak-counter-icon size-[22px]"
            />
            <span className="text-base leading-none text-muted-foreground">
              ·
            </span>
            <span>
              {current} {current === 1 ? "day" : "days"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground max-[359px]:text-[9px]"
          >
            <span>/</span>
            <span>in a row</span>
          </span>
        </div>
      </div>
    </header>
  );
}
