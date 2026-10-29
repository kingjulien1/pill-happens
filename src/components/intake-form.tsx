"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { MedicationIcon } from "@/components/medication-icon";
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
  const [quantity, setQuantity] = useState(() =>
    String(
      intake?.quantity ??
        medications.find((item) => item.id === medicationId)?.defaultQuantity ??
        1,
    ),
  );
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
      <div className="py-4 text-center">
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <Link
          href="/medications"
          onClick={onSaved}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-action-background text-sm font-medium text-primary-foreground"
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
        <Label htmlFor="intake-medication">Medication</Label>
        <Select
          value={medicationId}
          onValueChange={(value) => {
            if (!value) return;
            setMedicationId(value);
            if (!intake && value !== medicationId) {
              setQuantity(
                String(
                  medications.find((item) => item.id === value)
                    ?.defaultQuantity ?? 1,
                ),
              );
            }
          }}
        >
          <SelectTrigger
            id="intake-medication"
            className="h-10 w-full rounded-xl px-3 text-sm data-[size=default]:h-10"
          >
            <SelectValue>
              {medication ? (
                <>
                  <MedicationIcon
                    icon={medication.icon}
                    color={medication.color}
                    rotation={medication.iconRotation}
                    small
                    className="size-6 rounded-md"
                  />
                  <span className="min-w-0 truncate">
                    {medication.name} · {formatDose(strength)} mg
                  </span>
                </>
              ) : (
                "Choose medication"
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {medications.map((m) => (
              <SelectItem
                key={m.id}
                value={m.id}
                className="min-h-9 pl-3 pr-9 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MedicationIcon
                    icon={m.icon}
                    color={m.color}
                    rotation={m.iconRotation}
                    small
                    className="size-6 rounded-md"
                  />
                  <span className="min-w-0 break-words">
                    {m.name} · {formatDose(m.strengthMg)} mg
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-field">
        <div className="flex items-center justify-between">
          <Label htmlFor="intake-quantity">Amount taken</Label>
          <span className="text-xs text-muted-foreground">
            {medication?.form === "other"
              ? "units"
              : medication?.form === "drops"
                ? "drops"
                : `${medication?.form}s`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="Decrease amount"
            className="size-10 rounded-xl"
            disabled={Number(quantity) <= 0.25}
            onClick={() =>
              setQuantity(String(Math.max(0.25, Number(quantity) - 0.25)))
            }
          >
            <ActionIcon name="subtract" className="size-4.5" />
          </Button>
          <Input
            id="intake-quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            inputMode="decimal"
            min="0.000001"
            max="10000"
            step="any"
            required
            className="h-10 flex-1 rounded-xl px-3 text-center text-lg! font-medium"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Increase amount"
            className="size-10 rounded-xl"
            onClick={() => setQuantity(String(Number(quantity) + 0.25))}
          >
            <ActionIcon name="add" className="size-4.5" />
          </Button>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1.5">
          {[0.25, 0.5, 1, 2].map((amount) => (
            <button
              type="button"
              key={amount}
              onClick={() => setQuantity(String(amount))}
              aria-pressed={Number(quantity) === amount}
              className={`h-8 rounded-lg border text-xs transition-colors ${Number(quantity) === amount ? "border-primary/25 bg-accent text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {amount === 0.25 ? "¼" : amount === 0.5 ? "½" : amount}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Recorded dose:{" "}
          <span className="font-medium text-foreground">
            {formatDose(
              doseMg({ strengthMg: strength, quantity: Number(quantity) || 0 }),
            )}{" "}
            mg
          </span>
        </p>
      </div>
      <div className="form-field">
        <Label htmlFor="intake-time">
          <ActionIcon name="calendar" className="mr-1 size-4" />
          Date & time taken
        </Label>
        <Input
          id="intake-time"
          type="datetime-local"
          value={takenAt}
          max={toLocalInput(new Date(), timezone)}
          onChange={(e) => setTakenAt(e.target.value)}
          required
          className="h-10 w-full rounded-xl px-3 text-base md:text-sm"
        />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {timezone.replaceAll("_", " ")} ·{" "}
          {belongsTo
            ? `Saved to ${formatDay(belongsTo, { weekday: "short", month: "short" })}`
            : "Choose a valid time"}
          . Days begin at 06:00.
        </p>
      </div>
      <div className="form-field">
        <Label htmlFor="intake-note">
          A little context{" "}
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        </Label>
        <Textarea
          id="intake-note"
          placeholder="How are you feeling? Anything to remember?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          className="min-h-16 resize-none rounded-xl p-3 text-base md:text-sm"
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
        className="mt-1 h-13 w-full gap-2 rounded-2xl text-sm"
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
