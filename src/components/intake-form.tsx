"use client";

import {
  CalendarCheck,
  Clock3,
  Import,
  Pill,
  Route,
  StickyNote,
  Sunrise,
  Tags,
} from "lucide-react";
import { getMedicationColor } from "@/lib/medication-appearance";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
import { sortMedicationsByUsage } from "@/lib/medication-usage";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { IntakePrimaryButton } from "@/components/intake-primary-button";
import { IntakeMedicationSelect } from "@/components/intake-medication-select";
import { MedicationPreview } from "./notification-change-preview";
import { IntakePreviewDetails } from "./intake-preview-details";
import { IntakePreviewSkeleton } from "./intake-preview-skeleton";
import { FinalLookHeading } from "./final-look-heading";
import {
  IntakePreviewSummary,
  IntakePreviewTotals,
} from "./intake-preview-summary";
import { IntakeSectionContext } from "./intake-section-context";
import { priorMedicationIntake } from "@/lib/intake-context";
import { IntakeQuantityShortcuts } from "./intake-quantity-shortcuts";
import { IntakeAmountField } from "@/components/intake-amount-field";
import { IntakeDateTimeFields } from "@/components/intake-date-time-fields";
import { useIntakeTiming } from "@/components/use-intake-timing";
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
  dayIntakes,
  doseMg,
  formatDay,
  formatDose,
  fromLocalInput,
  totalsForDay,
  type Intake,
} from "@/lib/domain";
import { Label } from "@/components/ui/label";
import {
  INTAKE_ROUTES,
  preferredIntakeRoute,
  sortIntakeRoutesByUsage,
} from "@/lib/intake-routes";
import { IntakeRouteSelect } from "@/components/intake-route-select";
import {
  MIN_EDITABLE_INTAKE_QUANTITY,
  MAX_INTAKE_QUANTITY,
  parseIntakeQuantity,
  stepEditableIntakeQuantity,
  intakeQuantityShortcuts,
  normalizeIntakeQuantityForEditor,
  hasIntakeQuantityEditorPrecisionLoss,
  formatQuantityShortcut,
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
  const { data, mutate, busy, derived, now } = useJournal();
  const medications = useMemo(
    () =>
      data!.medications.filter(
        (m) => !m.archived || m.id === intake?.medicationId,
      ),
    [data, intake?.medicationId],
  );
  // Sorting choices never selects a medication for a fresh draft.
  const medicationOptions = sortMedicationsByUsage(
    medications,
    data!.intakes,
    derived?.medicationUsage,
  );
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
  const timing = useIntakeTiming({
    draft: draft.value,
    hasDraft: draft.hasDraft,
    editing: Boolean(intake),
    initialDay,
    timezone,
    now: now ?? new Date(),
    savedTimestamp: intake?.takenAt,
  });
  const [timingResetting, setTimingResetting] = useState(false);
  const draftFeedback = {
    ...draft,
    hasDraft: draft.hasDraft || timing.pinned,
    // Each save status must report the least durable of the two draft stores.
    status:
      timing.pinned && timing.status !== "saved" ? timing.status : draft.status,
  };
  useEffect(() => {
    onResetAvailability?.(draft.hasDraft && !busy);
  }, [onResetAvailability, draft.hasDraft, busy]);
  const showRestoredHelp = Boolean(
    formId && draft.hasDraft && draft.restored && draft.status === "saved",
  );
  useEffect(() => {
    onRestoredHint?.(showRestoredHelp);
    return () => onRestoredHint?.(false);
  }, [onRestoredHint, showRestoredHelp]);
  const { medicationId } = draft.value;
  const quantity = medicationId ? draft.value.quantity : "";
  const preferredRoute = (id: string) =>
    derived
      ? (derived.intakePreferences[id]?.route ?? "oral")
      : preferredIntakeRoute(id, data!.intakes);
  const route =
    draft.value.route ??
    (intake
      ? (intake.route ?? "unspecified")
      : medicationId
        ? preferredRoute(medicationId)
        : undefined);
  const takenAt = intakeDraftDisplayTime(timing.draft, timezone);
  const {
    initialTimestamp,
    takenAt: sourceTime,
    timezone: sourceZone,
  } = timing.draft;
  const contextTime = useMemo(() => {
    try {
      return intakeDraftTimestamp({
        initialTimestamp,
        takenAt: sourceTime,
        timezone: sourceZone,
      });
    } catch {
      return "";
    }
  }, [initialTimestamp, sourceTime, sourceZone]);
  const previousIntake = useMemo(
    () =>
      priorMedicationIntake(
        data!.intakes,
        medicationId,
        contextTime,
        intake?.id,
      ),
    [data, medicationId, contextTime, intake?.id],
  );
  const setQuantity = (value: string) =>
    draft.setValue((current) => ({ ...current, quantity: value }));
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
  const presets = intakeQuantityShortcuts(
    medicationId,
    data!.intakes,
    medication?.defaultQuantity,
    fallbackPresets,
    derived
      ? (derived.intakePreferences[medicationId]?.quantities ?? [])
      : undefined,
  );
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
  const { previewTime, belongsTo } = useMemo(() => {
    try {
      const timestamp = fromLocalInput(takenAt, timezone);
      return { previewTime: timestamp, belongsTo: dayKey(timestamp, timezone) };
    } catch {
      return { previewTime: "", belongsTo: "" };
    }
  }, [takenAt, timezone]);

  const hasPreview = Boolean(
    belongsTo &&
    validQuantity &&
    effectiveQuantity !== null &&
    (medication || fallbackIntake) &&
    route !== undefined,
  );

  const daySummary = useMemo(() => {
    if (!belongsTo || !medicationId)
      return { count: 0, totalMg: 0, excludingEditedMg: 0 };
    const saved = totalsForDay(data!, belongsTo).find(
      (total) => total.medicationId === medicationId,
    );
    const edited = intake
      ? dayIntakes(data!, belongsTo).find(
          (entry) =>
            entry.id === intake.id && entry.medicationId === medicationId,
        )
      : undefined;
    const totalMg = saved?.totalMg ?? 0;
    return {
      count: saved?.count ?? 0,
      totalMg,
      excludingEditedMg: Number(
        (totalMg - (edited ? doseMg(edited) : 0)).toFixed(8),
      ),
    };
  }, [belongsTo, data, intake, medicationId]);
  const includingDraftMg =
    calculatedDose === null
      ? null
      : Number((daySummary.excludingEditedMg + calculatedDose).toFixed(8));

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
            {...draftFeedback}
            onReset={busy || formId ? undefined : reset}
          />
        </div>
      </form>
    );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || timingResetting) return;
    setError("");
    try {
      if (!medication && !fallbackIntake) {
        setError("Choose an available medication. Your draft is still here.");
        return;
      }
      if (route === undefined) {
        setError(
          "Choose how you took this medication. Your draft is still here.",
        );
        return;
      }
      // The draft stores its original instant and the zone of any edited field.
      const timestamp = intakeDraftTimestamp(timing.draft);
      // This runs only from onSubmit, so it must check the actual submit time.
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
      const savedId =
        saved.intakeChange?.id ??
        saved.entityId ??
        (intake && saved.data.intakes.some((entry) => entry.id === intake.id)
          ? intake.id
          : undefined);
      const savedEntry = savedNotificationRecord(
        data!.intakes,
        saved.data.intakes,
        savedId,
      );
      // A medication switch replaces the original record atomically. Its new ID,
      // receipt and notification all belong to the newly created intake.
      const previousEntry = saved.intakeChange?.before ?? intake;
      const updated = Boolean(
        previousEntry && savedEntry?.id === previousEntry.id,
      );
      const replaced = Boolean(previousEntry && !updated && savedEntry);
      const beforePreview = updated
        ? intakeNotificationSnapshot(
            previousEntry!,
            data!.medications.find(
              (item) => item.id === previousEntry!.medicationId,
            ),
            timezone,
          )
        : undefined;
      const dayHref = `/history/${savedDay}${savedId ? `?intake=${encodeURIComponent(savedId)}` : ""}`;
      toast.success(
        updated
          ? "Your entry is updated and back in place."
          : "Intake saved. A little more awareness, nicely logged.",
        {
          journalScope: saved.notificationScope,
          heading: updated ? "Intake updated" : "Intake saved",
          ...(saved.unchanged
            ? { variant: "unchanged" as const }
            : !updated
              ? { variant: "intake-saved" as const }
              : {}),
          details: {
            ...(savedEntry
              ? {
                  preview: {
                    ...(beforePreview ? { before: beforePreview } : {}),
                    ...(updated
                      ? {
                          medicationChanged:
                            previousEntry!.medicationId !==
                            savedEntry.medicationId,
                        }
                      : {}),
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
            ...(!savedEntry
              ? {
                  paragraphs: [
                    "Your intake was saved. Open Entry to review its current values.",
                  ],
                }
              : {}),
            links: [
              { label: "View Entry", href: dayHref },
              {
                label: "Medication",
                href: `/medications?medication=${encodeURIComponent(medicationId)}`,
              },
            ],
            footer: replaced
              ? "New medication, new entry. Undo restores the original intake and removes this replacement."
              : updated
                ? "Undo restores the previous saved values. Your other entries stay as they are."
                : "Undo removes only this new entry. Your other entries stay as they are.",
          },
          ...(saved.undo
            ? {
                undo: {
                  label: updated
                    ? "Undo Edit"
                    : replaced
                      ? "Undo Replacement"
                      : "Undo Intake",
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
  };

  return (
    <form
      id={formId}
      onReset={handleReset}
      onSubmit={submit}
      className={`${checkStyles.form} ${styles.inputTypography}`}
      data-intake-form
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-7">
        <CheckInSection
          caption="Medication & Amount"
          detail={
            <IntakeSectionContext
              kind="medication"
              previous={previousIntake}
              takenAt={contextTime}
              timeZone={timezone}
              trackingDay={belongsTo}
              hasMedication={Boolean(medication || fallbackIntake)}
            />
          }
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
                          ? ((!current.medicationId
                              ? current.route
                              : undefined) ?? preferredRoute(value))
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
                  routes={sortIntakeRoutesByUsage(
                    medicationId,
                    data!.intakes,
                    derived
                      ? (derived.intakePreferences[medicationId]?.routes ??
                          derived.routes)
                      : undefined,
                  )}
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
              <div className={styles.amountHeading}>
                <Label id="intake-quantity-label" htmlFor="intake-quantity">
                  Amount Taken
                </Label>
                <span
                  id="intake-amount-step-hint"
                  className={styles.amountHint}
                >
                  {medication || fallbackIntake ? (
                    <>
                      <strong>± {formatQuantityShortcut(increment)}</strong> per
                      tap
                    </>
                  ) : (
                    "Quantity → dose"
                  )}
                </span>
              </div>
              <IntakeAmountField
                value={editorQuantity}
                onChange={setQuantity}
                onStep={stepQuantity}
                increment={increment}
                route={route}
                form={medicationForm ?? "other"}
                medicationIcon={medication?.icon}
                medicationIconRotation={medication?.iconRotation}
                categories={getMedicationCategories(medication)}
                unit={visibleQuantity === 1 ? type.unit : type.units}
                strengthMg={strength}
                calculatedDose={calculatedDose}
                originalQuantityPreserved={originalQuantityPreserved}
                disabled={busy || (!medication && !fallbackIntake)}
                empty={!medication && !fallbackIntake}
                invalid={Boolean(error) && !validQuantity}
              />
              <IntakeQuantityShortcuts
                amounts={presets}
                increment={increment}
                resetKey={medicationId}
                disabled={busy || (!medication && !fallbackIntake)}
                value={medication || fallbackIntake ? visibleQuantity : null}
                strengthMg={strength}
                unit={type.unit}
                units={type.units}
                onSelect={(amount) => setQuantity(String(amount))}
              />
            </div>
          </div>
        </CheckInSection>
        <CheckInSection
          caption="Timing"
          detail={
            <IntakeSectionContext
              kind="timing"
              previous={previousIntake}
              takenAt={contextTime}
              timeZone={timezone}
              trackingDay={belongsTo}
              hasMedication={Boolean(medication || fallbackIntake)}
            />
          }
        >
          <div className="form-field p-4">
            <IntakeDateTimeFields
              value={takenAt}
              onChange={timing.pin}
              onReset={timing.reset}
              pinned={timing.pinned}
              onEditingChange={timing.editingChanged}
              onResettingChange={setTimingResetting}
              timezone={timezone}
              disabled={busy}
            />
          </div>
        </CheckInSection>
      </fieldset>

      <div
        className={`${checkStyles.sectionDivider} ${styles.previewDivider}`}
        role="separator"
      />
      <section
        className={styles.preview}
        data-final-look-section
        data-preview-empty={!hasPreview || undefined}
        aria-labelledby="intake-preview-title"
      >
        {belongsTo && (medication || fallbackIntake) && (
          <IntakePreviewSummary
            medicationName={medication?.name ?? fallbackIntake!.medicationName}
            count={daySummary.count}
            takenAt={previewTime}
            timeZone={timezone}
          />
        )}
        <div className={styles.previewHeading}>
          {belongsTo && (medication || fallbackIntake) && (
            <IntakePreviewTotals
              totalMg={daySummary.totalMg}
              includingDraftMg={includingDraftMg}
            />
          )}
          <FinalLookHeading
            id="intake-preview-title"
            showIcon
            motion={false}
            color={getMedicationColor(medication?.color ?? "tw-mauve-400")}
          />
        </div>
        {belongsTo &&
        validQuantity &&
        effectiveQuantity !== null &&
        route !== undefined &&
        (medication || fallbackIntake) ? (
          <MedicationPreview
            record={{
              kind: "intake",
              name: medication?.name ?? fallbackIntake!.medicationName,
              medication: medication
                ? medicationNotificationSnapshot(medication)
                : undefined,
              strengthMg: strength,
              quantity: effectiveQuantity,
              form: medicationForm,
              route,
              takenAt: previewTime,
              timeZone: timezone,
            }}
          />
        ) : (
          <IntakePreviewSkeleton />
        )}
        {hasPreview && (
          <IntakePreviewDetails
            color={getMedicationColor(medication?.color).hex}
            rows={[
              {
                icon: CalendarCheck,
                text: `Tracking day · ${formatDay(belongsTo, { weekday: "long", month: "short" })}`,
              },
              {
                icon: Pill,
                text: `Recorded strength · ${formatDose(strength)} mg per ${type.unit}`,
              },
              {
                icon: Route,
                text: `Intake route · ${INTAKE_ROUTES.find((item) => item.value === route)?.label ?? "Not specified"}`,
              },
              {
                icon: Clock3,
                text: `Time taken · ${takenAt.slice(11, 16)} (${timezone})`,
              },
              ...(getMedicationCategories(medication).length
                ? [
                    {
                      icon: Tags,
                      text: `Categories · ${getMedicationCategories(medication)
                        .map((kind) => getMedicationCategory(kind).label)
                        .join(", ")}`,
                    },
                  ]
                : []),
              ...(intake?.note?.trim()
                ? [{ icon: StickyNote, text: `Entry note · ${intake.note}` }]
                : []),
            ]}
          />
        )}
        {!hasPreview && <IntakePreviewDetails disabled rows={[]} />}
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
        <IntakePrimaryButton
          type="submit"
          disabled={busy || timingResetting}
          pending={busy}
          symbol={
            <span className="intake-log-symbol" aria-hidden="true">
              <Import
                className="intake-log-symbol-pill"
                size={23}
                strokeWidth={3.25}
              />
            </span>
          }
          secondaryText={busy ? undefined : intake ? "Update!" : "Log it!"}
          data-intake-submit
        >
          {busy ? "Saving…" : intake ? "Save Edits" : "Save Intake"}
        </IntakePrimaryButton>
        <DraftStatus
          {...draftFeedback}
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
            Your device kept these unfinished changes. Save Intake to log them,
            or use <strong>Reset draft</strong> at the top right to start fresh.
          </p>
        )}
        <div className={styles.trackingDay}>
          <span>
            <CalendarCheck aria-hidden="true" />
            {belongsTo
              ? `Saved to ${formatDay(belongsTo, { weekday: "short", month: "short" })}.`
              : "Choose a valid time."}
          </span>
          <span>
            <Sunrise aria-hidden="true" />
            Days begin at 06:00.
          </span>
        </div>
      </div>
    </form>
  );
}
