"use client";

import { usePathname } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { dayKey } from "@/lib/domain";
import { loggingStreak } from "@/lib/logging-streak";

export function StreakMenu() {
  const pathname = usePathname();
  const { data, now } = useJournal();
  const streak =
    data && now
      ? loggingStreak(data, dayKey(now, data.settings.timezone), now)
      : null;
  const remaining = streak ? streak.nextMilestone - streak.current : 0;

  return (
    <Popover.Root key={pathname} modal={false}>
      <Popover.Trigger
        aria-label="View logging streak"
        className="header-icon-button header-icon-button--compact justify-self-center"
        disabled={!streak}
      >
        <ActionIcon
          name="sparkle"
          weight="fill"
          className="streak-counter-icon size-5"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup
            className="brand-menu max-h-(--available-height) w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-4 outline-none"
            data-streak-popover
          >
            <Popover.Title className="pr-7 text-xs font-semibold">
              Logging Streak
            </Popover.Title>
            <Popover.Close
              aria-label="Close streak details"
              className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring hover:[&>span]:bg-foreground/10"
            >
              <span className="flex size-7 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 transition-colors">
                <ActionIcon name="close" className="size-3.5" />
              </span>
            </Popover.Close>
            <Popover.Description className="mt-1 pr-7 text-[11px] leading-relaxed text-muted-foreground">
              Each tracking day with an entry counts once.
            </Popover.Description>
            {streak && (
              <>
                <dl className="mt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-muted-foreground">
                      Current Streak
                    </dt>
                    <dd
                      className="text-lg leading-none font-semibold tabular-nums"
                      data-streak-current={streak.current}
                    >
                      {streak.current}{" "}
                      <span className="text-xs font-normal">
                        {streak.current === 1 ? "day" : "days"}
                      </span>
                    </dd>
                  </div>
                </dl>
                <p
                  className="mt-2 text-[11px] text-muted-foreground"
                  data-streak-remaining={remaining}
                >
                  {remaining} {remaining === 1 ? "day" : "days"} to the next
                  milestone.
                  <span className="sr-only">
                    {" "}
                    The next milestone is {streak.nextMilestone} consecutive
                    logging days.
                  </span>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
                  <div>
                    <dt className="text-[10px] text-muted-foreground">
                      Best Streak
                    </dt>
                    <dd
                      className="mt-1 text-xs font-medium tabular-nums"
                      data-streak-best={streak.best}
                    >
                      {streak.best} {streak.best === 1 ? "day" : "days"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] text-muted-foreground">
                      Days with Entries
                    </dt>
                    <dd
                      className="mt-1 text-xs font-medium tabular-nums"
                      data-streak-total={streak.totalDays}
                    >
                      {streak.totalDays}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
