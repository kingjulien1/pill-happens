import type { ComponentProps } from "react";
import {
  BookLock,
  CornerUpLeft,
  Eraser,
  FilePenLine,
  ReceiptText,
  Scissors,
  Undo2,
} from "lucide-react";
import { doseMg, formatDose, type Intake } from "@/lib/domain";
import styles from "./entry-action-review.module.css";

type Action = "reset" | "delete";

function ReviewArtwork({ action }: { action: Action }) {
  const erase = action === "reset";
  return (
    <svg
      className={styles.art}
      viewBox="0 0 132 94"
      fill="none"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="68" cy="83" rx="46" ry="3" fill="var(--review-shadow)" />
      {erase ? (
        <>
          <g transform="rotate(-8 65 55)">
            <path
              d="M14 42 84 32l27 34-73 13Z"
              fill="#c88d60"
              stroke="#623d40"
            />
            <path
              d="m15 38 69-10 27 34-73 13Z"
              fill="#fff0ce"
              stroke="#75494c"
              strokeWidth="1.6"
            />
            <path
              d="m31 45 34-5m-30 11 48-7m-43 13 48-7m-44 14 32-5"
              stroke="#c6a28b"
            />
            <path
              className={styles.graphite}
              d="m49 53 5-5-2 6 8-8-3 7 7-8-1 5 10-7"
              stroke="#755461"
              strokeWidth="2.4"
            />
          </g>
          <g className={styles.eraser} stroke="#663d44" strokeWidth="1.6">
            <path d="m47 47 29-28 25 11-29 29Z" fill="#ffe4af" />
            <path d="m47 47 25 12-1 10-25-12Z" fill="#e8a78a" />
            <path d="m72 59 29-29-1 10-29 29Z" fill="#e0ac67" />
            <path d="m58 36 14-14 25 12-14 14Z" fill="#fc8e69" />
            <path d="m83 48 14-14-1 10-14 14Z" fill="#c46358" />
            <path d="m65 35 9-9m-3 12 9-9" stroke="#ffe2b5" strokeWidth="1.4" />
          </g>
          <path
            className={styles.crumbs}
            d="m35 60-3 1m7 4-1 2m-11-9-2-1m12-5-2-1"
            stroke="#efac74"
            strokeWidth="2.5"
          />
        </>
      ) : (
        <>
          <g transform="rotate(7 70 48)">
            <g className={styles.paperFeed}>
              <path
                d="M48 13h42v43H48z"
                fill="#ffeadb"
                stroke="#71364d"
                strokeWidth="1.7"
              />
              <path
                d="M55 22h17m-17 5h28m-28 6h23m-23 6h28"
                stroke="#ba8189"
                strokeWidth="1.6"
              />
              <path d="M78 20h5" stroke="#a34765" strokeWidth="2" />
            </g>
            <g
              className={styles.strips}
              fill="#ffd0cb"
              stroke="#875261"
              strokeWidth="1.2"
            >
              <path d="M49 58h6l-2 21-4-2zm10 0h6l1 24-6-1zm10 0h6l-1 18-4 2zm10 0h6l3 22-6-2z" />
            </g>
            <path
              d="m34 43 9-7h53l7 7v16l-7 6H37l-3-3Z"
              fill="#a34268"
              stroke="#643149"
              strokeWidth="1.7"
            />
            <path
              d="M34 43h69l-7 7H37z"
              fill="#ffb0bf"
              stroke="#643149"
              strokeWidth="1.6"
            />
            <path d="M46 41h42" stroke="#512b44" strokeWidth="3.5" />
            <path d="M43 56h33" stroke="#ffc5d0" strokeWidth="2" />
            <circle cx="88" cy="56" r="2.4" fill="#ffd7a4" />
          </g>
          <path
            className={styles.crumbs}
            d="m25 41-5-3m8-3-2-5m80 37 5 2"
            stroke="#ec97ad"
            strokeWidth="2.4"
          />
        </>
      )}
    </svg>
  );
}

export function ReviewTitle({ action }: { action: Action }) {
  return (
    <span className={styles.title}>
      <span>
        {action === "reset" ? "Reset this " : "Delete this "}
        <em>{action === "reset" ? "draft?" : "intake?"}</em>
      </span>
      <ReviewArtwork action={action} />
    </span>
  );
}

type ReviewScope =
  | { subject: string; resetDetail: string; keptDetail: string }
  | { intake: Intake; timezone: string };

export function ReviewDetails(props: ReviewScope) {
  const receipt = "intake" in props;
  const ScopeIcon = receipt ? ReceiptText : FilePenLine;
  const RecoveryIcon = receipt ? Undo2 : BookLock;
  return (
    <>
      <section
        className={styles.paper}
        aria-label={receipt ? "Intake to delete" : "Draft to reset"}
      >
        <div className={styles.paperMain}>
          <p className={styles.paperLabel}>
            <ScopeIcon size={15} aria-hidden="true" />
            {receipt ? "Saved intake" : "Unfinished draft"}
          </p>
          <h3>{receipt ? props.intake.medicationName : props.subject}</h3>
          {receipt ? (
            <time dateTime={props.intake.takenAt}>
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: props.timezone,
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(props.intake.takenAt))}
            </time>
          ) : (
            <p>{props.resetDetail}</p>
          )}
        </div>
        {receipt && (
          <div className={styles.stub}>
            <span>Dose</span>
            <b>
              {formatDose(doseMg(props.intake))} <small>mg</small>
            </b>
          </div>
        )}
      </section>
      <div className={styles.recovery}>
        <RecoveryIcon size={18} aria-hidden="true" />
        <div>
          <strong>{receipt ? "Want it back?" : "Already saved"}</strong>
          <p>
            {receipt ? (
              <>
                Choose <b>Undo</b> in the notification to restore this dose, its
                time and any saved note.
              </>
            ) : (
              props.keptDetail
            )}
          </p>
        </div>
      </div>
    </>
  );
}

export function ReviewButton({
  action,
  children,
  ...props
}: ComponentProps<"button"> & { action: Action | "keep" }) {
  const Icon =
    action === "keep" ? CornerUpLeft : action === "reset" ? Eraser : Scissors;
  return (
    <button
      type="button"
      className={action === "keep" ? styles.keep : styles.confirm}
      {...props}
    >
      <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
      {children}
    </button>
  );
}
