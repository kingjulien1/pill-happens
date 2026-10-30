"use client";

import { useId, useState } from "react";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { BatteryMediumIcon } from "@phosphor-icons/react/dist/ssr/BatteryMedium";
import { WavesIcon } from "@phosphor-icons/react/dist/ssr/Waves";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { toast } from "sonner";
import { ActionIcon } from "@/components/action-icon";
import { useJournal } from "@/components/journal-provider";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DailyReflectionEditor } from "@/components/daily-reflection-editor";
import {
  DAILY_MOODS,
  type DailyCheckIn,
  type DailyMood,
} from "@/lib/daily-check-in";
import { formatDay } from "@/lib/domain";
import styles from "./daily-check-in.module.css";

type CheckInProps = {
  day: string;
  checkIn?: DailyCheckIn;
  variant: "prompt" | "saved";
};

export function DailyCheckInSection({ day, checkIn, variant }: CheckInProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{
    day: string;
    checkIn?: DailyCheckIn;
  } | null>(null);
  const { busy } = useJournal();
  const saved = variant === "saved" && Boolean(checkIn);
  const moods = DAILY_MOODS.filter((mood) =>
    checkIn?.moods.includes(mood.value),
  );

  return (
    <section
      className={styles.section}
      aria-label={saved ? "Your Evening Check-In" : "Evening Check-In"}
      data-daily-check-in={saved ? "saved" : "prompt"}
      data-check-in-day={day}
    >
      <button
        type="button"
        className={styles.card}
        data-filled={saved}
        onClick={() => {
          setEditing({ day, checkIn });
          setOpen(true);
        }}
        aria-label={saved ? "Edit Evening Check-In" : "Write Evening Check-In"}
        aria-haspopup="dialog"
        disabled={busy}
      >
        <span className={styles.cardIcon} aria-hidden="true">
          <MoonStarsIcon size={23} weight="bold" />
        </span>
        <span className={styles.cardBody}>
          <span className={styles.cardHeading}>
            <span className={styles.cardTitle}>Evening Check-In</span>
            <span className={styles.cardContext}>
              <span aria-hidden="true">/</span>
              {saved ? "Saved" : "Your Day"}
            </span>
          </span>
          {saved && checkIn ? (
            <>
              {checkIn.note && (
                <span className={styles.note}>{checkIn.note}</span>
              )}
              {(moods.length > 0 ||
                checkIn.energy !== null ||
                checkIn.stress !== null ||
                checkIn.sleepHours !== null) && (
                <span className={styles.summaryValues}>
                  {moods.map((mood) => (
                    <span key={mood.value} className={styles.summaryChip}>
                      <span aria-hidden="true">{mood.emoji}</span>
                      {mood.label}
                    </span>
                  ))}
                  {checkIn.energy !== null && (
                    <span className={styles.summaryChip}>
                      <BatteryMediumIcon
                        size={12}
                        weight="bold"
                        aria-hidden="true"
                      />
                      Energy {checkIn.energy}/5
                    </span>
                  )}
                  {checkIn.stress !== null && (
                    <span className={styles.summaryChip}>
                      <WavesIcon size={12} weight="bold" aria-hidden="true" />
                      Stress {checkIn.stress}/5
                    </span>
                  )}
                  {checkIn.sleepHours !== null && (
                    <span className={styles.summaryChip}>
                      <MoonStarsIcon
                        size={12}
                        weight="bold"
                        aria-hidden="true"
                      />
                      {checkIn.sleepHours}h Sleep
                    </span>
                  )}
                </span>
              )}
              {checkIn.helped && (
                <span className={styles.helped}>
                  <span>Helped · </span>
                  {checkIn.helped}
                </span>
              )}
            </>
          ) : (
            <span className={styles.cardDescription}>
              Your day, your words. Make a little space to reflect.
            </span>
          )}
        </span>
        <span className={styles.cardAffordance} aria-hidden="true">
          <ActionIcon name={saved ? "edit" : "external"} className="size-4" />
        </span>
      </button>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
        title="Evening Check-In"
        titleIcon="shootingStar"
        context={formatDay(editing?.day ?? day, {
          weekday: "short",
          month: "short",
        })}
        description="Your evening journal: room for your thoughts, moods and the details you want to keep. Every field is optional."
      >
        {open && editing && (
          <CheckInForm
            day={editing.day}
            checkIn={editing.checkIn}
            onSaved={() => setOpen(false)}
          />
        )}
      </ResponsiveModal>
    </section>
  );
}

function RatingField({
  label,
  value,
  onChange,
  disabled,
  icon,
  low,
  high,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled: boolean;
  icon: "energy" | "stress";
  low: string;
  high: string;
}) {
  const Icon = icon === "energy" ? BatteryMediumIcon : WavesIcon;
  return (
    <fieldset className={styles.ratingField} disabled={disabled}>
      <legend className={styles.fieldHeading}>
        <Icon size={15} weight="bold" aria-hidden="true" />
        {label}
      </legend>
      <div className={styles.ratings}>
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`${label} ${number} of 5${value === number ? ", selected; press to clear" : ""}`}
            aria-pressed={value === number}
            className={styles.rating}
            onClick={() => onChange(value === number ? null : number)}
          >
            {number}
          </button>
        ))}
      </div>
      <div className={styles.ratingCaptions} aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}

function CheckInForm({
  day,
  checkIn,
  onSaved,
}: {
  day: string;
  checkIn?: DailyCheckIn;
  onSaved: () => void;
}) {
  const { mutate, busy } = useJournal();
  const id = useId();
  const [note, setNote] = useState(checkIn?.note ?? "");
  const [moods, setMoods] = useState<DailyMood[]>(checkIn?.moods ?? []);
  const [energy, setEnergy] = useState<number | null>(checkIn?.energy ?? null);
  const [stress, setStress] = useState<number | null>(checkIn?.stress ?? null);
  const [sleepHours, setSleepHours] = useState(
    checkIn?.sleepHours === null || checkIn?.sleepHours === undefined
      ? ""
      : String(checkIn.sleepHours),
  );
  const [helped, setHelped] = useState(checkIn?.helped ?? "");
  const [error, setError] = useState("");
  const hasContent =
    note.trim() ||
    moods.length ||
    energy !== null ||
    stress !== null ||
    sleepHours !== "" ||
    helped.trim();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!hasContent) {
      setError("Pick a mood or add one little detail before saving.");
      return;
    }
    setError("");
    try {
      await mutate("daily-check-ins", {
        day,
        note,
        moods,
        energy,
        stress,
        sleepHours: sleepHours === "" ? null : Number(sleepHours),
        helped,
      });
      toast.success(checkIn ? "Check-in updated." : "Your day, saved.");
      onSaved();
    } catch {
      // The provider shows the save error; keep the complete draft open.
    }
  }

  return (
    <form className={styles.form} onSubmit={save} aria-busy={busy}>
      <DailyReflectionEditor
        id={`${id}-note`}
        value={note}
        onChange={setNote}
        disabled={busy}
      />

      <fieldset className={styles.moodField} disabled={busy}>
        <legend className={styles.moodLegend}>
          <span className={styles.fieldHeading}>
            <ActionIcon name="flower" className="size-4" />
            Today Felt Like
          </span>
          <span className={styles.optional}>{moods.length} / 4</span>
        </legend>
        <p className={styles.fieldHint}>A mix is okay. Pick up to four.</p>
        <div className={styles.moodGrid}>
          {DAILY_MOODS.map((mood) => {
            const selected = moods.includes(mood.value);
            return (
              <button
                key={mood.value}
                type="button"
                aria-pressed={selected}
                className={styles.mood}
                disabled={!selected && moods.length >= 4}
                onClick={() =>
                  setMoods((current) =>
                    current.includes(mood.value)
                      ? current.filter((value) => value !== mood.value)
                      : [...current, mood.value],
                  )
                }
              >
                <span className={styles.moodEmoji} aria-hidden="true">
                  {mood.emoji}
                </span>
                <span>{mood.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.ratingRow}>
        <RatingField
          label="Energy"
          icon="energy"
          value={energy}
          onChange={setEnergy}
          disabled={busy}
          low="Low"
          high="Full"
        />
        <RatingField
          label="Stress"
          icon="stress"
          value={stress}
          onChange={setStress}
          disabled={busy}
          low="Low"
          high="High"
        />
      </div>
      <p className={styles.ratingHint}>
        Tap a selected number again to clear it.
      </p>

      <div className={styles.detailsRow}>
        <div className={styles.field}>
          <Label htmlFor={`${id}-sleep`}>
            <MoonStarsIcon size={15} weight="bold" aria-hidden="true" />
            Last Night
          </Label>
          <div className={styles.sleepInput}>
            <Input
              id={`${id}-sleep`}
              type="number"
              min="0"
              max="24"
              step="0.5"
              inputMode="decimal"
              value={sleepHours}
              onChange={(event) => setSleepHours(event.target.value)}
              placeholder="—"
              disabled={busy}
              className="h-10 rounded-xl pl-3 pr-7 text-base md:text-sm"
              aria-label="Hours Slept Last Night"
            />
            <span aria-hidden="true">h</span>
          </div>
        </div>
        <div className={styles.field}>
          <Label htmlFor={`${id}-helped`}>
            <ActionIcon name="sparkle" className="size-4" />
            One Thing That Helped
          </Label>
          <Input
            id={`${id}-helped`}
            value={helped}
            maxLength={160}
            onChange={(event) => setHelped(event.target.value)}
            placeholder="A walk, a chat…"
            disabled={busy}
            className="h-10 rounded-xl px-3 text-base md:text-sm"
          />
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.submitArea}>
        <Button
          type="submit"
          disabled={busy}
          className="h-13 w-full gap-3 rounded-2xl text-sm"
        >
          {busy ? (
            <ActionIcon name="loading" className="animate-spin size-5" />
          ) : (
            <PaperPlaneTiltIcon
              size={21}
              weight="bold"
              className="size-5"
              aria-hidden="true"
            />
          )}
          <span>{busy ? "Saving Your Day…" : "Save Check-In"}</span>
          {!busy && <ActionIcon name="external" className="size-4" />}
        </Button>
        <p className={styles.saveHint}>
          Saved to this day. Come back and edit whenever you like.
        </p>
      </div>
    </form>
  );
}
