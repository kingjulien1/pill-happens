"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BrushCleaning,
  Check,
  FileText,
  Shredder,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { doseMg, formatDose, type Intake } from "@/lib/domain";
import styles from "./intake-footer-actions.module.css";

type Action = "reset" | "delete";
type Step = "opening" | "review" | "arming" | "confirm" | "applying" | "done";
const labels = { reset: "Reset draft", delete: "Delete intake" };
const icons = { reset: BrushCleaning, delete: Shredder };
const titles = {
  reset: {
    review: "Review your draft",
    confirm: "Discard these changes?",
    applying: "Resetting draft…",
    done: "Draft reset",
  },
  delete: {
    review: "Review this intake",
    confirm: "Delete this intake?",
    applying: "Deleting intake…",
    done: "Intake deleted",
  },
};
const beat = 720;
const duration = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : beat;

export function IntakeFooterActions({
  intake,
  timezone,
  draftName,
  canReset,
  pinned,
  busy,
  onReset,
  onDelete,
}: {
  intake?: Intake;
  timezone: string;
  draftName?: string;
  canReset: boolean;
  pinned: boolean;
  busy: boolean;
  onReset: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action>("reset");
  const [step, setStep] = useState<Step>("opening");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const origin = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const applying = useRef(false);
  const id = useId();
  const reset = action === "reset";
  const Icon = icons[action];
  const applyAction = reset ? onReset : onDelete;
  const canAct = !busy && (reset ? canReset : Boolean(intake && onDelete));
  const scene =
    step === "opening" ? "review" : step === "arming" ? "confirm" : step;
  const reviewing = scene === "review";
  const finished = step === "done";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (step === "done") {
      const timer = setTimeout(() => setOpen(false), 1000);
      return () => clearTimeout(timer);
    }
    if (step !== "opening" && step !== "arming") return;
    const timer = setTimeout(
      () => setStep(step === "opening" ? "review" : "confirm"),
      duration(),
    );
    return () => clearTimeout(timer);
  }, [open, step]);

  function show(next: Action, button: HTMLButtonElement) {
    origin.current = button;
    setAction(next);
    setStep("opening");
    setError("");
    setOpen(true);
  }
  function returnFocus() {
    const button = origin.current;
    if (button?.isConnected && !button.disabled) return button;
    return (
      button?.form?.querySelector<HTMLElement>(
        "[data-intake-submit], a[href]",
      ) ?? false
    );
  }
  async function proceed() {
    if (applying.current || !canAct || !applyAction) return;
    if (step === "review") {
      setStep("arming");
      cancel.current?.focus({ preventScroll: true });
      return;
    }
    if (step !== "confirm") return;
    applying.current = true;
    setError("");
    setStep("applying");
    try {
      // Finish the sweep or paper feed before a successful delete unmounts its editor.
      await new Promise((resolve) => setTimeout(resolve, duration()));
      if (!mounted.current) return;
      await applyAction();
      if (mounted.current) setStep("done");
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof Error
            ? err.message
            : "The change couldn’t be confirmed. You can try again.",
        );
        setStep("confirm");
      }
    } finally {
      applying.current = false;
    }
  }

  return (
    <div className={styles.tools} role="group" aria-label="Intake actions">
      {(intake && onDelete
        ? (["reset", "delete"] as const)
        : (["reset"] as const)
      ).map((kind) => {
        const Mark = icons[kind];
        return (
          <button
            key={kind}
            type="button"
            className={styles.tool}
            data-tone={kind}
            disabled={busy || (kind === "reset" && !canReset)}
            aria-haspopup="dialog"
            aria-controls={open && kind === action ? id : undefined}
            aria-expanded={open && kind === action}
            onClick={(event) => show(kind, event.currentTarget)}
          >
            <span className={styles.tile}>
              <Mark size={19} strokeWidth={2.1} aria-hidden="true" />
            </span>
            {labels[kind]}
          </button>
        );
      })}
      <Dialog
        open={open}
        disablePointerDismissal={step === "applying"}
        onOpenChange={(next, details) => {
          if (!next && applying.current) {
            details.cancel();
            return;
          }
          setOpen(next);
        }}
      >
        <DialogContent
          id={id}
          role="alertdialog"
          showCloseButton={false}
          initialFocus={cancel}
          finalFocus={returnFocus}
          className={styles.panel}
          data-tone={action}
          data-scene={scene}
          aria-busy={step === "applying"}
        >
          <div className={styles.eyebrow}>
            <span>{reset ? "On this device" : "Daily log"}</span>
            <span
              className={styles.steps}
              aria-label={reviewing ? "Step 1 of 2" : "Step 2 of 2"}
            >
              <i />
              <i />
              {reviewing ? "1 / 2" : "2 / 2"}
            </span>
          </div>
          <div className={styles.heading}>
            <div className={styles.art} aria-hidden="true">
              <span className={styles.orbit} />
              <FileText className={styles.page} />
              <Icon className={styles.mark} />
              <span className={styles.flecks}>
                <i />
                <i />
                <i />
              </span>
              {finished && <Check className={styles.check} />}
            </div>
            <div>
              <DialogTitle
                className={styles.title}
                aria-live="polite"
                aria-atomic="true"
              >
                {titles[action][scene]}
              </DialogTitle>
              <DialogDescription className={styles.description}>
                {reset
                  ? intake
                    ? "Reset returns this editor to the saved entry."
                    : "Reset clears the unfinished intake from this device."
                  : "Delete removes this saved entry from its tracking day."}
              </DialogDescription>
            </div>
          </div>
          <div className={styles.record}>
            <small>
              {finished
                ? "Ready for editing"
                : reset
                  ? "Draft to reset"
                  : "Saved entry to delete"}
            </small>
            <strong>
              {reset ? draftName || "New intake draft" : intake?.medicationName}
            </strong>
            {!reset && intake && (
              <span>
                {formatDose(doseMg(intake))} mg <b aria-hidden="true">·</b>{" "}
                <time dateTime={intake.takenAt}>
                  {new Intl.DateTimeFormat("en-GB", {
                    timeZone: timezone,
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(intake.takenAt))}
                </time>
              </span>
            )}
            {reset && intake && draftName !== intake.medicationName && (
              <span>Returns to {intake.medicationName}</span>
            )}
          </div>
          <p className={styles.note}>
            {reset
              ? pinned
                ? "This also releases the date and time pinned across your intake forms."
                : "Other drafts and saved intakes stay as they are."
              : "The daily total updates after deletion. You can restore this entry with Undo in the notification."}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.buttons}>
            <button
              type="button"
              ref={cancel}
              disabled={step === "applying"}
              onClick={() => setOpen(false)}
            >
              {finished ? "Back to intake" : "Keep editing"}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={!canAct || (step !== "review" && step !== "confirm")}
              onKeyDown={(event) => {
                if (event.repeat) event.preventDefault();
              }}
              onClick={() => void proceed()}
            >
              {reviewing ? (
                <>
                  Continue <ArrowRight size={15} />
                </>
              ) : finished ? (
                <>
                  <Check size={15} /> Done
                </>
              ) : (
                <>
                  <Icon size={15} />
                  {labels[action]}
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
