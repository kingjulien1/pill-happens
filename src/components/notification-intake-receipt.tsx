"use client";

import { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  Clock3,
  History,
  Pill,
  Route,
  Scale,
} from "lucide-react";
import {
  MedicationPreview,
  type IntakeDetailDecoration,
} from "./notification-medication-preview";
import {
  intakeReceiptChanges,
  type IntakeReceiptChange,
  type IntakeReceiptField,
} from "@/lib/intake-receipt-changes";
import type { IntakeSnapshot } from "@/lib/intake-update-preview";
import styles from "./notification-intake-receipt.module.css";

const icons = {
  time: Clock3,
  name: ArrowRightLeft,
  route: Route,
  form: Pill,
  amount: Scale,
};

/** Open history callouts live outside the card, so they cannot alter its layout. */
export function NotificationIntakeReceipt({
  before,
  after,
  medicationChanged,
}: {
  before?: IntakeSnapshot;
  after: IntakeSnapshot;
  medicationChanged?: boolean;
}) {
  const id = useId();
  const changes = useMemo(
    () =>
      before ? intakeReceiptChanges(before, after, medicationChanged) : [],
    [before, after, medicationChanged],
  );
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || !changes.length) return;
    let frame = 0;
    const measure = () => {
      const box = root.getBoundingClientRect();
      if (!box.width || !box.height) return;
      for (const change of changes) {
        const mark = root.querySelector<HTMLElement>(
          `[data-intake-change="${change.field}"]`,
        );
        const callout = root.querySelector<HTMLElement>(
          `[data-change-callout="${change.field}"]`,
        );
        const line = root.querySelector<SVGPathElement>(
          `[data-change-connector="${change.field}"]`,
        );
        if (!mark || !callout || !line) continue;
        const a = mark.getBoundingClientRect(),
          b = callout.getBoundingClientRect();
        const below = change.field === "amount";
        const x1 = (b.left + b.right) / 2 - box.left;
        const x2 = (a.left + a.right) / 2 - box.left;
        const y1 = (below ? b.top : b.bottom) - box.top;
        const y2 = (below ? a.bottom + 6 : a.top - 6) - box.top;
        const bend = (y1 + y2) / 2;
        line.setAttribute(
          "d",
          `M${x1},${y1} C${x1},${bend} ${x2},${bend} ${x2},${y2}`,
        );
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    root
      .querySelectorAll<HTMLElement>(
        "[data-change-callout], [data-notification-snapshot-card], [data-intake-change]",
      )
      .forEach((element) => observer.observe(element));
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [changes]);

  const decorate = (
    field: IntakeReceiptField,
  ): IntakeDetailDecoration | undefined => {
    const change = changes.find((item) => item.field === field);
    return change
      ? {
          className: styles.changed,
          "data-intake-change": field,
          "aria-describedby": `${id}-callout-${field}`,
          "aria-label": `${change.label}: ${change.after}`,
          tabIndex: 0,
        }
      : undefined;
  };
  const top = changes.filter((change) => change.field !== "amount");
  const bottom = changes.filter((change) => change.field === "amount");
  return (
    <div
      className={styles.receipt}
      data-notification-change-preview
      data-intake-receipt={before ? "updated" : "created"}
      data-notification-intake-update={before ? "" : undefined}
    >
      <div ref={stage} className={styles.stage} data-intake-change-stage>
        {top.length > 0 && (
          <div className={styles.callouts} data-callout-side="top">
            {top.map((change) => (
              <ChangeCallout
                key={change.field}
                change={change}
                id={`${id}-callout-${change.field}`}
              />
            ))}
          </div>
        )}
        <section
          className={styles.card}
          aria-label={before ? "Saved intake after your edit" : "Saved intake"}
          data-notification-snapshot="after"
        >
          <MedicationPreview record={after} decorate={decorate} />
        </section>
        {bottom.length > 0 && (
          <div className={styles.callouts} data-callout-side="bottom">
            {bottom.map((change) => (
              <ChangeCallout
                key={change.field}
                change={change}
                id={`${id}-callout-${change.field}`}
              />
            ))}
          </div>
        )}
        {changes.length > 0 && (
          <svg className={styles.connectors} aria-hidden="true">
            {changes.map((change) => (
              <path key={change.field} data-change-connector={change.field} />
            ))}
          </svg>
        )}
      </div>
      {changes.length > 0 && (
        <section
          className={styles.recap}
          aria-labelledby={`${id}-changes`}
          data-intake-update-history
        >
          <header className={styles.heading}>
            <h4 id={`${id}-changes`}>
              <History aria-hidden="true" />
              The changed pieces
            </h4>
            <span>
              <strong>{changes.length}</strong>{" "}
              {changes.length === 1 ? "change" : "changes"} saved
            </span>
          </header>
          <dl className={styles.stories}>
            {changes.map((change) => {
              const Icon = icons[change.field];
              return (
                <div
                  key={change.field}
                  className={styles.story}
                  data-intake-history-field={change.field}
                >
                  <dt>
                    <Icon aria-hidden="true" />
                    {change.label}
                  </dt>
                  <dd className={styles.old}>
                    <span>Before</span>
                    {change.before}
                  </dd>
                  <dd className={styles.saved}>
                    <ArrowRight aria-hidden="true" />
                    <span>
                      <span className="sr-only">Saved as </span>
                      {change.after}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}
    </div>
  );
}

function ChangeCallout({
  change,
  id,
}: {
  change: IntakeReceiptChange;
  id: string;
}) {
  const Icon = icons[change.field];
  const oldTime = change.before.split(" · ");
  const newTime = change.after.split(" · ");
  const sharedDate =
    change.field === "time" &&
    oldTime.length === 2 &&
    oldTime[1] === newTime[1];
  return (
    <aside
      id={id}
      className={styles.callout}
      data-change-callout={change.field}
      role="tooltip"
    >
      <header>
        <span>
          <Icon aria-hidden="true" />
          {change.label}
        </span>
        <Check aria-label="Saved" />
      </header>
      <div className={styles.comparison}>
        <span>
          <small>Before</small>
          <span>{sharedDate ? oldTime[0] : change.before}</span>
        </span>
        <ArrowRight aria-hidden="true" />
        <span>
          <small>Saved</small>
          <strong>{sharedDate ? newTime[0] : change.after}</strong>
        </span>
      </div>
      <p>{sharedDate ? `${newTime[1]} · ${change.context}` : change.context}</p>
    </aside>
  );
}
