"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { toast } from "sonner";
import { useJournal } from "@/components/journal-provider";
import { ResponsiveModal } from "@/components/responsive-modal";
import { HeadingText } from "@/components/heading-text";
import { TodayHeading } from "@/components/today-heading";
import { loggingStreak } from "@/lib/logging-streak";
import { MedicationIcon } from "@/components/medication-icon";
import { IntakeForm } from "@/components/intake-form";
import { IntakeAction } from "@/components/intake-action";
import { IntakeSummary } from "@/components/intake-summary";
import { EmptyIntakeStack } from "@/components/empty-intake-stack";
import { GoalForm, MedicationForm } from "@/components/manage-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dayIntakes,
  dayKey,
  doseMg,
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
    <div className="mb-6">
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
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary/70">
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
          Daily totals
        </h2>
        {!activeIds.length && (
          <span className="text-xs text-muted-foreground">No intakes</span>
        )}
      </div>
      {activeIds.length > 0 && (
        <ul className="space-y-2.5">
          {activeIds.map((id) => {
            const total = totals.find((item) => item.medicationId === id);
            const goal = goalForDay(data, id, day);
            const amount = total?.totalMg ?? 0;
            const name =
              total?.medicationName ??
              data.medications.find((medication) => medication.id === id)
                ?.name ??
              "Medication";
            return (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="min-w-0 truncate text-xs font-medium"
                    title={name}
                  >
                    {name}
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
                  <p className="mt-1 text-[10px] text-primary">
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
      title="Edit intake"
      context="Update entry"
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
            className="h-11 w-full text-xs text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <ActionIcon name="delete" className="mr-2" />
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
}: {
  data: AppData;
  day: string;
  showSummary?: boolean;
}) {
  const [editing, setEditing] = useState<Intake | null>(null);
  const entries = dayIntakes(data, day);
  return (
    <>
      {showSummary && (
        <div className="mb-4">
          <IntakeSummary count={entries.length} />
        </div>
      )}
      {!entries.length ? (
        <EmptyIntakeStack />
      ) : (
        <div className="relative space-y-3 before:absolute before:top-6 before:bottom-6 before:left-[23px] before:w-px before:bg-border">
          {entries.map((entry, index) => {
            const medication = data.medications.find(
              (m) => m.id === entry.medicationId,
            );
            const time = new Intl.DateTimeFormat("en-GB", {
              timeZone: data.settings.timezone,
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(entry.takenAt));
            const localDay = new Intl.DateTimeFormat("en-CA", {
              timeZone: data.settings.timezone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(entry.takenAt));
            return (
              <button
                key={entry.id}
                onClick={() => setEditing(entry)}
                aria-label={`Edit ${entry.medicationName}, ${formatDose(doseMg(entry))} milligrams, ${time}`}
                className="surface relative flex w-full items-start gap-3.5 rounded-[21px] p-4 text-left transition-colors hover:border-primary/30"
              >
                <MedicationIcon
                  color={medication?.color}
                  icon={medication?.icon}
                  small
                />
                <div className="min-w-0 flex-1 pt-.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-[13px] font-medium">
                      {entry.medicationName}
                    </h3>
                    <span className="shrink-0 text-[13px] font-medium tabular-nums">
                      {formatDose(doseMg(entry))}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        mg
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>
                      {time}
                      {localDay !== day ? " · next morning" : ""}{" "}
                      <span className="mx-1">·</span>{" "}
                      {formatDose(entry.quantity)} ×{" "}
                      {formatDose(entry.strengthMg)} mg
                    </span>
                    <span className="flex items-center gap-1">
                      {String(index + 1).padStart(2, "0")}
                      <ActionIcon name="edit" className="size-4" />
                    </span>
                  </div>
                  {entry.note && (
                    <p className="mt-2.5 border-t border-border/60 pt-2 text-[11px] leading-relaxed break-words text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
  return (
    <div className="flex flex-1 flex-col pt-6" data-today-layout>
      <TodayHeading
        day={today}
        current={streak.current}
        now={now}
        timeZone={data.settings.timezone}
      />
      <section aria-label="Today's entries" className="flex-1">
        <IntakeTimeline data={data} day={today} showSummary={false} />
      </section>
      <IntakeAction
        onClick={() => setOpen(true)}
        todayCount={dayIntakes(data, today).length}
      />
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Log intake"
        context="New entry"
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
      <PageHeading title="Medications" context="Your list">
        Manage medication names, strengths, and types.
      </PageHeading>
      <Button
        className="mb-7 h-13 w-full gap-2 rounded-2xl"
        onClick={() => {
          setEditing(undefined);
          setOpen(true);
        }}
      >
        <ActionIcon name="medications" />
        Add a medication
      </Button>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          <HeadingText
            title={showArchived ? "Archived" : "Active"}
            context={`${medications.length} ${medications.length === 1 ? "medication" : "medications"}`}
          />
        </h2>
        <Button
          variant="ghost"
          className="h-11 px-2 text-[10px] text-muted-foreground"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? (
            <ActionIcon name="restore" className="size-4" />
          ) : (
            <ActionIcon name="archive" className="size-4" />
          )}
          <span className="ml-1">
            {showArchived ? "Show active" : "Archived"}
          </span>
        </Button>
      </div>
      {!medications.length ? (
        <EmptyState
          icon="medications"
          title={
            showArchived ? "Nothing archived." : "Start with your medication."
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
              className="surface flex items-center gap-3.5 rounded-3xl p-4"
            >
              <MedicationIcon color={m.color} icon={m.icon} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium">{m.name}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDose(m.strengthMg)} mg /{" "}
                  {m.form === "other"
                    ? "unit"
                    : m.form === "drops"
                      ? "drop"
                      : m.form}
                </p>
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
      <div className="mt-7 flex gap-3 rounded-2xl border border-border/70 bg-card/40 p-4">
        <Leaf size={16} className="mt-.5 shrink-0 text-primary/70" />
        <p className="text-[11px] leading-[1.8] text-muted-foreground">
          Changes apply to new entries. Past entries keep the name and strength
          you originally recorded.
        </p>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit medication" : "Add medication"}
        context={editing ? "Update details" : "Name & strength"}
        description="Use the name and strength printed on your medication packaging."
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
      <PageHeading title="Goals" context="Daily maximums">
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
        <EmptyState icon="goals" title="A little direction, when you’re ready.">
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
              <article key={goal.id} className="surface rounded-3xl p-5">
                <div className="mb-4 flex items-center gap-3">
                  <MedicationIcon color={med?.color} icon={med?.icon} small />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium">
                      {med?.name ?? "Medication"}
                    </h2>
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
                  <span className="rounded-full bg-primary/7 px-2.5 py-1 text-[9px] text-primary">
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
        <Leaf size={17} className="mt-1 shrink-0 text-primary/60" />
        <p className="text-[11px] leading-[1.9] text-muted-foreground">
          This is a record of your own goals, not a taper plan. Always work with
          your prescriber on dose changes. New goals can start on a future date.
        </p>
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Set a goal"
        context="Daily maximum"
        description="Record a daily maximum you have chosen with your prescriber. This does not calculate a taper schedule."
      >
        {open && <GoalForm onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
      <ResponsiveModal
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove this goal?"
        context="Confirm removal"
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
  const { data, mutate, busy } = useJournal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(data!.settings.timezone);
  const [saving, setSaving] = useState(false);
  async function logout() {
    setSaving(true);
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      router.replace("/login");
      router.refresh();
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
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary"
        >
          <ActionIcon name="export" className="size-4" />
          Export journal
        </a>
        <span className="h-3 w-px bg-border" />
        <button
          className="flex min-h-11 items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary"
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
        context="Your journal"
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
            <Label htmlFor="timezone">Journal timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="timezones"
              required
              className="h-12 rounded-xl text-base"
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
            disabled={saving}
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
  const days = [
    ...new Set(
      data.intakes.map((i) => dayKey(i.takenAt, data.settings.timezone)),
    ),
  ]
    .filter((d) => d !== today)
    .sort()
    .reverse();
  return (
    <>
      <PageHeading title="History" context="Past days">
        Daily summaries and intake details.
      </PageHeading>
      <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
        <span className="text-xs font-medium">Past days</span>
        <span className="text-[10px] text-muted-foreground">
          {days.length} {days.length === 1 ? "day" : "days"} with entries
        </span>
      </div>
      {!days.length ? (
        <EmptyState icon="history" title="Your story starts here.">
          Past days will appear here as you keep logging. Each new day begins at
          06:00.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {days.slice(0, limit).map((day) => {
            const totals = totalsForDay(data, day);
            const count = dayIntakes(data, day).length;
            const goals = totals.map((t) =>
              goalForDay(data, t.medicationId, day),
            );
            const hasGoals = goals.some(Boolean);
            const over = totals.some(
              (t, i) => goals[i] && t.totalMg > goals[i]!.dailyLimitMg,
            );
            return (
              <Link
                key={day}
                href={`/history/${day}`}
                className="surface block rounded-3xl p-5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[13px] font-medium">
                      {formatDay(day, { weekday: "short", month: "short" })}
                    </h2>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {count} {count === 1 ? "intake" : "intakes"}
                      {hasGoals
                        ? ` · ${over ? "Above a recorded maximum" : "Within recorded maximums"}`
                        : " · No daily goal"}
                    </p>
                  </div>
                  <ActionIcon
                    name="open"
                    className="mt-1 text-muted-foreground"
                  />
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {totals.map((t) => (
                    <span
                      key={t.medicationId}
                      className="rounded-lg bg-muted/70 px-2.5 py-1.5 text-[10px] text-muted-foreground"
                    >
                      {t.medicationName}
                      <span className="ml-2 font-medium text-foreground">
                        {formatDose(t.totalMg)} mg
                      </span>
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
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
        title="Daily log"
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
      <DailyOverview data={data} day={day} />
      <div className="my-6">
        <IntakeTimeline data={data} day={day} />
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
            className="h-11 gap-1 text-[10px] text-primary"
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
        title="Log intake"
        context="Past entry"
        description="Add an intake you missed. Check the date and time before saving."
      >
        {open && <IntakeForm initialDay={day} onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
    </>
  );
}
