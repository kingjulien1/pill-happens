import { ActionIcon } from "@/components/action-icon";
import { HeadingText } from "@/components/heading-text";
import { formatDay } from "@/lib/domain";
import { streakMilestone } from "@/lib/logging-streak";
import {
  milestoneEmoji,
  type JournalEncouragement,
} from "@/lib/streak-presentation";

export function TodayHeading({
  day,
  current,
  totalDays,
  encouragement,
}: {
  day: string;
  current: number;
  totalDays: number;
  encouragement: JournalEncouragement;
}) {
  const { reached, next } = streakMilestone(totalDays);
  const emoji = milestoneEmoji(encouragement.milestoneSeed, reached ?? next);

  return (
    <header className="mb-6" data-today-heading>
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight">
          <HeadingText
            title="Today"
            context={
              <time dateTime={day}>
                {formatDay(day, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            }
          />
        </h1>
        <div
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium tabular-nums"
          data-current-streak={current}
          aria-label={`${current} consecutive logging ${current === 1 ? "day" : "days"}`}
          title="Consecutive tracking days with a recorded intake"
        >
          <ActionIcon
            name={encouragement.streakIcon}
            weight="fill"
            className="streak-counter-icon size-[22px]"
          />
          <span aria-hidden="true" className="text-muted-foreground/60">
            ·
          </span>
          <span>
            {current} {current === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      <div
        className="streak-badge mt-3"
        data-logged-days={totalDays}
        data-milestone={reached ?? 0}
        data-next-milestone={next}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span aria-hidden="true" className="text-base leading-5">
            {emoji}
          </span>
          <span className="text-xs font-medium tabular-nums">
            {totalDays} {totalDays === 1 ? "day" : "days"} logged
          </span>
          <span
            aria-hidden="true"
            className="text-[10px] text-muted-foreground/50"
          >
            ·
          </span>
          <span className="text-[10px] text-muted-foreground">
            {reached ? `${reached}-day badge` : "First milestone"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label="Days logged toward the next milestone"
            aria-valuemin={0}
            aria-valuemax={next}
            aria-valuenow={totalDays}
            aria-valuetext={`${totalDays} days logged; next milestone at ${next} days`}
            className="h-0.5 min-w-12 flex-1 overflow-hidden rounded-full bg-primary/10"
          >
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${Math.min((totalDays / next) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[9px] leading-3 text-muted-foreground tabular-nums">
            Next {next} days
          </span>
        </div>
      </div>
      <p
        className="mt-2 max-w-[42ch] text-[11px] leading-relaxed text-muted-foreground"
        data-encouragement
      >
        {encouragement.message}
      </p>
    </header>
  );
}
