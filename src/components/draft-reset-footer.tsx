"use client";

import { useContext, useRef, useState, type ReactNode } from "react";
import type { Intake } from "@/lib/domain";
import {
  ReviewTitle,
  ReviewDetails,
  ReviewButton,
} from "./entry-action-review";
import reviewStyles from "./entry-action-review.module.css";
import {
  FooterActionTile,
  FooterActionLink,
  useFooterGuide,
} from "./intake-footer-actions";
import { ResponsiveModal } from "./responsive-modal";
import { DialogResetSweep } from "./dialog-reset-sweep";
import { DialogErrorPanel } from "./dialog-error-panel";
import tools from "./intake-footer-actions.module.css";
import styles from "./draft-reset-footer.module.css";

export type IntakeDeletionActions = {
  remove: () => Promise<void>;
  afterReview: () => void;
};

export function DraftResetFooter({
  saveLabel,
  subject,
  resetDetail,
  keptDetail,
  hasDraft,
  durable,
  canReset,
  busy,
  onReset,
  prepareReset,
  onReviewChange,
  deletion,
  footnote,
}: {
  saveLabel: string;
  subject: string;
  resetDetail: string;
  keptDetail: string;
  hasDraft: boolean;
  durable: boolean;
  canReset: boolean;
  busy: boolean;
  onReset: () => void;
  prepareReset?: () => Promise<unknown>;
  onReviewChange?: (reviewing: boolean) => void;
  deletion?: IntakeDeletionActions & { intake: Intake; timezone: string };
  footnote?: ReactNode;
}) {
  const resetGuide = useFooterGuide();
  const deleteGuide = useFooterGuide();
  const [selected, setSelected] = useState<"reset" | "delete">("reset");
  const [review, setReview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const applyingRef = useRef(false);
  const confirmed = useRef(false);
  const sweep = useContext(DialogResetSweep);
  const removing = selected === "delete" && Boolean(deletion);
  const button = removing ? deleteGuide.button : resetGuide.button;
  const unavailable = busy || (!removing && !canReset);
  const resetProps = {
    action: "reset" as const,
    guide: resetGuide,
    disabled: busy || !canReset,
    reviewing: review && !removing,
    onReview: () => openReview("reset"),
  };
  const deleteProps = {
    action: "delete" as const,
    guide: deleteGuide,
    disabled: busy,
    reviewing: review && removing,
    onReview: () => openReview("delete"),
  };
  function openReview(action: "reset" | "delete") {
    if (
      busy ||
      (action === "reset" ? !canReset : !deletion) ||
      applyingRef.current
    )
      return;
    resetGuide.setState(null);
    deleteGuide.setState(null);
    setSelected(action);
    setError("");
    confirmed.current = false;
    if (action === "reset") onReviewChange?.(true);
    setReview(true);
  }
  function cancel() {
    if (applyingRef.current || confirmed.current) return;
    onReviewChange?.(false);
    setReview(false);
  }
  async function confirm() {
    if (!review || unavailable || applyingRef.current || confirmed.current)
      return;
    applyingRef.current = true;
    setApplying(true);
    try {
      if (removing && deletion) {
        await deletion.remove();
      } else {
        await prepareReset?.();
        const clear = () => {
          onReset();
          onReviewChange?.(false);
        };
        if (sweep && button.current?.isConnected) sweep.begin(clear);
        else clear();
      }
      confirmed.current = true;
      setReview(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : removing
            ? "The intake could not be deleted. Try again."
            : "The draft could not be reset. Try again.",
      );
    } finally {
      applyingRef.current = false;
      setApplying(false);
    }
  }
  return (
    <div className={styles.footer} data-draft-reset-footer>
      <div className={tools.tools} role="group" aria-label="Draft actions">
        <FooterActionTile {...resetProps} />
        {deletion && <FooterActionTile {...deleteProps} />}
      </div>
      <div className={styles.notes}>
        <p className={styles.help}>
          {hasDraft && durable
            ? "Your device kept these unfinished changes."
            : hasDraft
              ? "Your unfinished changes are here for this visit."
              : "This device keeps your unfinished changes while you edit."}{" "}
          Choose {saveLabel} to keep them, or{" "}
          <FooterActionLink {...resetProps} /> to discard them.
        </p>
        {deletion && (
          <p className={styles.help}>
            To remove the saved entry itself, choose{" "}
            <FooterActionLink {...deleteProps} />.
          </p>
        )}
        {footnote}
      </div>
      <ResponsiveModal
        showFooterNavigation={false}
        open={review}
        onOpenChange={(next) => {
          if (!next) cancel();
        }}
        onOpenChangeComplete={(open) => {
          if (!open && confirmed.current) {
            confirmed.current = false;
            if (removing) deletion?.afterReview();
            else sweep?.reveal();
          }
        }}
        returnFocus={() =>
          button.current?.disabled
            ? (button.current.form?.querySelector<HTMLElement>(
                'button[type="submit"]',
              ) ?? null)
            : button.current
        }
        surfaceClassName={
          removing
            ? `${reviewStyles.sheet} ${reviewStyles.remove}`
            : reviewStyles.sheet
        }
        role={removing ? "alertdialog" : "dialog"}
        title={<ReviewTitle action={removing ? "delete" : "reset"} />}
        description={
          removing
            ? "Remove one dose from this day’s total."
            : "Discard the edits waiting in this draft."
        }
      >
        <div
          className={reviewStyles.body}
          data-reset-review={removing ? undefined : ""}
          data-delete-review={removing ? "" : undefined}
        >
          {removing && deletion ? (
            <ReviewDetails
              intake={deletion.intake}
              timezone={deletion.timezone}
            />
          ) : (
            <ReviewDetails
              subject={subject}
              resetDetail={resetDetail}
              keptDetail={keptDetail}
            />
          )}
          {error && (
            <DialogErrorPanel
              title={
                removing
                  ? "Couldn’t delete this intake"
                  : "Couldn’t reset the draft"
              }
              message={error}
            />
          )}
          <div className={reviewStyles.buttons}>
            <ReviewButton action="keep" disabled={applying} onClick={cancel}>
              Keep editing
            </ReviewButton>
            <ReviewButton
              action={removing ? "delete" : "reset"}
              disabled={unavailable || applying}
              onClick={() => void confirm()}
            >
              {removing
                ? applying
                  ? "Deleting…"
                  : "Delete Intake"
                : applying
                  ? "Resetting…"
                  : "Reset Draft"}
            </ReviewButton>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
