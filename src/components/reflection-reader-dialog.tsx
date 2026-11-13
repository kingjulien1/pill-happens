"use client";

import { useRef, type RefObject } from "react";
import { BookOpenText, PencilLine, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReflectionMarkdown } from "@/components/reflection-markdown";
import { formatDay } from "@/lib/domain";
import closeStyles from "./dialog-close.module.css";
import styles from "./reflection-reader-dialog.module.css";

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
          <span className={styles.symbol} aria-hidden="true">
            <BookOpenText strokeWidth={1.8} />
          </span>
          <div className={styles.heading}>
            <DialogTitle ref={heading} tabIndex={-1} className={styles.title}>
              Journal page
            </DialogTitle>
            <p className={styles.date}>
              <time dateTime={day}>{formatDay(day, { year: "numeric" })}</time>
            </p>
          </div>
          <div className={styles.controls}>
            {onEdit && (
              <button
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
              </button>
            )}
            <DialogClose
              render={
                <button
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
          <DialogDescription className="sr-only">
            Read your writing. Edit returns to the writing space without
            changing this page.
          </DialogDescription>
        </header>
        <article className={styles.body} data-reflection-reader-scroll>
          <ReflectionMarkdown value={value} day={day} />
        </article>
      </DialogContent>
    </Dialog>
  );
}
