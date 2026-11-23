"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Check, PencilLine, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReflectionMarkdown } from "@/components/reflection-markdown";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { JournalDialogSubheading } from "@/components/journal-dialog-subheading";
import { reflectionStats } from "@/lib/reflection-writing";
import { formatDay } from "@/lib/domain";
import closeStyles from "./dialog-close.module.css";
import styles from "./reflection-reader-dialog.module.css";
import { Button } from "@/components/ui/button";

/** Reading changes no draft; editing resumes only after this dialog has closed. */
export function ReflectionReaderDialog({
  open,
  onOpenChange,
  value,
  day,
  onEdit,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  day: string;
  onEdit?: () => void;
  returnFocus?: RefObject<HTMLElement | null> | (() => HTMLElement | null);
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingEdit = useRef<(() => void) | null>(null);
  const stats = useMemo(() => reflectionStats(value), [value]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) pendingEdit.current = null;
        onOpenChange(next);
      }}
      onOpenChangeComplete={(next) => {
        if (next) return;
        const edit = pendingEdit.current;
        pendingEdit.current = null;
        edit?.();
      }}
    >
      <DialogContent
        className={styles.dialog}
        showCloseButton={false}
        initialFocus={heading}
        finalFocus={returnFocus}
        data-reflection-reader
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <DialogTitle ref={heading} tabIndex={-1} className={styles.title}>
              Your Journal.
            </DialogTitle>
          </div>
          <div className={styles.controls}>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className={`${closeStyles.control} ${styles.control}`}
                aria-label="Edit entry"
                title="Edit entry"
                data-reader-edit
                onClick={() => {
                  pendingEdit.current = onEdit;
                  onOpenChange(false);
                }}
              >
                <PencilLine aria-hidden="true" strokeWidth={2.2} />
              </Button>
            )}
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className={`${closeStyles.control} ${styles.control}`}
                />
              }
              aria-label="Close reading view"
              title="Close reading view"
              data-reader-close
            >
              <X aria-hidden="true" strokeWidth={2.2} />
            </DialogClose>
          </div>
          <p className={styles.date}>
            <JournalDialogSubheading
              title={
                <time dateTime={day}>
                  {formatDay(day, { month: undefined, day: undefined })}
                </time>
              }
              detail={formatDay(day, { weekday: undefined, year: "numeric" })}
            />
          </p>
          <DialogDescription className={styles.description}>
            {onEdit
              ? "Your saved page, with room to read. Use the pencil to open its check-in and continue writing."
              : "Your saved journal page, formatted for reading."}
          </DialogDescription>
        </header>
        <article className={styles.body} data-reflection-reader-scroll>
          <ReflectionMarkdown value={value} day={day} />
        </article>
        <footer className={styles.footer} data-dialog-fade-footer>
          <div className={styles.stats} aria-label="Reading statistics">
            <span>
              <strong>{stats.words.toLocaleString("en-GB")}</strong>{" "}
              {stats.words === 1 ? "word" : "words"}
            </span>
            <span>
              {stats.readingMinutes ? `~${stats.readingMinutes}` : "0"} min read
            </span>
          </div>
          <DialogPrimaryButton
            type="button"
            className={styles.returnButton}
            onClick={() => onOpenChange(false)}
            leadingIcon={<Check strokeWidth={2.5} aria-hidden="true" />}
          >
            Done Reading
          </DialogPrimaryButton>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
