"use client";

import { DialogErrorPanel } from "./dialog-error-panel";
import {
  ReviewButton,
  ReviewDetails,
  ReviewTitle,
} from "./entry-action-review";
import reviewStyles from "./entry-action-review.module.css";

import { useEffect, useId, useRef, useState } from "react";
import { ActionIcon } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import closeStyles from "./dialog-close.module.css";
import styles from "./medication-dialog-actions.module.css";

type Confirmation = "reset" | "status";

/** Header actions share the form's existing draft through guarded callbacks. */
export function MedicationDialogActions({
  medicationName,
  resetDisabled,
  archiveDisabled = false,
  archived = false,
  onReset,
  onArchive,
}: {
  medicationName: string;
  resetDisabled: boolean;
  archiveDisabled?: boolean;
  archived?: boolean;
  onReset: () => boolean;
  onArchive?: () => Promise<boolean>;
}) {
  const groupRef = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmationId = useId();
  const activeTrigger = useRef<HTMLElement | null>(null);
  const focusClose = useRef(false);
  const mounted = useRef(true);
  const pendingRef = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation>("reset");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = confirmation === "reset";
  const action = reset ? "Reset Draft" : archived ? "Return to rotation" : "Bench medication";
  const statusIcon = archived ? "restore" : "archive";
  const name = medicationName.trim() || "this medication";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function requestConfirmation(next: Confirmation, trigger: HTMLElement) {
    if (pendingRef.current) return;
    activeTrigger.current = trigger;
    focusClose.current = false;
    setError(null);
    setConfirmation(next);
    setOpen(true);
  }

  function returnFocus() {
    const trigger = activeTrigger.current;
    if (
      !focusClose.current &&
      trigger?.isConnected &&
      !trigger.matches(":disabled, [aria-disabled='true']")
    )
      return trigger;

    // Reset clears its draft and disables its own trigger; Close stays usable.
    const close = groupRef.current
      ?.closest("[data-modal-header]")
      ?.querySelector<HTMLElement>("[data-modal-close]");
    return close?.isConnected ? close : false;
  }

  async function confirmAction() {
    if (pendingRef.current || !open) return;
    if (reset ? resetDisabled : archiveDisabled || !onArchive) return;

    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const succeeded = reset ? onReset() : await onArchive!();
      if (!mounted.current) return;
      if (succeeded) {
        focusClose.current = reset;
        setOpen(false);
      } else
        setError(
          reset
            ? "This draft is no longer available to reset. Your saved medication has not changed."
            : "The medication status could not be changed. Your medication and draft are still available; try again.",
        );
    } catch {
      if (!mounted.current) return;
      setError(
        reset
          ? "The draft could not be reset. Keep editing or try again."
          : "The medication status could not be changed. Keep editing or try again.",
      );
    } finally {
      pendingRef.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <span
      ref={groupRef}
      className={styles.group}
      data-medication-dialog-actions
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        rim={false}
        className={cn(closeStyles.control, closeStyles.medicationControl)}
        data-dialog-corner="medication"
        data-medication-reset-action
        disabled={resetDisabled || pending}
        aria-label="Reset Draft"
        aria-haspopup="dialog"
        aria-expanded={open && reset}
        aria-controls={confirmationId}
        title="Reset Draft"
        onClick={(event) => requestConfirmation("reset", event.currentTarget)}
      >
        <ActionIcon name="retry" />
      </Button>
      {onArchive && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          rim={false}
          className={cn(closeStyles.control, closeStyles.medicationControl)}
          data-dialog-corner="medication"
          data-medication-archive-action
          disabled={archiveDisabled || pending}
          aria-label={archived ? "Return to rotation" : "Bench medication"}
          aria-haspopup="dialog"
          aria-expanded={open && !reset}
          aria-controls={confirmationId}
          title={archived ? "Return to rotation" : "Bench medication"}
          onClick={(event) =>
            requestConfirmation("status", event.currentTarget)
          }
        >
          <ActionIcon name={statusIcon} />
        </Button>
      )}
      <Dialog
        open={open}
        disablePointerDismissal={pending}
        onOpenChange={(open, details) => {
          if (!open && pendingRef.current) {
            details.cancel();
            return;
          }
          if (!open) {
            setOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent
          id={confirmationId}
          role="alertdialog"
          showCloseButton={false}
          initialFocus={cancelRef}
          finalFocus={returnFocus}
          className={reset ? reviewStyles.sheet : styles.confirmation}
          data-medication-confirmation={
            reset ? "reset" : archived ? "restore" : "archive"
          }
          aria-busy={pending || undefined}
        >
          <DialogHeader>
            <DialogTitle className={styles.title}>
              {reset ? (
                <ReviewTitle action="reset" />
              ) : archived ? (
                "Return to Rotation?"
              ) : (
                "Bench This Medication?"
              )}
            </DialogTitle>
            <DialogDescription className={styles.description}>
              {reset ? (
                "Discard the edits waiting in this draft."
              ) : archived ? (
                <>
                  Return <strong>{name}</strong> to your rotation so
                  it can be selected for new intakes. Its details, past entries
                  and any unsaved draft stay available.
                </>
              ) : (
                <>
                  Move <strong>{name}</strong> to the bench and hide it from
                  the selector for new intakes. Past entries and this form’s
                  unsaved draft stay available.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {reset && (
            <ReviewDetails
              subject={medicationName.trim() || "New medication"}
              resetDetail="The medication form returns to its starting values."
              keptDetail="Your saved medications and past intakes stay in your journal."
            />
          )}
          {error && (
            <DialogErrorPanel
              title={
                reset
                  ? "Couldn’t reset the draft"
                  : "Couldn’t change medication status"
              }
              message={error}
            />
          )}
          {reset ? (
            <div className={reviewStyles.buttons}>
              <DialogClose
                disabled={pending}
                render={
                  <ReviewButton
                    action="keep"
                    ref={cancelRef}
                    disabled={pending}
                    data-medication-confirm-cancel
                  />
                }
              >
                Keep editing
              </DialogClose>
              <ReviewButton
                action="reset"
                onClick={() => void confirmAction()}
                disabled={pending || resetDisabled}
                data-medication-confirm-action
              >
                {pending ? "Resetting…" : "Reset Draft"}
              </ReviewButton>
            </div>
          ) : (
            <div className={styles.footer}>
              <DialogClose
                disabled={pending}
                render={
                  <Button
                    ref={cancelRef}
                    type="button"
                    variant="outline"
                    disabled={pending}
                    className={styles.action}
                    data-medication-confirm-cancel
                  />
                }
              >
                Keep Editing
              </DialogClose>
              <Button
                type="button"
                pending={pending}
                disabled={archiveDisabled || !onArchive}
                className={styles.action}
                onClick={() => void confirmAction()}
                data-medication-confirm-action
              >
                <ActionIcon
                  name={pending ? "loading" : statusIcon}
                  className={cn("size-3.5", pending && styles.spinner)}
                />
                {pending ? "Working…" : action}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}
