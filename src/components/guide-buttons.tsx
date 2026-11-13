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
  ACTION_BUTTON_TINT,
  INTAKE_ACTION_SUPPORTING_PAINT,
  ACCENT_FINISHES,
  ACCENT_SUPPORTING_PAINT,
  BUTTON_SIZE_BANDS,
  BUTTON_SYSTEM,
  getAccentButtonDimensions,
  getButtonSizeStyle,
  type AccentButtonFinish,
  type ActionButtonKind,
  type ActionButtonPaint,
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

type PaintLayer = {
  key: string;
  label: string;
  description: string;
  colors: readonly string[];
  opacity: number;
  property:
    | "base"
    | "fieldColors"
    | "diagonalColors"
    | "washColor"
    | "rimColors"
    | "tintColors"
    | "icon"
    | "text";
};
type Inspection = {
  role: GuideColorInspectorRole;
  mode: ActionButtonTheme;
  usage: string;
  layerOpacity: number;
};

function paintLayers(
  paint: ActionButtonPaint,
  kind: ActionButtonKind,
): PaintLayer[] {
  const transparentBase = /^#[\da-f]{6}00$/i.test(paint.base);
  return [
    {
      key: "base",
      label: "Base surface",
      description: transparentBase
        ? "A transparent glass foundation lets the canvas show through beneath the color field."
        : "A solid foundation supplies the starting surface beneath the decorative layers.",
      colors: [paint.base],
      opacity: 1,
      property: "base",
    },
    {
      key: "field",
      label: "Color field",
      description:
        "Radial and conic color stops give the face depth as the field moves.",
      colors: paint.fieldColors,
      opacity: paint.fieldOpacity,
      property: "fieldColors",
    },
    {
      key: "diagonal",
      label: kind === "accent" ? "Optional radial glaze" : "Diagonal veil",
      description:
        kind === "accent"
          ? `Absent from the default exposed field. The optional glazed finish adds a stationary charcoal center at ${percentage(ACCENT_FINISHES.glazed.anchorOpacity)} opacity.`
          : "A lighter diagonal gradient softens the field without changing its raw colors.",
      colors: paint.diagonalColors,
      opacity: paint.diagonalOpacity,
      property: "diagonalColors",
    },
    {
      key: "wash",
      label: kind === "accent" ? "Optional charcoal wash" : "Finishing wash",
      description:
        kind === "accent"
          ? `Absent from the default exposed field. The glazed finish adds this charcoal wash at ${percentage(ACCENT_FINISHES.glazed.washOpacity)} opacity, above the radial glaze.`
          : "A restrained top color unifies the face. Its opacity is separate from the hex value.",
      colors: [paint.washColor],
      opacity: paint.washOpacity,
      property: "washColor",
    },
    {
      key: "tint",
      label: "Mint / Emerald overlay",
      description:
        "One 13% layer combines offset radial pools and a conic field above the base field/glaze and below content and the rim. Its child drifts; the containing opacity stays fixed.",
      colors: [
        INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"],
        ...paint.rimColors,
        ACTION_BUTTON_TINT.emerald,
      ],
      opacity: ACTION_BUTTON_TINT.opacity,
      property: "tintColors",
    },
    {
      key: "rim",
      label: "Rim spectrum",
      description:
        "Three colors travel around the rounded perimeter; the center stays clear.",
      colors: paint.rimColors,
      opacity: 1,
      property: "rimColors",
    },
    {
      key: "text",
      label: "White copy",
      description:
        "The foreground sits above the painted face and retains its own full opacity.",
      colors: [paint.text],
      opacity: 1,
      property: "text",
    },
    {
      key: "icon",
      label: "Mint action icons",
      description:
        "Action icons retain the CTA Mint pigment above the tint; medication identity glyphs keep their domain colors.",
      colors: [INTAKE_ACTION_SUPPORTING_PAINT["--intake-action-accent"]],
      opacity: 1,
      property: "icon",
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
  const suffix = {
    base: "base",
    fieldColors: `field-${index + 1}`,
    diagonalColors: `diagonal-${index + 1}`,
    washColor: "wash",
    rimColors: `rim-${index + 1}`,
    tintColors: "tint-emerald",
    icon: "icon",
    text: "text",
  }[layer.property];
  return {
    id: `button-${kind}-${mode}-${layer.key}-${index}`,
    label: `${BUTTON_SYSTEM[kind].label} · ${layer.label}${stop}`,
    description: layer.description,
    token:
      layer.property === "icon" ||
      (layer.property === "tintColors" && index === 0)
        ? "--intake-action-accent"
        : layer.property === "tintColors"
          ? index === 4
            ? "--action-tint-emerald"
            : `--action-${mode}-rim-${index}`
          : `--action-${mode}-${suffix}`,
    light: color,
    dark: color,
    pairsWith: [],
  };
}

function ingredientPaint(layer: PaintLayer, kind: ActionButtonKind): string {
  const [first, second = first] = layer.colors;
  if (layer.key === "diagonal") {
    return kind === "accent"
      ? `radial-gradient(ellipse at 51% 46%, ${first}, transparent 85%)`
      : `radial-gradient(ellipse at 18% 20%, ${first}, transparent 75%), radial-gradient(ellipse at 92% 80%, ${second}, transparent 76%), linear-gradient(135deg, ${first} 8%, ${second} 92%)`;
  }
  if (layer.key === "field" || layer.key === "rim" || layer.key === "tint") {
    return `radial-gradient(ellipse at 20% 28%, ${first}, transparent 62%), conic-gradient(from 35deg at 48% 52%, ${[...layer.colors, first].join(", ")})`;
  }
  return first;
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

const usageCode = `import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { AccentButton } from "@/components/accent-button";

// A page's strongest next step.
<PrimaryButton type="button" onClick={openIntake}>
  Log Intake
</PrimaryButton>

// A supporting route alongside the commitment.
<SecondaryButton type="button" onClick={reviewDetails}>
  Review details
</SecondaryButton>

// Default Accent: exposed pigment, without a center glaze or Plum wash.
// Labels only: PencilSparkles and ArrowRight are shared defaults.
// Pending keeps a meaningful label and prevents another activation.
<AccentButton type="submit" pending={saving}>
  {saving ? "Saving…" : "Save medication"}
</AccentButton>

// Opt into a softer center over the same rotating field.
<AccentButton type="button" finish="glazed" onClick={reviewChanges}>
  Review changes
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
  const paint = BUTTON_SYSTEM[kind].themes[mode];
  const layers = paintLayers(paint, kind);
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
        Primary, Secondary and Accent share a button contract, with a distinct
        visual role for each kind of decision. Compare the real components in
        both themes, inspect the paint, then choose the smallest amount of
        emphasis that makes the next step clear.
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
          White text in both themes. Its 22px PencilSparkles and ArrowRight
          glyphs share a 2.5 stroke; the label and icons keep the same centered
          baseline as the page’s primary action.
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
                    <p>{system.description}</p>
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
          hex, RGB and opacity values. A raw color and its layer opacity stay
          separate, so a 67% field never becomes an invented replacement hex.
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
            {kind === "accent" &&
              " Accent shows the default exposed field: its optional glaze and wash are absent, represented by 0% layer opacity below."}
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
                        background: ingredientPaint(layer, kind),
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
              A gradient’s stops describe its source colors. Layer opacity
              blends that entire gradient into the surface below it. The final
              face depends on those overlaps, position and motion; a flat swatch
              represents one ingredient. Text remains above the decorative
              stack.
            </p>
          </div>
          <div>
            <Heading level={3}>Glass, Rim And Geometry</Heading>
            <p>
              This paint uses {paint.blur}px backdrop blur
              {paint.blur === 0
                ? "; the Accent’s depth comes from its own color field"
                : " beneath its layered face"}
              . A radius shapes the frame; rim thickness follows the perimeter.
              Changing the radius should preserve a clear center and a steady
              edge, including the short ends of wide buttons.
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
        <details
          className={styles.detail}
          data-card-entry="guide-button-accent-details"
        >
          <summary>
            Accent finishing details · {ACCENT_SUPPORTING_PAINT.length}{" "}
            supporting paints
          </summary>
          <div className={styles.detailBody}>
            <p>
              The six rows describe the core paint. These additional haze,
              offset-center reflections, aura, sheens and shadows add depth to
              Accent. The four anchor paints belong only to the optional glazed
              finish; the field, aura, sheens and shadows also serve the default
              exposed field. Each chip preserves the source color’s own alpha;
              the inspector applies its containing layer’s opacity separately.
              An optional anchor chip shows its glazed opacity, not a layer
              present in the default finish.
            </p>
            <div className={styles.supportingPaint}>
              {ACCENT_SUPPORTING_PAINT.map((entry) => (
                <div key={entry.id} className={styles.supportingItem}>
                  <button
                    type="button"
                    className={styles.colorStop}
                    data-guide-accent-support={entry.id}
                    data-guide-button-color={entry.color}
                    data-layer-opacity={entry.layerOpacity}
                    aria-label={`Inspect Accent ${entry.label}, ${entry.color}, ${percentage(entry.layerOpacity)} layer opacity`}
                    onClick={() =>
                      setInspection({
                        role: {
                          id: `button-accent-support-${entry.id}`,
                          label: `Accent · ${entry.label}`,
                          description: entry.placement,
                          token: `--accent-${entry.id}`,
                          light: entry.color,
                          dark: entry.color,
                          pairsWith: [],
                        },
                        mode,
                        usage: entry.placement,
                        layerOpacity: entry.layerOpacity,
                      })
                    }
                  >
                    <span
                      className={styles.colorSquare}
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                    <code>{entry.color}</code>
                    <ArrowRight size={11} aria-hidden="true" />
                  </button>
                  <div>
                    <strong>{entry.label}</strong>
                    <p>
                      {entry.placement} {percentage(entry.layerOpacity)}{" "}
                      containing-layer opacity.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <DeveloperCode
              label="Accent supporting paint values"
              language="json"
              code={JSON.stringify(ACCENT_SUPPORTING_PAINT, null, 2)}
            />
          </div>
        </details>
        <article
          className={styles.roleCard}
          data-card-entry="guide-button-accent-finishes"
        >
          <div className={styles.roleHeader}>
            <div>
              <Heading level={3}>Two Accent Finishes</Heading>
              <p>
                Both finishes share the Charcoal/Mint face, mode-aware
                Mint/Ice/Teal rim and one 13% Emerald/Mint tint. Choose{" "}
                <code>{'finish="glazed"'}</code> for a stationary{" "}
                {percentage(ACCENT_FINISHES.glazed.anchorOpacity)} center glaze
                and a {percentage(ACCENT_FINISHES.glazed.washOpacity)} charcoal
                wash. Both specimens use the current paint theme, base size and
                the same initial field phase with motion paused.
              </p>
              <p>
                With motion enabled, the field turns once every 26 seconds; the
                rim turns independently every 8 seconds. Choosing a finish
                changes the overlays, while both rotations retain their own
                timing and geometry.
              </p>
            </div>
          </div>
          <div className={styles.themePair}>
            {(
              [
                "field",
                "glazed",
              ] as const satisfies readonly AccentButtonFinish[]
            ).map((finish) => (
              <div
                key={finish}
                className={styles.themeCanvas}
                data-guide-button-theme={mode}
                style={{
                  backgroundColor: APP_THEME_VALUES[mode].background,
                }}
              >
                <span className={styles.themeLabel}>
                  {ACCENT_FINISHES[finish].label}
                  {finish === "field" ? " · default" : " · opt-in"}
                </span>
                <div className={styles.liveSample}>
                  <AccentButton
                    type="button"
                    theme={mode}
                    finish={finish}
                    motion={false}
                    className={styles.sampleButton}
                    style={getButtonSizeStyle(0)}
                    onClick={() =>
                      activate(`${ACCENT_FINISHES[finish].label} finish`)
                    }
                    data-guide-button-sample="accent"
                    data-guide-button-step={0}
                  >
                    Save changes
                  </AccentButton>
                </div>
                <span className={styles.canvasNote}>
                  {percentage(ACCENT_FINISHES[finish].anchorOpacity)} glaze
                  {" · "}
                  {percentage(ACCENT_FINISHES[finish].washOpacity)} wash
                  {" · static field phase 0"}
                </span>
              </div>
            ))}
          </div>
        </article>
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
          frame, rim and aura share the effective outer radius; the inset face
          uses that radius minus its 1.5px inset. This default follows the
          actual responsive button height even inside a dialog. An explicit
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
          Import the named component for the role. Keep form ownership, action
          state and accessible naming in the caller; the component supplies its
          shared button behavior, paint and responsive geometry.
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
                  Primary / Secondary: <code>{'"layered"'}</code> (default) or{" "}
                  <code>{'"accent"'}</code>
                </td>
                <td>
                  Accent reuses the charcoal rotating field, 13% Mint/Emerald
                  tint, sheen, White copy and Mint/Ice/Teal rim while preserving
                  the button’s size, content and SpecularRim. Today’s Log Intake
                  opts into this same surface. Exact light and dark stops are
                  shown in the live paint stack above and come from
                  BUTTON_SYSTEM; no separate hard-coded recipe is required here.
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
                  Defaults to the exposed field, with no glaze or wash nodes.
                  Glazed adds a 72% stationary center and 12% Plum wash over the
                  same pigment field.
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
              Accent defines the same complete Charcoal/Mint paint as Log Intake
              before first render. Its centered 190% square near-charcoal field
              begins at 12 degrees and rotates once every 26 seconds; the inward
              3px rim has an independent eight-second turn. One tint element
              above the field/glaze combines the icon Mint, the current rim
              pigments and Tailwind emerald-500 at exactly 13% opacity. Its
              child drifts over 16 seconds without changing that opacity. The
              exposed finish omits the optional glaze and wash nodes. White copy
              and Mint action icons stay above the paint at full visibility. The
              shared model, CSS-first edge, journal writing action and generic
              filled controls all use these colors while retaining their own
              existing dimensions, content and interaction behavior. Fuchsia
              remains available to check-in/decorative artwork and semantic
              compatibility roles. The 14.25px label uses 700 weight; visual
              truncation preserves the full accessible action text.
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
              <code>BUTTON_SYSTEM</code> supplies the palette and role metadata.
              <code> getButtonThemeStyle(kind)</code> defines both theme
              palettes as CSS variables; the component selects the active mode.
              <code> getButtonSizeStyle(step)</code> sets one shared size
              variable, bounded from 0 to 5, for an explicit specimen.
              <code> ACCENT_FINISHES</code> defines the two overlay choices;
              <code> getAccentFinishStyle(finish)</code> applies their opacity
              values to both theme palettes.
            </p>
            <dl className={styles.sourceMap}>
              <div>
                <dt>
                  <code>lib/action-button-system.ts</code>
                </dt>
                <dd>
                  Role metadata, both theme palettes, size bands and specimen
                  helpers.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/primary-button.tsx</code>
                </dt>
                <dd>
                  The main layered action and shared Primary/Secondary
                  interaction contract.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/secondary-button.tsx</code>
                </dt>
                <dd>
                  The supporting role, composed from the shared layered action.
                </dd>
              </div>
              <div>
                <dt>
                  <code>components/accent-button.tsx</code>
                </dt>
                <dd>
                  The exposed charcoal field, optional glazed center,
                  independent rim and explicit action state.
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
