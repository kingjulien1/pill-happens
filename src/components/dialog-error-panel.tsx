"use client";

import { CornerRightUp, MessageSquareWarning } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./dialog-error-panel.module.css";

export type DialogIssue = {
  message: string;
  jump?: { selector: string; label: string };
};

export function fieldIssue(
  message: string,
  selector: string,
  label: string,
): DialogIssue {
  return { message, jump: { selector, label } };
}

/** Search filters do not resolve a missing selection until an option is chosen. */
export function correctedIssueField(
  issue: DialogIssue | null,
  target: EventTarget,
) {
  return Boolean(
    issue?.jump &&
    target instanceof HTMLInputElement &&
    target.type !== "search" &&
    target.matches(issue.jump.selector) &&
    target.validity.valid &&
    (!target.required || target.value.trim()),
  );
}

/** Keep the browser's min, max and step rules when a form shows its own feedback. */
export function nativeDialogIssue(form: HTMLFormElement): DialogIssue | null {
  const field = form.querySelector<HTMLInputElement>(
    "input:invalid, textarea:invalid, select:invalid",
  );
  if (!field) return null;
  return {
    message: field.validationMessage,
    jump: field.id
      ? {
          selector: `#${CSS.escape(field.id)}`,
          label: field.labels?.[0]?.textContent?.trim() || "Review field",
        }
      : undefined,
  };
}

export function DialogErrorPanel({
  id,
  title,
  message,
  jump,
  action,
}: DialogIssue & {
  id?: string;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = panel.current;
    const scroll = element?.closest("[data-dialog-scroll]");
    if (!element || !scroll) return;
    const box = element.getBoundingClientRect();
    const viewport = scroll.getBoundingClientRect();
    if (box.bottom < viewport.top || box.top > viewport.bottom) {
      element.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, []);

  return (
    <div className={styles.panel} ref={panel} data-dialog-error>
      <span className={styles.mark} aria-hidden="true">
        <MessageSquareWarning size={18} strokeWidth={1.8} />
      </span>
      <div className={styles.body}>
        <div role="alert" aria-atomic="true">
          <strong className={styles.title}>{title}</strong>
          <p id={id} className={styles.message}>
            {message}
          </p>
        </div>
        {(jump || action) && (
          <div className={styles.actions}>
            {jump && (
              <button
                type="button"
                onClick={(event) => {
                  const field =
                    event.currentTarget.form?.querySelector<HTMLElement>(
                      jump.selector,
                    );
                  if (!field) return;
                  field.focus({ preventScroll: true });
                  field.scrollIntoView({
                    block: "center",
                    behavior: "instant",
                  });
                }}
              >
                <CornerRightUp size={13} aria-hidden="true" />
                {jump.label}
              </button>
            )}
            {action && (
              <button type="button" onClick={action.onClick}>
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
