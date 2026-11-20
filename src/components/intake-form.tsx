"use client";

import { CalendarCheck, Sunrise } from "lucide-react";
import { getMedicationCategories } from "@/lib/medication-categories";
import { sortMedicationsByUsage } from "@/lib/medication-usage";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { IntakeMedicationSelect } from "@/components/intake-medication-select";
import { MedicationPreview } from "./notification-change-preview";
import { FinalLookHeading } from "./final-look-heading";
import { IntakeAmountField } from "@/components/intake-amount-field";
import { IntakeDateTimeFields } from "@/components/intake-date-time-fields";
import { MedicationActionButton } from "@/components/medication-action-button";
import { toast } from "@/components/ui/journal-toast";
import {
  intakeNotificationSnapshot,
  medicationNotificationSnapshot,
  savedNotificationRecord,
} from "@/lib/notification-change-preview";
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
  formatDose,
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
  intakeQuantityShortcuts,
  normalizeIntakeQuantityForEditor,
  hasIntakeQuantityEditorPrecisionLoss,
} from "@/lib/intake-quantity";

import { CheckInSection } from "./check-in-section";
import checkStyles from "./daily-check-in.module.css";
import styles from "./intake-form.module.css";

export function IntakeForm({
  intake,
  initialDay,
  onSaved,
  footerAction,
  formId,
  onResetAvailability,
  onRestoredHint,
}: {
  formId?: string;
  onRestoredHint?: (restored: boolean) => void;
  onResetAvailability?: (available: boolean) => void;
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
  useEffect(() => {
    onResetAvailability?.(draft.hasDraft && !busy);
  }, [onResetAvailability, draft.hasDraft, busy]);
  const showRestoredHelp = Boolean(formId && draft.hasDraft && draft.restored && draft.status === "saved");
  useEffect(() => {
    onRestoredHint?.(showRestoredHelp);
    return () => onRestoredHint?.(false);
  }, [onRestoredHint, showRestoredHelp]);
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
  const handleReset = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy) reset();
  };
  const medication = medications.find((m) => m.id === medicationId);
  const fallbackIntake =
    intake?.medicationId === medicationId ? intake : undefined;
  const strength = medication?.strengthMg ?? fallbackIntake?.strengthMg ?? 0;
  const medicationForm = medication?.form ?? fallbackIntake?.medicationForm;
  const type = getMedicationType(medicationForm);
  const { increment, presets: fallbackPresets } = medicationQuantityControls(
    medicationForm,
    medication?.name ?? fallbackIntake?.medicationName,
  );
  const presets = intakeQuantityShortcuts(medicationId, data!.intakes, medication?.defaultQuantity, fallbackPresets);
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
    if (delta < 0 && visibleQuantity !== null && visibleQuantity <= increment)
      return;
    const next = stepEditableIntakeQuantity(editorQuantity, delta);
    if (next !== null)
      setQuantity(
        delta < 0 && Number(next) < increment ? String(increment) : next,
      );
  };
  let previewTime = "";
  let belongsTo = "";
  try {
    previewTime = fromLocalInput(takenAt, timezone);
    belongsTo = dayKey(previewTime, timezone);
  } catch {
    /* shown on submit */
  }

  if (!medications.length && !intake)
    return (
      <form
        id={formId}
        onReset={handleReset}
        data-intake-form
        className="pt-4 text-center"
      >
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <div
          className={styles.footer}
          data-dialog-fade-footer
          data-draft-action-footer
        >
          <MedicationActionButton
            intent="add"
            navigation
            nativeButton={false}
            render={<Link href="/medications" />}
            onClick={onSaved}
          />
          <DraftStatus
            {...draft}
            onReset={busy || formId ? undefined : reset}
          />
        </div>
      </form>
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
      const beforePreview = intake
        ? intakeNotificationSnapshot(
            intake,
            data!.medications.find((item) => item.id === intake.medicationId),
            timezone,
          )
        : undefined;
      const saved = await mutate(
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
      const savedDay = dayKey(timestamp, timezone);
      const savedTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(timestamp));
      const name = medication?.name ?? fallbackIntake!.medicationName;
      const savedId = saved.entityId ?? intake?.id;
      const savedEntry = savedNotificationRecord(
        data!.intakes,
        saved.data.intakes,
        savedId,
      );
      const dayHref = `/history/${savedDay}${savedId ? `?intake=${encodeURIComponent(savedId)}` : ""}`;
      toast.success(
        intake
          ? "Your entry is updated and back in place."
          : "Intake saved. A little more awareness, nicely logged.",
        {
          journalScope: saved.notificationScope,
          heading: intake ? "Intake updated" : "Intake saved",
          ...(!intake ? { variant: "intake-saved" as const } : {}),
          details: {
            ...(savedEntry
              ? {
                  preview: {
                    ...(beforePreview ? { before: beforePreview } : {}),
                    after: intakeNotificationSnapshot(
                      savedEntry,
                      saved.data.medications.find(
                        (item) => item.id === savedEntry.medicationId,
                      ),
                      saved.data.settings.timezone,
                    ),
                  },
                }
              : {}),
            paragraphs: [
              intake
                ? "Your saved entry now uses these values. The day’s list, medication total and goal progress have been recalculated from the updated record."
                : "This intake is now saved in your private journal. It contributes to this medication’s daily total and any goal you have set for it.",
              "Its tracking day follows Date & Time Taken, with the day boundary at 06:00 in your journal timezone. Nearby entries may appear in the same stack; each intake remains a separate record.",
            ],
            facts: [
              { label: "Medication", value: name },
              {
                label: "Amount",
                value: `${formatDose(amount)} ${amount === 1 ? type.unit : type.units} × ${formatDose(strength)} mg`,
              },
              {
                label: "Total",
                value: `${formatDose(doseMg({ strengthMg: strength, quantity: amount }))} mg`,
              },
              {
                label: "Taken",
                value: `${new Intl.DateTimeFormat("en", { timeZone: timezone, month: "short", day: "numeric" }).format(new Date(timestamp))} · ${savedTime}`,
              },
            ],
            links: [
              { label: "View Entry", href: dayHref },
              {
                label: "Medication",
                href: `/medications?medication=${encodeURIComponent(medicationId)}`,
              },
            ],
            footer: intake
              ? "Undo restores the previous saved values. Your other entries stay as they are."
              : "Undo removes only this new entry. Your other entries stay as they are.",
          },
          ...(saved.undo
            ? {
                undo: {
                  label: intake ? "Undo Edit" : "Undo Intake",
                  onUndo: saved.undo,
                  receipt: saved.receipt,
                },
              }
            : {}),
        },
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
    <form
      id={formId}
      onReset={handleReset}
      onSubmit={submit}
      className={checkStyles.form}
      data-intake-form
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-7">
        <CheckInSection
          caption="Medication & Amount"
          context="What you took"
          detail={type.label}
        >
          <div className={styles.medicationSection}>
            <div
              className="grid min-w-0 grid-cols-1 gap-[8px] min-[360px]:grid-cols-[minmax(0,1fr)_118px] sm:grid-cols-[minmax(0,1fr)_125px]"
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
                That medication is no longer available. Choose another to
                continue this draft.
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
                route={route}
                form={medicationForm ?? "other"}
                categories={getMedicationCategories(medication)}
                unit={visibleQuantity === 1 ? type.unit : type.units}
                calculatedDose={calculatedDose}
                originalQuantityPreserved={originalQuantityPreserved}
                disabled={busy}
                invalid={Boolean(error) && !validQuantity}
              />
              <div className="mt-1 grid grid-cols-5 gap-1.5">
                {presets.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => setQuantity(String(amount))}
                    aria-pressed={visibleQuantity === amount}
                    data-dialog-corner="compact"
                    className={`h-8 rounded-lg border text-sm font-semibold tabular-nums transition-colors ${visibleQuantity === amount ? "border-primary/25 bg-[color-mix(in_srgb,var(--checkin-line)_14%,transparent)] text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    {amount === 0.25 ? "¼" : amount === 0.5 ? "½" : amount}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CheckInSection>
        <CheckInSection
          caption="Timing"
          context="When you took it"
          detail="Local time"
        >
          <div className="form-field p-4">
            <IntakeDateTimeFields
              value={takenAt}
              onChange={setTakenAt}
              timezone={timezone}
              disabled={busy}
            />
          </div>
        </CheckInSection>
      </fieldset>

      <div className={checkStyles.sectionDivider} role="separator" />
      <section className={styles.preview} aria-labelledby="intake-preview-title">
        <FinalLookHeading id="intake-preview-title" />
        {belongsTo && validQuantity && effectiveQuantity !== null && (medication || fallbackIntake) ? (
          <MedicationPreview record={{
            kind: "intake",
            name: medication?.name ?? fallbackIntake!.medicationName,
            medication: medication ? medicationNotificationSnapshot(medication) : undefined,
            strengthMg: strength,
            quantity: effectiveQuantity,
            form: medicationForm,
            route,
            takenAt: previewTime,
            timeZone: timezone,
          }} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">Choose a medication, amount and time to preview your entry.</p>
        )}
      </section>
      {error && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
      <div
        className={styles.footer}
        data-dialog-fade-footer
        data-draft-action-footer
      >
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
          onReset={busy || footerAction || formId ? undefined : reset}
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
        {showRestoredHelp && (
          <p className={styles.restoredHelp}>
            Your device kept these unfinished changes. Save Intake to log them, or use <strong>Reset draft</strong> at the top right to start fresh.
          </p>
        )}
        <div className={styles.trackingDay}>
          <span><CalendarCheck aria-hidden="true" />{belongsTo ? `Saved to ${formatDay(belongsTo, { weekday: "short", month: "short" })}.` : "Choose a valid time."}</span>
          <span><Sunrise aria-hidden="true" />Days begin at 06:00.</span>
        </div>
      </div>
    </form>
  );
}
