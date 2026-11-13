"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { SwatchesIcon } from "@phosphor-icons/react/dist/ssr/Swatches";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ActionIcon } from "@/components/action-icon";
import { usePersistentDraft } from "@/components/journal-drafts";
import { ResponsiveModal } from "@/components/responsive-modal";
import { GuideColorInspector } from "@/components/guide-color-inspector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GUIDE_COLOR_FAMILIES,
  GUIDE_BRAND_COLORS,
  GUIDE_HARMONY_COLORS,
  GUIDE_FEATURED_ROLES,
  GUIDE_MEDICATION_COLORS,
  GUIDE_THEME_CSS,
  GUIDE_THEME_GROUPS,
  GUIDE_THEME_JSON,
  GUIDE_THEME_ROLES,
  guideColorDetails,
  guidePreviewInk,
  guideRole,
  type GuideThemeMode,
  type GuideThemeRole,
} from "@/lib/guide-colors";
import styles from "./guide-colors.module.css";

const MODES = ["light", "dark"] as const;

type ColorInspectionPreferences = {
  query: string;
  family: string;
  format: "hex" | "rgb";
  modes: Partial<Record<string, GuideThemeMode>>;
  inspectionId: string | null;
};

function isColorInspectionPreferences(
  value: unknown,
): value is ColorInspectionPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const preferences = value as Record<string, unknown>;
  return (
    typeof preferences.query === "string" &&
    preferences.query.length <= 200 &&
    typeof preferences.family === "string" &&
    (preferences.family === "all" ||
      GUIDE_COLOR_FAMILIES.includes(preferences.family)) &&
    (preferences.format === "hex" || preferences.format === "rgb") &&
    (preferences.inspectionId === null ||
      (typeof preferences.inspectionId === "string" &&
        Boolean(guideRole(preferences.inspectionId)))) &&
    Boolean(preferences.modes) &&
    typeof preferences.modes === "object" &&
    !Array.isArray(preferences.modes) &&
    Object.entries(preferences.modes as object).length <=
      GUIDE_THEME_ROLES.length &&
    Object.entries(preferences.modes as object).every(
      ([id, mode]) => guideRole(id) && (mode === "light" || mode === "dark"),
    )
  );
}

function ColorPreview({
  role,
  mode,
}: {
  role: GuideThemeRole;
  mode: GuideThemeMode;
}) {
  const canvas = GUIDE_THEME_ROLES.find(
    (item) => item.token === "--background",
  );
  const Icon = mode === "light" ? SunIcon : MoonIcon;
  return (
    <span
      className={styles.previewMode}
      style={{ backgroundColor: canvas?.[mode] }}
    >
      <span
        className={styles.previewPaint}
        style={{
          backgroundColor: role[mode],
          color: guidePreviewInk(role[mode], mode),
        }}
      >
        <span className={styles.previewModeLabel}>
          <Icon size={11} weight="bold" aria-hidden="true" />
          {mode === "light" ? "Light" : "Dark"}
        </span>
        <span className={styles.previewLetters} aria-hidden="true">
          Aa<span>↗</span>
        </span>
        <span className={styles.previewOpacity}>
          {guideColorDetails(role[mode]).opacity} opacity
        </span>
      </span>
    </span>
  );
}

export function GuideColors() {
  const id = useId();
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState("Tap a color to copy its hex value.");
  const [manual, setManual] = useState<{ label: string; value: string } | null>(
    null,
  );
  const inspectionPreferences = usePersistentDraft<ColorInspectionPreferences>(
    "view:guide-colors",
    () => ({
      query: "",
      family: "all",
      format: "hex",
      modes: {},
      inspectionId: null,
    }),
    isColorInspectionPreferences,
  );
  const { query, family, format, inspectionId, modes } =
    inspectionPreferences.value;
  const inspection = inspectionId
    ? { id: inspectionId, mode: modes[inspectionId] ?? "light" }
    : null;
  const inspectedRole = inspection ? guideRole(inspection.id) : undefined;
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAttempt = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const colors = GUIDE_MEDICATION_COLORS.filter((color) => {
    if (family !== "all" && color.family !== family) return false;
    const text =
      `${color.label} ${color.value} ${color.hex} ${color.family}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      copyAttempt.current += 1;
    },
    [],
  );

  function inspect(id: string, chosenMode?: GuideThemeMode) {
    const mode = chosenMode ?? inspectionPreferences.value.modes[id] ?? "light";
    inspectionPreferences.setValue((previous) => ({
      ...previous,
      inspectionId: id,
      modes: { ...previous.modes, [id]: mode },
    }));
  }

  function closeInspection() {
    inspectionPreferences.setValue((previous) => ({
      ...previous,
      inspectionId: null,
    }));
  }

  function setQuery(query: string) {
    inspectionPreferences.setValue((previous) => ({ ...previous, query }));
  }

  function setFamily(family: string) {
    inspectionPreferences.setValue((previous) => ({ ...previous, family }));
  }

  async function copy(value: string, label: string, key: string) {
    const attempt = ++copyAttempt.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Copy unavailable.");
      await navigator.clipboard.writeText(value);
      if (attempt !== copyAttempt.current) return;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setCopied(key);
      setMessage(`${label} copied.`);
      feedbackTimer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      if (attempt !== copyAttempt.current) return;
      setCopied(null);
      closeInspection();
      setManual({ label, value });
      setMessage(
        "Automatic copy is unavailable. Select and copy the value instead.",
      );
    }
  }

  return (
    <div className={styles.reference} data-guide-colors>
      <div className={styles.toolbar}>
        <p className={styles.hint}>One palette. Every role.</p>
        <div className={styles.exportActions}>
          {(
            [
              ["css", "Copy CSS", GUIDE_THEME_CSS],
              ["json", "Copy JSON", GUIDE_THEME_JSON],
            ] as const
          ).map(([key, label, value]) => (
            <button
              type="button"
              key={key}
              className={styles.copyAction}
              onClick={() =>
                void copy(value, label.replace("Copy ", "Theme "), key)
              }
            >
              {copied === key ? (
                <ActionIcon name="selected" className="size-3" />
              ) : (
                <CopyIcon size={12} weight="bold" aria-hidden="true" />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>
      <p
        className={styles.feedback}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>

      <div className={styles.brandPalette} aria-label="The five brand colors">
        {GUIDE_BRAND_COLORS.map((color) => (
          <button
            type="button"
            key={color.id}
            className={styles.brandColor}
            title={color.role}
            aria-label={`Copy ${color.name} ${color.hex}`}
            onClick={() =>
              void copy(color.hex, color.name, `brand-${color.id}`)
            }
          >
            <span
              className={styles.brandWell}
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            >
              {copied === `brand-${color.id}` && (
                <span style={{ color: guidePreviewInk(color.hex, "light") }}>
                  <ActionIcon name="selected" className="size-4" />
                </span>
              )}
            </span>
            <strong>{color.name}</strong>
            <code>{color.hex}</code>
          </button>
        ))}
      </div>
      <div className={styles.sectionHeading}>
        <h3 id="developer-colors-harmony" data-guide-outline-level="2">
          Related Tones
        </h3>
        <span>Small mixtures, shared character</span>
      </div>
      <div
        className={`${styles.brandPalette} ${styles.harmonyPalette}`}
        aria-label="Related Harmony colors"
      >
        {GUIDE_HARMONY_COLORS.map((color) => (
          <button
            type="button"
            key={color.id}
            className={styles.brandColor}
            title={color.role}
            aria-label={`Copy ${color.name} ${color.hex}`}
            data-guide-harmony-color={color.id}
            onClick={() =>
              void copy(color.hex, color.name, `harmony-${color.id}`)
            }
          >
            <span
              className={styles.brandWell}
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            >
              {copied === `harmony-${color.id}` && (
                <span style={{ color: guidePreviewInk(color.hex, "light") }}>
                  <ActionIcon name="selected" className="size-4" />
                </span>
              )}
            </span>
            <strong>{color.name}</strong>
            <code>{color.hex}</code>
          </button>
        ))}
      </div>
      <div className={styles.sectionHeading}>
        <h3
          id="developer-colors-context"
          data-guide-outline-level="2"
          data-guide-outline-label="Color In Context"
        >
          Color In Context
        </h3>
        <span>Light &amp; dark previews</span>
      </div>
      <div className={styles.roleCards}>
        {GUIDE_FEATURED_ROLES.map((role) => (
          <article
            className={styles.roleCard}
            key={role.id}
            data-guide-role={role.id}
          >
            <div className={styles.rolePreview}>
              {MODES.map((mode) => (
                <button
                  type="button"
                  key={mode}
                  aria-label={`Inspect ${role.label} in ${mode} mode`}
                  onClick={() => inspect(role.id, mode)}
                >
                  <ColorPreview role={role} mode={mode} />
                </button>
              ))}
            </div>
            <div className={styles.roleBody}>
              <div className={styles.roleHeading}>
                <h4
                  id={`developer-color-${role.id}`}
                  data-guide-outline-level="3"
                  data-guide-outline-label={role.label}
                >
                  {role.label}
                </h4>
                <button
                  type="button"
                  className={styles.tokenButton}
                  onClick={() =>
                    void copy(
                      role.token,
                      `${role.label} token`,
                      `token-${role.id}`,
                    )
                  }
                  aria-label={`Copy token ${role.token}`}
                >
                  <code>{role.token}</code>
                  {copied === `token-${role.id}` ? (
                    <ActionIcon name="selected" className="size-2.5" />
                  ) : (
                    <CopyIcon size={10} weight="bold" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className={styles.roleDescription}>{role.description}</p>
              <div className={styles.pairRow}>
                <span>Pairs With</span>
                <span>
                  {role.pairsWith.length
                    ? role.pairsWith
                        .map((pair) => guideRole(pair)?.label ?? pair)
                        .join(" · ")
                    : "Layered over the page base"}
                </span>
              </div>
              <div className={styles.hexFields}>
                {MODES.map((mode) => {
                  const key = `${role.id}-${mode}`;
                  return (
                    <button
                      type="button"
                      key={mode}
                      className={styles.hexField}
                      onClick={() =>
                        void copy(role[mode], `${role.label} ${mode} HEX`, key)
                      }
                      aria-label={`Copy ${role.label} ${mode} HEX ${role[mode]}`}
                    >
                      <span>
                        {mode === "light" ? "Light" : "Dark"}{" "}
                        <span>HEX / sRGB</span>
                      </span>
                      <span>
                        <code>{role[mode]}</code>
                        {copied === key ? (
                          <ActionIcon name="selected" className="size-3" />
                        ) : (
                          <CopyIcon
                            size={12}
                            weight="bold"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.sectionHeading}>
        <h3
          id="developer-every-color"
          data-guide-outline-level="2"
          data-guide-outline-label="Every Color"
        >
          Every Color <span>· Light and dark side by side</span>
        </h3>
        <span>
          <strong>{GUIDE_THEME_ROLES.length}</strong> roles
        </span>
      </div>
      <p className={styles.tableIntro}>
        Copy a value, or open a role to inspect its opacity, RGB values and
        matching colors.
      </p>
      <div className={styles.groups}>
        {GUIDE_THEME_GROUPS.map((group, groupIndex) => (
          <details
            key={group.id}
            id={`developer-color-group-${group.id}`}
            data-guide-outline-anchor
            className={styles.group}
            open={groupIndex === 0}
          >
            <summary
              className={styles.groupSummary}
              data-guide-outline-level="3"
              data-guide-outline-label={group.label}
              data-guide-outline-target={`developer-color-group-${group.id}`}
            >
              <span className={styles.groupTitle}>{group.label}</span>
              <span className={styles.groupCount}>
                <strong>{group.roles.length}</strong> roles
              </span>
              <ActionIcon name="expand" className={styles.chevron} />
            </summary>
            <p className={styles.groupDescription}>{group.description}</p>
            <table className={styles.colorTable}>
              <caption className="sr-only">
                {group.label}: roles with light and dark HEX values.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Light</th>
                  <th scope="col">Dark</th>
                </tr>
              </thead>
              <tbody>
                {group.roles.map((role) => (
                  <tr key={role.id}>
                    <th scope="row">
                      <button
                        type="button"
                        className={styles.tableRole}
                        onClick={() => inspect(role.id)}
                        aria-label={`Inspect ${role.label}`}
                      >
                        <span>{role.label}</span>
                        <code>{role.token}</code>
                      </button>
                    </th>
                    {MODES.map((mode) => {
                      const key = `table-${role.id}-${mode}`;
                      return (
                        <td key={mode}>
                          <button
                            type="button"
                            className={styles.tableValue}
                            onClick={() =>
                              void copy(
                                role[mode],
                                `${role.label} ${mode} HEX`,
                                key,
                              )
                            }
                            aria-label={`Copy ${role.label} ${mode} HEX ${role[mode]}`}
                            title={guideColorDetails(role[mode]).rgb}
                          >
                            <span
                              className={styles.tableChip}
                              style={{
                                backgroundColor:
                                  guideRole("background")?.[mode],
                              }}
                              aria-hidden="true"
                            >
                              <span style={{ backgroundColor: role[mode] }} />
                            </span>
                            <code>{role[mode]}</code>
                            {copied === key && (
                              <ActionIcon
                                name="selected"
                                className={styles.tableCopied}
                              />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>

      <div className={styles.notes}>
        <p>
          <strong>One foundation, related reflections.</strong> Plum and Lilac
          anchor the interface. Apricot and a small Rose admixture add warmth;
          Iris and Mint bring quieter cool detail. Black and White keep copy
          clear. Paired mixtures and opacity create the softer layers, while
          medication artwork keeps its separately chosen colors.
        </p>
        <p>
          Six-digit hex is a solid color. In <code>#RRGGBBAA</code>, the final
          two digits set opacity. The preview shows translucent colors over
          their mode’s page base. Glass, gradients and overlays can change the
          final appearance.
        </p>
        <p>
          <strong>Appearance follows your preference.</strong> Both preview
          modes are shown here for comparison. Inspecting a color does not
          change your appearance or any saved medication.
        </p>
        <p>
          CSS exports include the light defaults and system dark-mode rules.
          JSON includes the palette, token descriptions, pairings and both sets
          of values, all from the same source as the app.
        </p>
      </div>

      <div className={styles.medicationPalette}>
        <div className={styles.paletteHeading}>
          <span className={styles.paletteIcon} aria-hidden="true">
            <PaletteIcon size={22} weight="duotone" />
          </span>
          <h3
            id="developer-medication-accents"
            data-guide-outline-level="2"
            data-guide-outline-label="Medication Accents"
          >
            Medication Accents
          </h3>
        </div>
        <p className={styles.paletteDescription}>
          A color of your own for every medication. Tap a shade to copy it; your
          saved colors stay unchanged.
        </p>
        <div className={styles.filters}>
          <div className={styles.search}>
            <label htmlFor={`${id}-search`} className="sr-only">
              Search medication colors
            </label>
            <Input
              ref={searchInput}
              id={`${id}-search`}
              type="search"
              maxLength={200}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a color"
              className={styles.searchInput}
            />
            <MagnifyingGlassIcon
              size={16}
              weight="bold"
              aria-hidden="true"
              className={styles.searchIcon}
            />
          </div>
          <div>
            <label htmlFor={`${id}-family`} className="sr-only">
              Filter color family
            </label>
            <Select
              value={family}
              onValueChange={(value) => value && setFamily(value)}
            >
              <SelectTrigger
                id={`${id}-family`}
                className={styles.controlTrigger}
              >
                <SwatchesIcon
                  size={16}
                  weight="duotone"
                  aria-hidden="true"
                  className={styles.familyGlyph}
                />
                <SelectValue>
                  <span>{family === "all" ? "All families" : family}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className={styles.controlMenu}
                align="end"
                alignItemWithTrigger={false}
              >
                <SelectItem
                  value="all"
                  label="All families"
                  className={styles.controlItem}
                >
                  <SwatchesIcon size={16} weight="duotone" aria-hidden="true" />
                  All families
                </SelectItem>
                {GUIDE_COLOR_FAMILIES.map((name) => (
                  <SelectItem
                    key={name}
                    value={name}
                    label={name}
                    className={styles.controlItem}
                  >
                    <span
                      className={styles.familySwatch}
                      style={{
                        backgroundColor:
                          GUIDE_MEDICATION_COLORS.find(
                            (color) =>
                              color.family === name &&
                              color.label.endsWith(" 500"),
                          )?.hex ??
                          GUIDE_MEDICATION_COLORS.find(
                            (color) => color.family === name,
                          )?.hex,
                      }}
                      aria-hidden="true"
                    />
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className={styles.copyResults}
            aria-label={
              copied === "results" ? "Color results copied" : "Copy Results"
            }
            title={copied === "results" ? "Copied" : "Copy Results"}
            disabled={!colors.length}
            onClick={() =>
              void copy(
                colors
                  .map((color) => `${color.label}: ${color.hex}`)
                  .join("\n"),
                "Color results",
                "results",
              )
            }
          >
            {copied === "results" ? (
              <ActionIcon name="selected" className="size-4" />
            ) : (
              <CopyIcon
                size={16}
                weight="bold"
                aria-hidden="true"
                className="size-4"
              />
            )}
          </Button>
        </div>
        <div className={styles.resultRow}>
          <span aria-live="polite" aria-atomic="true">
            <strong>{colors.length}</strong>{" "}
            {colors.length === 1 ? "shade" : "shades"} to browse
          </span>
        </div>
        <div
          className={styles.paletteGrid}
          role="region"
          aria-label="Medication color swatches"
        >
          {colors.length ? (
            colors.map((color) => (
              <button
                type="button"
                className={styles.accent}
                key={color.value}
                onClick={() =>
                  void copy(
                    color.hex,
                    `${color.label} ${color.hex}`,
                    color.value,
                  )
                }
                aria-label={`Copy ${color.label} ${color.hex}`}
                title={`${color.label} · ${color.hex}`}
                data-copied={copied === color.value}
              >
                <span
                  className={styles.accentColor}
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                >
                  {copied === color.value && (
                    <span className={styles.accentCopied}>
                      <ActionIcon name="selected" className="size-3" />
                    </span>
                  )}
                </span>
                <span className={styles.accentLabel}>{color.label}</span>
                <code>{color.hex}</code>
              </button>
            ))
          ) : (
            <div className={styles.empty}>
              <ActionIcon name="discover" className="size-7" />
              <p>No colors found.</p>
              <span>Try a name, shade number or hex value.</span>
              <button
                type="button"
                className={styles.copyAction}
                onClick={() => {
                  setQuery("");
                  setFamily("all");
                  searchInput.current?.focus();
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <GuideColorInspector
        open={Boolean(inspection && inspectedRole)}
        onOpenChange={(open) => !open && closeInspection()}
        role={inspectedRole ?? GUIDE_THEME_ROLES[0]}
        mode={inspection?.mode ?? "light"}
        onModeChange={(mode) => {
          if (inspection) inspect(inspection.id, mode);
        }}
        format={format}
        onFormatChange={(format) =>
          inspectionPreferences.setValue((previous) => ({
            ...previous,
            format,
          }))
        }
        onInspectPair={(pair) => inspect(pair, inspection?.mode ?? "light")}
        usage="This semantic role comes from the shared application theme. Use its token reference in component styles; its source definition provides the matching light and dark values."
      />

      <ResponsiveModal
        scrollKey="color-manual-copy"
        open={Boolean(manual)}
        onOpenChange={(open) => !open && setManual(null)}
        title="Copy Values"
        context="Select & Copy"
        description="Your browser couldn't copy automatically. Select the text below and use your device's Copy action."
      >
        {manual && (
          <div className={styles.manualCopy}>
            <label htmlFor={`${id}-manual`}>{manual.label}</label>
            <Textarea
              id={`${id}-manual`}
              autoFocus
              readOnly
              value={manual.value}
              onFocus={(event) => event.target.select()}
              rows={manual.value.includes("\n") ? 7 : 2}
              className="min-h-20 rounded-xl font-mono text-base md:text-sm"
            />
            <Button
              type="button"
              className="mt-3 h-11 w-full gap-2 rounded-xl"
              onClick={() => setManual(null)}
            >
              <ActionIcon name="selected" className="size-4" />
              Done
            </Button>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
}
