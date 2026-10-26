"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { toast } from "sonner";
import { useJournal } from "@/components/journal-provider";
import {
  dayKey,
  doseMg,
  formatDay,
  formatDose,
  fromLocalInput,
  toLocalInput,
  type Intake,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function IntakeForm({
  intake,
  initialDay,
  onSaved,
}: {
  intake?: Intake;
  initialDay?: string;
  onSaved: () => void;
}) {
  const { data, mutate, busy } = useJournal();
  const medications = data!.medications.filter(
    (m) => !m.archived || m.id === intake?.medicationId,
  );
  const timezone = data!.settings.timezone;
  const [medicationId, setMedicationId] = useState(
    intake?.medicationId ?? medications[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(String(intake?.quantity ?? 1));
  const [initialTimestamp] = useState(
    () =>
      intake?.takenAt ??
      (initialDay && initialDay !== dayKey(new Date(), timezone)
        ? fromLocalInput(`${initialDay}T12:00`, timezone)
        : new Date().toISOString()),
  );
  const [takenAt, setTakenAt] = useState(() =>
    toLocalInput(initialTimestamp, timezone),
  );
  const [note, setNote] = useState(intake?.note ?? "");
  const [error, setError] = useState("");
  const medication = medications.find((m) => m.id === medicationId);
  const strength =
    intake && intake.medicationId === medicationId
      ? intake.strengthMg
      : (medication?.strengthMg ?? 0);
  let belongsTo = "";
  try {
    belongsTo = dayKey(fromLocalInput(takenAt, timezone), timezone);
  } catch {
    /* shown on submit */
  }

  if (!medications.length)
    return (
      <div className="py-2">
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <Link
          href="/medications"
          onClick={onSaved}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
        >
          Add a medication
          <ActionIcon name="next" />
        </Link>
      </div>
    );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      // Keep the original instant, including seconds and repeated DST hours,
      // unless the date/time field was actually changed.
      const timestamp =
        takenAt === toLocalInput(initialTimestamp, timezone)
          ? initialTimestamp
          : fromLocalInput(takenAt, timezone);
      if (new Date(timestamp).getTime() > Date.now()) {
        setError("Choose a time that has already happened.");
        return;
      }
      const amount = Number(quantity);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter an amount greater than zero.");
        return;
      }
      await mutate(
        intake ? `intakes/${intake.id}` : "intakes",
        { medicationId, quantity: amount, takenAt: timestamp, note },
        intake ? "PATCH" : "POST",
      );
      toast.success(
        intake
          ? "Your entry has been updated."
          : "Intake saved. A little more awareness.",
      );
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save. Try again.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="form-field">
        <Label htmlFor="intake-medication" className="text-xs">
          Medication
        </Label>
        <Select
          value={medicationId}
          onValueChange={(v) => v && setMedicationId(v)}
        >
          <SelectTrigger
            id="intake-medication"
            className="h-12 w-full rounded-lg px-3 text-base data-[size=default]:h-12"
          >
            <SelectValue>
              {medication
                ? `${medication.name} · ${formatDose(strength)} mg`
                : "Choose medication"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {medications.map((m) => (
              <SelectItem key={m.id} value={m.id} className="min-h-11 px-3">
                {m.name} · {formatDose(m.strengthMg)} mg
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-field">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Label htmlFor="intake-quantity" className="text-xs">
              Amount taken
            </Label>
            <span
              aria-hidden="true"
              className="text-xs text-muted-foreground/60"
            >
              /
            </span>
            <span className="text-xs text-muted-foreground">
              {medication?.form === "other"
                ? "units"
                : medication?.form === "drops"
                  ? "drops"
                  : `${medication?.form}s`}
            </span>
          </div>
          <output
            htmlFor="intake-quantity intake-medication"
            aria-label="Recorded dose"
            className="shrink-0 text-xs font-medium tabular-nums"
          >
            {formatDose(
              doseMg({ strengthMg: strength, quantity: Number(quantity) || 0 }),
            )}{" "}
            mg
          </output>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="Decrease amount"
            className="size-12 rounded-lg"
            disabled={Number(quantity) <= 0.25}
            onClick={() =>
              setQuantity(String(Math.max(0.25, Number(quantity) - 0.25)))
            }
          >
            <ActionIcon name="subtract" className="size-[22px]" />
          </Button>
          <Input
            id="intake-quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            inputMode="decimal"
            min="0.000001"
            max="1000"
            step="any"
            required
            className="h-12 flex-1 rounded-lg text-center text-2xl! font-medium tabular-nums"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Increase amount"
            className="size-12 rounded-lg"
            onClick={() => setQuantity(String(Number(quantity) + 0.25))}
          >
            <ActionIcon name="add" className="size-[22px]" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0.25, 0.5, 1, 2].map((amount) => (
            <button
              type="button"
              key={amount}
              onClick={() => setQuantity(String(amount))}
              aria-pressed={Number(quantity) === amount}
              className={`h-11 rounded-lg border text-sm transition-colors ${Number(quantity) === amount ? "border-primary/25 bg-accent text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {amount === 0.25 ? "¼" : amount === 0.5 ? "½" : amount}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <Label htmlFor="intake-time" className="text-xs">
          <ActionIcon name="calendar" className="mr-1 size-4.5" />
          Date & time taken
        </Label>
        <Input
          id="intake-time"
          type="datetime-local"
          value={takenAt}
          max={toLocalInput(new Date(), timezone)}
          onChange={(e) => setTakenAt(e.target.value)}
          required
          className="h-12 w-full rounded-lg px-3 text-base"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {timezone.replaceAll("_", " ")} ·{" "}
          {belongsTo
            ? `Saved to ${formatDay(belongsTo, { weekday: "short", month: "short" })}`
            : "Choose a valid time"}
          . Days begin at 06:00.
        </p>
      </div>
      <div className="form-field">
        <Label htmlFor="intake-note" className="text-xs">
          A little context{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            · optional
          </span>
        </Label>
        <Textarea
          id="intake-note"
          placeholder="How are you feeling? Anything to remember?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          className="min-h-18 resize-none rounded-lg p-3 text-base md:text-base"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy}
        className="h-12 w-full gap-2 rounded-lg text-sm"
      >
        {busy ? (
          <ActionIcon name="loading" className="animate-spin" />
        ) : (
          <ActionIcon name="save" />
        )}
        {busy ? "Saving…" : intake ? "Save changes" : "Save intake"}
      </Button>
    </form>
  );
}
