"use client";

import { useRef, type RefObject } from "react";
import { BookOpenText, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import closeStyles from "./dialog-close.module.css";
import styles from "./reflection-writing-help.module.css";

const examples = [
  ["Heading", "## A small win"],
  ["Bold & italic", "**bold** · *gentle*"],
  ["Strikethrough", "~~let it go~~"],
  ["Lists", "- One thing\n1. The next thing"],
  ["Checklist", "- [ ] A little task\n- [x] All done"],
  ["Quote", "> A thought to keep"],
  ["Link", "[A good read](https://example.com)"],
  ["Kit links", "@name · @ingredient · @category"],
  ["Days & weeks", "/Today · /Yesterday · /ThisWeek"],
  ["Journal pages", "/Today.Morning · /Yesterday.Evening"],
  ["Code & divider", "`a tiny detail` · ---"],
] as const;

/** A nested reference dialog; opening it never changes the writing draft. */
export function ReflectionWritingHelp({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.dialog}
        showCloseButton={false}
        initialFocus={heading}
        finalFocus={returnFocus}
        data-writing-help
      >
        <header className={styles.header}>
          <span className={styles.symbol} aria-hidden="true">
            <BookOpenText strokeWidth={1.8} />
          </span>
          <div className={styles.heading}>
            <DialogTitle ref={heading} tabIndex={-1} className={styles.title}>
              A little writing help
            </DialogTitle>
            <DialogDescription className={styles.description}>
              Tiny marks, a little more expression.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <button
                type="button"
                className={`${closeStyles.control} ${styles.close}`}
                data-dialog-corner="control"
              />
            }
            aria-label="Close writing help"
            title="Close writing help"
          >
            <X aria-hidden="true" strokeWidth={2.2} />
          </DialogClose>
        </header>

        <div className={styles.body} data-writing-help-scroll>
          <p className={styles.intro}>
            Select some text, then choose a format. Or type these Markdown marks
            as you go.
          </p>

          <dl className={styles.examples} aria-label="Markdown examples">
            {examples.map(([label, example]) => (
              <div key={label} className={styles.example}>
                <dt>{label}</dt>
                <dd>
                  <code>{example}</code>
                </dd>
              </div>
            ))}
          </dl>

          <ul className={styles.tips} aria-label="Writing tips">
            <li>
              Type <code>@</code> for a medication, active ingredient or
              category. Use <code>/</code> for a day, week or journal. Pause for
              0.8 seconds to see suggestions from your saved journal; no search
              request is sent. A space immediately after either trigger leaves
              it as ordinary text.
            </li>
            <li>
              Use Up and Down to browse, then <strong>Enter</strong> or{" "}
              <strong>Tab</strong> to insert. The small arrow beside a
              medication reveals today’s intakes; beside a day, it reveals saved
              Morning and Evening writing. Right opens these choices, Left goes
              back, and <strong>Escape</strong> dismisses suggestions.
            </li>
            <li>
              Dates accept <code>/2026-11-09</code> or <code>/09.11.2026</code>.
              Try <code>/ThisWeek</code>, <code>/LastWeek</code> or{" "}
              <code>/2026-W46</code> for a whole week. Relative dates become
              fixed dates when you insert them, so your links keep their
              meaning.
            </li>
            <li>
              You can also type an exact known name or date without choosing a
              suggestion. Preview and Read turn recognized references into
              compact links; ambiguous names stay as text. Use a medication’s
              strength to distinguish duplicate names.
            </li>
            <li>Start headings, lists, quotes, and dividers on a new line.</li>
            <li>
              Switch between <strong>Write</strong> and <strong>Preview</strong>{" "}
              to see your formatting. Your words stay put.
            </li>
            <li>
              Use a full <code>https://</code> address for links you trust.
            </li>
            <li>
              Writing saves separately from completing your check-in.{" "}
              <strong>Download</strong> keeps a <code>.md</code> copy.
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
