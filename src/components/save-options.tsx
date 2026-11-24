"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { BookmarkCheck, ChevronUp, Feather, Info, Origami } from "lucide-react";
import styles from "./save-options.module.css";

const saveCopy = {
  intake: {
    title: "Stay with this intake",
    context: "New log",
    description:
      "Log this dose and keep its entry open. The button switches to Save Edits. You can correct the time or amount right here.",
    note: "The time taken determines which tracking day gets the entry.",
    result: "Adds one intake",
  },
  edit: {
    title: "Stay with this intake",
    context: "Editing",
    description:
      "Save your corrections and keep this entry open. The preview shows the new values. You can give them another look before you leave.",
    note: "Choosing a different medication replaces the original intake.",
    result: "Saves your changes",
  },
  "check-in": {
    title: "Stay with this day",
    description:
      "Save the answers you’ve filled in so far. Your place in the check-in stays open. You can finish another section and save again.",
    note: "Blank ratings stay unrated. You can fill them in later.",
    result: "Saves to this day",
  },
  "medication-new": {
    title: "Stay with this medication",
    context: "New medication",
    description:
      "Add this medication to your library. Its saved details open here for editing. You can fine-tune the appearance or default amount before leaving.",
    note: "Logging a dose is a separate step.",
    result: "Adds to your library",
  },
  "medication-edit": {
    title: "Stay with this medication",
    context: "Library edit",
    description:
      "Save the medication details and keep this form open. Your next edit applies to the same library item. You can check the preview before making another change.",
    note: "Strength changes recalculate the totals on linked intake logs.",
    result: "Updates your library",
  },
  preferences: {
    title: "Stay in preferences",
    context: "Timezone",
    description:
      "Apply this timezone to your journal. Your saved entries will use its local times. You can review the setting here after saving.",
    note: "The 06:00 tracking-day boundary moves with the timezone.",
    result: "Applies to your journal",
  },
} as const;

export function isSaveAndStay(event: FormEvent<HTMLFormElement>) {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  return (
    submitter instanceof HTMLButtonElement &&
    submitter.name === "saveMode" &&
    submitter.value === "stay"
  );
}

export type SaveOptionsProps = (
  | { kind: "check-in"; period: "morning" | "evening" }
  | { kind: Exclude<keyof typeof saveCopy, "check-in">; period?: never }
) & {
  formId: string;
  disabled?: boolean;
};

export function SaveOptions({
  kind,
  period,
  formId,
  disabled,
}: SaveOptionsProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const copy = saveCopy[kind];
  const context =
    "context" in copy
      ? copy.context
      : period === "morning"
        ? "Morning"
        : "Evening";

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
          <ChevronUp size={14} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          anchor={() => trigger.current?.parentElement ?? null}
          side="top"
          align="start"
          alignOffset={-2}
          sideOffset={17}
          collisionPadding={10}
          collisionAvoidance={{
            side: "flip",
            align: "none",
            fallbackAxisSide: "none",
          }}
          className={styles.positioner}
        >
          <Popover.Popup
            className={styles.popup}
            data-kind={kind}
            aria-label="Save options"
          >
            <div className={styles.interior}>
              <header className={styles.heading}>
                <span className={styles.mark}>
                  <Origami size={17} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <Popover.Title>{copy.title}</Popover.Title>
                <span className={styles.context}>{context}</span>
              </header>
              <Popover.Description className={styles.description}>
                {copy.description}
              </Popover.Description>
              <p className={styles.note}>
                <Info size={11} aria-hidden="true" />
                {copy.note}
              </p>
              <div className={styles.actions}>
                <button
                  className={styles.save}
                  disabled={disabled}
                  type="submit"
                  name="saveMode"
                  value="stay"
                  form={formId}
                  aria-describedby={`${id}-save`}
                  onClick={(event) => {
                    event.preventDefault();
                    const button = event.currentTarget;
                    button.form?.requestSubmit(button);
                    setOpen(false);
                  }}
                >
                  <span className={styles.keycap}>
                    <BookmarkCheck size={15} aria-hidden="true" />
                  </span>
                  Save and stay
                </button>
                <Popover.Close
                  className={styles.edit}
                  type="button"
                  aria-describedby={`${id}-edit`}
                >
                  <Feather size={13} aria-hidden="true" /> Keep editing
                </Popover.Close>
                <small id={`${id}-save`}>{copy.result}</small>
                <small id={`${id}-edit`}>Draft only</small>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
