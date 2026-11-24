"use client";

import { sortMedicationsByUsage } from "@/lib/medication-usage";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationAppearanceFields } from "@/components/medication-appearance-fields";
import type { SymbolSourceFilter } from "@/lib/medication-symbol-browser";
import { MedicationActionButton } from "@/components/medication-action-button";
import { isSaveAndStay, SaveOptions } from "@/components/save-options";
import { sameDraftRevision } from "@/lib/journal-drafts";
import {
  ChoiceMenuHeader,
  ChoiceOptionContent,
} from "@/components/choice-menu";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { getMedicationIndicatorKinds } from "@/components/medication-indicator";
import { MedicationTypeSelect } from "@/components/medication-type-select";
import { MedicationCategoryBadges } from "@/components/medication-category-badges";
import { MedicationClassificationField } from "@/components/medication-classification-field";
import { MedicationIcon } from "@/components/medication-icon";
import {
  isMedicationIcon,
  MEDICATION_COLORS,
} from "@/lib/medication-appearance";
import {
  getMedicationCategories,
  MEDICATION_CATEGORY_VALUES,
  type MedicationCategory,
  medicationCategoryFlags,
} from "@/lib/medication-categories";
import {
  getMedicationType,
  isMeteredMedicationType,
  MEDICATION_TYPES,
} from "@/lib/medication-types";
import { toast } from "@/components/ui/journal-toast";
import {
  goalNotificationSnapshot,
  medicationNotificationSnapshot,
  savedNotificationRecord,
} from "@/lib/notification-change-preview";
import { useJournal } from "@/components/journal-provider";
import {
  DraftStatus,
  useJournalWorkspace,
  usePersistentDraft,
} from "@/components/journal-drafts";
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
import {
  dayKey,
  formatDose,
  isValidDayKey,
  type Medication,
} from "@/lib/domain";

const forms = MEDICATION_TYPES;

const inputClass = "h-11 rounded-xl px-3 text-base md:text-sm";
const selectClass =
  "h-11 w-full rounded-xl px-3 text-base md:text-sm data-[size=default]:h-11";
const iconError = "Choose an icon or enter one emoji.";

/** Native arrows keep fine saved decimals while using the requested increment. */
function medicationStepBase(value: string, increment: number, minimum: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < minimum) return increment;
  // Normalize binary modulo noise in the native step base, never in the value.
  const remainder = Number((amount % increment).toPrecision(12));
  return remainder >= minimum ? remainder : remainder + increment;
}

type MedicationDraft = {
  name: string;
  activeIngredient: string;
  categories: MedicationCategory[];
  strength: string;
  defaultQuantity: string;
  form: Medication["form"];
  color: Medication["color"];
  icon: string;
  iconRotation: number;
  searchQuery: string;
  symbolSource?: SymbolSourceFilter;
  previewMotion?: boolean;
};

function medicationDefaults(medication?: Medication): MedicationDraft {
  return {
    name: medication?.name ?? "",
    activeIngredient: medication?.activeIngredient ?? "",
    categories: getMedicationCategories(medication),
    strength: medication ? String(medication.strengthMg) : "",
    defaultQuantity: String(medication?.defaultQuantity ?? 1),
    form: medication?.form ?? "tablet",
    color: medication?.color ?? "rose",
    icon: medication?.icon ?? "pill",
    iconRotation: medication?.iconRotation ?? 0,
    searchQuery: "",
    symbolSource: "all",
    previewMotion: true,
  };
}

function isMedicationDraft(value: unknown): value is MedicationDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.name === "string" &&
    draft.name.length <= 80 &&
    typeof draft.activeIngredient === "string" &&
    draft.activeIngredient.length <= 160 &&
    Array.isArray(draft.categories) &&
    draft.categories.every((category) =>
      MEDICATION_CATEGORY_VALUES.includes(category),
    ) &&
    typeof draft.strength === "string" &&
    draft.strength.length <= 256 &&
    typeof draft.defaultQuantity === "string" &&
    draft.defaultQuantity.length <= 256 &&
    forms.some((item) => item.value === draft.form) &&
    MEDICATION_COLORS.some((item) => item.value === draft.color) &&
    typeof draft.icon === "string" &&
    draft.icon.length <= 256 &&
    typeof draft.iconRotation === "number" &&
    Number.isFinite(draft.iconRotation) &&
    typeof draft.searchQuery === "string" &&
    draft.searchQuery.length <= 1000 &&
    (draft.symbolSource === undefined ||
      (typeof draft.symbolSource === "string" &&
        ["all", "icons", "emojis", "customs"].includes(draft.symbolSource))) &&
    (draft.previewMotion === undefined ||
      typeof draft.previewMotion === "boolean")
  );
}

type GoalDraft = {
  medicationId: string;
  limit: string;
  startsOn: string;
  endsOn: string;
  note: string;
};

function isGoalDraft(value: unknown): value is GoalDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    ["medicationId", "limit", "startsOn", "endsOn"].every(
      (key) => typeof draft[key] === "string" && draft[key].length <= 256,
    ) &&
    typeof draft.note === "string" &&
    draft.note.length <= 1000
  );
}

export type MedicationFormControls = {
  draftKey: string;
  resetDraft: () => boolean;
};

export type MedicationDraftAvailability = {
  draftKey: string;
  hasDraft: boolean;
};

export function MedicationForm({
  medication,
  onSaved,
  controlsRef,
  onDraftAvailabilityChange,
}: {
  medication?: Medication;
  onSaved: () => void;
  controlsRef?: Ref<MedicationFormControls>;
  onDraftAvailabilityChange?: (state: MedicationDraftAvailability) => void;
}) {
  const { data, mutate, busy } = useJournal();
  const { openDialog, store } = useJournalWorkspace();
  const saving = useRef(false);
  const id = useId();
  const draftKey = medication ? `med:edit:${medication.id}` : "med:new";
  const draft = usePersistentDraft(
    draftKey,
    () => medicationDefaults(medication),
    isMedicationDraft,
  );
  const {
    name,
    activeIngredient,
    categories,
    strength,
    defaultQuantity,
    form,
    color,
    icon,
    iconRotation,
    searchQuery,
    symbolSource,
    previewMotion,
  } = draft.value;
  const setField = <K extends keyof MedicationDraft>(
    key: K,
    value: MedicationDraft[K],
  ) => draft.setValue((current) => ({ ...current, [key]: value }));
  const setName = (value: string) => setField("name", value);
  const setActiveIngredient = (value: string) =>
    setField("activeIngredient", value);
  const setCategories = (value: MedicationCategory[]) =>
    setField("categories", value);
  const setStrength = (value: string) => setField("strength", value);
  const setDefaultQuantity = (value: string) =>
    setField("defaultQuantity", value);
  const setForm = (value: Medication["form"]) => setField("form", value);
  const setColor = (value: Medication["color"]) => setField("color", value);
  const setIcon = (value: string) => setField("icon", value);
  const { isBenzodiazepine, isOpioid } = medicationCategoryFlags(categories);
  const [error, setError] = useState<string | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const type = getMedicationType(form);
  const reset = () => {
    if (busy || !draft.hasDraft) return false;
    draft.resetDraft(medicationDefaults(medication));
    setError(null);
    setResetRevision((revision) => revision + 1);
    return true;
  };
  // Header controls use this form's live draft; they never create a second store.
  useImperativeHandle(controlsRef, () => ({ draftKey, resetDraft: reset }));
  useEffect(() => {
    onDraftAvailabilityChange?.({ draftKey, hasDraft: draft.hasDraft });
    return () => onDraftAvailabilityChange?.({ draftKey, hasDraft: false });
  }, [draftKey, draft.hasDraft, onDraftAvailabilityChange]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saving.current) return;
    const stay = isSaveAndStay(event);
    const viewportTop = stay
      ? event.currentTarget
          .querySelector("[data-medication-submit]")
          ?.getBoundingClientRect().top
      : undefined;
    setError(null);
    const strengthMg = Number(strength);
    const quantity = Number(defaultQuantity);
    if (!name.trim()) {
      setError("Enter a medication name.");
      return;
    }
    if (!Number.isFinite(strengthMg) || strengthMg <= 0) {
      setError("Enter a strength greater than zero.");
      return;
    }
    if (
      !Number.isFinite(quantity) ||
      quantity < 0.000001 ||
      quantity > 10_000
    ) {
      setError("Enter an intake amount between 0.000001 and 10,000.");
      return;
    }
    if (!isMedicationIcon(icon)) {
      setError(iconError);
      return;
    }
    saving.current = true;
    const submitted = store.getSnapshot().drafts[draftKey];
    try {
      const beforePreview = medication
        ? {
            kind: "medication" as const,
            medication: medicationNotificationSnapshot(medication),
          }
        : undefined;
      const saved = await mutate(
        medication ? `medications/${medication.id}` : "medications",
        {
          name: name.trim(),
          activeIngredient: activeIngredient.trim(),
          categories,
          isBenzodiazepine,
          isOpioid,
          strengthMg,
          defaultQuantity: quantity,
          form,
          color,
          icon,
          iconRotation,
        },
        medication ? "PATCH" : "POST",
      );
      const savedMedication = savedNotificationRecord(
        data?.medications ?? [],
        saved.data.medications,
        saved.entityId ?? medication?.id,
      );
      store.synchronize();
      if (sameDraftRevision(submitted, store.getSnapshot().drafts[draftKey])) {
        if (stay && medication && savedMedication) {
          draft.resetDraft({
            ...medicationDefaults(savedMedication),
            searchQuery,
            symbolSource,
            previewMotion,
          });
        } else draft.clearDraft();
      }
      toast.success(medication ? "Medication updated." : "Medication added.", {
        journalScope: saved.notificationScope,
        ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
        heading: medication ? "Medication updated." : "Medication added.",
        details: {
          ...(savedMedication
            ? {
                preview: {
                  ...(beforePreview ? { before: beforePreview } : {}),
                  after: {
                    kind: "medication" as const,
                    medication: medicationNotificationSnapshot(savedMedication),
                  },
                },
              }
            : {}),
          paragraphs: [
            medication
              ? "Your medication details are saved. Linked past intakes now use its current name, type and strength, so their doses and totals are recalculated too."
              : "This medication is ready to choose when you log an intake. Saving it to your library does not record a dose.",
            "The default quantity prefills new entries; quantities and times you have already logged stay as entered. Your chosen appearance helps you recognize it throughout the journal.",
          ],
          facts: [
            { label: "Medication", value: name.trim() },
            { label: "Strength", value: `${formatDose(strengthMg)} mg` },
            { label: "Default Amount", value: formatDose(quantity) },
            {
              label: "Active Ingredient",
              value: activeIngredient.trim() || "Not recorded",
            },
          ],
          links: [
            {
              label: "Medication Library",
              href: `/medications${saved.entityId || medication?.id ? `?medication=${encodeURIComponent(saved.entityId ?? medication!.id)}` : ""}`,
            },
            { label: "Log Intake", href: "/" },
          ],
          footer: medication
            ? "Undo restores the previous medication details and updates linked totals."
            : "Undo removes this addition while it has no linked entries or goals.",
        },
        ...(saved.undo
          ? {
              undo: {
                label: medication ? "Undo Edit" : "Undo Addition",
                onUndo: saved.undo,
                receipt: saved.receipt,
              },
            }
          : {}),
      });
      if (stay && savedMedication && viewportTop !== undefined) {
        if (!medication) {
          openDialog(
            { kind: "medication-edit", id: savedMedication.id },
            { selector: "[data-medication-submit]", viewportTop },
          );
        }
      } else onSaved();
    } catch {
      // The journal provider explains failed saves and keeps the form available.
    } finally {
      saving.current = false;
    }
  }

  return (
    <form id={id} onSubmit={save} className="flex min-w-0 flex-col gap-4">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <div
          className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(128px,1fr)] items-end gap-3"
          data-medication-identity-fields
        >
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${id}-name`}>Medication Name</Label>
            <Input
              id={`${id}-name`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="As written on the packaging"
              required
              maxLength={80}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${id}-form`}>Type</Label>
            <MedicationTypeSelect
              id={`${id}-form`}
              value={form}
              onValueChange={setForm}
              disabled={busy}
            />
          </div>
        </div>

        <div
          className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(128px,1fr)] items-end gap-3"
          data-medication-classification-fields
        >
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={`${id}-ingredient`}>
              Active Ingredient
              <span className="inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                <span aria-hidden="true">·</span>
                optional
              </span>
            </Label>
            <Input
              id={`${id}-ingredient`}
              name="activeIngredient"
              value={activeIngredient}
              onChange={(event) => setActiveIngredient(event.target.value)}
              placeholder="e.g. Diazepam"
              maxLength={160}
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
            />
          </div>
          <MedicationClassificationField
            id={`${id}-classification`}
            value={categories}
            onChange={setCategories}
            disabled={busy}
          />
        </div>

        <div className="-mt-2 empty:hidden" data-medication-category-summary>
          <MedicationCategoryBadges
            medication={{ categories }}
            maxGeneral={3}
            presentation="form"
          />
        </div>

        <div
          className="grid min-w-0 grid-cols-2 gap-3"
          data-medication-dose-fields
        >
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-quantity`}>
              {type.units.charAt(0).toUpperCase() + type.units.slice(1)} per
              Intake
            </Label>
            <Input
              id={`${id}-quantity`}
              name="defaultQuantity"
              type="number"
              inputMode="decimal"
              value={defaultQuantity}
              onChange={(event) => setDefaultQuantity(event.target.value)}
              min={
                form === "tablet"
                  ? medicationStepBase(defaultQuantity, 0.5, 0.000001)
                  : 0.000001
              }
              max="10000"
              step={form === "tablet" ? 0.5 : "any"}
              required
              aria-describedby={`${id}-quantity-help`}
              className={inputClass}
            />
            <p
              id={`${id}-quantity-help`}
              className="text-[10px] leading-relaxed text-muted-foreground"
            >
              Prefills new entries.
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-strength`}>
              {isMeteredMedicationType(form)
                ? "Strength (mg/pump)"
                : "Strength (mg)"}
            </Label>
            <Input
              id={`${id}-strength`}
              name="strengthMg"
              type="number"
              inputMode="decimal"
              value={strength}
              onChange={(event) => setStrength(event.target.value)}
              placeholder="e.g. 1"
              min={medicationStepBase(strength, 0.25, 0.0001)}
              max="100000"
              step="0.25"
              required
              aria-describedby={`${id}-strength-help`}
              className={inputClass}
            />
            <p
              id={`${id}-strength-help`}
              className="text-[10px] leading-relaxed text-muted-foreground"
            >
              Per {type.unit}, as packaged.
            </p>
          </div>
        </div>

        <MedicationAppearanceFields
          key={resetRevision}
          previewMotion={previewMotion ?? true}
          onPreviewMotionChange={(value) => setField("previewMotion", value)}
          symbolSource={symbolSource ?? "all"}
          onSymbolSourceChange={(value) => setField("symbolSource", value)}
          searchQuery={searchQuery}
          onSearchQueryChange={(value) => setField("searchQuery", value)}
          color={color}
          icon={icon}
          iconRotation={iconRotation}
          name={name}
          activeIngredient={activeIngredient}
          categories={categories}
          strength={strength}
          defaultQuantity={defaultQuantity}
          medicationType={form}
          isBenzodiazepine={isBenzodiazepine}
          isOpioid={isOpioid}
          onColorChange={setColor}
          onIconChange={(value) => {
            setIcon(value);
            if (isMedicationIcon(value)) {
              setError((message) => (message === iconError ? null : message));
            }
          }}
        />
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="w-full space-y-3 pt-1" data-medication-save-footer>
        <div className="flex w-full flex-col gap-2" data-draft-action-footer>
          <div className="relative w-full">
            <MedicationActionButton
              intent="save"
              type="submit"
              pending={busy}
              data-medication-submit
            />
            <SaveOptions
              kind={medication ? "medication-edit" : "medication-new"}
              formId={id}
              disabled={busy}
            />
          </div>
          <DraftStatus {...draft} />
        </div>
      </div>
    </form>
  );
}

export function GoalForm({ onSaved }: { onSaved: () => void }) {
  const { data, mutate, busy, derived } = useJournal();
  const id = useId();
  const medications =
    data?.medications.filter((medication) => !medication.archived) ?? [];
  const medicationOptions = sortMedicationsByUsage(
    medications,
    data?.intakes ?? [],
    derived?.medicationUsage,
  );
  const freshGoal = (): GoalDraft => ({
    medicationId: medications[0]?.id ?? "",
    limit: "",
    startsOn: dayKey(new Date(), data?.settings.timezone ?? "Europe/Vienna"),
    endsOn: "",
    note: "",
  });
  const draft = usePersistentDraft("goal:new", freshGoal, isGoalDraft);
  const { medicationId, limit, startsOn, endsOn, note } = draft.value;
  const setField = (key: keyof GoalDraft, value: string) =>
    draft.setValue((current) => ({ ...current, [key]: value }));
  const setMedicationId = (value: string) => setField("medicationId", value);
  const setLimit = (value: string) => setField("limit", value);
  const setStartsOn = (value: string) => setField("startsOn", value);
  const setEndsOn = (value: string) => setField("endsOn", value);
  const setNote = (value: string) => setField("note", value);
  const [error, setError] = useState<string | null>(null);
  const selectedMedication = medications.find(
    (medication) => medication.id === medicationId,
  );

  const reset = () => {
    draft.resetDraft(freshGoal());
    setError(null);
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const dailyLimitMg = Number(limit);
    if (!selectedMedication) {
      setError("Choose an active medication.");
      return;
    }
    if (!limit.trim() || !Number.isFinite(dailyLimitMg) || dailyLimitMg < 0) {
      setError("Enter a daily maximum of zero or more.");
      return;
    }
    if (!isValidDayKey(startsOn) || (endsOn && !isValidDayKey(endsOn))) {
      setError("Choose valid start and end dates.");
      return;
    }
    if (endsOn && endsOn < startsOn) {
      setError("The end date must be on or after the start date.");
      return;
    }
    try {
      const saved = await mutate("goals", {
        medicationId,
        dailyLimitMg,
        startsOn,
        endsOn: endsOn || null,
        note: note.trim(),
      });
      const savedGoal = savedNotificationRecord(
        data?.goals ?? [],
        saved.data.goals,
        saved.entityId,
      );
      draft.clearDraft();
      toast.success("Your goal has been saved.", {
        journalScope: saved.notificationScope,
        ...(saved.unchanged ? { variant: "unchanged" as const } : {}),
        heading: "Daily maximum saved.",
        details: {
          ...(savedGoal
            ? {
                preview: {
                  after: goalNotificationSnapshot(
                    savedGoal,
                    saved.data.medications.find(
                      (item) => item.id === savedGoal.medicationId,
                    ),
                  ),
                },
              }
            : {}),
          paragraphs: [
            "This maximum is saved for the selected medication and date range. Daily progress compares the recorded dose for that medication with this value; it does not combine different medications.",
            "A newer goal’s start date supersedes older goals for the same medication. Goals are tracking references you enter yourself; saving one does not change your intakes.",
          ],
          facts: [
            { label: "Medication", value: selectedMedication.name },
            { label: "Daily Maximum", value: `${formatDose(dailyLimitMg)} mg` },
            { label: "Starts", value: startsOn },
            { label: "Ends", value: endsOn || "Open-ended" },
          ],
          links: [
            { label: "Review Goals", href: "/goals" },
            { label: "Daily Log", href: "/" },
          ],
          footer: "Undo removes only this newly saved goal.",
        },
        ...(saved.undo
          ? {
              undo: {
                label: "Undo Goal",
                onUndo: saved.undo,
                receipt: saved.receipt,
              },
            }
          : {}),
      });
      onSaved();
    } catch {
      // Save failures are shown by the journal provider without clearing inputs.
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div
        data-dialog-panel
        className="rounded-xl border border-primary/10 bg-primary/5 p-3.5 text-xs leading-relaxed text-muted-foreground"
      >
        Set a daily maximum agreed with your clinician. This is a reference for
        your journal; the app never creates an automatic taper.
      </div>

      {medications.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          Add a medication before creating a goal.
        </p>
      )}

      <fieldset
        disabled={busy || medications.length === 0}
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="space-y-2">
          <Label htmlFor={`${id}-medication`}>Medication</Label>
          <Select
            name="medicationId"
            value={medicationId || null}
            highlightItemOnHover={false}
            onValueChange={(value) => {
              if (value) setMedicationId(value);
            }}
            disabled={busy || medications.length === 0}
            required
          >
            <SelectTrigger id={`${id}-medication`} className={selectClass}>
              <SelectValue placeholder="Choose a medication">
                {selectedMedication ? (
                  <>
                    <MedicationIcon
                      icon={selectedMedication.icon}
                      rotation={selectedMedication.iconRotation}
                      color={selectedMedication.color}
                      small
                      className="size-5 rounded-md"
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span
                        className="min-w-0 truncate"
                        title={selectedMedication.name}
                      >
                        {selectedMedication.name}
                      </span>
                      <span className="shrink-0 text-xs">
                        · {formatDose(selectedMedication.strengthMg)} mg
                      </span>
                      {getMedicationIndicatorKinds(selectedMedication).map(
                        (kind) => (
                          <MedicationIndicatorMark
                            key={kind}
                            kind={kind}
                            size={20}
                          />
                        ),
                      )}
                    </span>
                  </>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              data-choice-menu="medication"
              align="start"
              alignItemWithTrigger={false}
              sideOffset={6}
            >
              <ChoiceMenuHeader title="Medication" count={medications.length} />
              {medicationOptions.map((medication) => {
                const current = medicationId === medication.id;
                return (
                  <SelectItem
                    key={medication.id}
                    value={medication.id}
                    label={`${medication.name} ${formatDose(medication.strengthMg)} mg`}
                    className="min-h-10 pl-2.5 pr-9 text-xs"
                    data-choice-option
                    data-current={current || undefined}
                  >
                    <ChoiceOptionContent
                      current={current}
                      currentLabel="This goal"
                      icon={
                        <MedicationIcon
                          icon={medication.icon}
                          rotation={medication.iconRotation}
                          color={medication.color}
                          small
                          className="size-6 rounded-md"
                        />
                      }
                      label={
                        <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                          <span>
                            {medication.name} ·{" "}
                            {formatDose(medication.strengthMg)} mg
                          </span>
                          {getMedicationIndicatorKinds(medication).map(
                            (kind) => (
                              <MedicationIndicatorMark
                                key={kind}
                                kind={kind}
                                size={20}
                              />
                            ),
                          )}
                        </span>
                      }
                    />
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-limit`}>Daily Maximum (mg)</Label>
          <Input
            id={`${id}-limit`}
            name="dailyLimitMg"
            type="number"
            inputMode="decimal"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            min="0"
            max="100000"
            step="0.0001"
            required
            placeholder="Your agreed daily target"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-start`}>Starts On</Label>
            <Input
              id={`${id}-start`}
              name="startsOn"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-end`}>
              Ends On{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id={`${id}-end`}
              name="endsOn"
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              onChange={(event) => setEndsOn(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
          Each tracking day starts at 06:00 in{" "}
          {data?.settings.timezone ?? "Europe/Vienna"}. Leave the end date empty
          to keep this goal ongoing.
        </p>

        <div className="space-y-2">
          <Label htmlFor={`${id}-note`}>
            A Note to Yourself{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id={`${id}-note`}
            name="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="A reminder, intention, or note from your clinician…"
            maxLength={1000}
            rows={2}
            className="min-h-16 rounded-xl px-3 py-2 text-base md:text-sm"
          />
        </div>
      </fieldset>

      {medicationId && !selectedMedication && medications.length > 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          Your draft medication is no longer active. Choose another to continue.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex w-full flex-col gap-2" data-draft-action-footer>
        <DialogPrimaryButton
          type="submit"
          disabled={busy || medications.length === 0}
          pending={busy}
          className="w-full"
        >
          {busy ? "Saving…" : "Save Goal"}
        </DialogPrimaryButton>
        <DraftStatus {...draft} onReset={busy ? undefined : reset} />
      </div>
    </form>
  );
}
