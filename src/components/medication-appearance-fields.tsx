"use client";

import { useId, useState } from "react";
import { Check, Shapes, Smile } from "lucide-react";
import { MedicationGlyph, MedicationIcon } from "@/components/medication-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEDICATION_COLORS,
  MEDICATION_ICON_NAMES,
  getMedicationColor,
  isMedicationIcon,
  type MedicationColor,
  type MedicationIconName,
} from "@/lib/medication-appearance";
import { cn } from "@/lib/utils";

const quickEmoji = ["💊", "🌿", "🌙", "☀️", "✨", "🌸", "❤️", "⭐"];
const isLucide = (value: string): value is MedicationIconName =>
  MEDICATION_ICON_NAMES.some((name) => name === value);
const iconLabel = (name: string) =>
  name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function checkColor(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.18 ? "#120f17" : "#fff1d6";
}

export function MedicationAppearanceFields({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: MedicationColor;
  icon: string;
  onColorChange: (value: MedicationColor) => void;
  onIconChange: (value: string) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<"lucide" | "emoji">(
    isLucide(icon) ? "lucide" : "emoji",
  );
  const [lastLucide, setLastLucide] = useState<MedicationIconName>(
    isLucide(icon) ? icon : "pill",
  );
  const [emoji, setEmoji] = useState(isLucide(icon) ? "💊" : icon);
  const selectedColor = getMedicationColor(color);
  const invalidEmoji = mode === "emoji" && !isMedicationIcon(icon);

  return (
    <div className="space-y-4" data-medication-appearance>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">
          A little color
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            / {selectedColor.label}
          </span>
        </legend>
        <div className="grid w-full max-w-[284px] grid-cols-8 gap-1">
          {MEDICATION_COLORS.map((item) => (
            <div key={item.value} className="relative min-w-0">
              <input
                type="radio"
                id={`${id}-color-${item.value}`}
                name={`${id}-color`}
                value={item.value}
                checked={color === item.value}
                onChange={() => onColorChange(item.value)}
                aria-label={`${item.label} medication color`}
                data-medication-color={item.value}
                className="peer sr-only"
              />
              <label
                htmlFor={`${id}-color-${item.value}`}
                title={item.label}
                className={cn(
                  "flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border border-transparent transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:pointer-events-none peer-disabled:opacity-40",
                  color === item.value && "border-primary/50 bg-primary/5",
                )}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full border border-black/10"
                  style={{
                    backgroundColor: item.hex,
                    color: checkColor(item.hex),
                  }}
                >
                  {color === item.value && (
                    <Check
                      className="size-3"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="sr-only">Medication icon</legend>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Icon source"
            className="inline-flex rounded-lg border border-border p-0.5"
          >
            {(["lucide", "emoji"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  onIconChange(value === "lucide" ? lastLucide : emoji);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors disabled:opacity-40",
                  mode === value && "bg-accent font-medium text-foreground",
                )}
              >
                {value === "lucide" ? (
                  <Shapes
                    className="size-3.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                ) : (
                  <Smile
                    className="size-3.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                )}
                {value === "lucide" ? "Icons" : "Emoji"}
              </button>
            ))}
          </div>
          <MedicationIcon
            color={color}
            icon={icon}
            small
            className="size-8 rounded-lg"
          />
        </div>

        {mode === "lucide" ? (
          <div className="grid w-full max-w-[284px] grid-cols-8 gap-1">
            {MEDICATION_ICON_NAMES.map((name) => (
              <div key={name} className="relative min-w-0">
                <input
                  type="radio"
                  id={`${id}-icon-${name}`}
                  name={`${id}-icon`}
                  value={name}
                  checked={icon === name}
                  onChange={() => {
                    setLastLucide(name);
                    onIconChange(name);
                  }}
                  aria-label={`${iconLabel(name)} medication icon`}
                  data-medication-icon={name}
                  className="peer sr-only"
                />
                <label
                  htmlFor={`${id}-icon-${name}`}
                  title={iconLabel(name)}
                  className={cn(
                    "flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:pointer-events-none peer-disabled:opacity-40",
                    icon === name &&
                      "border-primary/50 bg-accent text-foreground",
                  )}
                >
                  <MedicationGlyph icon={name} className="size-5" />
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`${id}-emoji`} className="sr-only">
              Emoji
            </Label>
            <Input
              id={`${id}-emoji`}
              value={icon}
              onChange={(event) => {
                setEmoji(event.target.value);
                onIconChange(event.target.value);
              }}
              placeholder="💊"
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={invalidEmoji || undefined}
              aria-describedby={`${id}-emoji-help`}
              className="h-11 rounded-xl px-3 text-base md:text-base"
            />
            <div
              className="grid w-full max-w-[284px] grid-cols-8 gap-1"
              aria-label="Suggested emoji"
            >
              {quickEmoji.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Use ${value} emoji`}
                  aria-pressed={icon === value}
                  onClick={() => {
                    setEmoji(value);
                    onIconChange(value);
                  }}
                  className={cn(
                    "flex aspect-square w-full items-center justify-center rounded-lg border border-transparent text-xl disabled:opacity-40",
                    icon === value
                      ? "border-primary/50 bg-accent"
                      : "hover:bg-muted",
                  )}
                >
                  <span aria-hidden="true">{value}</span>
                </button>
              ))}
            </div>
            <p
              id={`${id}-emoji-help`}
              className={cn(
                "text-[11px] leading-relaxed",
                invalidEmoji ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {invalidEmoji
                ? "Enter one emoji, such as 💊 or 🌿."
                : "Choose an emoji or enter one from your keyboard."}
            </p>
          </div>
        )}
      </fieldset>
    </div>
  );
}
