"use client";

import { useId, useState, type FormEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowRight,
  BookmarkCheck,
  CornerDownLeft,
  Info,
  PencilLine,
  X,
} from "lucide-react";
import styles from "./save-options.module.css";
import { playSaveStatusExit } from "./save-status-line";

const saveCopy = {
  intake: {
    context: "New intake",
    result: "Log this dose and open its saved entry.",
    note: "The time taken determines which tracking day gets this dose.",
  },
  edit: {
    context: "Edit intake",
    result: "Keep this entry open after saving your changes.",
    note: "Choosing a different medication replaces the original intake.",
  },
  "check-in": {
    result: "Save these answers and carry on with your check-in.",
    note: "You can come back to any unanswered rating later.",
  },
  "medication-new": {
    context: "New medication",
    result: "Add it to your library and keep its details open.",
    note: "You can log a dose once the medication is in your library.",
  },
  "medication-edit": {
    context: "Edit medication",
    result: "Save the details and stay on this medication.",
    note: "Strength changes recalculate doses on linked intake logs.",
  },
  preferences: {
    context: "Journal preferences",
    result: "Apply the timezone and stay in preferences.",
    note: "Tracking days begin at 06:00 in the timezone you choose.",
  },
} as const;

function SaveOptionsGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.tracks} d="M3.5 7.5h17m-17 9h17" />
      <g className={styles.upperThumb}>
        <rect x="5" y="4.25" width="5.5" height="6.5" rx="2.25" />
      </g>
      <g className={styles.lowerThumb}>
        <rect x="13.5" y="13.25" width="5.5" height="6.5" rx="2.25" />
      </g>
    </svg>
  );
}

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
  placement = "corner",
}: SaveOptionsProps & { placement?: "corner" | "top-edge" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const copy = saveCopy[kind];
  const context =
    "context" in copy
      ? copy.context
      : period === "morning"
        ? "Morning check-in"
        : "Evening check-in";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label="Save options"
        disabled={disabled}
        data-kind={kind}
        data-placement={placement}
        className={styles.trigger}
      >
        <span className={styles.face}>
          <SaveOptionsGlyph />
          {placement === "top-edge" && <span>Save options</span>}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          alignOffset={-8}
          sideOffset={placement === "top-edge" ? 8 : 18}
          collisionPadding={10}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className={styles.positioner}
        >
          <Popover.Popup
            className={styles.popup}
            data-kind={kind}
            aria-label="Save options"
          >
            <Popover.Arrow className={styles.pointer}>
              <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
                <path d="M0 0h16L9.4 6.5q-1.4 1.4-2.8 0Z" fill="var(--panel)" />
                <path
                  d="m.6 0 6 6.3q1.4 1.5 2.8 0l6-6.3"
                  fill="none"
                  stroke="var(--panel-edge)"
                />
              </svg>
            </Popover.Arrow>
            <div className={styles.interior}>
              <header className={styles.heading}>
                <div>
                  <p className={styles.context}>{context}</p>
                  <Popover.Title className={styles.title}>
                    Save options
                  </Popover.Title>
                </div>
                <Popover.Close
                  type="button"
                  className={styles.close}
                  aria-label="Close save options"
                >
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </Popover.Close>
              </header>
              <div className={styles.choices}>
                <button
                  className={styles.save}
                  disabled={disabled}
                  type="submit"
                  name="saveMode"
                  value="stay"
                  form={formId}
                  aria-labelledby={`${id}-save`}
                  aria-describedby={`${id}-result`}
                  onClick={(event) => {
                    event.preventDefault();
                    const button = event.currentTarget;
                    if (button.form) {
                      playSaveStatusExit(button.form);
                      button.form.requestSubmit(button);
                    }
                    setOpen(false);
                  }}
                >
                  <BookmarkCheck
                    className={styles.choiceIcon}
                    aria-hidden="true"
                  />
                  <span className={styles.choiceCopy}>
                    <strong id={`${id}-save`}>Save and stay</strong>
                    <span id={`${id}-result`}>{copy.result}</span>
                  </span>
                  <ArrowRight className={styles.direction} aria-hidden="true" />
                </button>
                <Popover.Close
                  className={styles.edit}
                  type="button"
                  aria-labelledby={`${id}-edit`}
                  aria-describedby={`${id}-draft`}
                >
                  <PencilLine
                    className={styles.choiceIcon}
                    aria-hidden="true"
                  />
                  <span className={styles.choiceCopy}>
                    <strong id={`${id}-edit`}>Keep editing</strong>
                    <span id={`${id}-draft`}>
                      Return to your draft without saving.
                    </span>
                  </span>
                  <CornerDownLeft
                    className={styles.direction}
                    aria-hidden="true"
                  />
                </Popover.Close>
              </div>
              <Popover.Description className={styles.note}>
                <Info size={13} aria-hidden="true" /> {copy.note}
              </Popover.Description>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
