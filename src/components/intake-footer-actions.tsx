"use client";

import { useId, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ArrowRight, BrushCleaning, Shredder, Sparkles, X } from "lucide-react";
import tools from "./intake-footer-actions.module.css";
import navigation from "./dialog-footer-navigation.module.css";
import styles from "./draft-reset-footer.module.css";

type Action = "reset" | "delete";
const actions = {
  reset: {
    label: "Reset Draft",
    Icon: BrushCleaning,
    description: "Review what will be cleared before you decide.",
    next: "Review reset",
  },
  delete: {
    label: "Delete Intake",
    Icon: Shredder,
    description: "See the saved dose and time before removing this entry.",
    next: "Review intake",
  },
} as const;

export function useFooterGuide() {
  const button = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const [state, setState] = useState<"open" | "closing" | null>(null);
  return { button, descriptionId, state, setState };
}
type Props = {
  action: Action;
  guide: ReturnType<typeof useFooterGuide>;
  disabled: boolean;
  reviewing: boolean;
  onReview: () => void;
};

export function FooterActionTile({
  action,
  guide: { button: buttonRef, state, descriptionId },
  disabled,
  reviewing,
  onReview,
}: Props) {
  const { label, Icon } = actions[action];
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${navigation.labeledControl} ${tools.tool}`}
      data-tone={action}
      data-reset-tool={action === "reset" ? "" : undefined}
      data-guidance={state ?? undefined}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={reviewing}
      aria-describedby={state === "open" ? descriptionId : undefined}
      onClick={onReview}
    >
      <span className={`${tools.tile} ${styles.tile}`}>
        <Icon
          className={action === "delete" ? tools.shredder : styles.brush}
          size={19}
          strokeWidth={2.1}
          aria-hidden="true"
        />
        {action === "reset" ? (
          <Sparkles className={styles.glint} size={11} aria-hidden="true" />
        ) : (
          <i className={tools.strip} aria-hidden="true" />
        )}
      </span>
      {label}
    </button>
  );
}

export function FooterActionLink({
  action,
  guide: { button: buttonRef, state, setState, descriptionId },
  disabled,
  reviewing,
  onReview,
}: Props) {
  const { label, Icon, description, next } = actions[action];
  return (
    <Popover.Root
      open={state === "open" && !disabled}
      onOpenChange={(open) => setState(open ? "open" : "closing")}
      onOpenChangeComplete={(open) => {
        if (!open) setState((state) => (state === "closing" ? null : state));
      }}
    >
      <Popover.Trigger
        type="button"
        disabled={disabled}
        className={styles.inlineLink}
        data-tone={action}
      >
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          anchor={buttonRef}
          side="top"
          sideOffset={10}
          collisionPadding={12}
          className={styles.positioner}
        >
          <Popover.Popup
            className={styles.tip}
            data-tone={action}
            aria-label={`${label} help`}
            finalFocus={reviewing ? false : undefined}
          >
            <Popover.Title>
              <Icon size={16} aria-hidden="true" /> {label}
            </Popover.Title>
            <Popover.Close
              type="button"
              className={styles.tipClose}
              aria-label={`Close ${action} help`}
            >
              <X size={14} />
            </Popover.Close>
            <Popover.Description id={descriptionId}>
              {description}
            </Popover.Description>
            <button
              type="button"
              className={styles.reviewLink}
              onClick={onReview}
            >
              {next} <ArrowRight size={13} />
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
