"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { WHAT_HELPED_MAX_LENGTH } from "@/lib/daily-check-in";
import {
  serializeReminders,
  type ReminderItem,
} from "@/lib/check-in-reminders";
import styles from "./small-reminders.module.css";

type RemovedReminder = { item: ReminderItem; index: number; nextId?: string };
const LIMIT_MESSAGE = "This list is full. Shorten a reminder to make room.";

function ReminderInput({
  item,
  index,
  maxLength,
  disabled,
  register,
  onEdit,
  onSplit,
  onMerge,
  onMove,
  onPaste,
}: {
  item: ReminderItem;
  index: number;
  maxLength: number;
  disabled: boolean;
  register: (id: string, element: HTMLTextAreaElement | null) => void;
  onEdit: (id: string, text: string) => void;
  onSplit: (index: number, start: number, end: number) => void;
  onMerge: (index: number) => void;
  onMove: (index: number, direction: number) => void;
  onPaste: (index: number, text: string, start: number, end: number) => boolean;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [item.text]);
  return (
    <textarea
      ref={(element) => {
        field.current = element;
        register(item.id, element);
      }}
      className={styles.input}
      rows={1}
      value={item.text.replace(/\r/g, "")}
      maxLength={maxLength}
      disabled={disabled}
      aria-label={`Reminder ${index + 1}`}
      placeholder={
        index
          ? "What else helped—and how?"
          : "A ten-minute walk cleared my head…"
      }
      enterKeyHint="next"
      onChange={(event) => onEdit(item.id, event.target.value)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
          return;
        const field = event.currentTarget;
        if (event.key === "Enter") {
          event.preventDefault();
          onSplit(index, field.selectionStart, field.selectionEnd);
        } else if (
          event.key === "Backspace" &&
          field.selectionStart === 0 &&
          field.selectionEnd === 0 &&
          index > 0
        ) {
          event.preventDefault();
          onMerge(index);
        } else if (
          event.altKey &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault();
          onMove(index, event.key === "ArrowUp" ? -1 : 1);
        }
      }}
      onPaste={(event) => {
        const text = event.clipboardData.getData("text");
        if (!/[\r\n]/.test(text)) return;
        event.preventDefault();
        onPaste(
          index,
          text,
          event.currentTarget.selectionStart,
          event.currentTarget.selectionEnd,
        );
      }}
    />
  );
}

export function SmallReminders({
  items,
  onChange,
  disabled,
  id,
}: {
  items: ReminderItem[];
  onChange: (items: ReminderItem[]) => void;
  disabled: boolean;
  id: string;
}) {
  const empty = { id: `${id}-first`, text: "" };
  const rows = items.length ? items : [empty];
  const text = serializeReminders(items);
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const list = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const pendingFocus = useRef<{ id: string; cursor?: number } | null>(null);
  const expected = useRef(text);
  const [removed, setRemoved] = useState<RemovedReminder | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const form = list.current?.closest("form");
    const reset = () => {
      setRemoved(null);
      setAnnouncement("");
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  useLayoutEffect(() => {
    if (expected.current !== text) {
      // A reset or another tab replaced the draft. Undo belongs to the previous list.
      setRemoved(null);
      setAnnouncement("");
      expected.current = text;
    }
    const target = pendingFocus.current;
    if (target) {
      const element = fields.current.get(target.id);
      if (element) {
        element.focus({ preventScroll: true });
        element.setSelectionRange(
          target.cursor ?? element.value.length,
          target.cursor ?? element.value.length,
        );
        element.scrollIntoView({ block: "nearest", behavior: "instant" });
        pendingFocus.current = null;
      }
    }
    const previous = positions.current;
    const next = new Map<string, number>();
    for (const row of list.current?.querySelectorAll<HTMLElement>(
      "[data-reminder-row]",
    ) ?? []) {
      const key = row.dataset.reminderRow!;
      const top = row.offsetTop;
      next.set(key, top);
      const before = previous.get(key);
      if (
        before !== undefined &&
        Math.abs(before - top) > 1 &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        row.animate(
          [
            { transform: `translateY(${before - top}px)` },
            { transform: "none" },
          ],
          {
            duration: 270,
            easing: "cubic-bezier(.2,.85,.25,1)",
          },
        );
      }
    }
    positions.current = next;
  }, [items, text]);

  function commit(
    next: ReminderItem[],
    focus?: { id: string; cursor?: number },
  ) {
    if (disabled) return false;
    if (serializeReminders(next).length > WHAT_HELPED_MAX_LENGTH) {
      setAnnouncement(LIMIT_MESSAGE);
      return false;
    }
    expected.current = serializeReminders(next);
    pendingFocus.current = focus ?? null;
    setAnnouncement("");
    onChange(next);
    return true;
  }

  function add() {
    const blank = rows.find((item) => !item.text.trim());
    if (blank) {
      fields.current.get(blank.id)?.focus();
      return;
    }
    const item = { id: crypto.randomUUID(), text: "" };
    if (commit([...rows, item], { id: item.id }))
      setAnnouncement("New reminder ready.");
  }

  function split(index: number, start: number, end: number) {
    const item = rows[index];
    const currentText = item.text.replace(/\r/g, "");
    if (!currentText.trim()) return;
    const added = { id: crypto.randomUUID(), text: currentText.slice(end) };
    const next = [...rows];
    next.splice(
      index,
      1,
      { ...item, text: currentText.slice(0, start) },
      added,
    );
    commit(next, { id: added.id, cursor: 0 });
  }

  function pasteLines(at: number, pasted: string, start: number, end: number) {
    const current = rows[at];
    const currentText = current.text.replace(/\r/g, "");
    const lines = pasted.replace(/\r\n?/g, "\n").split("\n");
    const tail = currentText.slice(end);
    const inserted = lines.map((line, i) => ({
      id: i ? crypto.randomUUID() : current.id,
      text:
        (i === 0 ? currentText.slice(0, start) : "") +
        line +
        (i === lines.length - 1 ? tail : ""),
    }));
    const next = [...rows];
    next.splice(at, 1, ...inserted);
    const last = inserted[inserted.length - 1];
    return commit(next, {
      id: last.id,
      cursor: last.text.length - tail.length,
    });
  }

  function move(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    const item = rows[index];
    const cursor = fields.current.get(item.id)?.selectionStart;
    if (commit(next, { id: item.id, cursor }))
      setAnnouncement(`Reminder moved to position ${target + 1}.`);
  }

  function remove(index: number) {
    const item = rows[index];
    const next = rows.filter((row) => row.id !== item.id);
    const focus = next[Math.min(index, next.length - 1)] ?? empty;
    if (commit(next, { id: focus.id })) {
      setRemoved({ item, index, nextId: rows[index + 1]?.id });
      setAnnouncement("Reminder removed. Undo is available below the list.");
    }
  }

  function undo() {
    if (!removed || items.some((row) => row.id === removed.item.id)) return;
    const next = [...items];
    const neighbor = next.findIndex((row) => row.id === removed.nextId);
    next.splice(
      neighbor < 0 ? Math.min(removed.index, next.length) : neighbor,
      0,
      removed.item,
    );
    if (commit(next, { id: removed.item.id })) {
      setRemoved(null);
      setAnnouncement("Reminder restored.");
    }
  }

  return (
    <div
      className={styles.editor}
      role="group"
      aria-labelledby={`${id}-heading`}
      data-check-in-section="helped"
    >
      <p className={styles.hint}>
        Name the thing and why it helped: a walk, a person, a meal, a boundary.
        Future you may need the recipe when memory becomes an unreliable
        witness.
      </p>
      <ol className={styles.list} ref={list} aria-label="Small reminders">
        {rows.map((item, index) => (
          <li key={item.id} className={styles.row} data-reminder-row={item.id}>
            <span className={styles.marker} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <ReminderInput
              item={item}
              index={index}
              disabled={disabled}
              maxLength={Math.max(
                0,
                WHAT_HELPED_MAX_LENGTH - (text.length - item.text.length),
              )}
              register={(key, element) => {
                if (element) fields.current.set(key, element);
                else fields.current.delete(key);
              }}
              onEdit={(key, content) => {
                const at = rows.findIndex((row) => row.id === key);
                if (content.includes("\n"))
                  pasteLines(at, content, 0, rows[at].text.length);
                else
                  commit(
                    rows.map((row) =>
                      row.id === key ? { ...row, text: content } : row,
                    ),
                  );
              }}
              onSplit={split}
              onMove={move}
              onMerge={(at) => {
                const previous = rows[at - 1];
                const next = [...rows];
                next.splice(at - 1, 2, {
                  ...previous,
                  text: previous.text + rows[at].text,
                });
                commit(next, { id: previous.id, cursor: previous.text.length });
              }}
              onPaste={pasteLines}
            />
            <Menu.Root modal={false}>
              <Menu.Trigger
                disabled={disabled}
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                  />
                }
                className={styles.more}
                aria-label={`Options for reminder ${index + 1}`}
              >
                <MoreHorizontal size={17} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  className={styles.positioner}
                  align="end"
                  sideOffset={7}
                  collisionPadding={12}
                >
                  <Menu.Popup
                    className={styles.menu}
                    aria-label={`Reminder ${index + 1} options`}
                  >
                    <Menu.Item
                      className={styles.menuItem}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={14} />
                      Move Up
                    </Menu.Item>
                    <Menu.Item
                      className={styles.menuItem}
                      disabled={disabled || index === rows.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={14} />
                      Move Down
                    </Menu.Item>
                    <Menu.Separator className={styles.menuSeparator} />
                    <Menu.Item
                      className={styles.menuItem}
                      disabled={disabled || items.length === 0}
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={14} />
                      Remove
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || text.length >= WHAT_HELPED_MAX_LENGTH}
          onClick={add}
          className={styles.add}
        >
          <Plus size={14} />
          Add a Reminder
        </Button>
        <span className={styles.keyboardHint}>
          <CornerDownLeft size={11} />
          Enter adds the next
        </span>
      </div>
      {removed && (
        <div className={styles.undo}>
          <span>One less thing on the list.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={undo}
          >
            <Undo2 size={13} />
            Undo Remove
          </Button>
        </div>
      )}
      <div className={styles.footer}>
        <span>
          <Sparkles size={11} />
          Save Check-In keeps your list with today.
        </span>
        <span>
          <strong>{text.length}</strong> / {WHAT_HELPED_MAX_LENGTH}
        </span>
      </div>
      <p
        className={announcement === LIMIT_MESSAGE ? styles.notice : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {announcement}
      </p>
    </div>
  );
}
