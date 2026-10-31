"use client";

import { useRef, useState } from "react";
import { ScribbleLoopIcon } from "@phosphor-icons/react/dist/ssr/ScribbleLoop";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { ShootingStarIcon } from "@phosphor-icons/react/dist/ssr/ShootingStar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAILY_REFLECTION_MAX_LENGTH } from "@/lib/daily-check-in";
import styles from "./daily-reflection-editor.module.css";

const prompts = [
  {
    id: "moment",
    label: "A Moment",
    question: "What is one moment from today you want to remember?",
    icon: CameraIcon,
  },
  {
    id: "feeling",
    label: "A Feeling",
    question: "What was on your mind, and how did it feel?",
    icon: HeartIcon,
  },
  {
    id: "win",
    label: "A Small Win",
    question: "What went a little better, however small?",
    icon: ShootingStarIcon,
  },
] as const;
const numberFormat = new Intl.NumberFormat("en-GB");

/** Prompts offer a starting point without adding to or replacing the journal. */
export function DailyReflectionEditor({
  id,
  value,
  onChange,
  disabled,
  selectedPrompt: controlledPrompt,
  onPromptChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  selectedPrompt?: string | null;
  onPromptChange?: (value: string | null) => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [internalPrompt, setInternalPrompt] = useState<string | null>(null);
  const prompt =
    controlledPrompt === undefined ? internalPrompt : controlledPrompt;
  const setPrompt = onPromptChange ?? setInternalPrompt;
  const selectedPrompt = prompts.find((item) => item.id === prompt);
  const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
  const remaining = DAILY_REFLECTION_MAX_LENGTH - value.length;

  return (
    <section className={styles.editor} aria-label="Evening Journal">
      <div className={styles.headingRow}>
        <Label htmlFor={id} className={styles.heading}>
          <span className={styles.headingIcon} aria-hidden="true">
            <ScribbleLoopIcon size={23} weight="bold" />
          </span>
          <span>Your Day, Your Words</span>
        </Label>
        <span className={styles.optional}>Optional</span>
      </div>
      <p className={styles.introduction} id={`${id}-hint`}>
        A few lines or a whole page. Make room for what mattered.
      </p>
      <div className={styles.page} data-journal-page>
        <Textarea
          ref={input}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={DAILY_REFLECTION_MAX_LENGTH}
          rows={8}
          placeholder={
            "Start anywhere…\nWhat happened, how you felt, or what you want to remember."
          }
          className={styles.writingArea}
          spellCheck
          autoCapitalize="sentences"
          disabled={disabled}
          aria-describedby={`${id}-hint ${id}-count ${id}-prompt`}
          data-journal-input
        />
        <div className={styles.pageFooter}>
          <span data-journal-words>
            <strong>{numberFormat.format(wordCount)}</strong>{" "}
            {wordCount === 1 ? "word" : "words"}
          </span>
          <span
            id={`${id}-count`}
            className={styles.characterCount}
            data-near-limit={remaining <= 200}
            data-journal-count
          >
            <strong>{numberFormat.format(value.length)}</strong>
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>
            {numberFormat.format(DAILY_REFLECTION_MAX_LENGTH)} characters
          </span>
        </div>
      </div>
      <div
        className={styles.prompts}
        role="group"
        aria-label="Optional Writing Prompts"
      >
        {prompts.map(({ id: promptId, label, icon: Icon }) => (
          <button
            key={promptId}
            type="button"
            disabled={disabled}
            aria-pressed={prompt === promptId}
            className={styles.prompt}
            onClick={() => {
              setPrompt(promptId);
              input.current?.focus({ preventScroll: true });
            }}
          >
            <Icon size={13} weight="bold" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <p className={styles.promptHint} id={`${id}-prompt`} aria-live="polite">
        {selectedPrompt?.question ?? "Stuck for a start? Pick a prompt."}
      </p>
      <span className="sr-only" role="status">
        {remaining === 0
          ? "Character limit reached. You can edit or shorten your entry."
          : ""}
      </span>
    </section>
  );
}
