"use client";

import { useContext, useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowRight,
  BrushCleaning,
  FilePenLine,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ResponsiveModal } from "./responsive-modal";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import { DialogResetSweep } from "./dialog-reset-sweep";
import { DialogErrorPanel } from "./dialog-error-panel";
import tools from "./intake-footer-actions.module.css";
import styles from "./draft-reset-footer.module.css";

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
  children,
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
  children?: ReactNode;
  footnote?: ReactNode;
}) {
  const [guide, setGuide] = useState<"open" | "closing" | null>(null);
  const [review, setReview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const applyingRef = useRef(false);
  const confirmed = useRef(false);
  const sweep = useContext(DialogResetSweep);
  const id = useId();
  const unavailable = busy || !canReset;
  function openReview() {
    if (unavailable || applyingRef.current) return;
    setGuide(null);
    setError("");
    confirmed.current = false;
    onReviewChange?.(true);
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
      await prepareReset?.();
      confirmed.current = true;
      const clear = () => {
        onReset();
        onReviewChange?.(false);
      };
      if (sweep && button.current?.isConnected) sweep.begin(clear);
      else clear();
      setReview(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
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
        <button
          ref={button}
          type="button"
          className={tools.tool}
          data-tone="reset"
          data-reset-tool=""
          data-guidance={guide ?? undefined}
          disabled={unavailable}
          aria-haspopup="dialog"
          aria-expanded={review}
          aria-describedby={guide === "open" ? id : undefined}
          onClick={openReview}
        >
          <span className={`${tools.tile} ${styles.tile}`}>
            <BrushCleaning
              className={styles.brush}
              size={19}
              strokeWidth={2.1}
              aria-hidden="true"
            />
            <Sparkles className={styles.glint} size={11} aria-hidden="true" />
          </span>
          Reset Draft
        </button>
        {children}
      </div>
      <div className={styles.notes}>
        <Popover.Root
          open={guide === "open" && !unavailable}
          onOpenChange={(next) => setGuide(next ? "open" : "closing")}
          onOpenChangeComplete={(open) => {
            if (!open)
              setGuide((current) => (current === "closing" ? null : current));
          }}
        >
          <p className={styles.help}>
            {hasDraft && durable
              ? "Your device kept these unfinished changes."
              : hasDraft
                ? "Your unfinished changes are here for this visit."
                : "This device keeps your unfinished changes while you edit."}{" "}
            Choose {saveLabel} to keep them, or{" "}
            <Popover.Trigger
              type="button"
              disabled={unavailable}
              className={styles.inlineLink}
            >
              Reset Draft
            </Popover.Trigger>{" "}
            to discard them.
          </p>
          <Popover.Portal>
            <Popover.Positioner
              anchor={button}
              side="top"
              sideOffset={10}
              collisionPadding={12}
              className={styles.positioner}
            >
              <Popover.Popup
                className={styles.tip}
                aria-label="Reset Draft help"
                finalFocus={review ? false : undefined}
              >
                <Popover.Title>
                  <BrushCleaning size={16} aria-hidden="true" /> Reset Draft
                </Popover.Title>
                <Popover.Close
                  type="button"
                  className={styles.tipClose}
                  aria-label="Close reset help"
                >
                  <X size={14} />
                </Popover.Close>
                <Popover.Description id={id}>
                  Review what will be cleared before you decide.
                </Popover.Description>
                <button
                  type="button"
                  className={styles.reviewLink}
                  onClick={openReview}
                >
                  Review reset <ArrowRight size={13} />
                </button>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        {footnote}
      </div>
      <ResponsiveModal
        open={review}
        onOpenChange={(next) => {
          if (!next) cancel();
        }}
        onOpenChangeComplete={(open) => {
          if (!open && confirmed.current) {
            confirmed.current = false;
            sweep?.reveal();
          }
        }}
        returnFocus={() =>
          button.current?.disabled
            ? (button.current.form?.querySelector<HTMLElement>(
                'button[type="submit"]',
              ) ?? null)
            : button.current
        }
        surfaceClassName={styles.sheet}
        title="Reset this draft?"
        context={
          <JournalDialogSubheading
            title="Draft review"
            detail="On this device"
          />
        }
        headerVariant="check-in"
        description="Take one last look before clearing your unfinished changes."
      >
        <div className={styles.sheetBody} data-reset-review>
          <section className={styles.scope}>
            <div>
              <FilePenLine />
              <span>
                <small>Draft to reset</small>
                <strong>{subject}</strong>
                <p>{resetDetail}</p>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <small>Kept in your journal</small>
                <p>{keptDetail}</p>
              </span>
            </div>
          </section>
          {error && (
            <DialogErrorPanel
              title="Couldn’t reset the draft"
              message={error}
            />
          )}
          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.confirm}
              disabled={unavailable || applying}
              onClick={() => void confirm()}
            >
              <BrushCleaning size={17} />
              {applying ? "Resetting…" : "Reset Draft"}
            </button>
            <button type="button" disabled={applying} onClick={cancel}>
              Keep editing
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
