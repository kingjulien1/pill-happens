"use client";

import { useState } from "react";
import { ArrowRight, Check, Layers3, Moon, Sun } from "lucide-react";
import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { AccentButton } from "@/components/accent-button";
import { DeveloperCode } from "@/components/developer-code";
import { IntakeLogSymbol } from "@/components/intake-log-symbol";
import {
  GuideColorInspector,
  type GuideColorInspectorRole,
} from "@/components/guide-color-inspector";
import {
  ACTION_BUTTON_KINDS,
  BUTTON_SIZE_BANDS,
  BUTTON_SYSTEM,
  getAccentButtonDimensions,
  getButtonSizeStyle,
  INTAKE_ACTION_PAINT,
  type ActionButtonKind,
  type ActionButtonTheme,
} from "@/lib/action-button-system";
import { APP_THEME_VALUES } from "@/lib/app-theme";
import { GUIDE_LAYOUT_BANDS } from "@/lib/guide-responsive";
import { guideHeadingId } from "@/lib/guide-outline";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-buttons.module.css";

const components = {
  primary: PrimaryButton,
  secondary: SecondaryButton,
  accent: AccentButton,
};
const sampleLabels = {
  primary: "Log Intake",
  secondary: "Review details",
  accent: "Save changes",
};
const number = (value: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(value);
const percentage = (value: number) => `${number(value * 100)}%`;
const MAIN_SECONDARY_INK = {
  color: "#fccee8",
  opacity: 1,
  encoded: "#fccee8",
} as const;

type ButtonPaint = {
  base: string;
  innerEdge?: string;
  rimColors?: readonly string[];
  text: string;
  icon: string;
};
type PaintLayer = {
  key: keyof ButtonPaint;
  label: string;
  description: string;
  colors: readonly string[];
  opacity: number;
};
type Inspection = {
  role: GuideColorInspectorRole;
  mode: ActionButtonTheme;
  usage: string;
  layerOpacity: number;
};

const roleDescriptions = {
  primary:
    "The page’s strongest next step, explicitly using the intake face, inward edges and quiet moving rim.",
  secondary:
    "A quiet tonal supporting action with paired semantic ink and no intake rim, glow or secondary icon pigment.",
  accent:
    "A main commitment action with intake paint, default leading and trailing icons, and responsive proportions.",
};

/** Inspection values mirror the selected adapter’s actual appearance. */
function buttonPaint(
  kind: ActionButtonKind,
  mode: ActionButtonTheme,
): ButtonPaint {
  if (kind === "secondary") {
    return {
      base: APP_THEME_VALUES[mode].secondary,
      text: APP_THEME_VALUES[mode]["secondary-foreground"],
      icon: APP_THEME_VALUES[mode]["secondary-foreground"],
    };
  }
  return {
    base: INTAKE_ACTION_PAINT[mode].base,
    innerEdge: "#e60076bd",
    rimColors: INTAKE_ACTION_PAINT[mode].rimColors,
    text: INTAKE_ACTION_PAINT[mode].text,
    icon: MAIN_SECONDARY_INK.color,
  };
}

function paintLayers(kind: ActionButtonKind, paint: ButtonPaint): PaintLayer[] {
  if (kind === "secondary") {
    return [
      {
        key: "base",
        label: "Tonal supporting face",
        description:
          "The semantic secondary surface keeps this supporting action quiet. Any alpha belongs to that source token; no intake overlay or moving perimeter is added.",
        colors: [paint.base],
        opacity: 1,
      },
      {
        key: "text",
        label: "Paired supporting ink",
        description:
          "The secondary-foreground token supplies the label’s paired ink in the selected theme.",
        colors: [paint.text],
        opacity: 1,
      },
      {
        key: "icon",
        label: "Inherited supporting icon ink",
        description:
          "Supporting icons inherit the same paired ink as the label, without the main action’s Pink secondary pigment.",
        colors: [paint.icon],
        opacity: 1,
      },
    ];
  }
  return [
    {
      key: "base",
      label: "Solid face",
      description:
        "An opaque dark-pink #29131f face stays the same in both appearances. There is no rotating field, glaze or tint layer.",
      colors: [paint.base],
      opacity: 1,
    },
    {
      key: "innerEdge",
      label: "Pink inner edge",
      description:
        "A two-pixel Pink600 band at 74% alpha sits one pixel inside the moving outer rim. Both edges paint inward without enlarging the control; the copyable HEX rounds alpha to eight bits.",
      colors: paint.innerEdge ? [paint.innerEdge] : [],
      opacity: 1,
    },
    {
      key: "rimColors",
      label: "Moving Pink rim",
      description:
        "Mode-aware pink stops contain a 28% Pink300 admixture and circulate at thirty-percent opacity. CSS supplies the default rim; Today and Add Medication use its GPU equivalent.",
      colors: paint.rimColors ?? [],
      opacity: 0.3,
    },
    {
      key: "text",
      label: "Primary copy",
      description:
        "The mode’s foreground keeps the label readable above the solid face, independently of decorative edges.",
      colors: [paint.text],
      opacity: 1,
    },
    {
      key: "icon",
      label: "Pink secondary ink",
      description:
        "Main-action icons and supporting CTA copy use full-opacity Pink200. Standard small controls and medication artwork retain their own ink.",
      colors: [paint.icon],
      opacity: MAIN_SECONDARY_INK.opacity,
    },
  ];
}

function colorRole(
  kind: ActionButtonKind,
  mode: ActionButtonTheme,
  layer: PaintLayer,
  color: string,
  index: number,
): GuideColorInspectorRole {
  const stop = layer.colors.length > 1 ? ` · stop ${index + 1}` : "";
  const token =
    kind === "secondary"
      ? {
          base: "--secondary",
          innerEdge: "--border",
          rimColors: "--border",
          icon: "--secondary-foreground",
          text: "--secondary-foreground",
        }[layer.key]
      : {
          base: "--button-face",
          innerEdge: "--button-edge",
          rimColors: `--action-rim-${index + 1}`,
          icon: "--daily-action-secondary-ink",
          text: "--button-copy",
        }[layer.key];
  const value =
    kind !== "secondary" && layer.key === "icon"
      ? MAIN_SECONDARY_INK.encoded
      : color;
  return {
    id: `button-${kind}-${mode}-${layer.key}-${index}`,
    label: `${BUTTON_SYSTEM[kind].label} · ${layer.label}${stop}`,
    description: layer.description,
    token,
    light: value,
    dark: value,
    pairsWith: [],
  };
}

function ingredientPaint(layer: PaintLayer): string {
  const [first] = layer.colors;
  return layer.key === "rimColors"
    ? `conic-gradient(from 25deg, ${[...layer.colors, first].join(", ")})`
    : first;
}

function Heading({ children, level = 2 }: { children: string; level?: 2 | 3 }) {
  const props = {
    id: guideHeadingId("developer-buttons", children),
    "data-guide-outline-level": String(level),
    "data-guide-outline-label": children,
    className: level === 2 ? styles.heading : styles.subheading,
  };
  return level === 2 ? (
    <h3 {...props}>{children}</h3>
  ) : (
    <h4 {...props}>{children}</h4>
  );
}

function ThemeControl({
  mode,
  onChange,
  label,
}: {
  mode: ActionButtonTheme;
  onChange: (mode: ActionButtonTheme) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {(["light", "dark"] as const).map((theme) => {
        const Icon = theme === "light" ? Sun : Moon;
        return (
          <button
            key={theme}
            type="button"
            aria-pressed={mode === theme}
            onClick={() => onChange(theme)}
          >
            <Icon size={13} strokeWidth={1.8} aria-hidden="true" />
            {theme === "light" ? "Light" : "Dark"}
          </button>
        );
      })}
    </div>
  );
}

function ButtonSample({
  kind,
  mode,
  label = sampleLabels[kind],
  step = 0,
  motion = false,
  pending = false,
  disabled = false,
  icon = false,
  onActivate,
}: {
  kind: ActionButtonKind;
  mode: ActionButtonTheme;
  label?: string;
  step?: number;
  motion?: boolean;
  pending?: boolean;
  disabled?: boolean;
  icon?: boolean;
  onActivate: (label: string) => void;
}) {
  const Component = components[kind];
  return (
    <Component
      type="button"
      theme={mode}
      motion={motion}
      pending={pending}
      disabled={disabled}
      className={styles.sampleButton}
      style={getButtonSizeStyle(step)}
      onClick={() => onActivate(label)}
      data-guide-button-sample={kind}
      data-guide-button-step={step}
    >
      {kind === "primary" && motion && <IntakeLogSymbol />}
      <span>{label}</span>
      {icon && kind !== "accent" && (
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      )}
    </Component>
  );
}

const usageCode = `import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { AccentButton } from "@/components/accent-button";
import { DialogPrimaryButton } from "@/components/dialog-primary-button";
import { MedicationActionButton } from "@/components/medication-action-button";

// Ordinary controls default to standard semantic styling, without intake art.
<Button type="button" variant="ghost" size="sm" onClick={reviewDetails}>
  Review
</Button>

// A lower-level main action can opt into the original intake paint.
<PrimaryButton type="button" onClick={openIntake}>
  Log Intake
</PrimaryButton>

// A quiet tonal route alongside the commitment; no intake rim or glow.
<SecondaryButton type="button" onClick={reviewDetails}>
  Review details
</SecondaryButton>

// Prominent live actions share the latest Today satin design and 80px height.
<MedicationActionButton intent="add" onClick={openMedication} />

// Dialog submissions use that same face, size, icon well and arrow.
// Labels only: PencilSparkles and ArrowRight are shared defaults.
// Pending keeps a meaningful label and prevents another activation.
<DialogPrimaryButton type="submit" pending={saving}>
  {saving ? "Saving…" : "Save Medication"}
</DialogPrimaryButton>

// Sign-in and journal creation use the same submission adapter.
<DialogPrimaryButton type="submit" pending={creating}>
  {creating ? "Creating…" : "Create Journal"}
</DialogPrimaryButton>

// Optional decorative slots accept a React node or null.
<AccentButton type="button" leadingIcon={null} trailingIcon={null}>
  Continue without icons
</AccentButton>`;

const previewCode = `import { getButtonSizeStyle } from "@/lib/action-button-system";

// Theme is explicit for a specimen. App buttons can follow the system.
// Step 5 matches 1536px and stays capped at 1920px and 2560px.
<PrimaryButton
  type="button"
  theme="dark"
  motion={false}
  radius={22}
  style={getButtonSizeStyle(5)}
>
  Log Intake
</PrimaryButton>`;

export function GuideButtons() {
  const [kind, setKind] = useState<ActionButtonKind>("primary");
  const [mode, setMode] = useState<ActionButtonTheme>("light");
  const [sizeMode, setSizeMode] = useState<ActionButtonTheme>("light");
  const [stateMode, setStateMode] = useState<ActionButtonTheme>("light");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [feedback, setFeedback] = useState(
    "Choose any live example to try its action.",
  );
  const paint = buttonPaint(kind, mode);
  const layers = paintLayers(kind, paint);
  const firstRole = colorRole(kind, mode, layers[0], paint.base, 0);
  const activate = (label: string) =>
    setFeedback(`“${label}” preview activated.`);

  function inspect(layer: PaintLayer, color: string, index: number) {
    const encodedInk = kind !== "secondary" && layer.key === "icon";
    setInspection({
      role: colorRole(kind, mode, layer, color, index),
      mode,
      usage: encodedInk
        ? "Main-action icons and supporting copy use Pink200 at full opacity. The copyable HEX has no extra alpha or element-opacity multiplier."
        : `${BUTTON_SYSTEM[kind].label}, ${mode} theme. ${layer.label} is painted at ${percentage(layer.opacity)} layer opacity. This is one raw color stop; the complete button combines the layers shown in the reference.`,
      layerOpacity: encodedInk ? 1 : layer.opacity,
    });
  }

  return (
    <section
      id="buttons"
      className={`${guideStyles.section} ${styles.reference}`}
      aria-labelledby="buttons-title"
      data-guide-buttons
    >
      <div className={guideStyles.sectionHeading}>
        <h2
          id="buttons-title"
          data-guide-outline-level="1"
          data-guide-outline-label="Buttons & Action Hierarchy"
          data-guide-outline-target="buttons"
        >
          <Layers3 size={18} strokeWidth={1.8} aria-hidden="true" />
          Buttons &amp; Action Hierarchy
        </h2>
        <span>
          <b>08</b> / Three Roles
        </span>
      </div>
      <p className={styles.intro}>
        Share native behavior, choose visual emphasis. Button defaults to
        standard semantic controls; Primary and Accent explicitly opt into the
        shared satin surface for main actions. Secondary stays quiet and tonal.
        Compare the real adapters in both themes, then choose the smallest
        useful size and emphasis.
      </p>
      <nav className={styles.jumpLinks} aria-label="Button reference sections">
        {[
          "Choose The Action’s Role",
          "Inside The Painted Surface",
          "Eight Layouts, Six Size Steps",
          "States And Action Groups",
          "Component Contract",
        ].map((label) => (
          <a
            key={label}
            href={`#${guideHeadingId("developer-buttons", label)}`}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className={styles.chapter}>
        <Heading>Choose The Action’s Role</Heading>
        <p className={styles.lead}>
          Both previews below render their own theme, independently of your
          device. These are base-size buttons; their native focus and activation
          behavior stays available. Actions in this reference only update the
          preview feedback. Accent starts at 72px high with 14.25px, 700-weight
          foreground text. Its 22px PencilSparkles and ArrowRight glyphs use
          Pink200 at full opacity and share a 2.5 stroke. Primary and Accent use
          intake paint; Secondary uses its paired semantic surface and ink. All
          retain native labels, focus and activation.
        </p>
        <div className={styles.roleList}>
          {ACTION_BUTTON_KINDS.map((buttonKind, index) => {
            const system = BUTTON_SYSTEM[buttonKind];
            return (
              <article
                key={buttonKind}
                className={styles.roleCard}
                data-card-entry
                data-guide-button-role={buttonKind}
              >
                <div className={styles.roleHeader}>
                  <div>
                    <span className={styles.eyebrow}>
                      0{index + 1} / Action role
                    </span>
                    <Heading level={3}>{`${system.label} Button`}</Heading>
                    <p>{roleDescriptions[buttonKind]}</p>
                  </div>
                  <dl className={styles.dimensions}>
                    <div>
                      <dt>Height</dt>
                      <dd>{system.height}px</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{system.fontSize}px</dd>
                    </div>
                    <div>
                      <dt>Radius</dt>
                      <dd>{system.radius}px</dd>
                    </div>
                  </dl>
                </div>
                <div className={styles.themePair}>
                  {(["light", "dark"] as const).map((theme) => {
                    const Icon = theme === "light" ? Sun : Moon;
                    return (
                      <div
                        key={theme}
                        className={styles.themeCanvas}
                        data-guide-button-theme={theme}
                        style={{
                          backgroundColor: APP_THEME_VALUES[theme].background,
                        }}
                      >
                        <span className={styles.themeLabel}>
                          <Icon
                            size={13}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          {theme === "light" ? "Light theme" : "Dark theme"}
                        </span>
                        <div className={styles.liveSample}>
                          <ButtonSample
                            kind={buttonKind}
                            mode={theme}
                            motion
                            icon
                            onActivate={activate}
                          />
                        </div>
                        <span className={styles.canvasNote}>
                          Real component · base size
                        </span>
                      </div>
                    );
                  })}
                </div>
                <dl className={styles.usageNotes}>
                  <div>
                    <dt>Use for</dt>
                    <dd>{system.useFor}</dd>
                  </div>
                  <div>
                    <dt>Keep quiet around</dt>
                    <dd>{system.avoidFor}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
        <p
          className={styles.feedback}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Check size={13} strokeWidth={1.8} aria-hidden="true" /> {feedback}
        </p>
      </div>

      <div className={styles.chapter}>
        <Heading>Inside The Painted Surface</Heading>
        <p className={styles.lead}>
          Read the stack from its foundation to its foreground. Each color chip
          opens the same inspector as the palette reference, including copyable
          hex, RGB and opacity values. The face swatch is a rounded sRGB
          representation of the main action’s forty-percent Purple / canvas mix.
          Its rim source colors and thirty-percent opacity stay separate.
          Secondary instead shows its semantic surface and paired ink, with no
          moving edge. The controls use their real theme-aware CSS tokens.
        </p>
        <div className={styles.inspectorToolbar}>
          <div
            className={styles.segmented}
            role="group"
            aria-label="Button paint to inspect"
          >
            {ACTION_BUTTON_KINDS.map((buttonKind) => (
              <button
                key={buttonKind}
                type="button"
                aria-pressed={kind === buttonKind}
                onClick={() => setKind(buttonKind)}
              >
                {BUTTON_SYSTEM[buttonKind].label}
              </button>
            ))}
          </div>
          <ThemeControl
            mode={mode}
            onChange={setMode}
            label="Button paint theme"
          />
        </div>
        <div
          className={styles.anatomy}
          data-guide-button-anatomy={kind}
          data-guide-paint-theme={mode}
        >
          <div className={styles.stackCaption}>
            <strong>
              {BUTTON_SYSTEM[kind].label} · {mode} paint
            </strong>
            <span>Back → front</span>
          </div>
          <p className={styles.stackNote}>
            Each strip shows one layer over the base. Inspect a stop for its
            source value; the live buttons show the complete composition.
          </p>
          <ol className={styles.layerStack}>
            {layers.map((layer, index) => (
              <li
                key={layer.key}
                className={styles.layer}
                data-guide-button-layer={layer.key}
              >
                <span className={styles.layerNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div className={styles.layerBody}>
                  <div className={styles.layerHeading}>
                    <h5>{layer.label}</h5>
                    <span className={styles.opacity}>
                      {percentage(layer.opacity)} layer
                    </span>
                  </div>
                  <p>{layer.description}</p>
                  <div
                    className={styles.paintWell}
                    style={{ backgroundColor: paint.base }}
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        background: ingredientPaint(layer),
                        opacity: layer.opacity,
                      }}
                    />
                  </div>
                  <div className={styles.colorStops}>
                    {layer.colors.map((color, stop) => (
                      <button
                        key={`${color}-${stop}`}
                        type="button"
                        className={styles.colorStop}
                        onClick={() => inspect(layer, color, stop)}
                        aria-label={`Inspect ${BUTTON_SYSTEM[kind].label} ${mode} ${layer.label}, stop ${stop + 1}, ${color}, ${percentage(layer.opacity)} layer opacity`}
                        data-guide-button-color={color}
                        data-layer-opacity={layer.opacity}
                      >
                        <span
                          className={styles.colorSquare}
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <code>{color}</code>
                        <ArrowRight size={11} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.noteGrid}>
          <div>
            <Heading level={3}>Color, Opacity And Compositing</Heading>
            <p>
              Main actions use an opaque dark-pink #29131f face in both modes.
              Their moving rim is a separate thirty-percent layer with a 28%
              Pink300 admixture in its color stops. Primary copy and Pink200
              supporting ink stay above that face. Secondary uses its semantic
              token directly, including any alpha encoded in that value.
              Medication glyphs keep their own pigments.
            </p>
          </div>
          <div>
            <Heading level={3}>One Face, Two Inward Edges</Heading>
            <p>
              The intake appearance needs no backdrop blur. Its default outer
              rim is 2px; Primary keeps a 3px default. Today uses 5.5px at the
              same 80px height and 21px radius as intake cards. A 1px
              face-colored gap precedes the 2px Pink600 band at 74% alpha. CSS
              supplies this main-action edge; Today and Add Medication use its
              GPU equivalent. Secondary and standard controls mount neither that
              perimeter nor its glow.
            </p>
          </div>
        </div>
        <details className={styles.detail}>
          <summary>
            Copy the shared {BUTTON_SYSTEM[kind].label} {mode} paint values
          </summary>
          <DeveloperCode
            label={`${BUTTON_SYSTEM[kind].label} ${mode} paint values`}
            language="json"
            code={JSON.stringify(
              {
                ...paint,
                iconOpacity:
                  kind === "secondary" ? 1 : MAIN_SECONDARY_INK.opacity,
              },
              null,
              2,
            )}
          />
        </details>
        {kind !== "secondary" && (
          <DeveloperCode
            label="Main Action Inner Edge And Secondary Ink"
            language="CSS"
            code={`--daily-action-inner-edge: color-mix(in srgb,
  var(--color-pink-600, #e60076) 74%, transparent);
--daily-action-secondary-ink: var(--color-pink-200, #fccee8);`}
          />
        )}
        <details className={styles.detail}>
          <summary>Legacy finish inputs and decorative artwork</summary>
          <div className={styles.detailBody}>
            <p>
              Existing <code>surface</code> and <code>finish</code> props remain
              accepted so saved examples and callers keep compiling. They no
              longer select decorative main-action backgrounds. Primary and
              Accent
              opt into intake paint on the shared <code>Button</code> host.
              DialogPrimaryButton instead composes TodayActionButton’s satin
              face, 80px height, 21px corners, icon well and arrow; Secondary
              defaults to its quiet standard
              variant. The separate
              <code> AccentButtonSurface</code> export remains a paint-only
              artwork utility for the journal illustration; it is not mounted
              inside an action button.
            </p>
          </div>
        </details>
      </div>

      <div className={styles.chapter}>
        <Heading>Eight Layouts, Six Size Steps</Heading>
        <div className={styles.sectionToolbar}>
          <p className={styles.lead}>
            The eight existing guide bands share six size steps. Each step adds
            0.75px of height, 0.125px of type and 0.5px of horizontal padding.
            Growth stops at 1536px; the two widest layouts keep that size.
            Accent therefore grows from 72px to 75.75px, with corners derived
            from the fixed 80px-high, 21px-radius intake-card/action design
            reference.
          </p>
          <ThemeControl
            mode={sizeMode}
            onChange={setSizeMode}
            label="Responsive size example theme"
          />
        </div>
        <p className={styles.caption}>
          Accent’s shape keeps a constant proportion:{" "}
          <code>radius = actual height × 21 / 80</code>. The ratio is 0.2625,
          giving 18.9px at 72px high and 19.884375px at the 75.75px cap. The
          face and inward rims share the effective outer radius. This default
          follows the actual responsive button height even inside a dialog. An
          explicit
          <code> radius</code> prop remains available. See{" "}
          <a href="#dialog-corner-radius">Dialog Corners &amp; Nested Shapes</a>{" "}
          for how this proportional action relates to the fixed surface, control
          and compact roles.
        </p>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="All eight button size bands; scroll horizontally to compare examples"
        >
          <table className={styles.sizeTable}>
            <caption>
              Actual button variables at each band · {sizeMode} theme
            </caption>
            <thead>
              <tr>
                <th scope="col">Viewport band</th>
                {ACTION_BUTTON_KINDS.map((buttonKind) => (
                  <th key={buttonKind} scope="col">
                    {BUTTON_SYSTEM[buttonKind].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BUTTON_SIZE_BANDS.map((band, index) => (
                <tr
                  key={band.min}
                  data-guide-button-size-band={band.min}
                  data-size-capped={band.capped || undefined}
                >
                  <th scope="row">
                    <strong>{GUIDE_LAYOUT_BANDS[index].name}</strong>
                    <span>
                      {band.min === 0
                        ? "Below 640px"
                        : `${number(band.min)}px+`}
                    </span>
                    <small>
                      {band.capped ? "Capped · step 5" : `Step ${band.step}`}
                    </small>
                  </th>
                  {ACTION_BUTTON_KINDS.map((buttonKind) => {
                    const system = BUTTON_SYSTEM[buttonKind];
                    return (
                      <td key={buttonKind}>
                        <ButtonSample
                          kind={buttonKind}
                          mode={sizeMode}
                          step={band.step}
                          label={
                            buttonKind === "primary"
                              ? "Continue"
                              : buttonKind === "secondary"
                                ? "Review"
                                : "Save"
                          }
                          onActivate={activate}
                        />
                        <span className={styles.sizeValues}>
                          {number(system.height + band.heightIncrement)}px high
                          · {number(system.fontSize + band.fontIncrement)}px
                          type
                        </span>
                        <small>
                          {number(system.padding + band.paddingIncrement)}px
                          padding / side
                          {buttonKind === "accent" && (
                            <>
                              {" · "}
                              {number(
                                getAccentButtonDimensions(band.step).radius,
                              )}
                              px radius
                            </>
                          )}
                        </small>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.caption}>
          Every row uses <code>getButtonSizeStyle(step)</code> to show that band
          inside this viewport. Type is sized directly with CSS variables. The
          examples use static paint so the comparison stays lightweight. The
          app’s Today action is fixed at 80px high with matching 21px radius;
          these specimens show the shared component sizes. Accent retains the
          fixed 80px/21px design reference. Accent radius labels round to three
          decimal places for display; the component keeps the full calculation.
        </p>
        <DeveloperCode
          label="An explicit theme and size specimen"
          language="tsx"
          code={previewCode}
        />
      </div>

      <div className={styles.chapter}>
        <Heading>States And Action Groups</Heading>
        <div className={styles.sectionToolbar}>
          <p className={styles.lead}>
            Try the ready examples, then compare pending and disabled states
            with the same label length.
          </p>
          <ThemeControl
            mode={stateMode}
            onChange={setStateMode}
            label="State and action group theme"
          />
        </div>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Button ready, pending and disabled states"
        >
          <table className={styles.stateTable}>
            <caption>One interaction contract across all three roles</caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Ready</th>
                <th scope="col">Pending</th>
                <th scope="col">Disabled</th>
              </tr>
            </thead>
            <tbody>
              {ACTION_BUTTON_KINDS.map((buttonKind) => (
                <tr key={buttonKind}>
                  <th scope="row">{BUTTON_SYSTEM[buttonKind].label}</th>
                  <td>
                    <ButtonSample
                      kind={buttonKind}
                      mode={stateMode}
                      label="Continue"
                      onActivate={activate}
                    />
                  </td>
                  <td>
                    <ButtonSample
                      kind={buttonKind}
                      mode={stateMode}
                      label="Working…"
                      pending
                      onActivate={activate}
                    />
                  </td>
                  <td>
                    <ButtonSample
                      kind={buttonKind}
                      mode={stateMode}
                      label="Continue"
                      disabled
                      onActivate={activate}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.noteGrid}>
          <div>
            <Heading level={3}>Hover, Focus And Activation</Heading>
            <p>
              Use Tab to inspect the real focus outline and Enter or Space to
              activate a ready example. Hover is an optional pointer
              enhancement; the label and shape already explain the action. Keep
              a visible verb in the accessible name and enough space around the
              focus ring.
            </p>
          </div>
          <div>
            <Heading level={3}>Pending And Disabled</Heading>
            <p>
              <code>pending</code> marks the control busy and disables
              activation while work is running. Keep its label meaningful, such
              as “Saving…”. Accent replaces its default leading pencil with a
              LoaderCircle and keeps the trailing arrow in its stable slot. A
              disabled action stays unavailable; explain the prerequisite nearby
              when the reason would otherwise be unclear.
            </p>
          </div>
        </div>
        <div className={styles.layoutGrid}>
          <article className={styles.layoutExample}>
            <Heading level={3}>A Page’s Main Invitation</Heading>
            <p>
              A single prominent next step, followed by a quieter route for
              someone who wants to review first.
            </p>
            <div className={styles.exampleActions}>
              <ButtonSample
                kind="primary"
                mode={stateMode}
                label="Log Intake"
                icon
                onActivate={activate}
              />
              <ButtonSample
                kind="secondary"
                mode={stateMode}
                label="Review details"
                onActivate={activate}
              />
            </div>
          </article>
          <article className={styles.layoutExample}>
            <Heading level={3}>A Form’s Final Decision</Heading>
            <p>
              Place a supporting choice beside the commitment. Preserve this
              reading order when the group wraps on a narrow screen. Inside a
              dialog or drawer, the Accent component adds 24px above the action;
              ordinary page actions and these specimens retain their existing
              layout spacing. The icon/label gap is 14px, and a further 12px
              inset keeps the trailing arrow away from the right edge.
            </p>
            <div className={styles.exampleActions}>
              <ButtonSample
                kind="secondary"
                mode={stateMode}
                label="Back to details"
                onActivate={activate}
              />
              <ButtonSample
                kind="accent"
                mode={stateMode}
                label="Save changes"
                icon
                onActivate={activate}
              />
            </div>
          </article>
        </div>
      </div>

      <div className={styles.chapter}>
        <Heading>Component Contract</Heading>
        <p className={styles.lead}>
          Use Button directly for ordinary controls, or a named adapter for
          contextual geometry and content slots. Main actions explicitly choose
          intake appearance; sharing one Base UI host does not require the same
          painted surface. Keep form ownership, state and accessible naming in
          the caller.
        </p>
        <DeveloperCode
          label="Primary, Secondary and Accent usage"
          language="tsx"
          code={usageCode}
        />
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Button component properties"
        >
          <table className={styles.apiTable}>
            <caption>
              Component properties · ordinary button props remain available
            </caption>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">Use</th>
                <th scope="col">Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>appearance</code>
                </th>
                <td>
                  <code>{'"standard"'}</code> by default;{" "}
                  <code>{'"intake"'}</code> for a main action
                </td>
                <td>
                  Primary and Accent opt into intake paint. A direct Button
                  can select it explicitly. Dialog submissions use the
                  TodayActionButton satin adapter at the full intake size.
                  Secondary and
                  ordinary utility controls keep standard semantic styling,
                  without the intake rim, glow or secondary icon ink.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>surface</code>
                </th>
                <td>
                  Legacy <code>{'"layered"'}</code>, <code>{'"accent"'}</code>{" "}
                  or <code>{'"solid"'}</code>
                </td>
                <td>
                  Accepted for compatibility; appearance selects the visual
                  intent. Intake actions use their solid face without mounting
                  the old gradient, tint, glaze or wash components.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>variant / size</code>
                </th>
                <td>Contextual emphasis and compact geometry</td>
                <td>
                  Standard variants keep distinct semantic styles: filled,
                  secondary, outline, ghost, destructive or link. They do not
                  acquire intake artwork. Sizes preserve the control’s context
                  instead of turning every action into a large CTA.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>children</code>
                </th>
                <td>A clear action label</td>
                <td>
                  Give the button a useful accessible name. Accent supplies its
                  leading and trailing icons; keep those out of its children.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>type</code>
                </th>
                <td>
                  <code>{'"button"'}</code> or <code>{'"submit"'}</code>
                </td>
                <td>Set it explicitly when composing a form.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>onClick</code>
                </th>
                <td>The caller’s action callback</td>
                <td>
                  Keep navigation, submission and side effects in their owning
                  flow.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>pending</code>
                </th>
                <td>Work is in progress</td>
                <td>
                  Sets aria-busy and prevents repeated activation. aria-busy
                  alone remains advisory and does not disable the action.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>disabled</code>
                </th>
                <td>The action is unavailable</td>
                <td>
                  Uses native disabled behavior; provide context where needed.
                  aria-disabled is also inert, retaining focusability by default
                  unless explicitly disabled or pending.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>radius</code>
                </th>
                <td>A numeric corner radius in px</td>
                <td>
                  Defaults to 22px for Primary and 16px for Secondary. Accent
                  derives its default from actual responsive height × 21 / 80,
                  including inside dialogs. An explicit number replaces that
                  derived value for all its paint layers.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>theme</code>
                </th>
                <td>
                  <code>{'"light"'}</code>, <code>{'"dark"'}</code>, or omitted
                </td>
                <td>
                  Sets local paint for these named adapter specimens; app
                  controls otherwise follow the resolved appearance.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>motion</code>
                </th>
                <td>
                  <code>false</code> for a static specimen
                </td>
                <td>
                  Keeps intake paint static when false. Reduced motion and
                  inactive states pause its decoration too. Standard supporting
                  controls have no continuous intake motion.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>leadingIcon / trailingIcon</code> · Accent only
                </th>
                <td>Optional React nodes or null</td>
                <td>
                  Omitted values use PencilSparkles and ArrowRight. A null value
                  deliberately suppresses that icon. The default leading glyph
                  becomes LoaderCircle while busy; custom nodes remain the
                  caller’s responsibility. Icons are decorative and do not
                  contribute duplicate accessible labels.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>finish</code> · Accent only
                </th>
                <td>
                  <code>{'"field"'}</code> or <code>{'"glazed"'}</code>
                </td>
                <td>
                  Compatibility input only. Both values render the same solid
                  action finish; the separate artwork utility still accepts its
                  own decorative finish settings.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>rim / rimThickness</code>
                </th>
                <td>Optional inward rim and explicit CSS-pixel width</td>
                <td>
                  CSS and GPU rendering consume the same width and palette. The
                  intake appearance defaults to 2px, Primary to 3px, and Today
                  explicitly requests 5.5px. The two-pixel inner band keeps a
                  one-pixel gap after that width. Standard controls have no
                  animated rim.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>gpuRim</code>
                </th>
                <td>Opt-in for the prominent native intake action</td>
                <td>
                  Defaults to false and applies only to intake appearance on a
                  native button. Other main actions use the CSS edge; standard
                  controls mount no intake renderer. The fallback remains
                  available if GPU rendering fails.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>navigation</code>
                </th>
                <td>Use with a rendered native link</td>
                <td>
                  Retains the link role, Space scrolling, Enter activation and
                  modified clicks. Combine it with nativeButton=false and the
                  actual Link or anchor; the caller keeps its navigation
                  handler.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>render / nativeButton / ref</code>
                </th>
                <td>Base UI composition</td>
                <td>
                  Preserves one host, stateful className/style callbacks, ref
                  forwarding and native keyboard semantics. A navigation Link
                  uses <code>navigation</code> and{" "}
                  <code>nativeButton={"{false}"}</code> with its rendered
                  element; do not nest interactive buttons.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>className / style</code>
                </th>
                <td>Layout and intentional overrides</td>
                <td>
                  Prefer the shared size step to separately scaling text or
                  graphics.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <details className={styles.detail}>
          <summary>Motion, rendering and a usable first paint</summary>
          <div className={styles.detailBody}>
            <p>
              Decorative layers are hidden from assistive technology and do not
              own pointer interaction. A complete CSS surface and edge are
              available at first paint. Static decorative borders need no
              canvas, GPU context or animation scheduler; functional pending
              spinners still report work in progress.
            </p>
            <p>
              The explicit intake appearance owns the opaque dark-pink face,
              Pink600 inner band at 74% and thirty-percent pink perimeter. Its
              CSS rim stays still. Today’s IntakeLaunchButton uses the check-in
              frame with a sky-to-indigo rim. Accent keeps its default icon slots and
              pending spinner, but no separate aura, gradient field or finish
              renderer. The paint-only AccentButtonSurface remains available for
              journal artwork. Visual truncation never removes the full
              accessible action text.
            </p>
            <p>
              Respect reduced motion and pause decoration for inactive states.
              Prefer a few live examples and static repeated specimens. This
              reference has six live theme previews; size, state and layout
              comparisons use <code>motion={"{false}"}</code>.
            </p>
          </div>
        </details>
        <details className={styles.detail}>
          <summary>Implementation map and review checklist</summary>
          <div className={styles.detailBody}>
            <p>
              <code>Button</code> owns the native host and standard semantic
              variants. Its opt-in intake appearance and shared stylesheet own
              the main-action face and edges. <code>BUTTON_SYSTEM</code> retains
              the adapters’ geometry and compatibility metadata;
              <code> getButtonThemeStyle(kind)</code> supplies their sizing
              variables without selecting another action renderer.
              <code> getButtonSizeStyle(step)</code> sets one shared size
              variable, bounded from 0 to 5, for an explicit specimen. The
              inspection swatches mirror the shared recipe with rounded hex
              values; the live specimens use its real theme-aware CSS tokens.
            </p>
            <dl className={styles.sourceMap}>
              <div>
                <dt>
                  <code>components/ui/button.tsx</code>
                </dt>
                <dd>
                  The single Base UI host, native composition and state
                  handling. Standard semantic variants stay undecorated; the
                  explicit intake appearance adds the shared face, edges and
                  secondary ink.
                </dd>
              </div>
              <div>
                <dt>
                  <code>lib/action-button-system.ts</code>
                </dt>
                <dd>
                  Compatibility geometry, size bands, specimen helpers and
                  independent artwork paint utilities.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/primary-button.tsx</code>
                </dt>
                <dd>
                  Main-action geometry and foreground-content adapters that
                  explicitly select intake appearance on Button.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/secondary-button.tsx</code>
                </dt>
                <dd>
                  A quiet standard secondary variant with preserved supporting
                  geometry and paired semantic ink, without intake decoration.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/accent-button.tsx</code>
                </dt>
                <dd>
                  Main-action intake appearance, default content slots, pending
                  spinner and proportional geometry. Its exported paint-only
                  surface remains available for journal artwork.
                </dd>
              </div>
            </dl>
            <p>
              Review both themes, long labels, pending and disabled states,
              keyboard focus, reduced motion and the eight size bands. At 1920px
              and 2560px, verify that button geometry stays at step 5 while the
              surrounding guide gains room.
            </p>
          </div>
        </details>
      </div>

      <GuideColorInspector
        open={inspection !== null}
        onOpenChange={(open) => {
          if (!open) setInspection(null);
        }}
        role={inspection?.role ?? firstRole}
        mode={inspection?.mode ?? mode}
        onModeChange={(theme) =>
          setInspection((current) =>
            current ? { ...current, mode: theme } : current,
          )
        }
        usage={inspection?.usage}
        layerOpacity={inspection?.layerOpacity ?? 1}
      />
    </section>
  );
}
