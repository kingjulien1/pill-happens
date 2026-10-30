"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { toast } from "sonner";
import { useJournal } from "@/components/journal-provider";
import { ResponsiveModal } from "@/components/responsive-modal";
import { HeadingText } from "@/components/heading-text";
import { TodayHeading } from "@/components/today-heading";
import { loggingStreak } from "@/lib/logging-streak";
import { getMedicationType } from "@/lib/medication-types";
import { MedicationIcon } from "@/components/medication-icon";
import { MedicationActionButton } from "@/components/medication-action-button";
import {
  MedicationClassBadges,
  medicationClassHighlights,
} from "@/components/medication-class-badge";
import { getMedicationClassification } from "@/lib/medication-classification";
import {
  MedicationListHeading,
  MedicationsHeading,
} from "@/components/medications-heading";
import { IntakeForm } from "@/components/intake-form";
import { IntakeAction } from "@/components/intake-action";
import { IntakeCardGroup } from "@/components/intake-card-group";
import { IntakeTimelineEntrance } from "@/components/intake-timeline-entrance";
import { HistoryDayCard } from "@/components/history-day-card";
import { IntakeSummary } from "@/components/intake-summary";
import { EmptyIntakeStack } from "@/components/empty-intake-stack";
import { DailyCheckInSection } from "@/components/daily-check-in";
import { GoalForm, MedicationForm } from "@/components/manage-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupIntakes } from "@/lib/intake-groups";
import { canCheckIn, checkInForDay, journalDays } from "@/lib/daily-check-in";
import { Label } from "@/components/ui/label";
import {
  dayIntakes,
  dayKey,
  formatDay,
  formatDose,
  goalForDay,
  shiftDayKey,
  totalsForDay,
  type AppData,
  type Intake,
  type Medication,
} from "@/lib/domain";

function PageHeading({
  title,
  context,
  children,
}: {
  title: string;
  context: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="canvas-copy mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        <HeadingText title={title} context={context} />
      </h1>
      {children && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ActionIconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center rounded-3xl px-7 py-9 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-foreground/70">
        <ActionIcon name={icon} className="size-7" weight="duotone" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-2 max-w-[270px] text-xs leading-[1.9] text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function usagePercent(total: number, maximum: number) {
  return maximum > 0 ? (total / maximum) * 100 : total > 0 ? 100 : 0;
}

function DailyOverview({ data, day }: { data: AppData; day: string }) {
  const totals = totalsForDay(data, day);
  const activeIds = [
    ...new Set([
      ...totals.map((total) => total.medicationId),
      ...data.goals
        .filter(
          (goal) => goalForDay(data, goal.medicationId, day)?.id === goal.id,
        )
        .map((goal) => goal.medicationId),
    ]),
  ];

  return (
    <section
      aria-label="Daily overview"
      className="surface rounded-2xl px-4 py-3"
    >
      <div
        className={
          activeIds.length ? "mb-2" : "flex items-center justify-between gap-3"
        }
      >
        <h2 className="text-xs font-medium text-muted-foreground">
          Daily Totals
        </h2>
        {!activeIds.length && (
          <span className="text-xs text-muted-foreground">No intakes</span>
        )}
      </div>
      {activeIds.length > 0 && (
        <ul className="space-y-2.5">
          {activeIds.map((id) => {
            const medication = data.medications.find((item) => item.id === id);
            const benzodiazepine = medication?.isBenzodiazepine === true;
            const total = totals.find((item) => item.medicationId === id);
            const goal = goalForDay(data, id, day);
            const amount = total?.totalMg ?? 0;
            const name =
              total?.medicationName ??
              data.medications.find((medication) => medication.id === id)
                ?.name ??
              "Medication";
            return (
              <li
                key={id}
                className={`${medicationClassHighlights(medication)}${benzodiazepine || medication?.isOpioid === true ? " rounded-lg px-2 py-1" : ""}`}
                data-benzodiazepine={benzodiazepine || undefined}
                data-opioid={medication?.isOpioid === true || undefined}
                data-medication-classification={getMedicationClassification(
                  medication,
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="min-w-0 truncate text-xs font-medium"
                      title={name}
                    >
                      {name}
                    </span>
                    <MedicationClassBadges medication={medication} />
                  </span>
                  <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                    {formatDose(amount)} mg
                    {goal && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        / {formatDose(goal.dailyLimitMg)} mg max
                      </span>
                    )}
                  </span>
                </div>
                {goal && amount > goal.dailyLimitMg && (
                  <p className="mt-1 text-[10px] text-foreground">
                    Above daily maximum
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EntryEditor({ intake, close }: { intake: Intake; close: () => void }) {
  const { mutate, busy } = useJournal();
  const [confirm, setConfirm] = useState(false);
  async function remove() {
    try {
      await mutate(`intakes/${intake.id}`, undefined, "DELETE");
      toast.success("Entry deleted.");
      close();
    } catch {
      /* provider displays error */
    }
  }
  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => !v && close()}
      title="Edit Intake"
      context="Update Entry"
      description="Update this entry. Changes are saved to the day the intake was taken."
    >
      <IntakeForm intake={intake} onSaved={close} />
      <div className="mt-5 border-t pt-4">
        {confirm ? (
          <div>
            <p className="mb-3 text-center text-xs text-muted-foreground">
              Permanently delete this intake?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setConfirm(false)}
              >
                Keep entry
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                className="h-11"
                onClick={() => void remove()}
              >
                <ActionIcon name="delete" />
                Delete entry
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="h-11 w-full gap-2 text-xs text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <ActionIcon name="delete" />
            Delete this entry
          </Button>
        )}
      </div>
    </ResponsiveModal>
  );
}

function IntakeTimeline({
  data,
  day,
  showSummary = true,
  onLog,
}: {
  data: AppData;
  day: string;
  showSummary?: boolean;
  onLog?: () => void;
}) {
  const [editing, setEditing] = useState<Intake | null>(null);
  const entries = dayIntakes(data, day);
  const groups = groupIntakes(entries);
  return (
    <>
      {showSummary && (
        <div className="mb-4">
          <IntakeSummary count={entries.length} />
        </div>
      )}
      {!entries.length ? (
        <EmptyIntakeStack onLog={onLog} />
      ) : (
        <IntakeTimelineEntrance key={day}>
          {groups.map((group) => (
            <IntakeCardGroup
              key={group.id}
              group={group}
              medications={data.medications}
              day={day}
              timeZone={data.settings.timezone}
              onEdit={setEditing}
            />
          ))}
        </IntakeTimelineEntrance>
      )}
      {editing && (
        <EntryEditor intake={editing} close={() => setEditing(null)} />
      )}
    </>
  );
}

export function TodayPage() {
  const { data, now } = useJournal();
  const [open, setOpen] = useState(false);
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const streak = loggingStreak(data, today, now);
  const checkIn = checkInForDay(data.dailyCheckIns, today);
  const openLog = () => setOpen(true);
  return (
    <div className="flex flex-1 flex-col pt-6" data-today-layout>
      <TodayHeading
        day={today}
        current={streak.current}
        now={now}
        timeZone={data.settings.timezone}
      />
      <div className="mb-4" hidden={!checkIn}>
        <DailyCheckInSection day={today} checkIn={checkIn} variant="saved" />
      </div>
      <section aria-label="Today's entries" className="flex-1">
        <IntakeTimeline
          data={data}
          day={today}
          showSummary={false}
          onLog={openLog}
        />
        <div
          className="mt-5"
          hidden={
            Boolean(checkIn) || !canCheckIn(today, now, data.settings.timezone)
          }
        >
          <DailyCheckInSection day={today} variant="prompt" />
        </div>
      </section>
      <IntakeAction
        onClick={openLog}
        todayCount={dayIntakes(data, today).length}
      />
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Log Intake"
        context="New Entry"
        description="Record what you took, when you took it, and anything on your mind."
      >
        {open && <IntakeForm onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
    </div>
  );
}

export function MedicationsPage() {
  const { data, mutate, busy } = useJournal();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  if (!data) return null;
  const medications = data.medications.filter(
    (m) => m.archived === showArchived,
  );
  async function archive(medication: Medication) {
    try {
      await mutate(
        `medications/${medication.id}`,
        { archived: !medication.archived },
        "PATCH",
      );
      toast.success(
        medication.archived
          ? "Medication restored."
          : "Medication archived. Past entries are saved.",
      );
    } catch {
      /* provider displays error */
    }
  }
  return (
    <>
      <MedicationsHeading medications={data.medications} />
      <MedicationActionButton
        intent="add"
        className="mb-7"
        onClick={() => {
          setEditing(undefined);
          setOpen(true);
        }}
      />
      <MedicationListHeading
        archived={showArchived}
        count={medications.length}
        onArchivedChange={setShowArchived}
      />
      <div
        className="mb-4 flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card/90 px-3 py-2.5"
        data-medication-history-notice
      >
        <ActionIcon name="retry" className="mt-0.5 size-4 text-foreground/70" />
        <p className="text-[11px] leading-[1.7] text-muted-foreground">
          <span className="font-medium text-foreground">
            Edits Update All Past Logs.
          </span>{" "}
          Strength changes recalculate past doses and totals. Logged quantities,
          times and notes stay as entered.
        </p>
      </div>
      <div id="medication-library-list">
        {!medications.length ? (
          <EmptyState
            icon="medications"
            title={
              showArchived ? "Nothing Archived." : "Start with Your Medication."
            }
          >
            {showArchived
              ? "Archived medications stay here, and their past entries stay in your journal."
              : "Add the exact name and strength from the packaging. Your first log starts here."}
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {medications.map((m) => (
              <div
                key={m.id}
                className={`surface flex items-center gap-3.5 rounded-3xl p-4 ${medicationClassHighlights(m)}`}
                data-benzodiazepine={m.isBenzodiazepine === true || undefined}
                data-opioid={m.isOpioid === true || undefined}
                data-medication-classification={getMedicationClassification(m)}
              >
                <MedicationIcon
                  color={m.color}
                  icon={m.icon}
                  rotation={m.iconRotation}
                  isBenzodiazepine={m.isBenzodiazepine === true}
                  isOpioid={m.isOpioid === true}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{m.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDose(m.strengthMg)} mg /{" "}
                      {getMedicationType(m.form).unit}
                    </span>
                    <MedicationClassBadges medication={m} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="size-11 shrink-0 text-muted-foreground"
                  aria-label={`Edit ${m.name}`}
                  onClick={() => {
                    setEditing(m);
                    setOpen(true);
                  }}
                >
                  <ActionIcon name="edit" />
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="size-11 shrink-0 text-muted-foreground"
                  aria-label={`${m.archived ? "Restore" : "Archive"} ${m.name}`}
                  onClick={() => void archive(m)}
                >
                  {m.archived ? (
                    <ActionIcon name="restore" />
                  ) : (
                    <ActionIcon name="archive" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Medication" : "Add Medication"}
        titleIcon="medications"
        headerVariant="medication"
        context={editing ? "Update Details" : "Name & Strength"}
        description="Medication details and appearance."
      >
        {open && (
          <MedicationForm
            key={editing?.id ?? "new"}
            medication={editing}
            onSaved={() => setOpen(false)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}

export function GoalsPage() {
  const { data, now, mutate, busy } = useJournal();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const totals = totalsForDay(data, today);
  const goals = [...data.goals].sort(
    (a, b) =>
      b.startsOn.localeCompare(a.startsOn) ||
      b.createdAt.localeCompare(a.createdAt),
  );
  async function remove() {
    if (!deleting) return;
    try {
      await mutate(`goals/${deleting}`, undefined, "DELETE");
      setDeleting(null);
      toast.success("Goal removed.");
    } catch {
      /* provider displays error */
    }
  }
  return (
    <>
      <PageHeading title="Goals" context="Daily Maximums">
        Keep track of the targets agreed with your prescriber.
      </PageHeading>
      <Button
        className="mb-7 h-13 w-full gap-2 rounded-2xl"
        onClick={() => setOpen(true)}
      >
        <ActionIcon name="goals" />
        Set a daily goal
      </Button>
      {!goals.length ? (
        <EmptyState icon="goals" title="A Little Direction, When You’re Ready.">
          Add a daily maximum for one medication. Your journal will help you
          keep sight of it.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const med = data.medications.find(
              (m) => m.id === goal.medicationId,
            );
            const current =
              goalForDay(data, goal.medicationId, today)?.id === goal.id;
            const taken =
              totals.find((t) => t.medicationId === goal.medicationId)
                ?.totalMg ?? 0;
            const future = goal.startsOn > today;
            return (
              <article
                key={goal.id}
                className={`surface rounded-3xl p-5 ${medicationClassHighlights(med)}`}
                data-benzodiazepine={
                  med?.isBenzodiazepine === true || undefined
                }
                data-opioid={med?.isOpioid === true || undefined}
                data-medication-classification={getMedicationClassification(
                  med,
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <MedicationIcon
                    color={med?.color}
                    icon={med?.icon}
                    rotation={med?.iconRotation}
                    isBenzodiazepine={med?.isBenzodiazepine === true}
                    isOpioid={med?.isOpioid === true}
                    small
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <h2 className="min-w-0 truncate text-sm font-medium">
                        {med?.name ?? "Medication"}
                      </h2>
                      <MedicationClassBadges medication={med} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {current
                        ? "Current daily maximum"
                        : future
                          ? "Upcoming goal"
                          : "Previous goal"}
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${med?.name ?? "medication"} goal`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                    onClick={() => setDeleting(goal.id)}
                  >
                    <ActionIcon name="delete" />
                  </button>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                    {formatDose(goal.dailyLimitMg)}
                    <span className="ml-1.5 font-sans text-xs tracking-normal text-muted-foreground">
                      mg / day
                    </span>
                  </p>
                  <span className="rounded-full bg-primary/7 px-2.5 py-1 text-[9px] text-foreground">
                    {current ? "Active" : future ? "Upcoming" : "Past"}
                  </span>
                </div>
                {current && (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatDose(taken)} mg logged today</span>
                      <span>
                        {goal.dailyLimitMg === 0
                          ? taken > 0
                            ? "Above maximum"
                            : "No intake recorded"
                          : `${Math.round(usagePercent(taken, goal.dailyLimitMg))}%`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-primary/65"
                        style={{
                          width: `${Math.min(usagePercent(taken, goal.dailyLimitMg), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-4 border-t border-border/60 pt-3 text-[10px] leading-relaxed text-muted-foreground">
                  From{" "}
                  {formatDay(goal.startsOn, {
                    weekday: undefined,
                    month: "short",
                    year: "numeric",
                  })}
                  {goal.endsOn
                    ? ` until ${formatDay(goal.endsOn, { weekday: undefined, month: "short", year: "numeric" })}`
                    : " · ongoing"}
                </p>
                {goal.note && (
                  <p className="mt-2 text-[11px] leading-relaxed break-words text-muted-foreground">
                    {goal.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-7 flex gap-3 p-1">
        <Leaf size={17} className="mt-1 shrink-0 text-foreground/60" />
        <p className="text-[11px] leading-[1.9] text-muted-foreground">
          This is a record of your own goals, not a taper plan. Always work with
          your prescriber on dose changes. New goals can start on a future date.
        </p>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Set a Goal"
        context="Daily Maximum"
        description="Record a daily maximum you have chosen with your prescriber. This does not calculate a taper schedule."
      >
        {open && <GoalForm onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
      <ResponsiveModal
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove This Goal?"
        context="Confirm Removal"
        description="This also removes it from historical summaries. Your intake entries stay in your journal."
      >
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => setDeleting(null)}
          >
            Keep goal
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            className="h-12 rounded-xl"
            onClick={() => void remove()}
          >
            <ActionIcon name="delete" />
            Remove goal
          </Button>
        </div>
      </ResponsiveModal>
    </>
  );
}

function JournalPreferences() {
  const { data, mutate, signOut, busy } = useJournal();
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(data!.settings.timezone);
  const [saving, setSaving] = useState(false);
  async function logout() {
    setSaving(true);
    try {
      await signOut();
    } catch {
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="mt-8 flex items-center justify-center gap-4">
        <a
          href="/api/export"
          download
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <ActionIcon name="export" className="size-4" />
          Export journal
        </a>
        <span className="h-3 w-px bg-border" />
        <button
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
        >
          <ActionIcon name="settings" className="size-4" />
          Preferences
        </button>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Preferences"
        context="Your Journal"
        description="Your day begins at 06:00 in this timezone. Changing it regroups all of your entries."
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await mutate("settings", { timezone }, "PATCH");
              toast.success("Timezone updated.");
              setOpen(false);
            } catch {
              /* provider displays error */
            }
          }}
        >
          <div className="form-field">
            <Label htmlFor="timezone">Journal Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="timezones"
              required
              className="h-10 rounded-xl px-3 text-base md:text-sm"
            />
            <datalist id="timezones">
              {[
                "Europe/Vienna",
                "Europe/London",
                "Europe/Berlin",
                "America/New_York",
                "America/Los_Angeles",
                "Asia/Tokyo",
                "Australia/Sydney",
                "UTC",
              ].map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Use an IANA timezone such as Europe/Vienna. Daylight-saving
              changes are handled automatically.
            </p>
          </div>
          <Button
            className="h-12 w-full rounded-xl"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <ActionIcon name="loading" className="animate-spin" />
            ) : (
              <>
                <ActionIcon name="save" />
                Save preferences
              </>
            )}
          </Button>
        </form>
        <div className="mt-5 border-t pt-4">
          <Button
            variant="ghost"
            disabled={saving || busy}
            className="h-11 w-full gap-2 text-xs text-muted-foreground"
            onClick={() => void logout()}
          >
            <ActionIcon name="signOut" />
            Sign out
          </Button>
        </div>
      </ResponsiveModal>
    </>
  );
}

export function HistoryPage() {
  const { data, now } = useJournal();
  const [limit, setLimit] = useState(20);
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const days = journalDays(
    data.intakes,
    data.dailyCheckIns,
    data.settings.timezone,
  ).filter((day) => day < today);
  return (
    <>
      <PageHeading title="History" context="Past Days">
        Intake details and evening check-ins, day by day.
      </PageHeading>
      <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
        <span className="text-xs font-medium">Past Days</span>
        <span className="text-[10px] text-muted-foreground">
          {days.length} {days.length === 1 ? "day" : "days"} with entries
        </span>
      </div>
      {!days.length ? (
        <EmptyState icon="history" title="Your Story Starts Here.">
          Past days will appear here as you keep logging. Each new day begins at
          06:00.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {days.slice(0, limit).map((day) => (
            <HistoryDayCard key={day} data={data} day={day} />
          ))}
        </div>
      )}
      {days.length > limit && (
        <Button
          variant="outline"
          onClick={() => setLimit((l) => l + 20)}
          className="mt-5 h-12 w-full gap-2 rounded-2xl text-xs"
        >
          <ActionIcon name="loadMore" />
          Load 20 more days
          <span className="text-muted-foreground">
            ({days.length - limit} left)
          </span>
        </Button>
      )}
      <JournalPreferences />
    </>
  );
}

export function DayPage({ day }: { day: string }) {
  const { data, now } = useJournal();
  const [open, setOpen] = useState(false);
  if (!data || !now) return null;
  const today = dayKey(now, data.settings.timezone);
  const isFuture = day > today;
  const checkIn = checkInForDay(data.dailyCheckIns, day);
  return (
    <>
      <Link
        href="/history"
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-[11px] text-muted-foreground"
      >
        <ActionIcon name="back" className="size-4.5" />
        Back to past days
      </Link>
      <PageHeading
        title="Daily Log"
        context={formatDay(day, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      >
        06:00 to 06:00 the next day ·{" "}
        {data.settings.timezone.replaceAll("_", " ")}
      </PageHeading>
      <div className="mb-5" hidden={!checkIn}>
        <DailyCheckInSection day={day} checkIn={checkIn} variant="saved" />
      </div>
      <DailyOverview data={data} day={day} />
      <div className="my-6">
        <IntakeTimeline
          data={data}
          day={day}
          onLog={isFuture ? undefined : () => setOpen(true)}
        />
        <div
          className="mt-5"
          hidden={
            Boolean(checkIn) || !canCheckIn(day, now, data.settings.timezone)
          }
        >
          <DailyCheckInSection day={day} variant="prompt" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Link
          href={`/history/${shiftDayKey(day, -1)}`}
          className="flex min-h-11 items-center gap-1 text-[10px] text-muted-foreground"
        >
          <ActionIcon name="back" className="size-4" />
          Previous day
        </Link>
        {!isFuture && (
          <Button
            variant="ghost"
            className="h-11 gap-1 text-[10px] text-foreground"
            onClick={() => setOpen(true)}
          >
            <ActionIcon name="create" className="size-4.5" />
            Add missed intake
          </Button>
        )}
        {day < today && (
          <Link
            href={`/history/${shiftDayKey(day, 1)}`}
            className="flex min-h-11 items-center gap-1 text-[10px] text-muted-foreground"
          >
            Next day
            <ActionIcon name="next" className="size-4" />
          </Link>
        )}
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Log Intake"
        context="Past Entry"
        description="Add an intake you missed. Check the date and time before saving."
      >
        {open && <IntakeForm initialDay={day} onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
    </>
  );
}
