"use client";

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
  const action = reset ? "Reset Draft" : archived ? "Restore" : "Archive";
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
          aria-label={archived ? "Restore Medication" : "Archive Medication"}
          aria-haspopup="dialog"
          aria-expanded={open && !reset}
          aria-controls={confirmationId}
          title={archived ? "Restore Medication" : "Archive Medication"}
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
          className={styles.confirmation}
          data-medication-confirmation={
            reset ? "reset" : archived ? "restore" : "archive"
          }
          aria-busy={pending || undefined}
        >
          <DialogHeader>
            <DialogTitle className={styles.title}>
              {reset
                ? "Reset This Draft?"
                : archived
                  ? "Restore This Medication?"
                  : "Archive This Medication?"}
            </DialogTitle>
            <DialogDescription className={styles.description}>
              {reset ? (
                <>
                  Discard the unsaved edits for <strong>{name}</strong> and
                  return this form to its starting values. Saved medications and
                  past intakes stay unchanged.
                </>
              ) : archived ? (
                <>
                  Return <strong>{name}</strong> to your active medications so
                  it can be selected for new intakes. Its details, past entries
                  and any unsaved draft stay available.
                </>
              ) : (
                <>
                  Move <strong>{name}</strong> to your archive and hide it from
                  the selector for new intakes. Past entries and this form’s
                  unsaved draft stay available.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
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
              disabled={reset ? resetDisabled : archiveDisabled || !onArchive}
              className={styles.action}
              onClick={() => void confirmAction()}
              data-medication-confirm-action
            >
              <ActionIcon
                name={pending ? "loading" : reset ? "retry" : statusIcon}
                className={cn("size-3.5", pending && styles.spinner)}
              />
              {pending ? "Working…" : action}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </span>
  );
}
