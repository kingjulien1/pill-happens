"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { StreakArtwork } from "@/components/streak-artwork";
import { dayKey } from "@/lib/domain";
import { loggingStreak } from "@/lib/logging-streak";
import { getMilestoneLook } from "@/lib/streak-milestones";
import { getStreakSpotlight } from "@/lib/streak-spotlight";
import { requestStreakSpotlight } from "@/lib/streak-spotlight-client";
import styles from "./streak-menu.module.css";

export function StreakMenu() {
  const pathname = usePathname();
  return <StreakPopover key={pathname} />;
}

function StreakPopover() {
  const [open, setOpen] = useState(false);
  const { data, now } = useJournal();
  const streak =
    data && now
      ? loggingStreak(data, dayKey(now, data.settings.timezone), now)
      : null;
  const active = Boolean(streak && streak.current > 0);
  const spotlight = streak ? getStreakSpotlight(streak) : null;
  const remaining = streak ? streak.nextMilestone - streak.current : 0;
  const look = getMilestoneLook(
    streak?.milestone ?? streak?.nextMilestone ?? 2,
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
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
            className={styles.popup}
            data-streak-popover
            data-streak-active={active}
            style={
              {
                "--party-accent": look.palette.accent,
                "--party-pop": look.palette.pop,
                "--party-spark": look.palette.spark,
              } as CSSProperties
            }
          >
            {active && (
              <StreakArtwork
                seed={streak!.current}
                palette={look.palette}
                party
              />
            )}
            <Popover.Close
              aria-label="Close streak details"
              className={styles.close}
            >
              <span>
                <ActionIcon name="close" className="size-3.5" />
              </span>
            </Popover.Close>
            <Link
              href={spotlight?.href ?? "/streaks"}
              scroll={false}
              className={styles.cardLink}
              aria-label={
                spotlight
                  ? `Open Streaks and spotlight the ${spotlight.target}-day milestone`
                  : "Explore Streak Milestones"
              }
              onNavigate={(event) => {
                if (spotlight) {
                  const current = new URL(window.location.href);
                  if (
                    current.pathname === "/streaks" &&
                    current.searchParams.get("spotlight") ===
                      String(spotlight.target)
                  ) {
                    // Replaying the same card needs no duplicate history entry.
                    event.preventDefault();
                  }
                  requestStreakSpotlight(spotlight.target);
                }
                setOpen(false);
              }}
              data-streak-spotlight-link
            >
              <div className={styles.content}>
                <Popover.Title className={styles.title}>
                  <ActionIcon
                    name={active ? "confetti" : "sparkle"}
                    weight="fill"
                    className="size-4"
                  />
                  {active ? "Streak Spotlight" : "Your Next Chapter"}
                </Popover.Title>

                <Popover.Description className={styles.description}>
                  Each tracking day with an intake entry counts once.
                </Popover.Description>
                {streak && (
                  <>
                    <div className={styles.hero}>
                      <span className={styles.medal} aria-hidden="true">
                        <span>{active ? look.emoji : "✧"}</span>
                      </span>
                      <p
                        className={styles.current}
                        data-streak-current={streak.current}
                      >
                        <strong>{streak.current}</strong>
                        <span>
                          {streak.current === 1 ? "day" : "days"} in a row
                        </span>
                      </p>
                      <p className={styles.cheer}>
                        {active
                          ? streak.current === 1
                            ? "One day, one little spark."
                            : "A little momentum worth celebrating."
                          : "Your milestones will be waiting here."}
                      </p>
                    </div>
                    <div className={styles.nextRow}>
                      <span>Next In This Run</span>
                      <strong>{streak.nextMilestone} days</strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Progress to the next milestone in this run"
                      aria-valuemin={0}
                      aria-valuemax={streak.nextMilestone}
                      aria-valuenow={streak.current}
                      className={styles.progress}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, (streak.current / streak.nextMilestone) * 100)}%`,
                        }}
                      />
                    </div>
                    <p
                      className={styles.remaining}
                      data-streak-remaining={remaining}
                    >
                      {remaining} {remaining === 1 ? "day" : "days"} to the next
                      milestone.
                    </p>
                    <dl className={styles.stats}>
                      <div>
                        <dt>
                          <ActionIcon
                            name="shootingStar"
                            className="size-3.5"
                          />
                          Best Streak
                        </dt>
                        <dd data-streak-best={streak.best}>
                          {streak.best}{" "}
                          <span>{streak.best === 1 ? "day" : "days"}</span>
                        </dd>
                      </div>
                      <div>
                        <dt>
                          <ActionIcon name="calendar" className="size-3.5" />
                          Days With Entries
                        </dt>
                        <dd data-streak-total={streak.totalDays}>
                          {streak.totalDays}
                        </dd>
                      </div>
                    </dl>
                    <span className={styles.link}>
                      <ActionIcon
                        name="sparkle"
                        weight="fill"
                        className="size-4"
                      />
                      Explore Milestones
                      <ActionIcon name="next" className="size-4" />
                    </span>
                    <p className={styles.footnote}>
                      Your earned milestones stay with you after a gap.
                    </p>
                  </>
                )}
              </div>
            </Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
