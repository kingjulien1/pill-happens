"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { toast } from "sonner";
import { useJournal } from "@/components/journal-provider";
import { ResponsiveModal } from "@/components/responsive-modal";
import { HeadingText } from "@/components/heading-text";
import { IntakeForm } from "@/components/intake-form";
import { IntakeAction } from "@/components/intake-action";
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
  trailing,
  children,
}: {
  title: string;
  context?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-lg font-medium">
        <HeadingText title={title} context={context} trailing={trailing} />
      </h1>
      {children && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
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
    <div className="flex items-start gap-3 border-y border-dashed border-border py-5">
      <ActionIcon name={icon} className="mt-0.5 size-6 text-muted-foreground" />
      <div className="min-w-0">
        <h3 className="text-xs font-medium">{title}</h3>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function MedicationIcon({
  color = "rose",
  small = false,
}: {
  color?: string;
  small?: boolean;
}) {
  return (
    <span
      className={`med-icon color-${color} flex shrink-0 items-center justify-center rounded-lg ${small ? "size-8" : "size-9"}`}
    >
      <ActionIcon
        name="medications"
        className={small ? "size-[22px]" : "size-6"}
      />
    </span>
  );
}

function usagePercent(total: number, maximum: number) {
  return maximum > 0 ? (total / maximum) * 100 : total > 0 ? 100 : 0;
}

function DailyOverview({ data, day }: { data: AppData; day: string }) {
  const totals = totalsForDay(data, day);
  const activeIds = [
    ...new Set([
      ...totals.map((t) => t.medicationId),
      ...data.goals
        .filter((g) => goalForDay(data, g.medicationId, day)?.id === g.id)
        .map((g) => g.medicationId),
    ]),
  ];
  return (
    <section
      aria-label="Daily overview"
      className="surface rounded-lg px-3 py-3"
    >
      <h2 className="text-xs font-medium">
        <HeadingText
          title="Totals"
          context="By medication"
          trailing={activeIds.length ? "Logged / max" : "No entries"}
        />
      </h2>
      {activeIds.length > 0 && (
        <ul className="mt-2.5 space-y-2.5">
          {activeIds.map((id) => {
            const total = totals.find((t) => t.medicationId === id);
            const goal = goalForDay(data, id, day);
            const amount = total?.totalMg ?? 0;
            const name =
              total?.medicationName ??
              data.medications.find((m) => m.id === id)?.name ??
              "Medication";
            return (
              <li key={id}>
                <div
                  data-journal-row="total"
                  className="flex items-center justify-between gap-3"
                >
                  <span
                    data-row-main
                    className="min-w-0 truncate text-xs"
                    title={name}
                  >
                    {name}
                  </span>
                  <span
                    data-row-meta
                    className="shrink-0 text-right text-[13px] font-medium tabular-nums"
                  >
                    {formatDose(amount)} mg
                    {goal && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        / {formatDose(goal.dailyLimitMg)} mg
                      </span>
                    )}
                  </span>
                </div>
                {goal && amount > goal.dailyLimitMg && (
                  <p className="mt-0.5 text-[10px] text-primary">
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
      /* provider displays the error */
    }
  }
  return (
    <ResponsiveModal
      open
      onOpenChange={(v) => !v && close()}
      title="Edit intake"
      context="Entry"
      description="Changes stay with the day the intake was taken."
    >
      <IntakeForm intake={intake} onSaved={close} />
      <div className="mt-4 border-t pt-3">
        {confirm ? (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Permanently delete this intake?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-lg"
                onClick={() => setConfirm(false)}
              >
                Keep entry
              </Button>
              <Button
                variant="destructive"
                className="h-11 rounded-lg"
                disabled={busy}
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

function IntakeTimeline({ data, day }: { data: AppData; day: string }) {
  const [editing, setEditing] = useState<Intake | null>(null);
  const entries = dayIntakes(data, day);
  return (
    <>
      <h2 className="mb-2 text-xs font-medium">
        <HeadingText
          title="Entries"
          context={`${entries.length} logged`}
          trailing="Log order"
        />
      </h2>
      {!entries.length ? (
        <p className="border-y border-dashed border-border py-4 text-xs text-muted-foreground">
          No entries recorded for this day.
        </p>
      ) : (
        <ol className="journal-list">
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
              <li key={entry.id}>
                <button
                  onClick={() => setEditing(entry)}
                  aria-label={`Edit ${entry.medicationName}, ${formatDose(doseMg(entry))} milligrams, ${time}`}
                  className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <MedicationIcon color={medication?.color} small />
                  <div className="min-w-0 flex-1">
                    <div
                      data-journal-row="intake"
                      className="flex items-center justify-between gap-3"
                    >
                      <h3
                        data-row-main
                        className="min-w-0 truncate text-[13px] font-medium"
                      >
                        {entry.medicationName}
                      </h3>
                      <span
                        data-row-meta
                        className="shrink-0 text-[13px] font-medium tabular-nums"
                      >
                        {formatDose(doseMg(entry))}
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          mg
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>
                        {time}
                        {localDay !== day ? " · next morning" : ""}
                        <span className="mx-1.5 text-muted-foreground/50">
                          /
                        </span>
                        {formatDose(entry.quantity)} ×{" "}
                        {formatDose(entry.strengthMg)} mg
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="tabular-nums">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <ActionIcon name="edit" className="size-4" />
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-2 text-[11px] leading-relaxed break-words text-muted-foreground">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
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
  return (
    <>
      <PageHeading
        title="Today"
        context={formatDay(today, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
        trailing="06:00 reset"
      />
      <DailyOverview data={data} day={today} />
      <section aria-label="Today's entries" className="mt-5">
        <IntakeTimeline data={data} day={today} />
      </section>
      <IntakeAction onClick={() => setOpen(true)} />
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Log intake"
        context="New entry"
        description="Medication, amount, and time taken."
      >
        {open && <IntakeForm onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
    </>
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
      /* provider displays the error */
    }
  }
  return (
    <>
      <PageHeading title="Medications" context="Library" trailing="mg / unit" />
      <Button
        className="mb-4 h-11 w-full gap-2 rounded-lg text-sm"
        onClick={() => {
          setEditing(undefined);
          setOpen(true);
        }}
      >
        <ActionIcon name="medications" />
        Add a medication
      </Button>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-xs font-medium">
          <HeadingText
            title="List"
            context={`${medications.length} ${showArchived ? "archived" : "active"}`}
          />
        </h2>
        <Button
          variant="ghost"
          className="h-11 gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground"
          onClick={() => setShowArchived(!showArchived)}
        >
          <ActionIcon
            name={showArchived ? "restore" : "archive"}
            className="size-4"
          />
          {showArchived ? "Show active" : "Archived"}
        </Button>
      </div>
      {!medications.length ? (
        <EmptyState
          icon="medications"
          title={
            showArchived ? "No archived medications" : "No medications yet"
          }
        >
          {showArchived
            ? "Archived items keep their past entries."
            : "Add the name and strength from the packaging."}
        </EmptyState>
      ) : (
        <div className="journal-list">
          {medications.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <MedicationIcon color={m.color} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-medium">{m.name}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDose(m.strengthMg)} mg
                  <span className="mx-1.5 text-muted-foreground/50">/</span>
                  {m.form === "other"
                    ? "unit"
                    : m.form === "drops"
                      ? "drop"
                      : m.form}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button
                  variant="ghost"
                  className="size-11 rounded-lg text-muted-foreground"
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
                  className="size-11 rounded-lg text-muted-foreground"
                  disabled={busy}
                  aria-label={`${m.archived ? "Restore" : "Archive"} ${m.name}`}
                  onClick={() => void archive(m)}
                >
                  <ActionIcon name={m.archived ? "restore" : "archive"} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
        Changes apply to future logs. Past entries keep their recorded details.
      </p>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit medication" : "Add medication"}
        context="mg / unit"
        description="Use the details on your medication packaging."
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
  const activeCount = goals.filter(
    (goal) => goalForDay(data, goal.medicationId, today)?.id === goal.id,
  ).length;
  async function remove() {
    if (!deleting) return;
    try {
      await mutate(`goals/${deleting}`, undefined, "DELETE");
      setDeleting(null);
      toast.success("Goal removed.");
    } catch {
      /* provider displays the error */
    }
  }
  return (
    <>
      <PageHeading
        title="Goals"
        context="Daily max"
        trailing={`${activeCount} active`}
      />
      <Button
        className="mb-4 h-11 w-full gap-2 rounded-lg text-sm"
        onClick={() => setOpen(true)}
      >
        <ActionIcon name="goals" />
        Set a daily goal
      </Button>
      {!goals.length ? (
        <EmptyState icon="goals" title="No goals yet">
          Record a daily maximum agreed with your prescriber.
        </EmptyState>
      ) : (
        <div className="journal-list">
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
            const state = current ? "Active" : future ? "Upcoming" : "Past";
            return (
              <article key={goal.id} className="py-4">
                <div
                  data-journal-row="goal"
                  className="flex items-center justify-between gap-3"
                >
                  <div data-row-main className="min-w-0">
                    <h2 className="truncate text-[13px] font-medium">
                      {med?.name ?? "Medication"}
                    </h2>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {state}
                      <span className="mx-1.5 text-muted-foreground/50">/</span>
                      daily maximum
                    </p>
                  </div>
                  <div
                    data-row-meta
                    className="flex shrink-0 items-center gap-1"
                  >
                    <span className="font-heading text-lg font-medium tabular-nums">
                      {formatDose(goal.dailyLimitMg)}
                      <span className="ml-1 font-sans text-[10px] font-normal text-muted-foreground">
                        mg
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      className="size-11 rounded-lg text-muted-foreground"
                      aria-label={`Remove ${med?.name ?? "medication"} goal`}
                      onClick={() => setDeleting(goal.id)}
                    >
                      <ActionIcon name="delete" />
                    </Button>
                  </div>
                </div>
                {current && (
                  <div className="mt-2">
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                      <span>{formatDose(taken)} mg logged</span>
                      <span>
                        {goal.dailyLimitMg === 0
                          ? taken > 0
                            ? "Above maximum"
                            : "No intake recorded"
                          : `${Math.round(usagePercent(taken, goal.dailyLimitMg))}%`}
                      </span>
                    </div>
                    <div className="h-1 bg-primary/10">
                      <div
                        className="h-full bg-primary/65"
                        style={{
                          width: `${Math.min(usagePercent(taken, goal.dailyLimitMg), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {formatDay(goal.startsOn, {
                    weekday: undefined,
                    month: "short",
                    year: "numeric",
                  })}
                  <span className="mx-1.5 text-muted-foreground/50">/</span>
                  {goal.endsOn
                    ? `Until ${formatDay(goal.endsOn, { weekday: undefined, month: "short", year: "numeric" })}`
                    : "Ongoing"}
                </p>
                {goal.note && (
                  <p className="mt-1.5 text-[11px] leading-relaxed break-words text-muted-foreground">
                    {goal.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-4 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
        Personal targets, not a taper plan. Review dose changes with your
        prescriber.
      </p>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Set a goal"
        context="Daily max"
        description="A daily maximum agreed with your prescriber."
      >
        {open && <GoalForm onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
      <ResponsiveModal
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Remove goal?"
        context="Confirm"
        description="This removes the goal from historical summaries. Intake entries stay saved."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-lg"
            onClick={() => setDeleting(null)}
          >
            Keep goal
          </Button>
          <Button
            variant="destructive"
            className="h-11 rounded-lg"
            disabled={busy}
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
      <div className="mt-4 flex items-center justify-between border-t border-border pt-2">
        <a
          href="/api/export"
          download
          className="flex min-h-11 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
        >
          <ActionIcon name="export" className="size-4" />
          Export journal
        </a>
        <button
          className="flex min-h-11 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
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
        context="Journal"
        description="Days begin at 06:00 in the selected timezone."
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
              /* provider displays the error */
            }
          }}
        >
          <div className="form-field">
            <Label htmlFor="timezone" className="text-xs">
              Journal timezone
            </Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="timezones"
              required
              className="h-12 rounded-lg text-base"
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
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Changing the timezone regroups existing entries. Daylight-saving
              changes are automatic.
            </p>
          </div>
          <Button
            className="h-12 w-full gap-2 rounded-lg"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <ActionIcon name="loading" className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <ActionIcon name="save" />
                Save preferences
              </>
            )}
          </Button>
        </form>
        <div className="mt-4 border-t pt-3">
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
      <PageHeading
        title="History"
        context={`${days.length} days`}
        trailing="Newest first"
      />
      {!days.length ? (
        <EmptyState icon="history" title="No past days">
          Past days with recorded entries will appear here.
        </EmptyState>
      ) : (
        <div className="journal-list">
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
                className="block py-3 transition-colors hover:bg-muted/40"
              >
                <div
                  data-journal-row="history"
                  className="flex items-center justify-between gap-3"
                >
                  <div data-row-main className="min-w-0">
                    <h2 className="text-[13px] font-medium">
                      {formatDay(day, { weekday: "short", month: "short" })}
                    </h2>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {count} {count === 1 ? "entry" : "entries"}
                      <span className="mx-1.5 text-muted-foreground/50">/</span>
                      {day.slice(0, 4)}
                    </p>
                  </div>
                  <span
                    data-row-meta
                    className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <span>
                      {hasGoals
                        ? over
                          ? "Above max"
                          : "Within set goals"
                        : "No goal"}
                    </span>
                    <ActionIcon name="open" className="size-4" />
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {totals.map((t) => (
                    <div
                      key={t.medicationId}
                      className="flex items-center justify-between gap-3 text-[11px]"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        {t.medicationName}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatDose(t.totalMg)} mg
                      </span>
                    </div>
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
          className="mt-4 h-11 w-full gap-2 rounded-lg text-xs"
          onClick={() => setLimit((l) => l + 20)}
        >
          <ActionIcon name="loadMore" />
          Load 20 more days
          <span className="font-normal text-muted-foreground">
            / {days.length - limit} left
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
        className="mb-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground"
      >
        <ActionIcon name="back" className="size-4" />
        Back to past days
      </Link>
      <PageHeading
        title="Daily log"
        context={formatDay(day, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
        trailing={day.slice(0, 4)}
      >
        06:00 to 06:00 the next day /{" "}
        {data.settings.timezone.replaceAll("_", " ")}
      </PageHeading>
      <DailyOverview data={data} day={day} />
      <div className="mt-5">
        <IntakeTimeline data={data} day={day} />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t pt-2">
        <Link
          href={`/history/${shiftDayKey(day, -1)}`}
          aria-label="Previous day"
          className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground"
        >
          <ActionIcon name="back" className="size-4" />
          Previous
        </Link>
        {!isFuture ? (
          <Button
            variant="ghost"
            className="h-11 gap-1 rounded-lg px-1.5 text-[10px] text-primary"
            onClick={() => setOpen(true)}
          >
            <ActionIcon name="create" className="size-4" />
            Add missed intake
          </Button>
        ) : (
          <span />
        )}
        {day < today ? (
          <Link
            href={`/history/${shiftDayKey(day, 1)}`}
            aria-label="Next day"
            className="flex min-h-11 items-center justify-end gap-1 text-xs text-muted-foreground"
          >
            Next
            <ActionIcon name="next" className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Log intake"
        context="Past entry"
        description="Check the date and time before saving."
      >
        {open && <IntakeForm initialDay={day} onSaved={() => setOpen(false)} />}
      </ResponsiveModal>
    </>
  );
}
