"use client";

import { useId, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileImage,
  Fingerprint,
  Images,
  ListChecks,
} from "lucide-react";
import { JournalDialogSubheading } from "./journal-dialog-subheading";
import { ResponsiveModal } from "./responsive-modal";
import { SquareArrowDownExit } from "./square-arrow-down-exit-icon";
import { Button } from "./ui/button";
import styles from "./sleep-cycle-export-help.module.css";

const reportParts = [
  ["The score & graph", "The top of the portrait report."],
  ["Every sleep stage", "Awake, Light, Dream and Deep."],
  ["Times & metric tiles", "Bed, wake, Asleep after and the remaining tiles."],
  ["The bottom of the image", "Keep the Sleep Cycle logo in frame, too."],
] as const;

export function SleepCycleExportHelp({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const id = useId();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Skip the screenshot séance."
      headerVariant="check-in"
      context={
        <JournalDialogSubheading
          title="One whole night"
          detail="One intact image"
        />
      }
      description="Sleep Cycle can share a complete portrait report, already arranged for you. Copy it for the quickest import, or save the image for later—no stitching, cropping or midnight arts and crafts."
      returnFocus={returnFocus}
    >
      <div className={styles.guide} data-sleep-export-guide>
        <section
          className={styles.report}
          aria-labelledby={`${id}-report-title`}
        >
          <div className={styles.sectionHeading}>
            <h3 id={`${id}-report-title`}>
              <FileImage size={17} aria-hidden="true" />
              The right receipt
            </h3>
            <span>Full portrait image</span>
          </div>
          <ul className={styles.checklist}>
            {reportParts.map(([label, detail]) => (
              <li key={label}>
                <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <ol className={styles.steps} aria-label="Export a Sleep Cycle report">
          <li>
            <span className={styles.stepNumber} aria-hidden="true">
              01
            </span>
            <div>
              <h3>Open the night</h3>
              <p>
                In Sleep Cycle’s Journal, choose the night you want to bring in.
                Check that it matches the day of your morning check-in.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">
              02
            </span>
            <div>
              <h3>Share the full report</h3>
              <p>
                Choose the portrait report image with the score, graph, stages
                and metric tiles. Keep the original layout and both ends of the
                image.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">
              03
            </span>
            <div>
              <h3>Pick your hand-off</h3>
              <div className={styles.methods}>
                <div>
                  <SquareArrowDownExit size={17} aria-hidden="true" />
                  <strong>Copy Image</strong>
                  <p>
                    Return here and tap <b>Paste Report.</b> Allow Paste if your
                    browser asks.
                  </p>
                </div>
                <div>
                  <Images size={17} aria-hidden="true" />
                  <strong>Save Image</strong>
                  <p>
                    Return here and tap <b>Bring Receipts.</b> Choose your saved
                    image.
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ol>

        <section
          className={styles.review}
          aria-labelledby={`${id}-review-title`}
        >
          <h3 id={`${id}-review-title`}>
            <ListChecks size={17} aria-hidden="true" />
            Check the night. Then the numbers.
          </h3>
          <p>
            You’ll see the readings before anything changes. Only the values you
            approve replace matching draft fields; everything else stays as
            entered. You can still edit them before{" "}
            <strong>Save Check-In.</strong>
          </p>
          <p className={styles.recovery}>
            Clipboard empty or Paste blocked? Save the image in Sleep Cycle and
            use <strong>Bring Receipts</strong> instead.
          </p>
        </section>

        <footer className={styles.footer}>
          <p className={styles.local}>
            <Fingerprint size={14} aria-hidden="true" />
            Image reading happens on this device.
          </p>
          <p>
            Sharing menu names can vary by Sleep Cycle version. Use the image
            option; a CSV or a cropped graph won’t contain the complete report.
          </p>
          <nav className={styles.links} aria-label="Sleep report references">
            <a href="/guide#daily-log" target="_blank" rel="noreferrer">
              App guide
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
            <a
              href="https://support.sleepcycle.com/"
              target="_blank"
              rel="noreferrer"
            >
              Sleep Cycle help
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </nav>
          <Button
            type="button"
            variant="ghost"
            className={styles.returnButton}
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to my night
          </Button>
        </footer>
      </div>
    </ResponsiveModal>
  );
}
