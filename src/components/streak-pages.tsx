"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";
import { TrendUpIcon } from "@phosphor-icons/react/dist/ssr/TrendUp";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import { EqualsIcon } from "@phosphor-icons/react/dist/ssr/Equals";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { ActionIcon } from "@/components/action-icon";
import { MedicationClassBadges } from "@/components/medication-class-badge";
import { HeadingText } from "@/components/heading-text";
import { useJournal } from "@/components/journal-provider";
import { StreakArtwork } from "@/components/streak-artwork";
import { formatDay, formatDose, shiftDayKey } from "@/lib/domain";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getStreakMilestone,
  getStreakMilestones,
  type MilestoneAnalytics,
  type StreakMilestone,
  type StreakPalette,
  type StreakRatingChange,
} from "@/lib/streak-milestones";
import styles from "./streak-pages.module.css";

const wholeNumber = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const meanNumber = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const count = (value: number) => wholeNumber.format(value);
const mean = (value: number | null) =>
  value === null ? "—" : meanNumber.format(value);
const shortDate = (day: string) =>
  formatDay(day, {
    weekday: undefined,
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function paletteStyle(palette: StreakPalette): CSSProperties {
  return {
    "--milestone-accent": palette.accent,
    "--milestone-pop": palette.pop,
    "--milestone-spark": palette.spark,
  } as CSSProperties;
}

function SectionTitle({
  children,
  context,
}: {
  children: ReactNode;
  context: ReactNode;
}) {
  return (
    <div className={styles.sectionTitle}>
      <h2>{children}</h2>
      <span>{context}</span>
    </div>
  );
}

function MilestoneCard({ milestone }: { milestone: StreakMilestone }) {
  const earned = milestone.achieved;
  return (
    <Link
      href={`/streaks/${milestone.target}`}
      className={`${styles.milestoneCard} ${earned ? styles.earnedCard : styles.upcomingCard}`}
      style={earned ? paletteStyle(milestone.palette) : undefined}
      data-streak-card={earned ? "achieved" : "upcoming"}
      data-streak-target={milestone.target}
      aria-label={`${count(milestone.target)} days, ${earned ? "achieved milestone" : "upcoming milestone"}. ${milestone.title}`}
    >
      {earned && (
        <StreakArtwork seed={milestone.target} palette={milestone.palette} />
      )}
      <div className={styles.cardForeground}>
        <span className={styles.medallion} aria-hidden="true">
          <span className={styles.medallionEmoji}>
            {earned ? milestone.emoji : "✧"}
          </span>
          <span className={styles.medallionCount}>
            {count(milestone.target)}
          </span>
          <span className={styles.medallionUnit}>days</span>
        </span>
        <span className={styles.cardCopy}>
          <span className={styles.cardEyebrow}>
            {earned ? "Milestone Unlocked" : "Up Ahead"}
            <span aria-hidden="true">·</span>
            {earned ? (
              <TrophyIcon size={12} weight="fill" aria-hidden="true" />
            ) : (
              <ActionIcon name="secure" className="size-3" />
            )}
          </span>
          <span className={styles.cardTitle}>{milestone.title}</span>
          <span className={styles.cardContext}>
            {earned && milestone.achievedOn
              ? `First reached ${shortDate(milestone.achievedOn)}`
              : `${count(milestone.remaining)} more in this run`}
          </span>
        </span>
        <span className={styles.cardArrow} aria-hidden="true">
          <ActionIcon name="external" className="size-4" />
        </span>
      </div>
      {earned && (
        <span className={styles.cardRibbon}>
          <span>Yours To Keep</span>
          <span>{count(milestone.target)} Days In A Row</span>
        </span>
      )}
    </Link>
  );
}

function RunProgress({ milestone }: { milestone: StreakMilestone }) {
  const progress = Math.min(
    100,
    (milestone.currentProgress / milestone.target) * 100,
  );
  return (
    <div className={styles.runProgress}>
      <div className={styles.progressLabels}>
        <span>
          <strong>{count(milestone.currentProgress)}</strong> in this run
        </span>
        <span>{count(milestone.target)} days</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`Progress toward ${count(milestone.target)} consecutive logging days`}
        aria-valuemin={0}
        aria-valuemax={milestone.target}
        aria-valuenow={milestone.currentProgress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function StreaksPage() {
  const { data, now } = useJournal();
  const view = useMemo(
    () => (data && now ? getStreakMilestones(data, now) : null),
    [data, now],
  );
  if (!view) return null;
  const next = view.upcoming[0];
  return (
    <div className={styles.page} data-streak-list>
      <header className={styles.pageHeader}>
        <h1>
          <HeadingText
            title={
              <span className={styles.headingTitle}>
                <TrophyIcon size={23} weight="bold" aria-hidden="true" />
                Streaks
              </span>
            }
            context="Little Milestones"
            className="items-center"
          />
        </h1>
        <p>
          A few days of showing up, a little more of your story. Your unlocked
          milestones stay here, even after a pause.
        </p>
      </header>

      <dl className={styles.runStats}>
        <div>
          <dt>Current Run</dt>
          <dd>
            {count(view.streak.current)} <span>days</span>
          </dd>
        </div>
        <div>
          <dt>Best Run</dt>
          <dd>
            {count(view.streak.best)} <span>days</span>
          </dd>
        </div>
        <div>
          <dt>Days Logged</dt>
          <dd>{count(view.streak.totalDays)}</dd>
        </div>
      </dl>

      <section aria-label="Achieved milestones" className={styles.listSection}>
        <SectionTitle
          context={
            view.achieved.length
              ? `Latest ${view.achieved.length}`
              : "The First Little Win"
          }
        >
          <ActionIcon name="confetti" className="size-4" />
          Unlocked
        </SectionTitle>
        {view.achieved.length ? (
          <div className={styles.cardList}>
            {view.achieved.map((milestone) => (
              <MilestoneCard key={milestone.target} milestone={milestone} />
            ))}
          </div>
        ) : (
          <div className={styles.firstMilestone}>
            <span aria-hidden="true">
              <ActionIcon name="shootingStar" className="size-8" />
            </span>
            <div>
              <h3>Your First Milestone Is Waiting</h3>
              <p>
                Two consecutive tracking days with intake records unlock the
                first one. There’s room to start at your own pace.
              </p>
            </div>
          </div>
        )}
      </section>

      <div
        className={styles.encouragement}
        style={next ? paletteStyle(next.palette) : undefined}
        data-streak-separator
      >
        <span className={styles.encouragementStar} aria-hidden="true">
          <ActionIcon name="sparkle" weight="fill" className="size-5" />
        </span>
        <h2>
          {view.streak.current
            ? "Keep A Little Momentum"
            : "There’s Room To Begin Again"}
        </h2>
        <p>{next?.encouragement}</p>
        {next && <RunProgress milestone={next} />}
        <span className={styles.separatorContext}>
          {view.streak.current
            ? "Your current run can grow toward a new milestone."
            : "Your next logged day can start a new run."}
        </span>
      </div>

      <section aria-label="Upcoming milestones" className={styles.listSection}>
        <SectionTitle context="The Next Three">
          <ActionIcon name="shootingStar" className="size-4" />
          Up Ahead
        </SectionTitle>
        <div className={styles.cardList}>
          {view.upcoming.map((milestone) => (
            <MilestoneCard key={milestone.target} milestone={milestone} />
          ))}
        </div>
      </section>

      <p className={styles.scopeNote}>
        A logging day means at least one saved intake in your 06:00-to-06:00
        tracking day. These milestones describe recorded days, rather than goal
        results or how much was taken.
      </p>
      <Link href="/" className={styles.backLink}>
        <ActionIcon name="back" className="size-3.5" />
        Back To Today
      </Link>
    </div>
  );
}

function TrendSymbol({ trend }: { trend: StreakRatingChange["trend"] }) {
  if (trend === "improved")
    return <TrendUpIcon size={14} weight="bold" aria-hidden="true" />;
  if (trend === "worse")
    return <TrendDownIcon size={14} weight="bold" aria-hidden="true" />;
  if (trend === "unchanged")
    return <EqualsIcon size={14} weight="bold" aria-hidden="true" />;
  return (
    <ActionIcon
      name={trend === "neutral" ? "history" : "discover"}
      className="size-3.5"
    />
  );
}

function trendLabel(change: StreakRatingChange) {
  if (change.trend === "insufficient") return "Not Enough Ratings";
  if (change.trend === "unchanged") return "No Change";
  if (change.trend === "improved")
    return change.key === "energy" ? "More Energy" : "Less Stress";
  if (change.trend === "worse")
    return change.key === "energy" ? "Less Energy" : "More Stress";
  return change.delta === 0
    ? "Same Hours"
    : (change.delta ?? 0) > 0
      ? "More Hours"
      : "Fewer Hours";
}

function RatingComparison({ change }: { change: StreakRatingChange }) {
  const unit = change.key === "sleepHours" ? "h" : "/ 5";
  const amount = change.delta === null ? null : Math.abs(change.delta);
  return (
    <article
      className={styles.ratingComparison}
      data-streak-rating={change.key}
      data-trend={change.trend}
    >
      <div className={styles.metricHeading}>
        <h3>{change.label}</h3>
        <span className={styles.trendPill}>
          <TrendSymbol trend={change.trend} />
          {trendLabel(change)}
        </span>
      </div>
      <div className={styles.metricValues}>
        <div>
          <span>This Milestone</span>
          <strong>
            {mean(change.current)} <small>{unit}</small>
          </strong>
        </div>
        <ActionIcon name="back" className="size-3 text-muted-foreground" />
        <div>
          <span>Previous Period</span>
          <strong>
            {mean(change.previous)} <small>{unit}</small>
          </strong>
        </div>
      </div>
      <p className={styles.metricCoverage}>
        {change.currentCount} ratings here · {change.previousCount} before
      </p>
      {change.trend === "insufficient" ? (
        <p className={styles.metricExplanation}>
          At least two ratings in each period are needed to compare.
        </p>
      ) : (
        <p className={styles.metricExplanation}>
          {amount === 0
            ? "The recorded averages match."
            : `${amount !== null && amount < 0.01 ? "Less than 0.01" : mean(amount)} ${change.key === "sleepHours" ? "hours" : "points"} ${change.delta! > 0 ? "higher" : "lower"} on average.`}
          {change.key === "sleepHours"
            ? " Hours are shown as a change, without rating it better or worse."
            : " Based on your own check-in ratings."}
        </p>
      )}
    </article>
  );
}

function WindowCoverage({ analytics }: { analytics: MilestoneAnalytics }) {
  return (
    <div className={styles.coverageCard} data-streak-coverage>
      <div className={styles.coverageTitle}>
        <ActionIcon name="calendar" className="size-4" />
        <h3>Two Equal Windows</h3>
        <span>{count(analytics.current.dayCount)} days each</span>
      </div>
      <div className={styles.coverageColumns}>
        {[
          { label: "This Milestone", period: analytics.current },
          { label: "Previous Period", period: analytics.previous },
        ].map(({ label, period }) => (
          <div key={label}>
            <h4>{label}</h4>
            <p>
              {shortDate(period.start)} – {shortDate(period.end)}
            </p>
            <dl>
              <div>
                <dt>Intake Days</dt>
                <dd>
                  {count(period.loggedDays)} / {count(period.dayCount)}
                </dd>
              </div>
              <div>
                <dt>Intake Entries</dt>
                <dd>{count(period.intakeCount)}</dd>
              </div>
              <div>
                <dt>Check-In Days</dt>
                <dd>{count(period.checkInDays)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className={styles.coverageHint}>
        A blank day is an unknown record, not a zero dose. Different amounts of
        recorded information can affect the comparison.
      </p>
    </div>
  );
}

function MedicationComparisons({
  analytics,
}: {
  analytics: MilestoneAnalytics;
}) {
  return (
    <section
      className={styles.detailSection}
      aria-labelledby="streak-medications-title"
    >
      <SectionTitle context="Each Medication Separately">
        <span id="streak-medications-title">Medication Records</span>
      </SectionTitle>
      <p className={styles.sectionDescription}>
        These are recorded amounts, shown without labeling a dose change better
        or worse. Averages use only days when that medication was logged.
      </p>
      {analytics.medications.length ? (
        <div className={styles.medicationList}>
          {analytics.medications.map((medication) => (
            <article
              key={medication.medicationId}
              className={styles.medicationComparison}
              data-streak-medication={medication.medicationId}
            >
              <div className={styles.medicationHeading}>
                <span
                  className={styles.medicationDot}
                  style={{
                    backgroundColor: getMedicationColor(medication.color).hex,
                  }}
                  aria-hidden="true"
                />
                <h3 title={medication.name}>{medication.name}</h3>
                <MedicationClassBadges medication={medication} />
                <span>
                  {medication.direction === "insufficient"
                    ? "No Comparison"
                    : medication.direction === "same"
                      ? "Same Mean"
                      : medication.direction === "lower"
                        ? "Lower Mean"
                        : "Higher Mean"}
                </span>
              </div>
              <div className={styles.medicationAmounts}>
                <div>
                  <span>This Milestone</span>
                  <strong>
                    {medication.currentMeanMg === null
                      ? "—"
                      : mean(medication.currentMeanMg)}{" "}
                    <small>mg / day with a record</small>
                  </strong>
                  <p>
                    {count(medication.currentLoggedDays)} days ·{" "}
                    {medication.currentTotalMg === null
                      ? "no recorded total"
                      : `${formatDose(medication.currentTotalMg)} mg recorded`}
                  </p>
                </div>
                <div>
                  <span>Previous Period</span>
                  <strong>
                    {medication.previousMeanMg === null
                      ? "—"
                      : mean(medication.previousMeanMg)}{" "}
                    <small>mg / day with a record</small>
                  </strong>
                  <p>
                    {count(medication.previousLoggedDays)} days ·{" "}
                    {medication.previousTotalMg === null
                      ? "no recorded total"
                      : `${formatDose(medication.previousTotalMg)} mg recorded`}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.plainEmpty}>
          No medication records are available in these windows.
        </div>
      )}
    </section>
  );
}

function RecordedJourney({ milestone }: { milestone: StreakMilestone }) {
  if (!milestone.windowEnd || !milestone.runStart) return null;
  const visibleDays = Math.min(14, milestone.target);
  const days = Array.from({ length: visibleDays }, (_, index) =>
    shiftDayKey(milestone.windowEnd!, index - visibleDays + 1),
  );
  return (
    <section
      className={styles.detailSection}
      aria-labelledby="streak-journey-title"
    >
      <SectionTitle
        context={
          milestone.target > 14
            ? `Last 14 Of ${count(milestone.target)}`
            : "Every Day In This Milestone"
        }
      >
        <span id="streak-journey-title">The Recorded Days</span>
      </SectionTitle>
      <div className={styles.dayGrid}>
        {days.map((day, index) => (
          <Link
            key={day}
            href={`/history/${day}`}
            aria-label={`Open daily log for ${formatDay(day, { year: "numeric" })}`}
          >
            <span>
              {formatDay(day, {
                weekday: "short",
                month: undefined,
                day: undefined,
              })}
            </span>
            <strong>
              {formatDay(day, {
                weekday: undefined,
                month: "short",
                day: "numeric",
              })}
            </strong>
            <span className={styles.dayNumber}>
              <ActionIcon name="selected" className="size-2.5" />
              {count(milestone.target - visibleDays + index + 1)}
            </span>
          </Link>
        ))}
      </div>
      <p className={styles.sectionDescription}>
        From {shortDate(milestone.runStart)} to {shortDate(milestone.windowEnd)}
        , one consecutive tracking day at a time. Open a day to see its actual
        entries.
      </p>
    </section>
  );
}

function CheckInMemories({ analytics }: { analytics: MilestoneAnalytics }) {
  const memories = [...analytics.current.checkIns]
    .filter((entry) => entry.note || entry.helped)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 3);
  return (
    <section
      className={styles.detailSection}
      aria-labelledby="streak-reflections-title"
    >
      <SectionTitle context={`${analytics.current.checkInDays} Check-In Days`}>
        <span id="streak-reflections-title">Little Things To Remember</span>
      </SectionTitle>
      {analytics.current.moods.length > 0 && (
        <div
          className={styles.moodSummary}
          aria-label="Recorded moods in this milestone"
        >
          {analytics.current.moods.map((mood) => (
            <span key={mood.value}>
              <span aria-hidden="true">{mood.emoji}</span>
              {mood.label}
              <strong>{mood.count}</strong>
            </span>
          ))}
        </div>
      )}
      {memories.length ? (
        <div className={styles.memoryList}>
          {memories.map((entry) => (
            <Link key={entry.day} href={`/history/${entry.day}`}>
              <span className={styles.memoryDate}>
                <MoonStarsIcon size={14} weight="bold" aria-hidden="true" />
                {shortDate(entry.day)}
                <ActionIcon name="external" className="size-3" />
              </span>
              {entry.note && <p>{entry.note}</p>}
              {entry.helped && (
                <span className={styles.helped}>
                  <strong>Helped · </strong>
                  {entry.helped}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.plainEmpty}>
          No written reflections in this milestone yet. Check-ins can be added
          from a past day whenever you want to remember more.
        </div>
      )}
    </section>
  );
}

export function StreakMilestonePage({ target }: { target: number }) {
  const { data, now } = useJournal();
  const milestone = useMemo(
    () => (data && now ? getStreakMilestone(data, now, target) : null),
    [data, now, target],
  );
  if (!data || !now) return null;
  if (!milestone)
    return (
      <div className={styles.page}>
        <p>This milestone isn’t available.</p>
        <Link href="/streaks" className={styles.backLink}>
          Back To Streaks
        </Link>
      </div>
    );
  const analytics = milestone.analytics;
  return (
    <div
      className={styles.page}
      data-streak-detail={target}
      data-streak-state={milestone.achieved ? "achieved" : "upcoming"}
    >
      <Link href="/streaks" className={styles.backLink}>
        <ActionIcon name="back" className="size-3.5" />
        Back To Streaks
      </Link>
      <header
        className={`${styles.detailHero} ${milestone.achieved ? styles.earnedHero : styles.upcomingHero}`}
        style={milestone.achieved ? paletteStyle(milestone.palette) : undefined}
      >
        {milestone.achieved && (
          <StreakArtwork
            seed={milestone.target}
            palette={milestone.palette}
            party
          />
        )}
        <div className={styles.heroForeground}>
          <div className={styles.heroTopline}>
            <span>
              {milestone.achieved ? (
                <>
                  <TrophyIcon size={14} weight="fill" aria-hidden="true" />
                  Milestone Unlocked
                </>
              ) : (
                <>
                  <ActionIcon name="secure" className="size-3.5" />A Little
                  Further Ahead
                </>
              )}
            </span>
            <span>Logging Streak</span>
          </div>
          <span className={styles.heroEmoji} aria-hidden="true">
            {milestone.achieved ? milestone.emoji : "✧"}
          </span>
          <h1>
            <span>{count(milestone.target)}</span>
            <small>Days In A Row</small>
          </h1>
          <h2>{milestone.title}</h2>
          <p className={styles.heroEncouragement}>
            {milestone.achieved
              ? milestone.encouragement
              : "A little more space for your story, when you reach it."}
          </p>
          {milestone.achieved && milestone.achievedOn ? (
            <div className={styles.earnedDate}>
              <ActionIcon name="calendar" className="size-3.5" />
              First reached{" "}
              {formatDay(milestone.achievedOn, {
                weekday: undefined,
                month: "short",
                year: "numeric",
              })}
            </div>
          ) : (
            <RunProgress milestone={milestone} />
          )}
        </div>
      </header>

      {!milestone.achieved ? (
        <>
          <div className={styles.upcomingSummary}>
            <h2>
              {count(milestone.remaining)} More Consecutive Logging{" "}
              {milestone.remaining === 1 ? "Day" : "Days"}
            </h2>
            <p>
              This is the progress of your current run. A gap starts a new run,
              while the milestones you already unlocked stay yours.
            </p>
            <div className={styles.futureContent}>
              <ActionIcon name="discover" className="size-6" />
              <div>
                <h3>The Detail Arrives With The Milestone</h3>
                <p>
                  Once reached, this page will show the recorded days, check-in
                  changes, and medication records available for that stretch.
                  There are no future results to show yet.
                </p>
              </div>
            </div>
          </div>
          <Link href="/" className={styles.todayAction}>
            <ActionIcon name="today" className="size-4" />
            Back To Today
            <ActionIcon name="next" className="size-4" />
          </Link>
        </>
      ) : (
        <>
          {analytics ? (
            <>
              <dl className={styles.earnedStats}>
                <div>
                  <dt>Days In This Milestone</dt>
                  <dd>{count(analytics.current.dayCount)}</dd>
                </div>
                <div>
                  <dt>Intakes Recorded</dt>
                  <dd>{count(analytics.current.intakeCount)}</dd>
                </div>
                <div>
                  <dt>Check-In Days</dt>
                  <dd>{count(analytics.current.checkInDays)}</dd>
                </div>
              </dl>
              <WindowCoverage analytics={analytics} />
              <section
                className={styles.detailSection}
                aria-labelledby="streak-changes-title"
              >
                <SectionTitle context="Your Own Ratings">
                  <span id="streak-changes-title">What Changed</span>
                </SectionTitle>
                <p className={styles.sectionDescription}>
                  See what improved, stayed the same, or felt harder in your
                  recorded energy and stress. Each comparison uses the
                  milestone’s first recorded stretch and the equally long period
                  just before it.
                </p>
                <div className={styles.ratingList}>
                  {analytics.ratings.map((change) => (
                    <RatingComparison key={change.key} change={change} />
                  ))}
                </div>
              </section>
              <MedicationComparisons analytics={analytics} />
              <RecordedJourney milestone={milestone} />
              <CheckInMemories analytics={analytics} />
            </>
          ) : (
            <div className={styles.plainEmpty}>
              This milestone is unlocked. A comparison for its recorded dates is
              not available.
            </div>
          )}
          <p className={styles.scopeNote}>
            Calculated from your current records; edits and backdated entries
            can update this view. These are self-reported changes, not a health
            score. Missing records never prove nothing was taken.
          </p>
        </>
      )}
      <Link href="/streaks" className={styles.backLink}>
        <ActionIcon name="back" className="size-3.5" />
        Milestone List
      </Link>
    </div>
  );
}
