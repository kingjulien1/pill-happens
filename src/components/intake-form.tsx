"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionIcon } from "@/components/action-icon";
import { MedicationIcon } from "@/components/medication-icon";
import { MedicationActionButton } from "@/components/medication-action-button";
import {
  MedicationClassBadges,
  medicationClassHighlights,
} from "@/components/medication-class-badge";
import { getMedicationClassification } from "@/lib/medication-classification";
import { toast } from "sonner";
import {
  getMedicationType,
  isMeteredMedicationType,
  medicationQuantityControls,
} from "@/lib/medication-types";
import { useJournal } from "@/components/journal-provider";
import { DraftStatus, usePersistentDraft } from "@/components/journal-drafts";
import {
  intakeDraftDisplayTime,
  intakeDraftTimestamp,
  isIntakeFormDraft,
  newIntakeFormDraft,
} from "@/lib/intake-form-draft";
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
  const draft = usePersistentDraft(
    intake ? `intake:edit:${intake.id}` : `intake:new:${initialDay ?? "today"}`,
    () => newIntakeFormDraft({ intake, initialDay, medications, timezone }),
    isIntakeFormDraft,
  );
  const { medicationId, quantity, note } = draft.value;
  const takenAt = intakeDraftDisplayTime(draft.value, timezone);
  const setQuantity = (value: string) =>
    draft.setValue((current) => ({ ...current, quantity: value }));
  const setNote = (value: string) =>
    draft.setValue((current) => ({ ...current, note: value }));
  const setTakenAt = (value: string) =>
    draft.setValue((current) => ({ ...current, takenAt: value, timezone }));
  const [error, setError] = useState("");
  const reset = () => {
    draft.resetDraft(
      newIntakeFormDraft({ intake, initialDay, medications, timezone }),
    );
    setError("");
  };
  const medication = medications.find((m) => m.id === medicationId);
  const fallbackIntake =
    intake?.medicationId === medicationId ? intake : undefined;
  const strength = medication?.strengthMg ?? fallbackIntake?.strengthMg ?? 0;
  const medicationForm = medication?.form ?? fallbackIntake?.medicationForm;
  const type = getMedicationType(medicationForm);
  const { increment, presets } = medicationQuantityControls(medicationForm);
  let belongsTo = "";
  try {
    belongsTo = dayKey(fromLocalInput(takenAt, timezone), timezone);
  } catch {
    /* shown on submit */
  }

  if (!medications.length && !intake)
    return (
      <div className="py-4 text-center">
        <DraftStatus {...draft} onReset={busy ? undefined : reset} />
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <MedicationActionButton
          intent="add"
          nativeButton={false}
          render={<Link href="/medications" />}
          onClick={onSaved}
        />
      </div>
    );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      if (!medication && !fallbackIntake) {
        setError("Choose an available medication. Your draft is still here.");
        return;
      }
      // The draft stores its original instant and the zone of any edited field.
      const timestamp = intakeDraftTimestamp(draft.value);
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
      draft.clearDraft();
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save. Try again.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <div className="form-field">
          <Label htmlFor="intake-medication">Medication</Label>
          <Select
            value={medicationId}
            onValueChange={(value) => {
              if (!value) return;
              draft.setValue((current) => ({
                ...current,
                medicationId: value,
                quantity:
                  !intake && value !== current.medicationId
                    ? String(
                        medications.find((item) => item.id === value)
                          ?.defaultQuantity ?? 1,
                      )
                    : current.quantity,
              }));
            }}
            disabled={!medications.length}
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
                      isBenzodiazepine={medication.isBenzodiazepine === true}
                      isOpioid={medication.isOpioid === true}
                      small
                      className="size-6 rounded-md"
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span
                        className="min-w-0 truncate"
                        title={medication.name}
                      >
                        {medication.name}
                      </span>
                      <span className="shrink-0 text-xs">
                        · {formatDose(strength)} mg
                        {isMeteredMedicationType(medicationForm)
                          ? " / pump"
                          : ""}
                      </span>
                      <MedicationClassBadges medication={medication} />
                    </span>
                  </>
                ) : fallbackIntake ? (
                  `${fallbackIntake.medicationName} · ${formatDose(strength)} mg`
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
                  className={`min-h-9 pl-3 pr-9 text-xs ${medicationClassHighlights(m)}`}
                  data-benzodiazepine={m.isBenzodiazepine === true || undefined}
                  data-opioid={m.isOpioid === true || undefined}
                  data-medication-classification={getMedicationClassification(
                    m,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MedicationIcon
                      icon={m.icon}
                      color={m.color}
                      rotation={m.iconRotation}
                      isBenzodiazepine={m.isBenzodiazepine === true}
                      isOpioid={m.isOpioid === true}
                      small
                      className="size-6 rounded-md"
                    />
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="min-w-0 break-words">
                        {m.name} · {formatDose(m.strengthMg)} mg
                        {isMeteredMedicationType(m.form) ? " / pump" : ""}
                      </span>
                      <MedicationClassBadges medication={m} />
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!medication && !fallbackIntake && medicationId && (
          <p
            role="status"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            That medication is no longer available. Choose another to continue
            this draft.
          </p>
        )}
        <div className="form-field">
          <div className="flex items-center justify-between">
            <Label htmlFor="intake-quantity">Amount Taken</Label>
            <span className="text-xs text-muted-foreground">{type.units}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="Decrease amount"
              className="size-10 rounded-xl"
              disabled={Number(quantity) <= increment}
              onClick={() =>
                setQuantity(
                  String(Math.max(increment, Number(quantity) - increment)),
                )
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
              onClick={() => setQuantity(String(Number(quantity) + increment))}
            >
              <ActionIcon name="add" className="size-4.5" />
            </Button>
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {presets.map((amount) => (
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
                doseMg({
                  strengthMg: strength,
                  quantity: Number(quantity) || 0,
                }),
              )}{" "}
              mg
            </span>
          </p>
        </div>
        <div className="form-field">
          <Label htmlFor="intake-time">
            <ActionIcon name="calendar" className="mr-1 size-4" />
            Date & Time Taken
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
            A Little Context{" "}
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
      </fieldset>
      <DraftStatus {...draft} onReset={busy ? undefined : reset} />
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
        {busy ? "Saving…" : intake ? "Save Changes" : "Save Intake"}
      </Button>
    </form>
  );
}
