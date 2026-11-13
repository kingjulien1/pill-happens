"use client";

import { sortMedicationsByUsage } from "@/lib/medication-usage";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { IntakeMedicationSelect } from "@/components/intake-medication-select";
import { IntakeAmountField } from "@/components/intake-amount-field";
import { IntakeDateTimeFields } from "@/components/intake-date-time-fields";
import { MedicationActionButton } from "@/components/medication-action-button";
import { toast } from "@/components/ui/journal-toast";
import {
  getMedicationType,
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
  fromLocalInput,
  type Intake,
} from "@/lib/domain";
import { Label } from "@/components/ui/label";
import { preferredIntakeRoute } from "@/lib/intake-routes";
import { IntakeRouteSelect } from "@/components/intake-route-select";
import {
  MIN_EDITABLE_INTAKE_QUANTITY,
  MAX_INTAKE_QUANTITY,
  parseIntakeQuantity,
  stepEditableIntakeQuantity,
  normalizeIntakeQuantityForEditor,
  hasIntakeQuantityEditorPrecisionLoss,
} from "@/lib/intake-quantity";

export function IntakeForm({
  intake,
  initialDay,
  onSaved,
  footerAction,
}: {
  intake?: Intake;
  initialDay?: string;
  onSaved: () => void;
  /** The editing owner can place a secondary action beside safe draft feedback. */
  footerAction?: ReactNode;
}) {
  const { data, mutate, busy } = useJournal();
  const medications = data!.medications.filter(
    (m) => !m.archived || m.id === intake?.medicationId,
  );
  // Sorting the menu must not change fresh/reset draft defaults.
  const medicationOptions = sortMedicationsByUsage(medications, data!.intakes);
  const timezone = data!.settings.timezone;
  const draft = usePersistentDraft(
    intake ? `intake:edit:${intake.id}` : `intake:new:${initialDay ?? "today"}`,
    () =>
      newIntakeFormDraft({
        intake,
        initialDay,
        medications,
        intakes: data!.intakes,
        timezone,
      }),
    isIntakeFormDraft,
  );
  const { medicationId, quantity } = draft.value;
  const route =
    draft.value.route ??
    (intake
      ? (intake.route ?? "unspecified")
      : preferredIntakeRoute(medicationId, data!.intakes));
  const takenAt = intakeDraftDisplayTime(draft.value, timezone);
  const setQuantity = (value: string) =>
    draft.setValue((current) => ({ ...current, quantity: value }));
  const setTakenAt = (value: string) =>
    draft.setValue((current) => ({ ...current, takenAt: value, timezone }));
  const [error, setError] = useState("");
  const reset = () => {
    draft.resetDraft(
      newIntakeFormDraft({
        intake,
        initialDay,
        medications,
        intakes: data!.intakes,
        timezone,
      }),
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
  // Keep the raw draft intact until a quantity interaction explicitly replaces it.
  const unchangedOriginalQuantity = Boolean(
    intake &&
    medicationId === intake.medicationId &&
    (quantity === String(intake.quantity) ||
      parseIntakeQuantity(quantity) === intake.quantity),
  );
  const normalizedQuantity = normalizeIntakeQuantityForEditor(quantity);
  const editorQuantity =
    normalizedQuantity ??
    (unchangedOriginalQuantity &&
    intake!.quantity < MIN_EDITABLE_INTAKE_QUANTITY
      ? "0"
      : "");
  const visibleQuantity = parseIntakeQuantity(editorQuantity);
  const originalQuantityPreserved =
    unchangedOriginalQuantity &&
    (normalizedQuantity === null ||
      hasIntakeQuantityEditorPrecisionLoss(quantity));
  const effectiveQuantity = originalQuantityPreserved
    ? intake!.quantity
    : visibleQuantity;
  const validQuantity =
    effectiveQuantity !== null &&
    effectiveQuantity > 0 &&
    (originalQuantityPreserved ||
      effectiveQuantity >= MIN_EDITABLE_INTAKE_QUANTITY) &&
    effectiveQuantity <= MAX_INTAKE_QUANTITY;
  const rawDose = validQuantity ? strength * effectiveQuantity! : null;
  const calculatedDose =
    rawDose !== null && rawDose > 0 && rawDose < 0.01
      ? rawDose
      : validQuantity
        ? doseMg({ strengthMg: strength, quantity: effectiveQuantity! })
        : null;
  const stepQuantity = (delta: number) => {
    const next = stepEditableIntakeQuantity(editorQuantity, delta);
    if (next !== null) setQuantity(next);
  };
  let belongsTo = "";
  try {
    belongsTo = dayKey(fromLocalInput(takenAt, timezone), timezone);
  } catch {
    /* shown on submit */
  }

  if (!medications.length && !intake)
    return (
      <div className="py-4 text-center">
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <div className="flex w-full flex-col gap-2" data-draft-action-footer>
          <MedicationActionButton
            intent="add"
            nativeButton={false}
            render={<Link href="/medications" />}
            onClick={onSaved}
          />
          <DraftStatus {...draft} onReset={busy ? undefined : reset} />
        </div>
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
      const amount = effectiveQuantity;
      if (!validQuantity || amount === null) {
        setError(
          "Enter an amount from 0.01 to 10000 with at most two decimal places. Use a comma or dot for decimals.",
        );
        return;
      }
      await mutate(
        intake ? `intakes/${intake.id}` : "intakes",
        {
          medicationId,
          quantity: amount,
          route,
          takenAt: timestamp,
          // Legacy notes remain intact when editing an existing record.
          ...(intake ? { note: intake.note } : {}),
        },
        intake ? "PATCH" : "POST",
      );
      toast.success(
        intake
          ? "Your entry has been updated."
          : "Intake saved. A little more awareness.",
        { heading: intake ? "Intake updated" : "Intake saved" },
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
        <div
          className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_136px] sm:grid-cols-[minmax(0,1fr)_144px]"
          data-intake-medication-route-fields
        >
          <div className="form-field min-w-0">
            <Label htmlFor="intake-medication">Medication</Label>
            <IntakeMedicationSelect
              medications={medicationOptions}
              value={medicationId}
              fallbackIntake={fallbackIntake}
              onValueChange={(value) => {
                draft.setValue((current) => ({
                  ...current,
                  medicationId: value,
                  route:
                    !intake && value !== current.medicationId
                      ? preferredIntakeRoute(value, data!.intakes)
                      : current.route,
                  quantity:
                    !intake && value !== current.medicationId
                      ? String(
                          medications.find((item) => item.id === value)
                            ?.defaultQuantity ?? 1,
                        )
                      : current.quantity,
                }));
              }}
            />
          </div>
          <div className="form-field min-w-0">
            <Label htmlFor="intake-route">Intake route</Label>
            <IntakeRouteSelect
              value={route}
              disabled={busy}
              onValueChange={(value) =>
                draft.setValue((current) => ({ ...current, route: value }))
              }
            />
          </div>
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
          <Label id="intake-quantity-label" htmlFor="intake-quantity">
            Amount Taken
          </Label>
          <IntakeAmountField
            value={editorQuantity}
            onChange={setQuantity}
            onStep={stepQuantity}
            increment={increment}
            unit={visibleQuantity === 1 ? type.unit : type.units}
            calculatedDose={calculatedDose}
            originalQuantityPreserved={originalQuantityPreserved}
            disabled={busy}
            invalid={Boolean(error) && !validQuantity}
          />
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {presets.map((amount) => (
              <button
                type="button"
                key={amount}
                onClick={() => setQuantity(String(amount))}
                aria-pressed={visibleQuantity === amount}
                data-dialog-corner="compact"
                className={`h-8 rounded-lg border text-xs transition-colors ${visibleQuantity === amount ? "border-primary/25 bg-accent text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {amount === 0.25 ? "¼" : amount === 0.5 ? "½" : amount}
              </button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <IntakeDateTimeFields
            value={takenAt}
            onChange={setTakenAt}
            timezone={timezone}
            disabled={busy}
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {belongsTo
              ? `Saved to ${formatDay(belongsTo, { weekday: "short", month: "short" })}`
              : "Choose a valid time"}
            . Days begin at 06:00.
          </p>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
      <div className="flex w-full flex-col gap-2" data-draft-action-footer>
        <DialogPrimaryButton
          type="submit"
          disabled={busy}
          pending={busy}
          className="w-full rounded-2xl"
        >
          {busy ? "Saving…" : intake ? "Save Changes" : "Save Intake"}
        </DialogPrimaryButton>
        <DraftStatus
          {...draft}
          onReset={busy || footerAction ? undefined : reset}
          action={footerAction}
          copy={
            footerAction
              ? {
                  idle: "Ready when you are. Take a look.",
                  saved: "Your draft is kept on this device.",
                  restored: "Your draft is back on this device.",
                }
              : undefined
          }
        />
      </div>
    </form>
  );
}
