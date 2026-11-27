"use client";

import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowUpRight,
  CirclePause,
  Ellipsis,
  History,
  ListRestart,
  PencilLine,
  Repeat2,
  X,
} from "lucide-react";
import { MedicationCard } from "@/components/medication-card";
import { MedicationCardDose } from "@/components/medication-card-dose";
import { formatDose, type Medication } from "@/lib/domain";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
import { getMedicationType } from "@/lib/medication-types";
import { HoldCountdown } from "./time-lock-countdown";
import { useHoldPress } from "./use-hold-press";
import styles from "./medication-library-card.module.css";

const cardPress = { delay: 100, duration: 1000, tapWindow: 240 };

export function MedicationLibraryCard({
  medication,
  onEdit,
  onChangeRotation,
  disabled = false,
}: {
  medication: Medication;
  onEdit: () => void;
  onChangeRotation: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const card = useRef<HTMLButtonElement>(null);
  const editAction = useRef<HTMLButtonElement>(null);
  const handingOff = useRef(false);
  const pending = useRef(false);
  const [open, setOpen] = useState(false);
  function showActions() {
    if (disabled) return;
    handingOff.current = false;
    setOpen(true);
  }
  const hold = useHoldPress(disabled || open, onEdit, showActions, cardPress);
  const type = getMedicationType(medication.form);
  const ingredient = medication.activeIngredient?.trim();
  const strength = formatDose(medication.strengthMg);
  const categories = getMedicationCategories(medication);
  const quantity = medication.defaultQuantity ?? 1;
  const benched = medication.archived;
  const RotationIcon = benched ? CirclePause : Repeat2;
  const ChangeIcon = benched ? ListRestart : CirclePause;
  const label = [
    `Edit ${medication.name}`,
    `${strength} milligrams per ${type.unit}`,
    `default intake quantity ${formatDose(quantity)}`,
    type.label,
    ingredient ? `active substance ${ingredient}` : "active substance not set",
    categories.length
      ? `categories: ${categories.map((category) => getMedicationCategory(category).label).join(", ")}`
      : null,
    benched ? "Benched" : "In rotation",
  ]
    .filter(Boolean)
    .join(", ");

  // An extra 2px on each edge, independent of the card's aspect ratio.
  function measureFrame() {
    const button = card.current;
    if (!button) return;
    button.style.setProperty("--grow-x", String(1 + 4 / button.offsetWidth));
    button.style.setProperty("--grow-y", String(1 + 4 / button.offsetHeight));
  }

  async function changeRotation() {
    if (disabled || pending.current) return;
    pending.current = true;
    try {
      if (await onChangeRotation()) setOpen(false);
    } finally {
      pending.current = false;
    }
  }

  return (
    <div
      className={styles.row}
      data-press={hold.feedback ?? undefined}
      style={
        { "--charge-duration": `${hold.chargeDuration}ms` } as CSSProperties
      }
    >
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) showActions();
          else setOpen(false);
        }}
      >
        <MedicationCard
          ref={card}
          medication={medication}
          name={medication.name}
          form={medication.form}
          formPresentation="library"
          ingredient={ingredient}
          quantity={quantity}
          className={`medication-library-card ${styles.card}`}
          disabled={disabled}
          aria-label={label}
          aria-haspopup="dialog"
          data-card-entry
          data-medication-library-card={medication.id}
          data-medication-archived={benched || undefined}
          {...hold.handlers}
          onPointerDown={(event) => {
            measureFrame();
            hold.handlers.onPointerDown(event);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "ContextMenu" ||
              (event.shiftKey && event.key === "F10")
            ) {
              event.preventDefault();
              showActions();
            } else {
              if (!event.repeat && (event.key === " " || event.key === "Enter"))
                measureFrame();
              hold.handlers.onKeyDown(event);
            }
          }}
          decoration={
            hold.feedback && <span className={styles.wash} aria-hidden="true" />
          }
          artworkFeedback={
            hold.feedback && (
              <HoldCountdown
                phase={hold.feedback}
                chargeDuration={hold.chargeDuration}
                medication
              />
            )
          }
          trailing={
            <MedicationCardDose
              quantity={quantity}
              strengthMg={medication.strengthMg}
              form={medication.form}
              source="default"
            />
          }
        />
        <Popover.Trigger
          type="button"
          className={styles.trigger}
          aria-label={`Quick actions for ${medication.name}`}
          title="Quick actions"
          disabled={disabled}
        >
          <span>
            <Ellipsis aria-hidden="true" />
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            anchor={card}
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={10}
            className={styles.positioner}
          >
            <Popover.Popup
              className={styles.panel}
              initialFocus={editAction}
              finalFocus={() => (handingOff.current ? false : card.current)}
            >
              <div className={styles.panelHead}>
                <span className={styles.eyebrow}>
                  <span className={styles.signal} /> Quick actions
                </span>
                <span className={styles.status} data-benched={benched}>
                  <RotationIcon />
                  {benched ? "Benched" : "In rotation"}
                </span>
                <Popover.Close
                  className={styles.close}
                  aria-label="Close quick actions"
                >
                  <X />
                </Popover.Close>
              </div>
              <Popover.Title className={styles.name}>
                {medication.name}
              </Popover.Title>
              <Popover.Description className={styles.caption}>
                {strength} mg per {type.unit} <span aria-hidden="true">·</span>{" "}
                {formatDose(quantity)} {quantity === 1 ? type.unit : type.units}{" "}
                by default
              </Popover.Description>
              <div className={styles.tools}>
                <button
                  type="button"
                  ref={editAction}
                  disabled={disabled}
                  onClick={() => {
                    handingOff.current = true;
                    setOpen(false);
                    onEdit();
                  }}
                >
                  <PencilLine />
                  <span>Edit details</span>
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void changeRotation()}
                  className={styles.rotationAction}
                >
                  <ChangeIcon />
                  <span>{benched ? "Return to rotation" : "Bench"}</span>
                </button>
                <Link
                  href={`/medications/${encodeURIComponent(medication.id)}`}
                  onClick={() => {
                    handingOff.current = true;
                    setOpen(false);
                  }}
                >
                  <span className={styles.historyGlyph}>
                    <History />
                    <ArrowUpRight />
                  </span>
                  <span>View history</span>
                </Link>
              </div>
              <p className={styles.note}>
                {benched
                  ? "Return it to choose it again when logging an intake."
                  : "Benching hides it from new intakes and keeps every past log."}
              </p>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
