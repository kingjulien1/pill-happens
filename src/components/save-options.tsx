"use client";

import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  BookmarkCheck,
  ChevronUp,
  Feather,
  ListPlus,
  NotebookPen,
} from "lucide-react";
import styles from "./save-options.module.css";

export type SaveOptionsProps = {
  kind: "intake" | "edit" | "check-in";
  formId: string;
  disabled?: boolean;
};

export function SaveOptions({ kind, formId, disabled }: SaveOptionsProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const checkIn = kind === "check-in";
  const Mark = checkIn ? NotebookPen : ListPlus;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={trigger}
        type="button"
        aria-label="Save options"
        disabled={disabled}
        data-kind={kind}
        className={styles.trigger}
      >
        <span className={styles.tab}>
          <ChevronUp size={14} strokeWidth={2.6} />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          anchor={() => trigger.current?.parentElement ?? null}
          side="top"
          align="start"
          alignOffset={-2}
          sideOffset={9}
          collisionPadding={10}
          className={styles.positioner}
        >
          <Popover.Popup
            className={styles.popup}
            data-kind={kind}
            aria-label="Save options"
          >
            <div className={styles.heading}>
              <Mark size={17} aria-hidden="true" />
              <Popover.Title>
                {checkIn ? "Stay on this page" : "Stay with this intake"}
              </Popover.Title>
            </div>
            <Popover.Description className={styles.description}>
              {checkIn
                ? "Save your check-in and carry on here."
                : kind === "edit"
                  ? "Save your changes and keep this entry open."
                  : "Log this intake and keep the saved entry open for edits."}
            </Popover.Description>
            <div className={styles.actions}>
              <button
                className={styles.save}
                disabled={disabled}
                type="submit"
                name="saveMode"
                value="stay"
                form={formId}
                onClick={(event) => {
                  event.preventDefault();
                  const button = event.currentTarget;
                  button.form?.requestSubmit(button);
                  setOpen(false);
                }}
              >
                <BookmarkCheck size={15} aria-hidden="true" /> Save and stay
              </button>
              <Popover.Close className={styles.edit} type="button">
                <Feather size={13} aria-hidden="true" /> Keep editing
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
