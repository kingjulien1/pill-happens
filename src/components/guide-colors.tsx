"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { ActionIcon } from "@/components/action-icon";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  GUIDE_COLOR_FAMILIES,
  GUIDE_BRAND_COLORS,
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
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState("Tap a color to copy its hex value.");
  const [manual, setManual] = useState<{ label: string; value: string } | null>(
    null,
  );
  const [inspection, setInspection] = useState<{
    id: string;
    mode: GuideThemeMode;
  } | null>(null);
  const [format, setFormat] = useState<"hex" | "rgb">("hex");
  const inspectedRole = inspection ? guideRole(inspection.id) : undefined;
  const inspectionKey = inspection
    ? `inspection-${inspection.id}-${inspection.mode}-${format}`
    : "";
  const declarationKey = inspection
    ? `declaration-${inspection.id}-${inspection.mode}`
    : "";
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
      setInspection(null);
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
        <h3>Color In Context</h3>
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
                  onClick={() => setInspection({ id: role.id, mode })}
                >
                  <ColorPreview role={role} mode={mode} />
                </button>
              ))}
            </div>
            <div className={styles.roleBody}>
              <div className={styles.roleHeading}>
                <h4>{role.label}</h4>
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
        <h3>
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
            className={styles.group}
            open={groupIndex === 0}
          >
            <summary className={styles.groupSummary}>
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
                        onClick={() =>
                          setInspection({ id: role.id, mode: "light" })
                        }
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
          <strong>Five colors, many roles.</strong> Peach, Flame, Rust, Ink and
          Violet are the interface palette. Peach and Ink take the place of
          white and black; mixes and opacity create the quieter layers.
        </p>
        <p>
          Six-digit hex is a solid color. In <code>#RRGGBBAA</code>, the final
          two digits set opacity. The preview shows translucent colors over
          their mode’s page base. Glass, gradients and overlays can change the
          final appearance.
        </p>
        <p>
          <strong>Your device chooses the app’s theme.</strong> Both preview
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
          <h3>Medication Accents</h3>
          <span>{GUIDE_MEDICATION_COLORS.length} choices</span>
        </div>
        <p className={styles.paletteDescription}>
          A separate palette for your own medication identities: all original
          accents and installed Tailwind shades, including Black and White.
          These are literal saved colors; the app theme does not replace them.
          Copying a swatch leaves your medication unchanged.
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a color"
              className="h-10 rounded-xl text-base md:text-sm"
            />
          </div>
          <div>
            <label htmlFor={`${id}-family`} className="sr-only">
              Filter color family
            </label>
            <select
              id={`${id}-family`}
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className={styles.family}
            >
              <option value="all">All Families</option>
              {GUIDE_COLOR_FAMILIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.resultRow}>
          <span aria-live="polite">
            <strong>{colors.length}</strong>{" "}
            {colors.length === 1 ? "color" : "colors"}{" "}
            {query || family !== "all" ? "found" : "to explore"}
          </span>
          <button
            type="button"
            className={styles.copyAction}
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
              <ActionIcon name="selected" className="size-3" />
            ) : (
              <CopyIcon size={12} weight="bold" aria-hidden="true" />
            )}
            Copy Results
          </button>
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

      <ResponsiveModal
        open={Boolean(inspection && inspectedRole)}
        onOpenChange={(open) => !open && setInspection(null)}
        title={inspectedRole?.label ?? "Color Details"}
        context={inspection?.mode === "dark" ? "Dark Preview" : "Light Preview"}
        description={
          inspectedRole?.description ??
          "Inspect an application color without changing the theme."
        }
      >
        {inspection && inspectedRole && (
          <div className={styles.inspection} data-guide-color-inspection>
            <div className={styles.inspectionPreview}>
              <ColorPreview role={inspectedRole} mode={inspection.mode} />
            </div>
            <p className={styles.inspectionNote}>
              Preview only · Your system appearance stays in control.
            </p>
            <div className={styles.inspectionControls}>
              <label htmlFor={`${id}-preview-mode`}>
                Preview
                <select
                  id={`${id}-preview-mode`}
                  value={inspection.mode}
                  onChange={(event) =>
                    setInspection({
                      ...inspection,
                      mode: event.target.value as GuideThemeMode,
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label htmlFor={`${id}-format`}>
                Copy Format
                <select
                  id={`${id}-format`}
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as "hex" | "rgb")
                  }
                >
                  <option value="hex">HEX</option>
                  <option value="rgb">RGB / sRGB</option>
                </select>
              </label>
            </div>
            <dl className={styles.inspectionFacts}>
              <div>
                <dt>Token</dt>
                <dd>
                  <code>{inspectedRole.token}</code>
                </dd>
              </div>
              <div>
                <dt>Opacity</dt>
                <dd>
                  {guideColorDetails(inspectedRole[inspection.mode]).opacity}
                </dd>
              </div>
              <div>
                <dt>sRGB</dt>
                <dd>
                  <code>
                    {guideColorDetails(inspectedRole[inspection.mode]).rgb}
                  </code>
                </dd>
              </div>
            </dl>
            <label htmlFor={`${id}-color-value`} className={styles.valueLabel}>
              {format === "hex" ? "Exact HEX Value" : "sRGB Value"}
            </label>
            <Input
              id={`${id}-color-value`}
              readOnly
              value={
                format === "hex"
                  ? inspectedRole[inspection.mode]
                  : guideColorDetails(inspectedRole[inspection.mode]).rgb
              }
              onFocus={(event) => event.target.select()}
              className="h-11 rounded-xl font-mono text-base"
            />
            <Button
              type="button"
              className="h-11 w-full gap-2 rounded-xl"
              onClick={() =>
                void copy(
                  format === "hex"
                    ? inspectedRole[inspection.mode]
                    : guideColorDetails(inspectedRole[inspection.mode]).rgb,
                  `${inspectedRole.label} ${inspection.mode} ${format.toUpperCase()}`,
                  inspectionKey,
                )
              }
            >
              {copied === inspectionKey ? (
                <ActionIcon name="selected" className="size-4" />
              ) : (
                <CopyIcon size={16} weight="bold" aria-hidden="true" />
              )}
              {copied === inspectionKey
                ? "Copied"
                : `Copy ${format.toUpperCase()}`}
            </Button>
            <button
              type="button"
              className={styles.copyAction}
              onClick={() =>
                void copy(
                  `${inspectedRole.token}: ${inspectedRole[inspection.mode]};`,
                  `${inspectedRole.label} CSS declaration`,
                  declarationKey,
                )
              }
            >
              <CopyIcon size={12} weight="bold" aria-hidden="true" />
              {copied === declarationKey
                ? "Declaration Copied"
                : "Copy CSS Declaration"}
            </button>
            {inspectedRole.pairsWith.length > 0 && (
              <div className={styles.inspectionPairs}>
                <span>Pairs With</span>
                <div>
                  {inspectedRole.pairsWith.map((pair) => {
                    const role = guideRole(pair);
                    return role ? (
                      <button
                        type="button"
                        key={pair}
                        className={styles.copyAction}
                        onClick={() =>
                          setInspection({ ...inspection, id: role.id })
                        }
                      >
                        {role.label}
                        <ActionIcon name="open" className="size-3" />
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveModal>

      <ResponsiveModal
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
