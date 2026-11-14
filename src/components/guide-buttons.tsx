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
  type ActionButtonKind,
  type ActionButtonTheme,
} from "@/lib/action-button-system";
import { APP_HARMONY, APP_THEME_VALUES, mixAppColors } from "@/lib/app-theme";
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

type ButtonPaint = {
  base: string;
  innerEdge: string;
  rimColors: readonly string[];
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
    "Prominent geometry for the strongest next step, using the same solid face and rim as every other action.",
  secondary:
    "Compact supporting geometry on the same renderer, without a separate button paint recipe.",
  accent:
    "A commitment adapter with default leading and trailing icons, shared solid paint and responsive proportions.",
};

/** Rounded inspection swatches mirror shared-button.module.css, not a second renderer. */
function buttonPaint(mode: ActionButtonTheme): ButtonPaint {
  return {
    base: mixAppColors("#3c0366", APP_THEME_VALUES[mode].background, 0.4),
    innerEdge: "#7008e7",
    rimColors: ["#f9a8d4", "#d8b4fe", "#f0abfc"],
    text: APP_THEME_VALUES[mode].foreground,
    icon: mixAppColors("#4e456e", APP_HARMONY.rose, 0.94),
  };
}

function paintLayers(paint: ButtonPaint): PaintLayer[] {
  return [
    {
      key: "base",
      label: "Solid face",
      description:
        "Purple 950 at a forty-percent share mixes with the mode’s opaque canvas. There is no rotating field, glaze or tint layer.",
      colors: [paint.base],
      opacity: 1,
    },
    {
      key: "innerEdge",
      label: "Violet inner edge",
      description:
        "A two-pixel Violet 700 band sits one pixel inside the moving outer rim. Both edges paint inward without enlarging the control.",
      colors: [paint.innerEdge],
      opacity: 1,
    },
    {
      key: "rimColors",
      label: "Moving Pink rim",
      description:
        "Pink 300, Purple 300 and Fuchsia 300 circulate at thirty-percent opacity. Compact controls use the shared CSS rim; Today’s prominent action opts into its GPU equivalent.",
      colors: paint.rimColors,
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
      label: "Mug-base secondary ink",
      description:
        "Action icons and secondary CTA copy use the coffee tile’s base: #4e456e at ninety-four percent mixed with Rose. Medication artwork keeps its own pigments.",
      colors: [paint.icon],
      opacity: 1,
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
  const token = {
    base: "--button-face",
    innerEdge: "--button-edge",
    rimColors: `--action-rim-${index + 1}`,
    icon: "--daily-action-secondary-ink",
    text: "--button-copy",
  }[layer.key];
  return {
    id: `button-${kind}-${mode}-${layer.key}-${index}`,
    label: `${BUTTON_SYSTEM[kind].label} · ${layer.label}${stop}`,
    description: layer.description,
    token,
    light: color,
    dark: color,
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

// Compact actions use the same renderer directly.
<Button type="button" size="sm" onClick={reviewDetails}>
  Review
</Button>

// A page's strongest next step.
<PrimaryButton type="button" onClick={openIntake}>
  Log Intake
</PrimaryButton>

// A supporting route alongside the commitment.
<SecondaryButton type="button" onClick={reviewDetails}>
  Review details
</SecondaryButton>

// Accent adds content slots, not a different paint renderer.
// Labels only: PencilSparkles and ArrowRight are shared defaults.
// Pending keeps a meaningful label and prevents another activation.
<AccentButton type="submit" pending={saving}>
  {saving ? "Saving…" : "Save Medication"}
</AccentButton>

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
  const paint = buttonPaint(mode);
  const layers = paintLayers(paint);
  const firstRole = colorRole(kind, mode, layers[0], paint.base, 0);
  const activate = (label: string) =>
    setFeedback(`“${label}” preview activated.`);

  function inspect(layer: PaintLayer, color: string, index: number) {
    setInspection({
      role: colorRole(kind, mode, layer, color, index),
      mode,
      usage: `${BUTTON_SYSTEM[kind].label}, ${mode} theme. ${layer.label} is painted at ${percentage(layer.opacity)} layer opacity. This is one raw color stop; the complete button combines the layers shown in the reference.`,
      layerOpacity: layer.opacity,
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
        One canonical Button renderer supplies every action’s solid face, inward
        edges and native behavior. Primary, Secondary and Accent retain their
        contextual geometry and content slots. Compare the real adapters in both
        themes, then choose the smallest useful size and emphasis.
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
          foreground text. Its 22px PencilSparkles and ArrowRight glyphs use the
          coffee tile’s base pigment and share a 2.5 stroke. Every preview uses
          the shared solid paint and CSS rim; their native labels, focus and
          activation remain available.
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
          representation of the shared forty-percent Purple / canvas mix. Rim
          source colors and their thirty-percent layer opacity stay separate.
          The controls themselves use the real shared CSS tokens.
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
              The face mixes forty percent Purple 950 with sixty percent opaque
              canvas; that is a color recipe, not forty-percent element opacity.
              The moving rim is a separate thirty-percent layer. Primary copy
              and mug-base secondary ink retain their own colors above the face.
              Medication identity glyphs keep their domain pigments.
            </p>
          </div>
          <div>
            <Heading level={3}>One Face, Two Inward Edges</Heading>
            <p>
              The opaque face needs no backdrop blur. Compact Button controls
              default to a 2px outer rim; Primary and Secondary adapters retain
              their 3px geometry. Today uses 5.5px at the same 74px height and
              19.425px radius. A 1px face-colored gap precedes the shared 2px
              Violet band. CSS paints the rim by default; only the main intake
              action opts into GPU rendering, with the same CSS fallback.
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
            code={JSON.stringify(paint, null, 2)}
          />
        </details>
        <details className={styles.detail}>
          <summary>Legacy finish inputs and decorative artwork</summary>
          <div className={styles.detailBody}>
            <p>
              Existing <code>surface</code> and <code>finish</code> props remain
              accepted so saved examples and callers keep compiling. They no
              longer select different button backgrounds: Primary, Secondary,
              Accent and DialogPrimaryButton all delegate to the canonical
              <code> Button</code> renderer. The separate
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
          app’s Today action is fixed at 74px high with a proportional 19.425px
          radius; these specimens show the shared component sizes. Accent
          retains the fixed 80px/21px design reference. Accent radius labels
          round to three decimal places for display; the component keeps the
          full calculation.
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
          Use Button directly for compact actions, or a named adapter for its
          contextual geometry and content slots. Keep form ownership, action
          state and accessible naming in the caller. Every path delegates to one
          Base UI host with the same solid surface and inward-edge renderer.
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
                  <code>surface</code>
                </th>
                <td>
                  Legacy <code>{'"layered"'}</code>, <code>{'"accent"'}</code>{" "}
                  or <code>{'"solid"'}</code>
                </td>
                <td>
                  Accepted for compatibility; all values use the same solid
                  daily-action face. They do not mount the old gradient, tint,
                  glaze or wash components.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>variant / size</code>
                </th>
                <td>Contextual emphasis and compact geometry</td>
                <td>
                  Ordinary actions share one palette and renderer. Ghost keeps a
                  quiet edge, Link keeps a text presentation, and Destructive
                  retains its semantic edge color. Sizes preserve the control’s
                  context instead of turning every action into a large CTA.
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
                <td>Sets busy state and prevents repeated activation.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>disabled</code>
                </th>
                <td>The action is unavailable</td>
                <td>
                  Uses native disabled behavior; provide context where needed.
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
                <td>Forces a local specimen or follows the system theme.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>motion</code>
                </th>
                <td>
                  <code>false</code> for a static specimen
                </td>
                <td>
                  Retains a painted button without continuous decorative motion.
                  Reduced motion and inactive states pause the shared rim too.
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
                  primitive defaults to 2px, Primary and Secondary to 3px, and
                  Today explicitly requests 5.5px. The two-pixel inner band
                  keeps a one-pixel gap after that width.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <code>gpuRim</code>
                </th>
                <td>Opt-in for the prominent native intake action</td>
                <td>
                  Defaults to false. Compact, repeated and link actions use the
                  same CSS rim without allocating a graphics context. The CSS
                  edge remains available if GPU rendering fails.
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
                  uses <code>nativeButton={"{false}"}</code> with its rendered
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
              own pointer interaction. A complete CSS surface and fallback edge
              are available before animated rendering. The text stays on a
              separate foreground layer, so a moving highlight cannot change the
              meaning or availability of the action.
            </p>
            <p>
              The canonical renderer owns the opaque Purple/canvas face, Violet
              inner band and thirty-percent Pink/Purple/Fuchsia perimeter. Its
              CSS rim makes one turn every 6.8 seconds. Today alone opts into
              SpecularRim for the equivalent GPU edge; when that canvas renders,
              the adjacent CSS fallback becomes invisible. The main CTA’s icons
              and “Jot it!” use the coffee tile’s base pigment, independently of
              its primary label. Accent keeps its default icon slots and pending
              spinner, but no separate aura, gradient field or finish renderer.
              The paint-only AccentButtonSurface remains available for journal
              artwork. Visual truncation never removes the full accessible
              action text.
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
              <code>Button</code> and its shared stylesheet own production
              painting and native behavior. <code>BUTTON_SYSTEM</code> retains
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
                  The single Base UI host, native composition, state handling
                  and CSS-first rim. The shared-button stylesheet owns its face,
                  inner edge, secondary ink and per-variant emphasis.
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
                  Primary/Secondary geometry and foreground-content adapters
                  that delegate to the canonical Button.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/secondary-button.tsx</code>
                </dt>
                <dd>
                  The supporting role, composed from the same geometry adapter.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/accent-button.tsx</code>
                </dt>
                <dd>
                  Default content slots, pending spinner and proportional
                  geometry on the same renderer. Its exported paint-only surface
                  remains available for journal artwork.
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
