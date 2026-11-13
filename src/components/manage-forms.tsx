"use client";

import { sortMedicationsByUsage } from "@/lib/medication-usage";

import { useId, useState, type FormEvent } from "react";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationAppearanceFields } from "@/components/medication-appearance-fields";
import type { SymbolSourceFilter } from "@/lib/medication-symbol-browser";
import { MedicationActionButton } from "@/components/medication-action-button";
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
import { useJournal } from "@/components/journal-provider";
import { DraftStatus, usePersistentDraft } from "@/components/journal-drafts";
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

const inputClass = "h-10 rounded-xl px-3 text-base md:text-sm";
const selectClass =
  "h-10 w-full rounded-xl px-3 text-sm data-[size=default]:h-10";
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

export function MedicationForm({
  medication,
  onSaved,
}: {
  medication?: Medication;
  onSaved: () => void;
}) {
  const { mutate, busy } = useJournal();
  const id = useId();
  const draft = usePersistentDraft(
    medication ? `med:edit:${medication.id}` : "med:new",
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
  const type = getMedicationType(form);
  const reset = () => {
    draft.resetDraft(medicationDefaults(medication));
    setError(null);
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
    try {
      await mutate(
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
      draft.clearDraft();
      toast.success(medication ? "Medication updated." : "Medication added.", {
        heading: "Medication library",
      });
      onSaved();
    } catch {
      // The journal provider explains failed saves and keeps the form available.
    }
  }

  return (
    <form onSubmit={save} className="flex min-w-0 flex-col gap-4">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <div
          className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(112px,1fr)] items-end gap-3"
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
          className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(112px,1fr)] items-end gap-3"
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

      <div className="w-full space-y-3 pt-4" data-medication-save-footer>
        <div className="flex w-full flex-col gap-2" data-draft-action-footer>
          <MedicationActionButton intent="save" type="submit" pending={busy} />
          <DraftStatus {...draft} onReset={busy ? undefined : reset} />
        </div>
      </div>
    </form>
  );
}

export function GoalForm({ onSaved }: { onSaved: () => void }) {
  const { data, mutate, busy } = useJournal();
  const id = useId();
  const medications =
    data?.medications.filter((medication) => !medication.archived) ?? [];
  const medicationOptions = sortMedicationsByUsage(
    medications,
    data?.intakes ?? [],
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
      await mutate("goals", {
        medicationId,
        dailyLimitMg,
        startsOn,
        endsOn: endsOn || null,
        note: note.trim(),
      });
      draft.clearDraft();
      toast.success("Your goal has been saved.", { heading: "Daily goal" });
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
