"use client";

import { Import } from "lucide-react";
import { getMedicationColor } from "@/lib/medication-appearance";
import { getMedicationCategories } from "@/lib/medication-categories";
import { sortMedicationsByUsage } from "@/lib/medication-usage";

import { useId, useMemo, useRef, useState } from "react";
import { IntakeFooterActions } from "./intake-footer-actions";
import {
  correctedIssueField,
  DialogErrorPanel,
  fieldIssue,
  nativeDialogIssue,
  type DialogIssue,
} from "./dialog-error-panel";
import Link from "next/link";
import { IntakePrimaryButton } from "@/components/intake-primary-button";
import { isSaveAndStay } from "@/components/save-options";
import { IntakeMedicationSelect } from "@/components/intake-medication-select";
import { MedicationPreview } from "./notification-change-preview";
import { IntakePreviewSkeleton } from "./intake-preview-skeleton";
import { FinalLookHeading } from "./final-look-heading";
import {
  IntakePreviewChangeRow,
  IntakePreviewSummary,
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
import {
  DraftStatus,
  useJournalWorkspace,
  usePersistentDraft,
} from "@/components/journal-drafts";
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
  fromLocalInput,
  totalsForDay,
  type Intake,
} from "@/lib/domain";
import { Label } from "@/components/ui/label";
import {
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
  onDelete,
}: {
  intake?: Intake;
  initialDay?: string;
  onSaved: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { data, mutate, busy, derived, now } = useJournal();
  const { openDialog } = useJournalWorkspace();
  const formId = useId();
  const submitPending = useRef(false);
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
    restored:
      (draft.hasDraft && draft.restored) || (timing.pinned && timing.restored),
    // Each save status must report the least durable of the two draft stores.
    status:
      timing.pinned && timing.status !== "saved" ? timing.status : draft.status,
  };
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
  const [error, setError] = useState<DialogIssue | null>(null);
  const reset = () => {
    timing.reset("form");
    draft.resetDraft(
      newIntakeFormDraft({
        intake,
        initialDay,
        medications,
        intakes: data!.intakes,
        timezone,
      }),
    );
    setError(null);
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
      return {
        count: 0,
        totalMg: 0,
        excludingEditedMg: 0,
        excludingEditedCount: 0,
      };
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
      excludingEditedCount: Math.max(0, (saved?.count ?? 0) - (edited ? 1 : 0)),
      excludingEditedMg: Number(
        (totalMg - (edited ? doseMg(edited) : 0)).toFixed(8),
      ),
    };
  }, [belongsTo, data, intake, medicationId]);
  const includingDraftMg =
    calculatedDose === null
      ? null
      : Number((daySummary.excludingEditedMg + calculatedDose).toFixed(8));
  const includingDraftCount =
    includingDraftMg === null ? null : daySummary.excludingEditedCount + 1;
  const previewHintId = `${formId}-preview-hint`;
  const receiptDate = takenAt.slice(0, 10);
  let previewHint: string;
  if (!medication && !fallbackIntake) {
    previewHint = "Choose a medication to see the entry you’ll save.";
  } else if (!validQuantity) {
    previewHint = "Enter the amount you took to see the dose on your card.";
  } else if (!belongsTo) {
    previewHint =
      "Set the date and time you took this dose to see it on your card.";
  } else if (route === undefined) {
    previewHint = "Choose how you took this medication to complete your card.";
  } else if (intake && intake.medicationId !== medicationId) {
    previewHint =
      "Saving replaces the original entry with this medication and updates both totals.";
  } else {
    previewHint =
      "Saving updates the entry you opened. This dose counts just once.";
  }

  const footerActions = (
    <IntakeFooterActions
      intake={intake}
      timezone={timezone}
      draftName={medication?.name ?? fallbackIntake?.medicationName}
      canReset={draftFeedback.hasDraft || timing.followingCurrentTime}
      pinned={timing.pinned}
      busy={busy || timingResetting}
      onReset={reset}
      onDelete={onDelete}
    />
  );

  if (!medications.length && !intake)
    return (
      <form
        id={formId}
        data-intake-form="new"
        className={`${styles.closingSurface} ${styles.emptySurface} pt-4 text-center`}
      >
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Add the name and strength from your medication packaging, then come
          back to log your first intake.
        </p>
        <div
          className={styles.footer}
          data-dialog-fade-footer
          data-intake-rim-fade
          data-draft-action-footer
        >
          <MedicationActionButton
            intent="add"
            navigation
            nativeButton={false}
            render={<Link href="/medications" />}
            onClick={onSaved}
          />
          <DraftStatus {...draftFeedback} scope="intake" />
          {footerActions}
        </div>
      </form>
    );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || timingResetting || submitPending.current) return;
    const stay = isSaveAndStay(event);
    const form = event.currentTarget;
    const viewportTop = stay
      ? form.querySelector("[data-intake-submit]")?.getBoundingClientRect().top
      : undefined;
    setError(null);
    try {
      if (!medication && !fallbackIntake) {
        setError(
          fieldIssue(
            "Choose an available medication. Your draft is still here.",
            "#intake-medication",
            "Choose medication",
          ),
        );
        return;
      }
      if (route === undefined) {
        setError(
          fieldIssue(
            "Choose how you took this medication. Your draft is still here.",
            "#intake-route",
            "Choose route",
          ),
        );
        return;
      }
      const amount = effectiveQuantity;
      if (!validQuantity || amount === null) {
        setError(
          fieldIssue(
            "Enter an amount from 0.01 to 10000 with at most two decimal places. Use a comma or dot for decimals.",
            "#intake-quantity",
            "Edit amount",
          ),
        );
        return;
      }
      const nativeIssue = nativeDialogIssue(form);
      if (nativeIssue) {
        setError(nativeIssue);
        return;
      }
      // The draft stores its original instant and the zone of any edited field.
      const timestamp = intakeDraftTimestamp(timing.draft);
      // This runs only from onSubmit, so it must check the actual submit time.
      if (new Date(timestamp).getTime() > Date.now()) {
        setError(
          fieldIssue(
            "Choose a time that has already happened.",
            "[data-intake-clock]",
            "Review time",
          ),
        );
        return;
      }
      submitPending.current = true;
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
      if (stay && savedEntry && viewportTop !== undefined) {
        if (intake?.id === savedEntry.id) {
          draft.resetDraft(
            newIntakeFormDraft({ intake: savedEntry, medications, timezone }),
          );
        } else {
          draft.clearDraft();
        }
        openDialog(
          { kind: "intake-edit", id: savedEntry.id },
          { selector: "[data-intake-submit]", viewportTop },
        );
      } else {
        draft.clearDraft();
        onSaved();
      }
    } catch (err) {
      setError({
        message:
          err instanceof Error ? err.message : "Unable to save. Try again.",
      });
    } finally {
      submitPending.current = false;
    }
  };

  return (
    <form
      id={formId}
      onSubmit={submit}
      noValidate
      onChange={(event) => {
        if (
          error?.jump?.selector !== "#intake-quantity" &&
          correctedIssueField(error, event.target)
        )
          setError(null);
      }}
      className={`${checkStyles.form} ${styles.inputTypography}`}
      data-intake-form={intake ? "edit" : "new"}
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
                    if (error?.jump?.selector === "#intake-medication")
                      setError(null);
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
                  onValueChange={(value) => {
                    if (error?.jump?.selector === "#intake-route")
                      setError(null);
                    draft.setValue((current) => ({ ...current, route: value }));
                  }}
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
                invalid={
                  error?.jump?.selector === "#intake-quantity" && !validQuantity
                }
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

      <div className={`${styles.closingSurface} ${styles.closingRegion}`}>
        {intake && (
          <div
            className={styles.editBottomFade}
            data-intake-rim-fade
            aria-hidden="true"
          />
        )}
        <div
          className={`${checkStyles.sectionDivider} ${styles.previewDivider}`}
          role="separator"
        />
        <CheckInSection
          recap
          caption="Dose Receipt"
          context={intake ? "Revision" : "New entry"}
          headingId={`${formId}-receipt`}
          detail={
            previewTime ? (
              <time
                dateTime={previewTime}
                title={`${formatDay(receiptDate)} · ${timezone}`}
              >
                {formatDay(receiptDate, { month: undefined, day: undefined })}
                {" · "}
                {takenAt.slice(11, 16)}
              </time>
            ) : (
              "Time pending"
            )
          }
          description="Check the dose, route and time before you save. Your future self has enough cold cases."
        >
          <div className={styles.receiptBody}>
            <section
              className={styles.preview}
              data-final-look-section
              data-preview-empty={!hasPreview || undefined}
              aria-labelledby="intake-preview-title"
            >
              <FinalLookHeading
                id="intake-preview-title"
                showIcon
                motion={false}
                color={getMedicationColor(medication?.color ?? "tw-mauve-400")}
              />
              {belongsTo && (medication || fallbackIntake) && (
                <IntakePreviewSummary
                  newIntake={
                    !intake && medication
                      ? { medication, savedTotalMg: daySummary.totalMg }
                      : undefined
                  }
                  medicationName={
                    medication?.name ?? fallbackIntake!.medicationName
                  }
                  count={includingDraftCount}
                  totalMg={includingDraftMg}
                  trackingDay={belongsTo}
                  isToday={belongsTo === dayKey(now ?? new Date(), timezone)}
                />
              )}
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
            </section>
            {hasPreview &&
              includingDraftCount !== null &&
              includingDraftMg !== null && (
                <IntakePreviewChangeRow
                  savedCount={daySummary.count}
                  projectedCount={includingDraftCount}
                  savedMg={daySummary.totalMg}
                  projectedMg={includingDraftMg}
                />
              )}
            <p
              id={previewHintId}
              className={
                hasPreview
                  ? `${styles.footerCaption} ${styles.savePreviewHint}`
                  : styles.previewHint
              }
            >
              {hasPreview && !intake && (
                <strong className={styles.hintLead}>
                  To edit later, reopen this intake from your day.
                </strong>
              )}
              {previewHint}
            </p>
          </div>
        </CheckInSection>
        {error &&
          !(error.jump?.selector === "#intake-quantity" && validQuantity) && (
            <DialogErrorPanel
              title={
                error.jump
                  ? "Before you log this dose"
                  : "Couldn’t save this intake"
              }
              {...error}
            />
          )}
        <div
          className={styles.footer}
          data-dialog-fade-footer
          data-intake-rim-fade={intake ? undefined : ""}
          data-draft-action-footer
        >
          <IntakePrimaryButton
            type="submit"
            aria-describedby={previewHintId}
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
            saveOptions={{
              kind: intake ? "edit" : "intake",
              formId,
              disabled: busy || timingResetting,
            }}
            data-intake-submit
          >
            {busy ? "Saving…" : intake ? "Save Edits" : "Save Intake"}
          </IntakePrimaryButton>
          <DraftStatus {...draftFeedback} scope="intake" />
          <div className={styles.trackingFooter} data-intake-tracking-footer>
            {footerActions}
            <div className={styles.trackingNotes}>
              {draftFeedback.restored && draftFeedback.status === "saved" && (
                <p className={styles.restoredHelp}>
                  Your device kept these unfinished changes. Choose{" "}
                  {intake ? "Save Edits" : "Save Intake"} to keep them, or{" "}
                  <strong>Reset draft</strong> to discard them.
                </p>
              )}
              {intake && (
                <p className={`${styles.footerCaption} ${styles.editFootnote}`}>
                  Before 06:00, doses go on the previous day. Totals update on
                  save. The confirmation includes Undo.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
