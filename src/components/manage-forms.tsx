"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useJournal } from "@/components/journal-provider";
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
import {
  dayKey,
  formatDose,
  isValidDayKey,
  type Medication,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

const forms: { value: Medication["form"]; label: string }[] = [
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "drops", label: "Drops" },
  { value: "other", label: "Other" },
];

const colors: { value: Medication["color"]; label: string; dot: string }[] = [
  { value: "rose", label: "Rose", dot: "bg-rose-400" },
  { value: "amber", label: "Amber", dot: "bg-amber-400" },
  { value: "violet", label: "Violet", dot: "bg-violet-400" },
];

const inputClass = "h-12 rounded-xl px-3 text-base md:text-base";
const selectClass =
  "h-12 w-full rounded-xl px-3 text-base data-[size=default]:h-12";

export function MedicationForm({
  medication,
  onSaved,
}: {
  medication?: Medication;
  onSaved: () => void;
}) {
  const { mutate, busy } = useJournal();
  const id = useId();
  const [name, setName] = useState(medication?.name ?? "");
  const [strength, setStrength] = useState(
    medication ? String(medication.strengthMg) : "",
  );
  const [form, setForm] = useState<Medication["form"]>(
    medication?.form ?? "tablet",
  );
  const [color, setColor] = useState<Medication["color"]>(
    medication?.color ?? "rose",
  );
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const strengthMg = Number(strength);
    if (!name.trim()) {
      setError("Enter a medication name.");
      return;
    }
    if (!Number.isFinite(strengthMg) || strengthMg <= 0) {
      setError("Enter a strength greater than zero.");
      return;
    }
    try {
      await mutate(
        medication ? `medications/${medication.id}` : "medications",
        { name: name.trim(), strengthMg, form, color },
        medication ? "PATCH" : "POST",
      );
      toast.success(medication ? "Medication updated." : "Medication added.");
      onSaved();
    } catch {
      // The journal provider explains failed saves and keeps the form available.
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        <div className="space-y-2.5">
          <Label htmlFor={`${id}-name`}>Medication name</Label>
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

        <div className="space-y-2.5">
          <Label htmlFor={`${id}-strength`}>Strength per unit (mg)</Label>
          <Input
            id={`${id}-strength`}
            name="strengthMg"
            type="number"
            inputMode="decimal"
            value={strength}
            onChange={(event) => setStrength(event.target.value)}
            placeholder="e.g. 1"
            min="0.0001"
            max="100000"
            step="0.0001"
            required
            aria-describedby={`${id}-strength-help`}
            className={inputClass}
          />
          <p
            id={`${id}-strength-help`}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            The amount in one tablet, capsule, or drop. Check the packaging for
            the exact strength.
          </p>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor={`${id}-form`}>Form</Label>
          <Select
            name="form"
            value={form}
            onValueChange={(value) => {
              if (value && forms.some((item) => item.value === value)) {
                setForm(value as Medication["form"]);
              }
            }}
            disabled={busy}
          >
            <SelectTrigger id={`${id}-form`} className={selectClass}>
              <SelectValue>
                {forms.find((item) => item.value === form)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {forms.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="min-h-11 px-3 text-base"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <fieldset className="min-w-0 space-y-2.5">
          <legend className="text-sm font-medium">A little color</legend>
          <div className="grid grid-cols-3 gap-2">
            {colors.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant="outline"
                aria-label={`${item.label} medication color`}
                aria-pressed={color === item.value}
                onClick={() => setColor(item.value)}
                disabled={busy}
                className={cn(
                  "h-11 gap-2 rounded-xl px-2 text-xs",
                  color === item.value &&
                    "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    item.dot,
                  )}
                >
                  {color === item.value && (
                    <Check className="size-3 text-white" aria-hidden="true" />
                  )}
                </span>
                {item.label}
              </Button>
            ))}
          </div>
        </fieldset>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="h-12 w-full gap-2 rounded-xl text-base"
      >
        {busy && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        )}
        {busy ? "Saving…" : "Save medication"}
      </Button>
    </form>
  );
}

export function GoalForm({ onSaved }: { onSaved: () => void }) {
  const { data, now, mutate, busy } = useJournal();
  const id = useId();
  const medications =
    data?.medications.filter((medication) => !medication.archived) ?? [];
  const [medicationId, setMedicationId] = useState(medications[0]?.id ?? "");
  const [limit, setLimit] = useState("");
  const [startsOn, setStartsOn] = useState(() =>
    dayKey(now ?? new Date(), data?.settings.timezone ?? "Europe/Vienna"),
  );
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selectedMedication = medications.find(
    (medication) => medication.id === medicationId,
  );

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
      toast.success("Your goal has been saved.");
      onSaved();
    } catch {
      // Save failures are shown by the journal provider without clearing inputs.
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-3.5 text-xs leading-relaxed text-muted-foreground">
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
        className="flex min-w-0 flex-col gap-5"
      >
        <div className="space-y-2.5">
          <Label htmlFor={`${id}-medication`}>Medication</Label>
          <Select
            name="medicationId"
            value={medicationId || null}
            onValueChange={(value) => {
              if (value) setMedicationId(value);
            }}
            disabled={busy || medications.length === 0}
            required
          >
            <SelectTrigger id={`${id}-medication`} className={selectClass}>
              <SelectValue placeholder="Choose a medication">
                {selectedMedication
                  ? `${selectedMedication.name} · ${formatDose(selectedMedication.strengthMg)} mg`
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {medications.map((medication) => (
                <SelectItem
                  key={medication.id}
                  value={medication.id}
                  className="min-h-11 px-3 text-base"
                >
                  {medication.name} · {formatDose(medication.strengthMg)} mg
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor={`${id}-limit`}>Daily maximum (mg)</Label>
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
          <div className="min-w-0 space-y-2.5">
            <Label htmlFor={`${id}-start`}>Starts on</Label>
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
          <div className="min-w-0 space-y-2.5">
            <Label htmlFor={`${id}-end`}>
              Ends on{" "}
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

        <div className="space-y-2.5">
          <Label htmlFor={`${id}-note`}>
            A note to yourself{" "}
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
            rows={3}
            className="min-h-24 rounded-xl px-3 py-3 text-base md:text-base"
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={busy || medications.length === 0}
        className="h-12 w-full gap-2 rounded-xl text-base"
      >
        {busy && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        )}
        {busy ? "Saving…" : "Save goal"}
      </Button>
    </form>
  );
}
