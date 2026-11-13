import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { DeveloperCode } from "@/components/developer-code";
import { GuideColors } from "@/components/guide-colors";
import { GuideButtons } from "@/components/guide-buttons";
import { GuideOutline } from "@/components/guide-outline";
import { GuideResponsiveReference } from "@/components/guide-responsive-reference";
import { GuideContentSpacing } from "@/components/guide-content-spacing";
import { GuideDialogShape } from "@/components/guide-dialog-shape";
import { GuideMenuSurfaces } from "@/components/guide-menu-surfaces";
import { guideHeadingId } from "@/lib/guide-outline";
import {
  APP_PALETTE,
  APP_THEME_GROUPS,
  APP_THEME_TOKENS,
  APP_THEME_VALUES,
  type AppThemeMode,
} from "@/lib/app-theme";
import {
  CONTRIBUTION_STEPS,
  DEVELOPER_REPOSITORY,
  DEVELOPER_SECTIONS,
  GENERATED_ASSETS_EXAMPLE,
  LOCAL_SETUP_EXAMPLE,
  MOTION_EXAMPLE,
  SOURCE_GROUPS,
  TAILWIND_THEME_EXAMPLE,
  THEME_USAGE_EXAMPLE,
  THEME_WORKFLOW_EXAMPLE,
  VALIDATION_EXAMPLE,
  developerSource,
} from "@/lib/developer-guide";
import { MEDICATION_COLORS } from "@/lib/medication-appearance";
import { SVG_ICON_CATALOG } from "@/lib/svg-icon-catalog";
import styles from "./developer-guide.module.css";

function Section({
  id,
  number,
  title,
  context,
  icon,
  children,
}: {
  id: string;
  number: string;
  title: string;
  context: string;
  icon: ActionIconName;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHeading}>
        <h2
          id={`${id}-title`}
          data-guide-outline-level="1"
          data-guide-outline-label={title}
          data-guide-outline-target={id}
        >
          <ActionIcon name={icon} className="size-[18px]" />
          {title}
        </h2>
        <span>
          <b>{number}</b> / {context}
        </span>
      </div>
      {children}
    </section>
  );
}

function ExternalLink({
  href,
  children,
  className = styles.textLink,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      data-card-entry={className === styles.resourceLink || undefined}
    >
      {children}
      <ActionIcon name="external" className="size-3.5" />
    </a>
  );
}

function Detail({
  title,
  context,
  children,
  open = false,
}: {
  title: string;
  context?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      id={guideHeadingId("developer-detail", title)}
      className={styles.detail}
      open={open}
      data-guide-outline-anchor
      data-card-entry
    >
      <summary
        data-guide-outline-level="2"
        data-guide-outline-label={title}
        data-guide-outline-target={guideHeadingId("developer-detail", title)}
      >
        <span>{title}</span>
        {context && <small>{context}</small>}
        <ActionIcon name="expand" className={styles.detailCaret} />
      </summary>
      <div className={styles.detailBody}>{children}</div>
    </details>
  );
}

function ModeSpecimen({ mode }: { mode: AppThemeMode }) {
  const Icon = mode === "light" ? SunIcon : MoonStarsIcon;
  const theme = Object.fromEntries(
    Object.entries(APP_THEME_VALUES[mode]).map(([token, value]) => [
      `--${token}`,
      value,
    ]),
  ) as CSSProperties;
  return (
    <div className={styles.modeSpecimen} style={theme} data-example-mode={mode}>
      <div className={styles.modeLabel}>
        <Icon size={15} weight="bold" aria-hidden="true" />
        {mode === "light" ? "Light" : "Dark"}
        <span>Same Roles</span>
      </div>
      <div className={styles.sampleCard}>
        <div className={styles.sampleTop}>
          <span className={styles.sampleIcon}>
            <ActionIcon name="medications" />
          </span>
          <div>
            <strong>Sample Entry</strong>
            <small>Reading Surface / Card Text</small>
          </div>
          <span className={styles.sampleTag}>Tablet</span>
        </div>
        <p>Color gives it character. The paired text role keeps it readable.</p>
        <div className={styles.sampleFooter}>
          <span>09:00 / Example</span>
          <strong>
            1 <small>mg</small>
          </strong>
        </div>
      </div>
      <div
        className={styles.sampleActions}
        aria-label="Illustrative action styles"
      >
        <span className={styles.samplePrimary}>
          Primary Action <span>↗</span>
        </span>
        <span className={styles.sampleSecondary}>Secondary</span>
      </div>
      <p className={styles.sampleCaption}>
        Static component specimen / live token values
      </p>
    </div>
  );
}

export function DeveloperGuidePage() {
  return (
    <article
      className={styles.page}
      data-developer-guide
      data-guide-page="developer"
    >
      <GuideOutline>
        <header className={styles.intro}>
          <span className={styles.eyebrow}>
            <CodeIcon size={20} weight="regular" aria-hidden="true" />
            Pill Happens / Build Notes
          </span>
          <h1>Developer guide</h1>
          <p>
            A practical reference for the design and code behind the journal.
            Explore the live palette, see how semantic colors become readable
            surfaces, and follow the conventions for typography, responsive
            layouts, motion and reusable components. Working examples and source
            links connect each decision to its implementation. Whether you are
            adjusting a small detail or preparing a contribution, start with the
            foundation, inspect the relevant pattern, and use the validation
            notes to check the result.
          </p>
          <div
            className={styles.paletteRibbon}
            aria-label="Application palette"
          >
            {APP_PALETTE.map((color) => (
              <span
                key={color.id}
                style={{ backgroundColor: color.hex }}
                title={`${color.name} ${color.hex}`}
              />
            ))}
          </div>
          <dl className={styles.atAGlance}>
            <div>
              <dt>Brand Colors</dt>
              <dd>
                {APP_PALETTE.length}
                <small>Shared Foundation</small>
              </dd>
            </div>
            <div>
              <dt>Theme Roles</dt>
              <dd>
                {APP_THEME_TOKENS.length}
                <small>Two Device Modes</small>
              </dd>
            </div>
            <div>
              <dt>Medication Colors</dt>
              <dd>
                {MEDICATION_COLORS.length}
                <small>Separate Accent Library</small>
              </dd>
            </div>
          </dl>
        </header>

        <details className={styles.contentsBox} open data-guide-inline-contents>
          <summary>
            <span>
              <ActionIcon name="discover" className="size-4" />
              On This Page
            </span>
            <small>{DEVELOPER_SECTIONS.length} Sections</small>
            <ActionIcon name="expand" className={styles.detailCaret} />
          </summary>
          <nav
            className={styles.contents}
            aria-label="Developer Guide Contents"
          >
            {DEVELOPER_SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </details>

        <Section
          id="foundation"
          number="01"
          title="A Small, Shared Foundation"
          context="Start Here"
          icon="flower"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              Plum <code>#2b233e</code> and Lilac <code>#b7a4e5</code> form the
              shared foundation. Apricot <code>#f2b88f</code> supplies warmth,
              with related Rose, Iris and Mint reflections adding variety. Black{" "}
              <code>#111014</code> and White
              <code> #ffffff</code> provide neutral contrast. The canonical
              pigments live in <code>src/lib/app-theme.ts</code>; semantic roles
              turn them into surfaces, readable copy, boundaries, actions and
              feedback.
            </p>
            <div className={styles.principleGrid}>
              <div>
                <ActionIcon name="calendar" />
                <h3
                  id={guideHeadingId("developer-card", "Useful First")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Useful First"}
                >
                  Useful First
                </h3>
                <p>
                  Make the next daily action easy to find. Keep quantities,
                  times and editing behavior clear.
                </p>
              </div>
              <div>
                <ActionIcon name="sparkle" />
                <h3
                  id={guideHeadingId(
                    "developer-card",
                    "Character In The Details",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Character In The Details"}
                >
                  Character In The Details
                </h3>
                <p>
                  Use color, small icons and deliberate movement around a
                  compact, predictable structure.
                </p>
              </div>
              <div>
                <ActionIcon name="settings" />
                <h3
                  id={guideHeadingId("developer-card", "One Source Of Truth")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"One Source Of Truth"}
                >
                  One Source Of Truth
                </h3>
                <p>
                  Reuse theme roles, stored appearance IDs and domain helpers
                  instead of creating parallel rules.
                </p>
              </div>
            </div>
            <p>
              Appearance can follow the device or use an explicit Light or Dark
              choice. These local guide previews do not change that preference.
              The same semantic roles work in either mode, while saved
              medication colors remain part of each medication’s identity.
            </p>
          </div>
        </Section>

        <Section
          id="colors"
          number="02"
          title="Colors & Appearance"
          context="Inspect & Copy"
          icon="log"
        >
          <p className={styles.sectionIntro}>
            Every value below comes from the application’s current theme data.
            Copy a brand swatch, inspect a role in either mode, or export the
            full CSS and JSON. Alpha is preserved in values that include
            transparency.
          </p>
          <div className={styles.readingCard} data-card-entry>
            <h3 id="theme-shared-layout" data-guide-outline-level="2">
              One Theme, Three Page Widths
            </h3>
            <p>
              Use <code>--background</code>, <code>--card</code>, their paired
              foregrounds and <code>--border</code> for the interface. Plum and
              Lilac provide depth; Apricot and restrained Rose add warmth, while
              Iris and Mint supply small cool highlights. Black and White keep
              copy and branding clear. Medication artwork and manually assigned
              category markers remain recognizable domain information, rather
              than becoming alternate interface themes.
            </p>
            <div className={styles.principleGrid}>
              <div>
                <h4>Timeline · 510px</h4>
                <p>
                  Today and individual history days keep the compact daily-log
                  width. Time, medication and dose stay easy to scan together.
                </p>
              </div>
              <div>
                <h4>Browsing · 760px</h4>
                <p>
                  Collections gain room for comparison. A shared PageHeading
                  aligns the icon, context, title, description and optional
                  actions; PageSurface supplies the quiet supporting panel.
                </p>
              </div>
              <div>
                <h4>Guides · Responsive</h4>
                <p>
                  The guide shell keeps its wider breakpoint caps and outside
                  contents rail. Documentation width does not enlarge the daily
                  timeline or change card geometry.
                </p>
              </div>
            </div>
            <p>
              Canonical pigments are exported as <code>APP_FOUNDATION</code>
              and <code>--palette-plum</code>, <code>--palette-lilac</code>,
              <code> --palette-apricot</code>, <code>--palette-black</code> and
              <code> --palette-white</code>. Legacy palette identifiers remain
              compatibility aliases; they are not additional colors.
              <code> APP_HARMONY</code> adds Rose <code>#f9a8d4</code>, Iris{" "}
              <code>#b7c9f5</code> and Mint <code>#a7e4cf</code>, exposed as
              <code> --palette-rose</code>, <code>--palette-iris</code> and
              <code> --palette-mint</code>. The {APP_THEME_TOKENS.length}
              semantic roles and their paired contrast checks stay the single
              source for both light and dark appearances.
            </p>
          </div>
          <div className={styles.colorReference}>
            <GuideColors />
          </div>
          <div className={styles.note}>
            <ActionIcon name="flower" className="size-4" />
            <p>
              The five foundation pigments, three related Harmony tones and the{" "}
              {MEDICATION_COLORS.length} medication swatches serve different
              purposes. Medication colors identify saved items; application
              roles organize the interface.
            </p>
          </div>
        </Section>

        <Section
          id="roles"
          number="03"
          title="Style Through Roles"
          context="Meaning Before Hue"
          icon="settings"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              Choose a role for the job a component performs, then pair it with
              its reading color. A primary action can be light in one mode and
              warm in another; its importance remains the same. A color name
              alone does not tell you which text belongs on it.
            </p>
            <dl className={styles.roleIndex}>
              {APP_THEME_GROUPS.map((group) => (
                <div key={group.id}>
                  <dt
                    id={`developer-role-group-${group.id}`}
                    data-guide-outline-level="2"
                    data-guide-outline-label={group.label}
                  >
                    {group.label}
                    <b>
                      {
                        APP_THEME_TOKENS.filter(
                          (role) => role.group === group.id,
                        ).length
                      }
                    </b>
                  </dt>
                  <dd>{group.description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={styles.detailGroup}>
            <Detail
              title="Surface & Reading Pairs"
              context="The First Choice"
              open
            >
              <p>
                Use <code>--card</code> with <code>--card-foreground</code> and
                <code> --popover</code> with <code>--popover-foreground</code>.
                Long instructions use <code>--surface-reading</code> and
                <code> --surface-reading-foreground</code>. Raised, sunken and
                inverse surfaces each have their own foreground partner.
              </p>
              <p>
                Text directly over the animated field uses
                <code> --canvas-foreground</code> or
                <code> --canvas-muted-foreground</code>. A general muted reading
                color can disappear when moved from a card to the canvas.
              </p>
            </Detail>
            <Detail title="Actions, Focus & Feedback" context="Clear Intent">
              <p>
                Shared filled buttons use getButtonThemeStyle() for their
                Charcoal/Mint action paint and 13% tint. The existing
                <code> --action-background</code> /{" "}
                <code>--action-foreground</code>
                roles retain Fuchsia/White for compatibility with check-in and
                decorative surfaces. Other supporting controls use
                <code> --secondary</code> with
                <code> --secondary-foreground</code>. Component paint remains
                independent from geometry and semantic feedback colors.
              </p>
              <p>
                Keep keyboard focus visible through <code>--ring</code>. Borders
                and inputs use their dedicated roles. Success, warning, info and
                destructive treatments have paired foregrounds; include a label
                or icon so color is not the only signal.
              </p>
            </Detail>
            <Detail
              title="Transparent Values Need A Backdrop"
              context="Alpha Matters"
            >
              <p>
                An eight-digit hex value includes alpha: the last pair controls
                opacity. The same wash will look different on White, Plum, a
                card, or the moving field. The inspector displays the exact
                value and opacity rather than replacing it with an opaque
                approximation.
              </p>
              <p>
                Layer order matters too. A 30% overlay above a 75% gradient does
                not have the same result as putting those layers in the opposite
                order. Review the finished composite with its real text.
              </p>
            </Detail>
          </div>
        </Section>

        <Section
          id="setup"
          number="04"
          title="Theme Setup & Changes"
          context="Source → Generate → Use"
          icon="retry"
        >
          <div
            className={styles.flow}
            aria-label="Theme generation flow"
            data-card-entry
          >
            <span>
              <b>01</b> app-theme.ts<small>Palette + Roles</small>
            </span>
            <ActionIcon name="next" className="size-4" />
            <span>
              <b>02</b> theme:generate<small>CSS + Offline Theme</small>
            </span>
            <ActionIcon name="next" className="size-4" />
            <span>
              <b>03</b> Components<small>Semantic Variables</small>
            </span>
          </div>
          <div className={styles.readingCard} data-card-entry>
            <p>
              <code>src/app/globals.css</code> imports Tailwind, the animation
              utilities and generated <code>theme.css</code>. Its
              <code> @theme inline</code> mapping exposes the CSS roles as
              Tailwind utilities such as <code>bg-card</code>,
              <code> text-card-foreground</code> and <code>border-border</code>.
            </p>
            <p>
              Make a shared color change in <code>app-theme.ts</code>, then
              regenerate. The generator updates the application stylesheet and
              the theme block in the public offline page. Editing generated CSS
              directly creates drift that <code>theme:check</code> detects.
            </p>
          </div>
          <DeveloperCode
            label="Change The Shared Theme"
            language="Shell"
            code={THEME_WORKFLOW_EXAMPLE}
          />
          <DeveloperCode
            label="Use A Paired Reading Surface"
            language="CSS"
            code={THEME_USAGE_EXAMPLE}
          />
          <DeveloperCode
            label="Use The Same Roles In Tailwind"
            language="JSX"
            code={TAILWIND_THEME_EXAMPLE}
          />
          <p className={styles.sourceNote}>
            The full live CSS and JSON exports are available in{" "}
            <a href="#colors">Colors & Appearance</a>.
          </p>
        </Section>

        <Section
          id="specimens"
          number="05"
          title="The Palette In Context"
          context="Light / Dark"
          icon="navToday"
        >
          <p className={styles.sectionIntro}>
            The same roles, with their two current sets of values. These small
            specimens show reading hierarchy, card edges and primary versus
            secondary action surfaces together.
          </p>
          <div className={styles.modeGrid}>
            <ModeSpecimen mode="light" />
            <ModeSpecimen mode="dark" />
          </div>
          <div
            className={styles.tryLinks}
            aria-label="See The Components In The App"
          >
            <Link href="/">
              <ActionIcon name="navToday" className="size-3.5" />
              Try The Daily Log
              <ActionIcon name="next" className="size-3.5" />
            </Link>
            <Link href="/medications">
              <ActionIcon name="navMedications" className="size-3.5" />
              Medication Appearance
              <ActionIcon name="next" className="size-3.5" />
            </Link>
          </div>
          <div className={styles.note}>
            <ActionIcon name="discover" className="size-4" />
            <p>
              Inspect the entire component in each mode. A readable isolated
              swatch does not describe a translucent card over an animated
              background, a focused control, or a disabled action.
            </p>
          </div>
        </Section>

        <Section
          id="typography"
          number="06"
          title="Typography, Shape & Rhythm"
          context="Compact By Design"
          icon="record"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              The application uses the platform’s system sans-serif stack:
              <code>
                {" "}
                ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                &quot;Segoe UI&quot;, sans-serif
              </code>
              . Headings stay compact and slightly heavier; context stays
              smaller, quieter and separated with a dot or slash.
            </p>
            <div className={styles.typeSpecimen}>
              <span className={styles.specimenEyebrow}>Heading / Context</span>
              <div className={styles.typeHeading}>
                A Familiar Space <span>· Every Day</span>
              </div>
              <div className={styles.typeRow}>
                <strong>
                  3 days <span>/ in a row</span>
                </strong>
                <small>Small Details Matter</small>
              </div>
              <p>
                Use enough line height for instructions, and keep values aligned
                with their labels.
              </p>
              <code>--surface-reading / 0123456789</code>
            </div>
            <dl className={styles.referenceList}>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Headings")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Headings"}
                >
                  Headings
                </dt>
                <dd>
                  Guide heroes scale from 40px to 80px, while ordinary page
                  titles retain their compact 24px treatment. Sections and
                  nested headings step down clearly in size and weight.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Body & Context")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Body & Context"}
                >
                  Body & Context
                </dt>
                <dd>
                  Use readable body copy for explanations. Reserve the smallest
                  type for short secondary labels.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Numbers")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Numbers"}
                >
                  Numbers
                </dt>
                <dd>
                  Tabular numerals keep changing counts and times steady.
                  Include the unit and distinguish quantity from dose.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Alignment")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Alignment"}
                >
                  Alignment
                </dt>
                <dd>
                  Center icons, labels, separators and values on a shared row.
                  Shared medication cards keep exactly two single-line rows.
                  Long names truncate before reaching the reserved action gap.
                </dd>
              </div>
            </dl>
          </div>
          <div className={styles.shapeCard} data-card-entry>
            <div className={styles.shapeHeading}>
              <h3
                id={guideHeadingId(
                  "developer-card",
                  "A Small Family Of Shapes",
                )}
                data-guide-outline-level="2"
                data-guide-outline-label={"A Small Family Of Shapes"}
              >
                A Small Family Of Shapes
              </h3>
              <span>Theme Base / Dialog Roles</span>
            </div>
            <div className={styles.radiusSamples}>
              <div style={{ borderRadius: 8 }}>
                <b>8</b>
                <span>Compact Choice</span>
              </div>
              <div style={{ borderRadius: 12 }}>
                <b>12</b>
                <span>Dialog Control</span>
              </div>
              <div style={{ borderRadius: 16 }}>
                <b>16</b>
                <span>Theme Base</span>
              </div>
              <div style={{ borderRadius: 21 }}>
                <b>21</b>
                <span>Card / Dialog Surface</span>
              </div>
            </div>
            <p>
              The generated <code>1rem</code> base still supplies Tailwind’s
              general radius roles. Dialogs use an explicit rounded-rectangle
              policy: the intake card’s 21px outer curve, 12px standard controls
              and 8px compact choices. Height, padding and protected content
              gaps keep their separate roles. The complete dialog reference
              below explains that relationship and how nested borders follow it.
            </p>
            <div
              className={styles.spacingSamples}
              aria-label="Spacing examples in pixels"
            >
              {[4, 8, 12, 16, 24, 32].map((space) => (
                <span key={space}>
                  <i style={{ width: space }} />
                  <b>{space}</b>
                </span>
              ))}
            </div>
            <p className={styles.caption}>
              Structural spacing for insets and sections. Protected inline
              relationships use the separate three-tier system below.
            </p>
          </div>
          <GuideContentSpacing />
          <GuideDialogShape />
        </Section>

        <GuideResponsiveReference />
        <GuideButtons />

        <Section
          id="layers"
          number="09"
          title="Layers, Glass & Light"
          context="Build The Composite"
          icon="sparkle"
        >
          <div className={styles.detailGroup}>
            <Detail
              title="The Log Intake Button"
              context="Primary / Secondary / Accent"
              open
            >
              <p>
                Primary, Secondary, Accent and ordinary filled actions share the
                Log Intake paint in both themes: a Charcoal #1d161e base, White
                copy, Electric Mint #9fffd1 action icons and mode-aware
                Mint/Ice/Teal rim colors. One separate overlay combines offset
                radial pools and a conic field of those icon/rim pigments plus
                Tailwind emerald-500, at exactly 13% opacity. This opacity is
                applied once to the tint layer; text, icons and the border
                retain their own full visibility. The field, optional glaze,
                tint, edge and content remain independent paint layers. Shared
                components retain their existing heights, corner radii, padding,
                labels, glyphs, pending/disabled behavior and event handlers.
                Fuchsia remains available to the established check-in artwork
                and semantic compatibility roles rather than coloring these
                filled actions.
              </p>
              <p>
                The{" "}
                <a href="#buttons">Buttons &amp; Action Hierarchy reference</a>
                shows both themes, every responsive size, the actual layer
                values, component contracts and inspectable color stops. Keep
                that shared reference beside the implementations when changing a
                paint recipe.
              </p>
              <p>
                A surface can clip its own pigment while surrounding light
                remains on a separate paint plane. The constant-width edge is
                measured in visible CSS pixels; moving light changes its color
                and luminance. This keeps rounded geometry and readable content
                independent of decorative motion. Focus, pending and disabled
                behavior belong to the button primitive beneath the
                presentation.
              </p>
            </Detail>
            <Detail
              title="Indigo Dropdowns"
              context="Light &amp; Dark Surface Variants"
            >
              <p>
                Dropdowns use a distinct Indigo variation of the shared
                Plum/Lilac theme. Light mode uses pale Indigo paper with deep
                Indigo copy; dark mode uses an opaque Indigo backplate with
                light copy. Dialogs and reading panels retain their own semantic
                surfaces. Navigation, Appearance, medication choices,
                categories, intake routes, guide controls, journal references
                and streak details share this menu family.
              </p>
              <GuideMenuSurfaces />
              <p>
                Nine canonical menu roles define surface, primary and muted
                copy, outer and inward edges, hover, selection, focused
                selection and keyboard focus. They live in{" "}
                <code>src/lib/app-theme.ts</code>; generated CSS and the{" "}
                <a href="#developer-color-group-menus">
                  inspectable menu colors
                </a>{" "}
                use those same values. Hover, selected and selected-hover paints
                have separate opaque tonal bases, so text remains clear above
                the background field. Choice rows keep their borderless
                selection treatment; navigation retains its inward bands.
              </p>
              <p>
                Menu-local aliases adapt existing components without recoloring
                their triggers or parent dialogs. Portals inherit the resolved
                appearance, including a manual choice that differs from the
                operating system. The pre-paint appearance script, explicit mode
                selectors and System fallback share the same recipes. Keyboard
                focus and selection indicators remain independent of motion, and
                reduced motion stops decorative movement. Medication colors and
                category markers retain their saved identities in either
                appearance.
              </p>
              <p>
                Page-level guidance, dates and milestone labels use the canvas
                copy pair above the darker moving background. Text inside cards,
                dialogs and readers keeps its own paired surface roles. This
                distinction preserves readable light-mode labels without
                flattening the hierarchy of the card content. Verify both
                explicit appearance choices and System whenever a surface or
                background recipe changes.
              </p>
            </Detail>
            <Detail
              title="Navigation &amp; Appearance"
              context="One Family Of Menus"
            >
              <p>
                The journal directory contains Today, Journal, Past Days,
                Medications, Goals and Getting Started Guide. The 420px panel
                caps at viewport width minus 24px. Its Charcoal/Mint logo tile
                is 48px with 15px corners and 36px artwork, exactly 75% of its
                former dimensions. Tablet carriers and choreography use
                percentages, so their travel and glyphs shrink proportionally
                while the 4.8-second loop remains unchanged. Your Journal keeps
                its 22px/700 title beside the logo, with the existing subtitle.
              </p>
              <p>
                Appearance sits beside Close in the navigation masthead;
                repository and installation shortcuts no longer occupy this row.
                Both controls match the page navigation trigger: 46px squares,
                23px glyphs and 14px corners at every breakpoint and in both
                themes. One grid row places the logo, flexible title/subtitle
                and right-aligned controls on the same top edge. Whole-word
                wrapping keeps narrow copy readable; below 360px the title uses
                19px and the grid gaps use 6px. Neighbor control gaps remain
                4px, with another 4px before Close. Bottom padding is 16px, four
                more than before. The inset introductory separator is 2px thick
                with 28% foreground opacity, stronger than the shared menu edge.
                Normally only destinations scroll between the masthead and
                footer; at viewport heights of 560px or less, the complete menu
                becomes one scroll area so controls cannot hide later links or
                footer actions.
              </p>
              <p>
                Main links retain 44px Black/White navigation artwork and a 28px
                trailing rail. Selected and hovered rows use the shared Indigo
                menu family, with a restrained Lilac wash. Resting, hovered and
                selected states remain distinct without a separate warning-like
                stripe. Decorative fields stay behind text, preserve a complete
                first paint and stop moving for reduced motion.
              </p>
              <p>
                Selected and hovered rows paint both rims inward on an absolute,
                pointer-inert layer. Selection adds no layout border: width,
                padding and the 68px link height stay unchanged. The outer band
                is quieter than the thin inner edge. Keyboard focus remains
                independently visible. ArrowUpRight is 19.5px at 65% visibility;
                the current-page CircleCheck stays 26px with its draw animation.
                Leading icon weight is consistent, and historical days select
                Past Days.
              </p>
              <p>
                Streaks is not listed in the navigation menu. The existing
                Explore Streak Milestones link in Getting Started Guide still
                opens /streaks, and milestone detail routes remain available.
                The page navigation trigger has no streak star, pulse or moving
                border trail. Streak calculations, the 06:00 boundary and
                milestone pages are unchanged.
              </p>
              <p>
                The footer retains one nonwrapping link row: Backups &amp;
                Export left, Report a Bug exactly centered and Developer Guide
                right. Muted 9px copy uses 7.5px trailing arrows at 50%
                visibility. Labels can truncate while accessible names remain
                complete. The separator above these links uses the shared accent
                at restrained opacity. The helper paragraph starts 10px below
                and always clamps to two lines at every breakpoint. Its
                decoration is a pointer-inert bottom theme wash, held through
                46% of its height, then gradually fading to 0. The top reaches
                halfway into the final 68px link: the footer’s measured CSS
                height plus 34px and its existing 8px margin/7px gutter
                determine the extension. The overlay sits behind content and
                adds no hit target or layout height. The 352px Appearance popup
                is a click-open Base UI submenu with its existing choices and
                compact interior controls. Selecting a theme leaves both menus
                open. Its Close or Escape dismisses only Appearance and returns
                focus to its masthead trigger; another Escape closes navigation
                and returns focus to the page trigger. Closing navigation or
                pressing outside dismisses the submenu too. Base UI owns arrow
                keys, typeahead, collision placement and focus return; native
                links retain modified clicks and header actions follow DOM
                order.
              </p>
            </Detail>
            <Detail
              title="The Fixed Background"
              context="Flowing Radial Grainient"
            >
              <p>
                <code>JournalBackground</code> uses the resolved appearance and
                uses its mode-specific background ramp from
                APP_BACKGROUND_COLORS_BY_MODE. Light mode stays pale Lilac; dark
                mode stays Plum, with small Apricot traces in both. Grainient is
                radial, with variation 16, saturation 1.01, silk 0.58 and
                softness 0.96. Broad folds move continuously at speed 3.6 on
                desktop and 5.4 on narrow/coarse-pointer devices. Mobile runs
                50% faster than desktop and 20% faster than its previous 4.5
                setting. Both use flow strength 1.4 and warp scale 0.3. A
                separate portrait framing mode reveals more of the whole
                composition on tall screens, while its viewport layer stays
                fixed. Grain stays still; intro, pointer interaction and click
                swirl remain disabled. Reduced motion holds a still composition
                and stops the idle frame loop. Hidden/offscreen rendering
                pauses, and resuming never adds elapsed background time.
              </p>
              <p>
                Above that original field and its tint, a separate
                viewport-clipped radial/conic veil adds depth using{" "}
                <code>#1e1a4d</code>, <code>#2f0d68</code> and{" "}
                <code>#2a212c</code>. The veil is 60% opaque in dark mode and
                56% in light mode, where opaque canvas copy preserves contrast.
                Its overscanned color field drifts gently over 68 seconds while
                the viewport box stays fixed. It is present before hydration,
                never intercepts input, and stays still with reduced motion.
                Card and reading-surface text keep their own semantic pairings.
              </p>
              <p>
                Both guides reuse the daily log’s viewport-fixed background.
                Their theme-colored reading overlay covers the same screen area
                at 67% opacity. The field uses the large viewport height
                (100lvh, with a 100vh fallback) to stay stable as mobile browser
                controls appear and disappear. Page content scrolls above it.
              </p>
              <div
                className={styles.tableScroll}
                tabIndex={0}
                role="region"
                aria-label="Background rendering settings"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Setting</th>
                      <th>Desktop</th>
                      <th>Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Flow</td>
                      <td>1.4</td>
                      <td>1.4</td>
                    </tr>
                    <tr>
                      <td>Speed</td>
                      <td>3.6</td>
                      <td>5.4</td>
                    </tr>
                    <tr>
                      <td>Scale</td>
                      <td>0.3</td>
                      <td>0.3</td>
                    </tr>
                    <tr>
                      <td>Composition Framing</td>
                      <td>Native · zoom 1</td>
                      <td>Adaptive Portrait · zoom 0.65–1</td>
                    </tr>
                    <tr>
                      <td>DPR Limit</td>
                      <td>Component Default</td>
                      <td>1.25</td>
                    </tr>
                    <tr>
                      <td>Pixel Budget</td>
                      <td>Component Default</td>
                      <td>750,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Portrait framing uses zoom = clamp(√(width ÷ height), 0.65, 1).
                At 390 × 844 that is about 0.68: the pattern appears 32% smaller
                and the visible field area is roughly 2.16 times larger. Both
                coordinate axes use the same factor, preserving shapes rather
                than stretching them to fill the narrow screen. Square and
                landscape views remain at zoom 1. Very tall screens stop at 0.65
                to keep the composition recognizable. Warp scale still controls
                deformation texture; framing controls the full scene. The shader
                applies framing after pointer effects, keeping their existing
                viewport coordinates aligned. The default native mode preserves
                the desktop view.
              </p>
              <p>
                Mobile retains its bounded rendering budget while animating
                continuously at the faster pace. Density and pixel caps control
                rendering cost, while the shader clock advances from elapsed
                time rather than a fixed amount per frame. Slower frame rates
                therefore do not automatically slow the animation. The renderer
                pauses when hidden or offscreen, and reduced motion stops the
                idle loop. WebGL fallback remains still. Light mode keeps the
                dark center and warm colors.
              </p>
            </Detail>
            <Detail title="A Dock That Leaves Room" context="Mobile Actions">
              <p>
                Today starts directly with its check-in and intake timeline
                beneath the shared topbar divider. The repeated upper
                intake/count row is removed; a screen-reader-only Daily Log
                heading preserves the page hierarchy. The action row above Log
                Intake keeps the recorded tablet/capsule quantities, including
                fractions, rather than doses or distinct medication counts.
                Benzo, Opioid and Stimulant quantities follow manual categories
                independently, so overlapping labels may count the same quantity
                in more than one category. Explicit categories override legacy
                flags; names never infer classification. Recorded form takes
                precedence over current form, and invalid/non-positive
                quantities do not contribute to pill totals. Historical
                summaries retain their “Logged X” heading and two-count layout.
              </p>
              <p>
                Directly above Log Intake, one compact strip shows icons and
                exact values only: the total stays at the far left, while Benzo,
                Opioid and Stimulant quantities form a right-aligned group. The
                total uses the shared Tablets frame; categories use Brain, Skull
                and BatteryCharging. All four retain full names and quantities
                in accessible labels and titles. There are no visible labels,
                headings or highlighted total cell. Two subtle gradient
                separators divide the right-side pairs, with 8px clearance on
                either side. Their four-second Tailwind bounce travels just
                2.5px; the second starts half a cycle apart, and reduced motion
                leaves both static. Whole icon/value pairs wrap naturally when
                needed, with the category group staying aligned right and the
                total retaining its left anchor. Layout does not shorten or clip
                formatted quantities and has no character-count thresholds or
                special grid fallback.
              </p>
              <p>
                The action row uses the regular app font for every value,
                inherited directly without a separate condensed font download.
                Values use 19px/700 primary canvas copy on a 24px line. Their
                canonical 24px framed markers sit beside them on the same center
                line with a 5px gap. History and other count contexts keep their
                existing typography. Empty-day and fractional quantities use the
                same layout; category totals remain independently overlapping
                subsets of recorded tablet and capsule quantities, not a sum of
                intake records or mg.
              </p>
              <p>
                The summary glass uses 5px vertical and 8px horizontal padding,
                12px corners, a 1px edge at 16% visibility and a restrained
                semantic glass fill over 32px blur with 1.1 saturation. Its
                single-line height is 36px: 24px content plus 10px vertical
                padding and two 1px edges. Reduced transparency uses an opaque
                semantic fallback. The row remains 7px above the 74px Log Intake
                button, with the “Your journal, your pace.” footer 10px below
                it. That exact text now links to the Journal page, retaining the
                same inherited font, size, weight, color and undecorated
                appearance. Natural wrapping still participates in the dock’s
                existing ResizeObserver measurement and page clearance; button
                corners, paint, rim and glow are unchanged.
              </p>
              <p>
                The Today action is 74px high at every breakpoint, with a
                proportional 19.425px corner radius. Its fixed 80px/21px
                intake-card/action design reference continues to define Accent
                proportions independently of this shorter Today action. Shared
                PrimaryButton examples keep their existing sizing. Today passes
                its explicit 19.425px radius so the face, border and exterior
                glow follow the same geometry. The button fills the available
                content width while retaining the existing page gutters. Its
                opt-in <code>{'surface="accent"'}</code>
                keeps the Accent moving-field machinery while opting into a
                dedicated charcoal face with an exact <code>#1d161e</code>
                base in both themes. Electric Mint <code>#9fffd1</code> colors
                the Pills mark, arrow and aside, while the main label remains
                White. Four near-charcoal field stops blend at 26% opacity,
                preserving the original subtle 26-second rotation without
                covering the dark base in a saturated color. Light rims use
                <code> #9fffd1 / #b8f4ff / #2dd4bf</code>; dark rims use
                <code> #c6ffe2 / #b8f4ff / #5eead4</code>. One dedicated
                <code> INTAKE_ACTION_PAINT</code> registry and shared serializer
                feed the CSS fallback and live shader. Mint/Ice/Teal halos share
                those aliases. The new ActionButtonTint adds one 13% composited
                layer above the field/glaze and below sheen, rim and content.
                Its offset radial pools and conic color field use the Mint icon
                pigment, the current rim stops and the installed emerald-500
                token, oklch(69.6% 0.17 162.48). A child drifts over 16 seconds
                while the outer tint stays at 13%. It pauses offscreen, in
                hidden documents and inactive states; reduced motion settles it.
                The aside retains 94% visibility, and the existing geometry,
                entry effects, pause behavior and 3px SpecularRim remain. Shared
                Primary, Secondary and Accent specimens, dialog submissions and
                default-filled controls now use this same paint. The main Today
                action opts into the optional pills variant of IntakeLogSymbol:
                a 23px Lucide Tablets glyph at 2.5 stroke, with no spark. Its
                individual scale mirrors the glyph, and its 5px left shift stays
                independent of entrance transforms. Other callers retain the
                default signature artwork. AccentButtonSurface remains shared by
                both buttons, with its outer frame adapted; motion follows the
                existing pause and reduced-motion states. Other PrimaryButton
                examples retain their default sizing and radius with the shared
                Charcoal/Mint paint. Desktop places the section 44px after the
                entries with 20px bottom padding. Mobile uses{" "}
                <code>max(0px, env(safe-area-inset-bottom))</code>
                for bottom clearance, with a 4px minimum in short landscape
                windows.
              </p>
              <p>
                IntakeAction reserves its final geometry before its own
                entrance. After shared page-entry readiness, its callback-ref
                controller observes the static root and waits for 20%
                visibility, so desktop actions below a long log do not arrive
                unseen; the fixed mobile dock is already in view. It then waits
                two rendered frames for the responsive portal to stabilize and
                raises the summary over 740ms. The button follows after 140ms
                for 1060ms; the footer follows after 620ms for 760ms. Count
                details join in short overlapping steps, while the Tablets mark
                spins into a small scale rebound and the arrow glides forward
                into place. The whole button frame only translates and fades,
                preserving measured rim thickness and the exterior shadow. No
                fixed dock ancestor is transformed, filtered or clipped for this
                entrance.
              </p>
              <p>
                The exact footer animation end settles that component for its
                lifetime. Early pointer/focus, hidden tabs, reduced motion and a
                desktop/mobile DOM replacement after entry has started also
                settle immediately. Re-rendering for clock, counts, theme,
                drafts or dialog dismissal never re-arms it. Before the first
                entrance starts, a hydration-time portal replacement cancels and
                reassigns the queued frames to the committed node. Static base
                styles stay readable without the controller. If intersection
                observation is unavailable, entry starts immediately. The
                observer disconnects on launch, settlement or detach; cleanup
                also removes frame requests and listeners. Existing ambient
                paint and border loops keep their own clocks.
              </p>
              <p>
                The mobile intake action is fixed directly to the document body.
                ResizeObserver measures its complete height, including a wrapped
                summary, text sizing and safe-area padding. That height plus
                24px drives both the page’s bottom clearance and the viewport’s
                scroll padding, so the final entry and keyboard focus can clear
                it. Short windows reduce the dock’s outer padding to preserve
                reading room while retaining the control’s size and safe-area
                inset.
              </p>
              <p>
                Mobile adds two pointer-inert pseudo-elements directly to the
                fixed intake-dock, spanning the viewport width and 120% of its
                height from bottom zero. This extends the decoration 20% above
                the complete action section without a separate scrolling canvas.
                Light mode keeps its semantic page-background base at 46% and
                Apricot overlay at 12%. Dark mode uses two tones of the Blue 800
                accent (#1e40af): a deeply shaded base mixed with 80% Black at
                60% layer opacity, followed by the accent mixed with just 8%
                White at 21% layer opacity. These are approximately #060d23 and
                #304fb5 before their layer opacity is applied. Both layers use
                the same multi-stop alpha mask: solid coverage across the bottom
                60%, then a gradual fade through the top 40% to zero. Manual
                Appearance and system themes select the same recipes. Desktop
                has no such overlays. Masks belong only to the decorative
                layers; the fixed parent keeps visible overflow without a
                filter, transform or mask, leaving the button’s own rounded glow
                and animated rim unclipped. Absolute decoration does not enlarge
                the border box measured by ResizeObserver or its existing
                height-plus-24px page reserve. Measurement changes still refresh
                intake entrance bounds. The shared size and scroll padding are
                released when the dock unmounts or the layout switches to
                desktop. The retained footer keeps its original
                animation-completion role.
              </p>
            </Detail>
            <Detail
              title="Glass Is A Base, Color Is A Layer"
              context="Intake Cards"
            >
              <p>
                MedicationCardBackground supplies one shared surface for intake,
                medication, history and Final Look cards. Its foundation follows
                <code> --card</code>: off-white Lilac paper in light mode and
                opaque Plum in dark mode. Decoration remains below artwork and
                copy. A small saved-pigment reflection uses 8% in light mode and
                10% in dark mode, so medication identity remains visible without
                replacing the interface’s foundation.
              </p>
              <p>
                A quiet 2.5px Lilac-derived inward edge and soft reflection
                supply depth without increasing the frame. The paired
                <code> --card-foreground</code> stays above decorative paint,
                and no opacity is applied to the content owner. Standard and
                Safari glass handling share the same treatment. Intake rows,
                library cards, past-day cards and Final Look samples retain
                their existing 80px geometry and entry behavior.
              </p>
              <p>
                The Medications heading pairs up to six narrow rounded color
                swatches with a compact bold saved count. Resolve saved pigments
                and deduplicate by HEX before applying the cap. Ordering keeps
                manual Benzo priority, record frequency, latest valid taken time
                and library order; archived entries remain eligible. Empty
                libraries show zero with no invented colors. Accessible context
                retains exact saved/active totals and visible accent names, even
                when large visual counts use compact notation.
              </p>
              <p>
                GuideOutline adds an On This Page rail only from 1024px upward,
                outside the centered page column. Explicit section, card and
                deep headings use stable fragment IDs. Native links open closed
                detail ancestors; scroll tracking highlights the current item
                and its parents without changing the URL. The rail scrolls
                independently and remains sticky only within main content,
                before the footer.
              </p>
              <p>
                The app topbar places animated-tablet refresh/Today gestures at
                the far left and navigation at the far right. Appearance lives
                inside navigation beside Close. Streaks is available through
                Getting Started Guide, with no menu item or separate topbar
                control or popover. Both page controls are 46px squares with
                23px glyphs and 14px corners, about 39% larger than their former
                33px / 16.5px geometry. The two controls anchor opposite edges
                of the shared header. Two faint radial reflections and 24px
                backdrop blur form the shared glass treatment in both themes.
                The navigation trigger uses the shared Plum/Lilac glass. Its
                thicker 2.5px foreground edge uses only 14% opacity; an 8%
                blurred decorative rim softens it while icons and keyboard focus
                stay crisp. Hover, focus and open states use the same quiet
                treatment for every control. Menu-specific layouts determine
                each popup’s interior dimensions.
              </p>
              <p>
                After shared page-entry readiness, two separate layout wrappers
                stagger left to right by 200ms. Each 1280ms upward arc adds a
                tilt, gentle overshoot and rebound; a 1080ms artwork turn begins
                120ms after its control, growing from a tiny −92-degree pose
                into a small counter-turn before settling. The resting geometry
                is visible without JavaScript. Natural wrapper completion
                latches the resting state; hydration also settles wrappers with
                no remaining own animation, without counting their nested tablet
                loops. Pointer/focus, popup opening, pull gestures, hidden tabs
                and reduced motion settle it too. This keeps decorative motion
                from shifting an active control or menu. The branding gestures’
                transforms and tablet loops stay on their existing inner owners.
              </p>
              <p>
                Header branding matches Today’s main action in both modes:
                charcoal <code>#1d161e</code> for the face and pill scores,
                electric Mint <code>#9fffd1</code> for the filled tablet pair,
                refresh glyph and primary border pigment. Its root color aliases
                read the existing Intake action palette, keeping both controls
                aligned. Navigation’s static mark retains its own neutral
                identity. The header mark measures 34.5px in its 46px control,
                preserving the menu logo’s 48px/64px ratio. Orbit, approach and
                spin still share the same base keyframes. A 7.2-second header
                cycle runs at two-thirds of the menu’s 4.8-second speed, with
                unchanged endpoint geometry.
              </p>
              <p>
                Fine-pointer hover adds exactly 1/18 to the header tablet speed:
                playback rate 19/18, or about 5.56% faster. The authored 7.2s
                duration stays fixed; the effective cycle becomes 7.2 × 18/19 =
                6.821052632s. The existing five orbit, approach and spin
                animations use <code>updatePlaybackRate()</code> to keep their
                current pose, following the{" "}
                <ExternalLink href="https://www.w3.org/TR/web-animations-1/#speed-control">
                  Web Animations speed-control model
                </ExternalLink>
                . Leaving restores rate 1 without seeking, replacing or
                restarting the animations. An exact name allowlist excludes
                topbar entrance effects; the menu logo and refresh curtain are
                outside the header mark’s scope.
              </p>
              <p>
                Hover never owns play/pause state. Reduced motion, hidden tabs,
                offscreen artwork, dragging and an unavailable refresh control
                retain their existing CSS pause behavior and use normal rate 1.
                Fine-hover capability and pointer entry/exit are event-driven;
                touch entry does not activate the boost. Ending a short drag
                while still hovered restores it without requiring another
                pointer entry. Recreated CSS animations are discovered on
                animation start, cleanup restores normal rates, and browsers
                without animation inspection or playback-rate updates keep the
                original CSS loop. There are no new animation-frame loops or
                timers.
              </p>
              <p>
                Menu controls share a 2.5px edge at 14% resting opacity, 24% on
                hover and 28% when active. The branding button instead matches
                the Mint pill color at 67% border opacity in resting, hover and
                active/focus states, in both themes. This base border remains
                unchanged during pulling; a separate inset edge and outer halo
                provide the brighter ready feedback. It retains the same 2.5px
                geometry, 8% blurred decorative rim at 0.8px blur and separate
                60% focus outline. These alpha percentages apply once to the
                opaque Mint pigment, without theme-token alpha. The charcoal
                face, Mint silhouettes and charcoal scores remain the same when
                Appearance changes.
              </p>
              <p>
                Visibility, reduced-motion, offscreen and refresh-unavailable
                state pause or settle the header loop. Cleanup disconnects
                observation and listeners. The critical refresh curtain has its
                own compact tablet duet, separate from the header and menu brand
                loops. Its existing phase handoff is preserved; click, keyboard
                activation and downward pulls still use the guarded
                full-document reload. The navigation menu has no separate
                refresh action.
              </p>
              <p>
                A rightward branding pull opens Medications with in-app
                navigation and remembers it as the last screen. Already on
                Medications, it only settles back without navigating, scrolling
                or changing drafts. Both gestures retain an 8px slop, 1.5 axis
                dominance and a resisted offset capped at 84px, with a deliberate 340px release
                threshold. Each pointer-down captures the available physical
                travel with a 16px screen-edge inset; a narrow phone or short
                landscape viewport can use a shorter threshold so the gesture
                remains reachable. Viewport changes cannot move that captured
                goal during the pull. After slop, intent can change freely
                between down and right; a neutral diagonal is recoverable and
                does not cancel the gesture. Only reaching the threshold commits
                the chosen axis. That lock survives opposite-axis drift and even
                retraction to zero, so a later direction cannot replace it.
                Release still requires reaching the captured threshold along the
                locked axis; pulling back cancels the action without unlocking.
                Coalesced samples are processed in order and final pointer-up
                coordinates pass through the same transition, preserving fast
                threshold crossings between paints. Pointer capture tolerates
                interrupted Safari touches; the completed gesture is cleared
                before releasing capture. The following dragged or cancelled
                pointer click is suppressed; ordinary taps and keyboard refresh
                retain their native behavior.
              </p>
              <p>
                The live brand marks share the same Charcoal #1d161e face and
                Mint #9fffd1 pills in both appearances. The original
                getIntakeBrandStyle() retains its two-value contract for
                existing callers; getBrandThemeStyle() extends that paint with
                aliases derived from the action’s current icon/rim palette.
                Header, menu, sign-in and recovery contexts keep their existing
                sizes, labels and native link/button behavior. The 46px button
                retains its exact charcoal face throughout rest, pulling,
                readiness and release. Its base Mint border stays at 67%; no
                colored wash covers the pills. The pills turn through 540
                degrees while shrinking across a 1–88px visual exchange.
                RefreshCcw appears across 56–112px and grows with pull progress.
                Both directions use that same 23px icon with a 2.65 stroke,
                including the ready state. A separate 160ms exchange follower is
                capped at 112/340 physical progress before easing, so even an
                immediate threshold crossing still shows the conversion. This
                visual clock does not delay the authoritative gesture or its
                release guard. Retraction while the pointer remains held
                reverses the exchange and progress-driven glyph rotation
                continuously. Actual release or cancellation holds the last
                painted glyph angle as it shrinks and fades, so decreasing
                return progress cannot rotate it backward. A new pull clears the
                held angle. The charged rotation lives on a separate child, so
                it can pause at its current angle without taking ownership of
                the gesture’s translation or progress-driven turn.
              </p>
              <p>
                Reaching the threshold springs the button outward, then settles
                it at 1.25× its resting size and the glyph at 1.14× inside that
                enlarged surface. It stays at its pulled position: the same
                resisted offset applies before, at and after the threshold.
                Retracting below readiness therefore changes scale and feedback
                without sending the control to the header origin. Only release
                or cancellation returns it home; frozen gesture coordinates and
                capture remain independent. Eighteen small particles, two
                ripples, a shockwave, eight individually colored rays and inner
                pops retain their compact celebration choreography. Their colors
                now come entirely from the Intake action: Electric Mint #9fffd1,
                Ice #b8f4ff, Teal #2dd4bf, Soft Mint #c6ffe2, Soft Teal #5eead4
                and the canonical Tailwind emerald-500 token. The refresh glyph,
                filled pills and base border use the exact Mint icon pigment,
                with Charcoal #1d161e scores and face. Shared
                getBrandThemeStyle() aliases also color the navigation heading,
                sign-in wordmark and standalone recovery marks, including their
                glow, corona, sheen and animated accents. Opacity, geometry and
                every existing animation curve remain unchanged. The finite
                crossing burst stays throttled against threshold jitter.
              </p>
              <p>
                After a 960ms settling pause, the armed RefreshCcw begins its
                own eight-second cycle. It accelerates quickly, eases into a
                normal-to-brisk coast for several seconds, brakes and briefly
                reverses, then accelerates forward again. Six complete net turns
                make the loop join at the same orientation, with continuous
                angular speed across the seam. A small coordinated size change
                emphasizes acceleration and softens the reversal without
                changing the button’s measured size or pulled position. The
                refreshed waiting artwork pairs a fading conic ribbon with
                counter-turning split arcs and a travelling bead. Its compact
                traces stay close to the button and share the restrained
                Mint/Ice/Teal/Emerald highlights.
              </p>
              <p>
                Rotation and breathing stay on independent decorative children.
                Retraction pauses the charged angle while the existing gesture
                exchange reverses; release pauses it for the original shrink and
                fade, without adding another launch rotation. A fresh pull
                resets these decorative clocks through the feedback subtree’s
                identity, with one state update per gesture rather than one per
                frame. Decoration remains pointer-inert, with no separate
                progress control. Accessible instructions and readiness
                announcements describe the action without relying on color or
                motion. Reduced motion retains the static ready edge and skips
                the ribbons, spin and burst; hidden tabs and interruptions keep
                their existing cancellation behavior.
              </p>
              <p>
                One requestAnimationFrame owner combines position, the visual
                exchange, readiness and origin springs. Translation and progress
                use exponential easing: 38ms while pulling and 72ms on return.
                The separate 160ms exchange uses the same elapsed-frame timing;
                both followers cap a long frame at 64ms. Recoil uses an exact
                underdamped spring with natural frequency 18 rad/s and damping
                ratio 0.36. Retained velocity keeps a threshold reversal
                continuous. Derived variables paint scale, turn, edge and brief
                flourish without layout reads or a React render for every
                distance update. React publishes intent, lock, readiness,
                celebration and accessible-status changes. Decorative loops live
                on separate children, leaving gesture geometry to the frame
                owner. Re-grabbing during return holds the current rendered pose
                and spring velocity while starting fresh threshold state;
                bounded origin carry avoids jumps or accumulating offset. The
                frame loop stops only after position, progress, exchange and
                springs settle. Cleanup stops frames and releases capture.
              </p>
              <p>
                A committed release holds the rendered pose for a guarded 600ms
                sequence: the button compresses, expands and rebounds while the
                refresh glyph shrinks and fades at its held angle. Orbit traces
                expand and fade without an extra launch rotation; the edge
                catches the light, and particles briefly draw inward before
                scattering. Only after this sequence does refresh or client
                navigation run. A pending-release token prevents duplicate
                activation. Escape, blur, scrolling, hidden tabs, multitouch,
                unavailability, a route change or unmounting cancels pending
                work; lost capture also cancels an active pull. Reduced motion
                skips this delay, settles geometry and uses a static ready edge
                without bursts or loops.
              </p>
              <p>
                Client navigation from another page records / through{" "}
                <code>{'workspace.rememberDestination("/")'}</code>, preserving
                raw drafts while clearing Today’s remembered dialog. Already on
                plain Today, the release sequence ends with a reversible 560ms
                inward ripple instead: it does not navigate, scroll or change
                drafts. A query or fragment still uses client navigation to the
                plain route. Downward release then enters the existing full-page
                refresh handoff, including its separate 1500ms outbound hold;
                taps and keyboard activation go straight to that handoff. The
                menu’s Today link provides an accessible destination without
                dragging.
              </p>
              <p>
                The shared divider matches the topbar’s full padded width,
                including both guides’ wider content caps. Its 2px thickness and
                32%-opacity canvas foreground stay consistent across the middle;
                a 0.35px blur softens the line over a 12px standard/Safari
                backdrop blur. Only the first and last clamp(18px, 5%, 32px)
                fade to transparent, preserving its quiet glass edge. Existing
                16px vertical clearance increases to 20px from 640px, with
                safe-area padding and guide sidebar offsets unchanged.
              </p>
              <p>
                Appearance is a browser preference, separate from journal data.
                A head bootstrap reads light/dark/system before the first paint,
                resolves the device scheme and exposes data-color-mode on html.
                One external store feeds the provider, toast styling and canvas
                effects. Explicit choices survive reloads, synchronize across
                tabs and ignore OS changes until System is selected. Blocked
                storage keeps the current choice in memory and the menu says
                This Visit Only. No preference is sent to the journal API.
              </p>
              <p>
                The authored CSS still uses familiar prefers-color-scheme
                blocks. The postcss-appearance build plugin adds equivalent
                attribute-controlled rules and guards the device fallback when a
                resolved preference exists. This covers generated theme tokens,
                CSS Modules and Tailwind dark variants without copying palettes
                across files. Preserve non-theme media constraints, selector
                specificity and the inline refresh screen’s matching pre-paint
                theme rules. The generated theme registry remains the single
                source of palette values.
              </p>
              <p>
                Refresh presentation is server-rendered once at the document
                root. Critical head styles and a pre-paint handoff script cover
                the page before external styles or React arrive. The new scene
                translates the branding pull into a stationary 2.5× stage: its
                46px internal world paints a 115px Charcoal face, then settles
                into the same 1.25× charged pose at 143.75px. RefreshCw starts
                with 57.5px artwork; the face’s 1.25× spring and nested 1.14×
                icon scale compound to 81.9375px in the charged pose. Mint, Ice,
                Teal, Soft Mint, Soft Teal and Emerald pigments come from the
                same shared branding aliases in both appearances. A restrained
                green atmosphere answers the core’s build-up without adding
                another card or moving the central position.
              </p>
              <p>
                The refresh symbol begins at zero size in the center and grows
                while spinning rapidly clockwise. At roughly 800ms, two thirds
                of the way to the 1200ms threshold, its angular speed eases
                slightly; that easing reaches its slowest point just before the
                threshold. The button’s same analytically sampled spring,
                including its 3.4 icon-scale cap, now overshoots and rebounds in
                place. Three layered waves, eight rays, 18 particles in four
                shape variants and inner pops use the branding burst’s geometry
                and timing at the larger scale. This finite threshold response
                happens once per intentional refresh. The visible copy is one
                compact 14px/650 line: “A little reset. Back to you.” Decorative
                artwork is hidden from assistive technology, while a single
                polite status describes the load; the scene contains no
                interactive controls.
              </p>
              <p>
                At 2160ms, after the 960ms threshold settling interval, a fast
                clockwise rotor takes over: three turns in 1800ms with a smooth
                ±6% speed variation that joins seamlessly at each loop boundary.
                It never reverses direction. The fading conic ribbon,
                counter-turning split arcs, travelling bead, charged edge,
                moving glow and small scale changes retain the branding
                animation’s character. Independent wrappers own entry, ambient
                rotation and the 600ms release so completion does not reset the
                current icon angle. Release uses the familiar compression,
                expansion and rebound; the glyph shrinks away, orbit light fades
                and particles draw inward before the page is revealed. Header
                and menu branding retain their own gesture controller, sizes and
                loops. Reduced motion shows a static mark, removes burst
                decoration and skips the remaining minimum hold and animated
                exit once data is ready.
              </p>
              <p>
                Session storage and a history-entry fallback carry only the
                exact route, original start time and bounded viewport,
                preserving framework history and URL fragments. A full negative
                elapsed-time delay, rather than a phase reduced to one loop’s
                period, resumes every finite entrance and differently timed loop
                across documents. The client adopts that same curtain through an
                external store; it never mounts a second scene or restarts the
                introduction. A 1500ms outbound hold lets the threshold burst
                begin before navigation; it counts toward that same original
                clock. Completion waits for data, workspace readiness and two
                committed frames, then restores the controlled refresh’s
                viewport. A fast response waits only for the unspent part of the
                original 3000ms visibility window, which includes the entrance,
                threshold response, a short charged loop and time spent before
                navigation; a slower response proceeds directly to the 600ms
                departure. Repeated completion calls do not restart either
                timer. The existing 23-second boot watchdog stays armed through
                the hold and exit, releasing the cover if loading or hydration
                fails. Expired markers, unrelated routes and ordinary deep links
                never start it. Reduced motion completes immediately. A
                boot-level visibility listener pauses decorative animation in
                hidden documents; the wall-clock hold, exit and watchdog
                continue, so backgrounding cannot leave a stuck cover.
                Visibility changes do not rewrite the elapsed marker or restart
                choreography. Refresh remains separate from saving records and
                activating app updates.
              </p>
              <p>
                Page entrances share a visibility boundary with that loading
                presentation. The provider server-renders{" "}
                <code>{'data-page-entry-ready="false"'}</code>, then releases it
                only for ready journal data and workspace, or a terminal error,
                while the real refresh phase is idle. A layout-commit
                notification and direct phase check prevent a stale React
                readiness value from starting motion during the 600ms curtain
                departure. Header adoption, generic cards, the mixed log
                scheduler, Today’s action and the streak spotlight wait before
                reserving starts or consuming entrance timers and history
                markers. A CSS play-state gate also holds finite entrances,
                including check-in progress, page entry and restored popups;
                loading and other ambient loops keep their own lifecycle.
                Controlled dialogs and drawers defer opening without discarding
                parent intent or raw drafts. This boundary covers cold loads and
                terminal error views without a guessed timeout. Busy journal
                writes do not re-arm completed entrances; existing viewport,
                hidden-page, reduced-motion and stack-head ordering rules remain
                unchanged.
              </p>
              <p>
                MedicationCard gives the journal, medication library and live
                appearance row the same comfortable two-row frame. The first row
                contains time or Default, the medication name and category
                icons. Actual intake cards pair a compact form glyph with the
                active ingredient in the flexible lower-left region, with
                quantity × strength and the total dose at the right. Library and
                appearance previews retain the small plain medication-type label
                before the ingredient. Library values come from saved defaults;
                intake values come from the actual record. Both use the same
                geometry and glyph frame. Actual intakes retain a uniform 19%
                tint using the exact selected palette swatch from --entry-color.
                The fill is independent of darker icon ink and fixed-color SVG
                artwork. Their 2.5px identity rim still follows the rendered
                main glyph and sits entirely inside the 21px card corner at 50%
                opacity. The muted primary rim sits 2.5px outside, following a
                23.5px corner without changing layout or the hit target. Glass
                reflections stay clipped to the card face. Check-ins use the
                same frame with their main icon background as the inner pigment;
                library and journal surfaces retain their own paint. Their
                native button opens the appropriate editor; Archive and Restore
                remain inside the medication dialog.
              </p>
              <p>
                The shared medication details fill the artwork’s 56px inner
                stage, keeping the whole default card at 80px. Actual intake
                cards center the lower label pair and dose together. Their
                artwork-to-text gap, also used by check-ins, is 11px, or 7px
                below 360px. Library cards use 14px/10px; history and journal
                cards use 11px/7px. Each moves text 2px right while preserving
                the right edge. A fixed 56px artwork rail prevents quantity fans
                from shifting either text row. Names use compact 15px/650 type;
                recorded times use 13.5px/700 at roughly 75% foreground. The
                details stage inherits 13.5px so the five-character time column
                matches. The second row starts at the text region’s left edge at
                every breakpoint; it no longer indents by the time-column width
                on large screens. Actual intake forms use one unframed,
                decorative icon at the main artwork’s top-left, centered on the
                first text row and overlapping the artwork’s left edge by 60%,
                with 40% outside. Its 20px phone size and 22px size from 768px
                stay fixed even when quantity fans scale within their 56px rail.
                Black #000000 outlines use a 2.5px Lucide stroke; closed areas
                are filled with opaque Zinc 300 #D4D4D8, the authored
                Levomethasan border pigment. Open detail strokes remain
                unfilled. The same native vector appears before the active
                ingredient at 10px, with a 4px gap, or at 8px beside an unset
                placeholder. Tablet retains the tilted, scored svg:tablet-angled
                geometry; the other forms keep their corresponding symbols. No
                square backplate, surrounding rim, route icon or expansion
                control is rendered. Recorded forms take precedence over
                medication fallbacks. Route values remain saved and editable in
                the intake dialog without record changes. Library type labels
                retain their 9.5px/500 text at 66% visibility. Actual active
                substances use 11px/650 text in the medication name’s exact
                primary color; known library and appearance-preview ingredients
                share that weight. Missing values and the exact case-insensitive
                word Unspecified keep that color at 34% opacity, 9px size and
                500 weight. Their 17px line box preserves row alignment and
                stored data. Category tiles and dose totals share an 8px inset
                from the content’s right edge, so both rows finish on one
                invisible vertical line. Categories stack right to left with
                one-third overlap, the rightmost tile above the next, at 65%
                opacity. Their accessible labels and horizontal panning remain.
                The ingredient and complete dose group share one vertical
                center; calculation and total align along the bottom inside that
                group. The total number and mg unit share a baseline with a 2px
                gap. The 11px/550 calculation uses a thin space before mg,
                preserving a readable unit without a loose gap. Actual intake
                totals retain the recent 17/12 multiplier: an exact 41⅔%
                enlargement, giving 15.0520833px numbers, 13.546875px long
                values and a 12.75px mg unit. The total’s 20px line box and 2px
                unit gap stay fixed; the calculation sits 4px away on phones or
                5px from 768px. Library and appearance preview totals keep their
                own existing size. These rules affect presentation only.
              </p>
              <p>
                Each saved intake is one native full-card edit button again. Its
                data-intake-card-action marker preserves the group’s keyboard
                disclosure focus; reference arrival can focus that root button
                directly. Both form glyphs are decorative and hidden from
                assistive technology, while the card’s accessible description
                retains the form label. Disabled cards use the native disabled
                state. Category-rail panning, group disclosure, dose values and
                reference highlighting stay attached to their existing behavior.
                Removing the badge-pair control makes no journal write and does
                not change saved intake routes, quantity, measured height or
                border geometry.
              </p>
              <p>
                Main medication artwork now reflects the intake quantity. A
                recorded 1.01 renders two frames; 2.5 renders three, for any
                medication form. Library cards and the live journal preview use
                their default quantity, while actual entries use their own
                recorded value. The appearance hero, history’s unique-medication
                previews and check-in illustrations remain single frames.
              </p>
              <p>
                MedicationCardIconStack places the leftmost frame above the
                others. Each next frame is 92% of the preceding size and 83% of
                its opacity. Its right edge extends exactly 20% of its own
                smaller width beyond the previous frame; all vertical centers
                match. A single frame measures 48px. Every quantity uses the
                same 56px rail at all breakpoints; larger fans scale together to
                fit, preserving relative size, exposure and center. Card height
                stays 80px; text keeps both single-line rows and their reserved
                clearances.
              </p>
              <p>
                Decorative rendering stops at 24 layers, whose last frame is
                already below 1.4% opacity. This bounds unusually large drop or
                pump values while normal quantities up to ten retain every
                frame. The exact quantity remains in the dose and accessible
                description. One outer entrance hook animates the complete fan;
                keyed internal frames never replay entrance animations during
                group disclosure. Invalid or missing decorative quantities use
                one frame without rewriting any medication or intake.
              </p>
              <p>
                Appearance color samples use compact rounded squares and a quiet
                selection treatment. Final Look reuses the actual shared
                medication-card surface, so the preview reflects the saved icon,
                chosen pigment, shape and intake content. Its section surface
                uses the semantic reading roles rather than a separate warm
                overlay that could obscure the artwork.
              </p>
              <p>
                Final Look uses a restrained selected-color gradient behind the
                semantic reading surface, with its mode-aware neutral overlay.
                Both decorative layers stay at scene level zero; one foreground
                wrapper stays above them. Its icon-only MedicationCardBase and
                real MedicationCard sample retain saved pigment, rotation,
                ingredient, categories and per-unit strength. These preview
                cards reuse the shared semantic base, restrained Lilac
                reflection and quiet glaze, but disable backdrop filtering and
                keep a solid native inward edge. The explicit mask-free fallback
                prevents a full-surface mask from covering their real icon or
                journal sample. Normal journal cards retain the 24px glass
                filter and inward gradient rim. A faint geometric network sits
                behind the foreground using a quiet, mode-aware Lilac tone. The
                centered rounded title group separates Final Look and Live
                Preview. Color chips use the selected pigment at 40% and a
                matching family-900 ink, including a neutral fallback. The
                preview shows quantity and per-unit strength as 2 tablets / 20
                mg beside the calculated 40 mg total. Compact Surprise Me and
                Undo now affect only color and symbol. Manual rotation controls
                are removed; saved angles remain unchanged for compatibility. An
                optional previewMotion draft field defaults to true and controls
                independent frame and symbol loops. It survives reopening and
                refresh; CSS reduced motion always settles both loops. These
                transforms never hide content or alter saved medication data.
              </p>
              <p>
                MedicationIndicatorMark and MedicationCategoryGlyph share one
                tile system for all 19 manually selected categories. The card
                rail displays every selected label from right to left with
                conservative spacing, including on the oldest linked intake. A
                bounded horizontal rail preserves the single-line heading when
                many labels are selected; categories are not replaced by a count
                or silently omitted. Journal medication and ingredient
                references reuse the same glyphs and palettes. Current manual
                metadata is authoritative; names never infer classification. The
                three quantity-summary categories remain independent of this
                complete display catalog.
              </p>
              <p>
                Benzo retains the Categories selector’s #fda4af tile with a
                pink-700 Brain. Opioid uses rose-400 with rose-700 Skull;
                Antidepressant uses orange-300 with yellow-600 HeartHandshake;
                Antipsychotic keeps Brain in purple-700 on violet-300; Sleep Aid
                keeps MoonStars in indigo-700 on indigo-300. Stimulant now uses
                BatteryCharging in cyan-700 on cyan-300. Mood Stabilizer keeps
                YinYang in lime-700 on lime-300; Pain Relief keeps Heartbeat in
                pink-600 on pink-300. Hormone uses Venus in emerald-600 on
                green-300, and Digestion keeps BowlFood in teal-700 on
                emerald-300. The remaining labels retain their established
                palettes. Pills is a separate indigo-300/violet-900 Tablets
                display marker, not a medication category.
              </p>
              <p>
                Frames are opaque and identical in both themes, with an 80%
                glyph proportion and corners at 7/22 of the outer size. Lucide
                glyphs share a 2.5 stroke; retained Phosphor artwork uses its
                native bold paths. A 22px frame therefore has 7px corners and a
                17.6px glyph. Cards use 20px tiles on phones and 22px from
                768px; other contexts change the outer size without adding a
                second fill or outline. Main medication artwork retains its
                saved pigment and rotation without category dots.
              </p>
              <p>
                Shared medication cards retain their 80px height and two
                single-line rows. The first-row name yields only to the category
                rail, leaving more room for the medication name. Library and
                appearance-preview cards retain plain secondary type text before
                the active ingredient below, without a background, border, form
                icon or dot separator. Its width is capped at 40% of the
                flexible label region, and the responsive Smallest gap,{" "}
                <code>--content-min-gap-tertiary</code>, separates it from the
                substance. Both labels can ellipsize while staying vertically
                centered with each other and flush with that region’s left edge.
                Their overall lower row retains its existing bottom alignment.
                Actual intake rows instead use the same filled form glyph as
                their top-left artwork marker, reduced to 10px before the
                substance with a 4px gap. Full names and labels remain available
                through accessible descriptions and titles.
              </p>
              <p>
                Intake and check-in times use a 700-weight rounded system stack:
                ui-rounded, SF Pro Rounded, Segoe UI and system-ui, retaining
                tabular numerals without loading another font. Intake second
                rows center the form/substance pair and dose together. Their
                protected gap adds 2px to the responsive Basic minimum; flexible
                copy truncates before entering that space. Calculation and total
                sit 4px apart on phones and 5px from 768px. Intake total numbers
                and their unit use a 17/12 multiplier, an increase of exactly
                5/12 or 41⅔%. The normal number is 15.0520833px; long values use
                13.546875px. Both use a 20px line box, with a 12.75px mg label
                alongside on the same baseline. Library and preview totals keep
                their existing 15px/13.5px numbers and 11px unit. No quantity or
                recorded dose changes. Unspecified remains a reduced-visibility
                label for an unrecorded ingredient, without implying the
                medicine has none.
              </p>
              <p>
                Log Intake medication choices use compact rows with saved
                artwork, the medication name and exact strength. The optional
                Intake route selector records a manual per-entry value, separate
                from medication form. New entries suggest the medication’s most
                frequently recorded route; ties use latest taken time, and no
                recorded route falls back to Swallowed. Saved entries and
                restored draft selections stay as entered. Existing stored
                routes use the same Swallowed label throughout the journal. Its
                shared catalog still drives the dropdown and API allowlist.
              </p>
              <p>
                Amount Taken is one 40px rounded-rectangle field. Its 1px border
                and equal 5px inner padding enclose 28px minus/plus buttons with
                8px corners and centered 14px icons. The editable quantity, its
                tablet/drop/pump unit and the calculated mg dose share the
                central row: a 6 mg tablet can read 0.5 tablets · 3 mg. The mg
                amount is calculated from quantity and current strength; the
                quantity remains the value saved to the intake.
              </p>
              <p>
                Every medication accepts comma or dot input with at most two
                fractional digits, including medications whose buttons step by
                whole units. Extra typed digits are truncated. Valid
                higher-precision prefills and restored drafts are rounded half
                up for display. A step starts from that visible fraction and
                uses the medication form’s increment, within 0.01–10000. A new
                amount that rounds to zero requires correction rather than an
                automatic increase. An untouched existing quantity keeps its
                exact saved value through date/route-only edits, with an
                approximation marker when its display is shortened. Typing,
                presets or stepping explicitly adopt two-decimal precision;
                focus and blur alone preserve the original quantity. The inline
                mg value uses at most two decimals, with &lt;0.01 mg for a
                smaller positive dose and an em dash for an invalid amount. This
                presentation does not reduce stored history precision or change
                dose formatting elsewhere in the journal.
              </p>
              <p>
                Date Taken and Time Taken share the row equally, using 40px
                controls. Native values are centered vertically with a 14px left
                inset. Edit Intake puts safe draft feedback and an underlined
                Delete intake action directly beneath Save Changes; deletion
                requires a separate confirmation. Storage warnings remain
                visible. The square time-reset button keeps the date, restores
                the journal’s current clock and shows a check for 1.5 seconds.
                Native number spinners and date/time icons are hidden. Intake
                context inputs and card notes are removed; saved historical
                notes remain in storage and backups. Medication choices and the
                closed value use the shared Brain, Skull and BatteryCharging
                indicators. The menus share 38px minimum rows with 11px text and
                softened 23px colored icon tiles: 28% tile backgrounds in light
                mode and 22% in dark mode. Benzo, Opioid and Stimulant markers
                retain their canonical opaque pink, orange and cyan tiles in
                both themes, matching cards and summaries without a second
                tinted wrapper. Selected Type, Route and Categories rows show “·
                selected” beside a stronger warm fill and checkmark. Selected
                and keyboard-focused options have no enclosing border, outline
                or shadow. Keyboard focus instead underlines the label and
                strengthens its warm fill. Other sits below a short inset
                separator and an 8px gap, with quieter text until selected.
                Categories lists all 19 options without a search field in a
                256px popup, constrained to the viewport. Its inset header rule
                and compact 28px Clear/Done footer sit outside the listbox; only
                the options scroll. Multiple selection keeps the menu open,
                normalizes the stored order and preserves native typeahead,
                Escape and focus return. Old drafts with a category search
                string still restore their selections; that obsolete string is
                ignored. Medication choices keep their saved artwork, exact
                strengths and contextual “This intake” caption. Quantity and
                draft behavior stay connected to the existing controls.
              </p>
              <p>
                Shared dialogs are explicitly modal. The document root declares
                overflow-y: auto so Base UI locks the actual viewport instead of
                relying on body overflow propagation in Safari. Base UI retains
                ownership of nested locks, gutter compensation and cleanup; no
                fixed-body or second scroll-lock manager is added. Dialog and
                drawer scrollers contain overscroll, while backdrop touch
                gestures cannot pan the page. Every dialog and modal drawer
                shares a 20px backdrop blur, including the Safari-prefixed
                filter. A separate 36% color mix uses #4b1f0cd9 in dark mode and
                #fad3a7 in light mode. The dark source color keeps its original
                alpha before the 36% mix; this yields about 30.6% effective
                alpha, while the light overlay is 36%. Manual Appearance choices
                and system mode resolve through the same prepaint flag; nested
                dialogs keep their existing lock and dismissal behavior.
              </p>
              <p>
                Shared close controls use a 36px rounded-square face with 8px
                corners, an 18px glyph and a 44px target. A subtle foreground
                fill keeps the control visible without a decorative outline.
                Shared dialog and drawer headers use 22px titles on mobile and
                24px from 768px, with 28px leading artwork. Context follows
                beneath the title in 12px copy without a dot or slash, and
                visible descriptions align to the title’s text column.
                Medication descriptions retain their screen-reader-only intent.
                Morning uses a coffee symbol. The headerActions slot places
                native controls beside Close; check-in Reset Draft uses the same
                44px styling. Its footer keeps draft feedback without a
                duplicate Reset link. Native dismissal, focus return and scroll
                memory remain with the existing primitives.
              </p>
              <p>
                Dialog save actions delegate through DialogPrimaryButton to
                AccentButton, keeping White foreground, 14.25px/700 text and
                matching 22px PencilSparkles/ArrowRight glyphs at a 2.5 stroke.
                The wrapper multiplies actual responsive Accent height by 0.74,
                then derives its corners from the fixed 21/80 design ratio.
                Heights therefore run from 53.28px to 56.055px and default radii
                from 13.986px to 14.7144375px. This changes layout geometry
                rather than scaling a finished button. Standalone Accent actions
                remain 72–75.75px high with 18.9–19.884375px corners; page-level
                Add a Medication instead shares Today’s 74px height, 19.425px
                radius and internal label/icon/arrow spacing. Save Medication
                retains the compact dialog wrapper. Today remains 74px high with
                19.425px corners. An explicit radius override remains available.
                Frame, rim and aura follow the effective radius; the inset face
                subtracts 1.5px. Pending replaces only the leading glyph with a
                spinner. Dialog Accent actions retain 24px top clearance; plain
                submit actions add 8px to their existing layout gap. See the{" "}
                <a href="#buttons">button component reference</a> for shared
                paints and standalone examples. General focus uses the paired
                Plum or Lilac focus role. Intake timing hints omit the visible
                timezone prefix while preserving timezone-aware tracking days
                and the 06:00 reset.
              </p>
              <p>
                Each intake group has one head: its original first entry.
                Tapping any card or noninteractive frame area in a folded group
                reveals its rows; tapping a shown card opens its editor
                directly. Reveal and Collapse transition the whole group in one
                staggered wave. The folded preview keeps up to six full rear
                cards, with delayed height shrink keeping the footer below
                returning cards. Both opening and collapsing finish every target
                member and all visible neighboring faces before changing the
                saved view. During movement, incoming visible faces settle
                immediately instead of starting delayed text or icon fades. Open
                groups also suppress content entrances in CSS. Genuinely unseen
                offscreen faces retain their normal first scroll entrance after
                disclosure; card nodes and stack timing stay unchanged. Preserve
                natural heights and corners, with no added rear borders. Grouped
                card faces keep the same width and aligned edges as single
                cards. Their frame shares the cards’ 21px corner token and
                extends 8px beyond both list edges, with equal 8px top and side
                padding. Expanded faces have the same 8px gap, controlled by
                INTAKE_GROUP_SPACING_PX. Negative side margins preserve
                single-card alignment; folded rear cards retain 20px offsets.
                History week groups reuse the same spacing. The disclosure’s
                native target stays 44px high, offset 6px upward into the last
                card’s empty bottom padding with its content still clear. Its
                visible 24px face begins 8px below the last card and ends at the
                group’s flow edge. The glass keeps its 12px bottom inset and
                measured label notch. The label retains its 2px local offset,
                3px vertical padding and 9.5px medium-weight text. A shared
                intrinsic-width slot reserves both Reveal and Collapse, so
                changing state never shifts the face or its measured notch. The
                bolder, full-color count reserves at least two numeral widths,
                keeping ordinary counts uniform between groups. Matching
                chevrons flank the label, and the measured notch meets both face
                edges. Desktop hover and press feedback change only the paint;
                keyboard focus adds a 2px outline around the visible face with a
                3px offset. The compact geometry and full hit area stay
                unchanged.
              </p>
              <p>
                The group background separates a 50%-opacity blur from a
                20%-opacity gradient made from every card’s current medication
                color. Repeated colors are weighted by card count; at most three
                radial/conic layers include the full palette. Missing
                medications share the card’s default-color fallback. A smooth
                54-second drift runs in both open and folded states, with no
                fixed-color base or extra theme wash. Folded cards keep 90%
                opacity. Visibility, page-hidden and reduced-motion changes
                pause CSS movement. The disclosure keeps the same blur layer
                with a steady semantic surface, avoiding a separately animated
                miniature gradient that can look disconnected from its frame.
                Hover raises that fill to 56% on desktop, and press uses 66%;
                reduced motion also removes its paint and chevron transitions.
                Header actions and nested disclosures keep their own actions.
              </p>
              <p>
                Stack presentation is saved per journal and day in the existing
                local workspace, separately from form drafts. Persist user
                intent rather than animation progress: Collapse saves its closed
                target immediately, and a new Reveal replaces that intent.
                Hydrate before layout and reconcile saved IDs with live records.
                Older additional head IDs are ignored; only expansion of the
                original first entry is retained. The bounded store keeps up to
                60 recently used day views.
              </p>
              <p>
                Shared subsection backplates use the semantic surface family.
                Dark cards and popovers use opaque Plum backplates; related
                reading panels retain 94% Plum glass. Light cards and popovers
                use opaque, off-white Lilac mixtures. Foregrounds remain opaque
                and independently paired. Registry tests composite translucent
                panels over the moving ramps and neutral extremes, then check
                normal text at 4.5:1 or better. Component decoration may add
                depth, but it must not replace that readable base.
              </p>
              <p>
                Past-day cards reuse the intake card’s 80px frame, 21px corners,
                2.5px inward gradient rim and shared semantic base, restrained
                Lilac reflection and quiet glaze via MedicationCardBackground.
                One artwork tile takes the first chronologically taken
                medication’s saved icon, rotation and color, rather than dose or
                catalog order. Missing medications retain a fallback;
                reflection-only days use a sun for Morning alone or a moon for
                Evening. The upper row pairs month/day and weekday with
                pill/Benzo totals using canonical 18px markers and 13.5px/650
                numeric copy, reduced to 12.5px in containers up to 380px so
                ordinary decimal totals and short weekdays stay readable. The
                lower row shows Logs, unique Meds and whether Morning, Evening
                or both check-ins are saved. There is no medication-icon fan,
                goal judgment or visible reflection excerpt. Both rows remain
                single-line, truncating when needed; narrower containers shorten
                the weekday. Full accessible labels retain dates, totals,
                medication names and reflection details. The whole card is one
                native day link; the lower summary uses the full available
                width.
              </p>
              <p>
                Past Days groups these same cards into Monday–Sunday ISO weeks,
                newest week and newest day first. Each compact heading pairs the
                week number and ISO week-year with its full Monday–Sunday date
                range, including weeks spanning two calendar years. Only
                recorded tracking days appear; gaps do not create empty cards.
                Reflection-only days remain part of their week. The journal’s
                timezone and 06:00 reset resolve the day before calendar
                grouping begins, so grouping does not move an entry to another
                day.
              </p>
              <p>
                Multi-day weeks use the intake stack’s measured card positions,
                21px glass frame, quiet moving tint, notched footer and dual
                chevrons. The whole folded stack reveals its days; after
                opening, each original card is a native day link. Reveal and
                Collapse preserve the mounted cards, support keyboard focus and
                respect reduced motion. One recorded day keeps its week heading
                and direct link without an unnecessary disclosure. Week
                expansion and the history loading budget are remembered in the
                journal’s existing local history view, independently of form
                drafts.
              </p>
              <p>
                Load more weeks advances the existing 20-recorded-day budget,
                then includes the complete boundary week. It never splits a week
                across batches. The opening coverage counts all recorded past
                days and intakes, including those not yet loaded; today and
                future tracking days stay outside Past Days. These stacks change
                only presentation and leave saved intake and check-in data
                unchanged.
              </p>
              <p>
                Each individual past-day page opens with a centered weekday and
                month/day/year, small recorded-intake and unique-medication
                counts, a compact Past Days link and a short separator. The
                overview statistics, Medication Totals cards and separate Logged
                intake summary row are removed. The focusable{" "}
                <code>#logged-intakes</code> region directly contains the intake
                cards or their empty state, without adding a visible heading.
                Check-ins, timeline order, Previous/Next day navigation and Add
                missed intake keep their existing behavior. Reflection-only days
                show zero intakes rather than inventing medication activity.
              </p>
            </Detail>
          </div>
        </Section>

        <Section
          id="motion"
          number="10"
          title="Motion, Input & Accessibility"
          context="Delight With A Purpose"
          icon="shootingStar"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              Continuous ambience, one-time arrivals and direct interaction are
              different jobs. Keep them coordinated without making a control
              depend on motion. Device preferences and page visibility are part
              of an effect’s lifecycle.
            </p>
            <dl className={styles.referenceList}>
              <div>
                <dt
                  id={guideHeadingId(
                    "developer-reference",
                    "Continuous Effects",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Continuous Effects"}
                >
                  Continuous Effects
                </dt>
                <dd>
                  Pause work when hidden, out of view or disabled where the
                  component supports it. Clean up animation frames, listeners,
                  observers and graphics resources.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId(
                    "developer-reference",
                    "One-Time Arrivals",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"One-Time Arrivals"}
                >
                  One-Time Arrivals
                </dt>
                <dd>
                  Use bounded, finite effects. Related cards retain a 180ms
                  interval between starts. Each daily log now has one mixed
                  IntakeTimelineEntrance owner for check-ins, intake heads,
                  folded undercards and the empty state. Its stable outer
                  data-log-entry-scope is excluded from the ordinary page-card
                  controller; the nested intake grid has no second controller.
                  Before reserving starts, it waits for the shared data,
                  workspace and idle-curtain boundary. The same finite CSS
                  play-state gate prevents progress and other nested entrances
                  from finishing under the loader. After the existing two
                  measurement frames and 60ms, one DOM-order query gathers
                  pending visible cards, so observer callback order cannot start
                  a lower check-in or another group first. Only main faces
                  reserve the shared 180ms start cadence: standalone cards,
                  check-ins, the empty state and the top card of each group. A
                  group head advances the sequence exactly like a standalone
                  card; the next main starts one step later, without waiting for
                  the head’s 1140ms arrival to finish. Each group has an
                  independent absolute rear clock seeded at its head’s start
                  plus 180ms. The first rear and the next main may start
                  together; later rears retain their own 180ms cascade while
                  consuming no global slots. Late-visible rears continue their
                  local clock, and a rear-only batch never extends the main
                  queue. Visible orphan rears can enter without waiting for an
                  offscreen head. Main arrivals remain 1140ms and rear previews
                  960ms. Each group’s decorative surface starts on the next
                  local 180ms beat after its last scheduled exposed face starts,
                  while the cards finish their own entrances. The surface
                  gathers over 360ms and the control follows 40ms later with a
                  360ms rebound and 240ms paired chevron greeting. This shell
                  reveal consumes no global card slot and does not delay the
                  next card. Hidden/capped faces cannot block it. Interaction,
                  disclosure, cancellation, hidden tabs and reduced motion
                  settle the shell immediately. Hidden/capped and offscreen
                  faces do not reserve global slots. Detaching, scrolling out,
                  interacting, backgrounding and reduced motion still settle
                  affected faces. Once no main is running, unused global
                  reservations clear even if rear tails continue; effect cleanup
                  also resets the idle clock. A stable owner and
                  intake-ID/check-in-day-period identities prevent replay or
                  editor remounts on clock updates, drafts and dialogs. The
                  17:00 Evening availability is sampled on refresh or a new
                  visit. Check-in spacing is inert and adds no queue slot or
                  completion barrier. Its right-side progress rail replays
                  number and artwork together on that card’s dialog open/close
                  or completion changes, without replaying the whole card or
                  remounting an editor. The copy shares a gentle 1560ms
                  fade/scale/shift/rotation rebound with the existing artwork’s
                  timing, including its 38% and 65% peaks. Return delays remain
                  180ms desktop and 400ms mobile; the shared entry-readiness
                  play-state gate and reduced-motion static result remain. Stack
                  disclosure still settles all target faces and visible
                  neighbors before layout moves; restored-open groups retain
                  fully painted content. Other card lists keep their existing
                  page-scoped cadence and viewport batches. Page, dialog,
                  drawer, menu, tooltip, search-result, milestone and toast
                  openings retain their shorter individual durations. Exits,
                  disclosure movement, input waits and ambient loops keep their
                  own timing. Scroll reveals wait inside the usable viewport.
                  The streak spotlight waits for that same readiness before
                  starting its timer or consuming its history-entry marker, then
                  clears its particles after the unchanged 3.36 seconds.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Reduced Motion")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Reduced Motion"}
                >
                  Reduced Motion
                </dt>
                <dd>
                  Prefer a quiet static state. Preserve the information, focus
                  destination and ability to complete the action.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Touch & Hover")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Touch & Hover"}
                >
                  Touch & Hover
                </dt>
                <dd>
                  Mobile has no hover animations. Desktop hover is scoped to a
                  viewport of at least 768px with hover support and a fine
                  pointer.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Keyboard")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Keyboard"}
                >
                  Keyboard
                </dt>
                <dd>
                  Use real links and buttons, descriptive names, visible focus,
                  and predictable disclosure. Decorative icons and particles
                  stay out of the accessibility tree.
                </dd>
              </div>
              <div>
                <dt
                  id={guideHeadingId("developer-reference", "Forms & Feedback")}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"Forms & Feedback"}
                >
                  Forms & Feedback
                </dt>
                <dd>
                  Keep labels attached to fields. Explain errors in text, retain
                  drafts after a failed save, and distinguish a loading state
                  from an empty result.
                </dd>
              </div>
            </dl>
            <Detail
              title="Notifications With Native Behavior"
              context="Shared Sonner Adapter"
            >
              <p>
                The shared <code>src/components/ui/sonner.tsx</code> adapter and{" "}
                <code>sonner.css</code> follow the{" "}
                <ExternalLink href="https://ui.shadcn.com/docs/components/radix/sonner">
                  shadcn Sonner
                </ExternalLink>{" "}
                pattern. The <code>journal-toast</code> facade adds a concise
                contextual heading, a dot separator and a secondary type label,
                with the complete message in its own description. Callers may
                provide explicit heading and description copy; the facade never
                guesses where an arbitrary message should be split. Its six
                types are Success, Error, Info, Warning, Loading and Update.
                Semantic glyphs and secondary type labels identify each kind
                beyond color: a double check for success, X for error,
                lightbulb for information, warning triangle, rotating refresh
                mark for loading and sparkles for an available update.
              </p>
              <p>
                Short messages use a compact 64px minimum height, 40px artwork
                and 10px vertical padding. The title and description share a 2px
                gap; complete descriptions wrap naturally without clamping.
                A 38% Pink 300 overlay sits above the themed glass surface. A
                thicker 4px neutral rim and a 2px Pink 500 band at 56% opacity
                both paint inward using inset shadows, preserving Sonner’s
                hover and swipe pseudo-elements. The same pink edge token
                appears in the icon’s rear plate and front tile. Secondary
                copy uses 78% ink in light mode and 90% in dark mode to stay
                readable against the brighter pink surface.
              </p>
              <p>
                Three 34px rounded squares replace the circular rings. Pink
                and lilac rear plates tilt gently in opposite directions over
                7.4 and 8.1 seconds; the deep Plum front keeps the 18px glyph
                legible. A short sheen, tiny square sparks and a restrained
                glyph spring complete the artwork. The icon stack arrives over
                780ms after an 80ms delay; its glyph follows at 140ms. The
                notification’s position and scale remain entirely under Sonner’s
                control. Artwork and copy departures fit within its 200ms
                removal window. Hidden loading artwork and collapsed rear
                plates pause, while reduced motion presents the settled design.
                Button hover styling runs only with a fine pointer that
                supports hover.
              </p>
              <p>
                Sonner remains responsible for announcements, keyboard access,
                stack offsets, height measurement, rear-card visibility, native
                hover/focus timing, swipe dismissal and notification lifetime.
                The facade passes IDs, actions, cancellation, callbacks and
                duration through to the standard toast methods; it adds no
                request, extra timer or separate lifetime owner.
                Loading-to-success and loading-to-error updates keep the same ID
                and list item. The top-center stack caps at 460px, respects safe
                areas and retains 16px mobile side insets. Its compact 10px gap
                separates the stack; three notifications remain visible
                with a default lifetime of 5,500ms.
              </p>
              <p>
                PWA Update notices use the shared update artwork and retain{" "}
                <code>duration: Infinity</code>, their stable ID and native
                Reload/Later actions. Contextual messages distinguish refreshing
                a journal, changing an intake, managing medications, saving a
                check-in and updating settings. Success still follows the actual
                completed operation; error descriptions keep the complete
                failure message. Presentation neither applies an app update nor
                changes when a journal operation succeeds.
              </p>
            </Detail>
          </div>
          <DeveloperCode
            label="Scope Decorative Motion & Hover"
            language="CSS"
            code={MOTION_EXAMPLE}
          />
        </Section>

        <Section
          id="icons"
          number="11"
          title="Icons, Emoji & Local Artwork"
          context="One Familiar Marker"
          icon="medications"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              Interface actions use the project’s Phosphor-based
              <code> ActionIcon</code> mapping. Medication symbols combine
              Lucide icons, emoji and{" "}
              <strong>{SVG_ICON_CATALOG.length} local SVG entries</strong>.
              Outline and colored variants count separately because each is a
              distinct selectable value.
            </p>
            <div className={styles.iconKinds}>
              <div>
                <span>
                  <ActionIcon name="medications" className="size-7" />
                </span>
                <strong>Outline</strong>
                <small>Follows The Accent</small>
              </div>
              <div>
                <span aria-hidden="true">🌻</span>
                <strong>Emoji</strong>
                <small>One Grapheme</small>
              </div>
              <div>
                <span>
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" fill="#74d4ff" />
                    <path
                      d="M12 4v16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <strong>Color SVG</strong>
                <small>Flat Artwork Color</small>
              </div>
            </div>
            <p>
              The appearance picker presents three source counts in one row.
              Icons includes Lucide and custom SVG artwork; Emojis isolates the
              curated emoji catalog; Customs narrows to the local SVG entries. A
              source opens immediately with its first 100 choices. Press the
              active source again to return to mixed search. Typed searches keep
              their 2.5-second pause and respect the current source.
            </p>
            <p>
              Load more appends each next batch inside the compact scroll panel.
              Short separators mark batch boundaries; an emerald loading state
              gives brief feedback while the next set appears. The final batch
              can be smaller. Query or source changes reset the visible range
              and cancel any pending load. These are browsing controls: only
              selecting a radio option changes the saved symbol. Keyboard focus
              remains on the loading control, and reduced motion keeps the same
              status without decorative movement.
            </p>
          </div>
          <div className={styles.detailGroup}>
            <Detail
              title="Add Or Refine A Tablet"
              context="24 × 24 Geometry"
              open
            >
              <ol className={styles.orderedList}>
                <li>
                  Start with geometry in{" "}
                  <code>src/lib/tablet-icons/geometry.ts</code>. Keep the 24 ×
                  24 Lucide-compatible viewBox, centered silhouette and simple
                  stroke geometry.
                </li>
                <li>
                  Add artwork metadata in <code>artwork.ts</code>: stable slug,
                  component name, shape, aliases, keywords, variant and any flat
                  artwork color.
                </li>
                <li>
                  Generate the public assets with{" "}
                  <code>npm run icons:tablets</code>, then verify with{" "}
                  <code>npm run icons:tablets:check</code>.
                </li>
                <li>
                  Check the resulting glyph at small sizes in search, Final
                  Look, a medication row and an intake card. Preserve meaningful
                  relative tablet sizes.
                </li>
              </ol>
            </Detail>
            <Detail
              title="Names, Labels & Search"
              context="Stored Values Stay Stable"
            >
              <p>
                The catalog separates component names, stored values, labels and
                search aliases. Search can match names, labels, keywords and
                English or German terms. Historical appearance values remain
                supported; renaming a label should not silently rename a stored
                key.
              </p>
              <p>
                Local SVG selection uses the allowlisted catalog. The medication
                icon field accepts a known symbol or a single supported emoji,
                rather than arbitrary SVG markup or remote URLs. The 17 colored
                variants render inline from the shared{" "}
                <code>TABLET_SHAPES</code> geometry and fixed catalog palettes;
                each rendered instance uses unique local SVG mask IDs and
                luminance masks to preserve transparent cutouts. The original 12
                tintable drawings also render inline from their exact checked-in
                path geometry, with 2.5px strokes and their original filled
                dots. The 16 outline tablets retain their inline renderer. All
                existing 45 stored IDs, colors, filenames and search aliases
                remain stable, so saved selections continue to work without
                reselection. The assets are already vectors: their display uses
                SVG geometry directly, with no bitmap conversion or
                bitmap-quality settings.
              </p>
              <p>
                Nose, Single Tablet and Angled Tablet bring the local catalog to
                48: 31 tintable outlines and 17 colored variants. Nose’s
                shortened bridge fits a square 24×24 viewport while keeping the
                reference profile recognizable. Lucide-compatible defaults use a
                2px currentColor stroke, no fill and rounded caps and joins. The
                stored svg:nose key follows the existing allowlisted catalog and
                inline-vector rendering path. English and German aliases include
                nose, nasal, nostril and Nase; selecting or tinting it needs no
                special image conversion. Angled Tablet uses svg:tablet-angled
                for a tilted elliptical face, a single score and a visible
                sidewall, following only the rear pill of the supplied
                reference. Its Lucide-compatible SVG and native inline renderer
                share the exact same unfilled geometry. Intake form glyphs reuse
                that shape with a black 2.5px stroke and fill only its closed
                areas with full-opacity Levomethasan Zinc 300 #D4D4D8; other
                saved appearances retain their own settings. The earlier
                circular svg:tablet-single remains selectable with its stored ID
                and aliases unchanged. Branding and the Pills count marker
                retain the original two-tablet symbol.
              </p>
            </Detail>
            <Detail
              title="Sharp Icons After Entry"
              context="Prime The SVG Mask At Display Size"
            >
              <p>
                An inline vector can still look pixelated when a browser caches
                its SVG mask at the tiny starting size of a parent animation.
                Safari reproduced this for the colored pump after the entrance
                had completely finished: zooming repainted a sharp image at the
                exact same dimensions. Removing settled identity transforms did
                not fix that cached mask, so the original fan and group layout
                remain intact. The behavior matches the rendering issue
                discussed in{" "}
                <ExternalLink href="https://bugs.webkit.org/show_bug.cgi?id=199706">
                  WebKit 199706
                </ExternalLink>
                .
              </p>
              <p>
                The shared icon entrance now starts at its normal display size
                with 0.001 opacity (0.1%), giving the mask a full-resolution
                initial paint. Its existing backwards-fill delay holds that
                effectively invisible pose. At 2% it reaches the familiar 0.14
                scale, 0.45 opacity and spinning start, then follows the same
                overshoot, duration and stagger. This is a one-time allocation
                fix: there are no redraw loops, zoom listeners, extra GPU hints
                or changes to saved artwork. Reduced motion retains the normal
                static icon.
              </p>
              <p>
                Verify untouched, just-finished icons before any zoom or group
                interaction, then compare equal-coordinate image crops after a
                zoom/revert or reveal/re-collapse. Check colored cutouts,
                quantity fans, saved rotations and multiple screen densities. A
                computed transform of none alone cannot prove a sharp render.
                The original twelve drawings also have a regression comparing
                rendered SVG nodes against the public asset geometry, preserving
                their identities and tinting without external CSS masks.
              </p>
            </Detail>
            <Detail
              title="Color, Rotation & Preview"
              context="Keep The Meaning Clear"
            >
              <p>
                Outline artwork follows the selected medication accent. Flat
                colored artwork retains its own palette. Rotation changes the
                glyph while its surrounding preview remains upright; the editor
                offers 45° steps.
              </p>
              <p>
                Medication appearance is a personal visual marker. Keep the
                medication name, active ingredient, strength, quantity and unit
                visible in the appropriate flows rather than asking the artwork
                to carry those details alone.
              </p>
            </Detail>
          </div>
        </Section>

        <Section
          id="architecture"
          number="12"
          title="A Map Of The Project"
          context="Find The Right File"
          icon="discover"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              App Router pages compose the screens, shared components handle
              interaction, pure library modules hold domain and appearance
              rules, and server modules own authentication and persistence.
              Generated public assets stay connected to their source data.
            </p>
            <div className={styles.architectureFlow}>
              <span>Routes</span>
              <ActionIcon name="next" className="size-3.5" />
              <span>Components</span>
              <ActionIcon name="next" className="size-3.5" />
              <span>Domain Helpers</span>
              <small>
                API boundaries connect the journal provider to isolated server
                persistence.
              </small>
            </div>
          </div>
          <div className={styles.sourceGroups}>
            {SOURCE_GROUPS.map((group) => (
              <Detail
                key={group.title}
                title={group.title}
                context={`${group.files.length} Files`}
              >
                <p>{group.description}</p>
                <ul className={styles.sourceList}>
                  {group.files.map(([path, description]) => (
                    <li key={path}>
                      <ExternalLink href={developerSource(path)}>
                        {path}
                      </ExternalLink>
                      <p>{description}</p>
                    </li>
                  ))}
                </ul>
              </Detail>
            ))}
          </div>
          <div className={styles.detailGroup}>
            <Detail
              title="First Sign-In & The Journal Guide"
              context="One Introduction Per Journal"
            >
              <p>
                Newly created journals carry an optional
                <code> onboarding.guidePending</code> flag. The daily route
                reads that flag and directs a first visit to{" "}
                <code>/guide#start</code>. An absent flag represents an existing
                journal and does not force a new introduction.
              </p>
              <p>
                The actual guide mount acknowledges its arrival through
                <code> POST /api/onboarding/guide</code>. The server updates
                that one journal through the existing versioned mutation. Guide
                links to the daily screen wait for the shared acknowledgement
                before navigating, so a fast first click can start the log
                immediately.
              </p>
              <p>
                This records opening the guide, not completing it. Returning
                visits can resume their last screen, and Guide remains available
                from navigation. The flag belongs to journal state rather than
                the browser’s local storage or the authentication cookie. The
                first guide’s Daily Log action declares its destination before
                navigating, so screen restoration cannot send it back here.
              </p>
            </Detail>
            <Detail
              title="Domain Contracts Worth Preserving"
              context="Small Details, Real Data"
            >
              <ul className={styles.bulletList}>
                <li>
                  A tracking day begins at 06:00 in the saved journal timezone.
                  Grouping uses Date &amp; Time Taken, including daylight-saving
                  boundaries. Small wake-up and bedtime markers frame the entire
                  mixed stack on Today and historical daily pages. Each label
                  uses 11px text above its 13.5px time, separated by 2px; quiet
                  rules flank the time. Their 12:30 and 23:30 defaults are
                  display-only. Morning’s Got up field and Evening’s optional
                  Tonight’s bedtime field update their respective marker
                  independently from raw drafts; saved values persist and an
                  explicit clear restores the fallback. These clocks do not
                  create answers, reorder intakes or change the 06:00 boundary.
                </li>
                <li>
                  Consecutive intakes within a rolling 13-minute gap share a
                  stack. Each intake extends the window; creation time does not
                  decide membership.
                </li>
                <li>
                  Dose is recorded quantity multiplied by the medication’s
                  current strength. Editing a linked medication updates the
                  presentation and recalculated dose of past intakes.
                </li>
                <li>
                  Goals compare one medication against its own chosen value.
                  Different medications are not merged through an automatic
                  equivalence calculation.
                </li>
                <li>
                  Categories are manually selected labels. Names and ingredients
                  do not automatically classify a medication.
                </li>
                <li>
                  Morning and Evening check-ins share the same large-logo
                  layout: an 80px frame, 21px corners and a 48px artwork tile in
                  a 56px stage. Both use the plain transparent group base, with
                  the same 50%-opacity 24px blur and 1.08 saturation. Former
                  feature gradients, tint and glaze layers are removed. The
                  shared muted rim sits outside without changing geometry; a
                  2.5px inner rim uses the main icon background at 50% opacity.
                  Sunrise and crescent artwork distinguish the periods; their
                  colors, entry motion, ambient loops and progress replay stay
                  independent of this plain card face. Section dots retain the
                  deeper Plum pigment. Details and icon stages remain 56px, the
                  tile 48px and glyph 28px, with 11px artwork-to-copy clearance
                  (7px below 360px) and 8px trailing inset. SavedCheckInHeading
                  now separates opening history from save history. Its primary
                  HH:mm is the first recorded opening on this device, using the
                  intake time class: 13.5px/700 rounded-system type at roughly
                  75% foreground visibility. The 5ch time column and shared text
                  gap lead the 15px/650 title with its 20px line box and 15px
                  top inset. Unknown first openings display an em dash with an
                  explanatory accessible label; createdAt is never substituted
                  for an opening. Under the primary time, the latest successful
                  updatedAt uses 9px/475 type, 36% foreground visibility, a 12px
                  line and 1px vertical gap. Only this saved-update display may
                  fall back to a validated legacy createdAt. No valid save means
                  no secondary timestamp. The heading shifts 3px left, or 2px
                  below 360px. The static 11px/550 lower invitation starts on
                  the title’s vertical line: “Still here. Take stock.” for
                  Morning and “Survived? Leave notes.” for Evening. It never
                  changes into a response excerpt or claims that a local edit
                  has been saved. Both content rows remain single-line and
                  truncate before the completion meter. The meter uses a 40px
                  ring with rounded whole number centered alone in 13px/625 type
                  at 94% opacity, using the arc’s Lilac foreground and a
                  single-line height. There is no percent sign, caption or
                  separate outside percentage. The background measures 40px
                  across: the original 17px radius plus one third of the former
                  9px increase gives a 20px radius. The right component now uses{" "}
                  <code>align-self: center</code> with zero top margin, placing
                  that footprint 20px below the 80px card’s top edge; the
                  heading retains its 15px inset. The Lilac/Fuchsia arc follows
                  a quiet foreground track. Section dots use the shared deepest
                  Plum pigment, at 50% opacity while unfinished and 100% when
                  complete. This single number replaces the old center
                  spark/check. The meter is always present. With no saved
                  record, no genuine draft change and no valid first-opening
                  observation, the entire meter uses exactly opacity: calc(1 /
                  3) and a decorative 6% starter arc. The number and accessible
                  completion remain 0, and no section dot is marked complete. An
                  observed opening without edits restores full-strength
                  presentation with a true zero-length arc and the number 0;
                  opening still earns no completion credit. Saved responses and
                  genuinely changed drafts retain normal presentation even when
                  opening metadata is absent. The shared getCheckInCardProgress
                  helper keeps its visible flag as a saved-or-changed-content
                  signal; rendering no longer uses that flag to hide the meter.
                  It projects valid raw draft groups independently: six Evening
                  sections or five Morning groups, rounded to a whole
                  percentage. It makes no API request and changes neither saved
                  content nor timestamps. Both periods retain{" "}
                  <code>hasCheckInDraftChanges</code> for content detection and{" "}
                  <code>getCheckInCardFeedback</code> for accessible saved/local
                  draft feedback and missing-section descriptions. There is no
                  visible Saved, Draft saved, Unsent draft or Optional label.
                  Number, orb, halo and dots share the existing replay identity
                  when their own dialog opens/closes or completion changes. The
                  number and orb arrive over 1560ms, with scale rebounds at 38%
                  and 65% of the choreography; their peak scales are 1.08 and
                  1.14 respectively. The arc draws over 1200ms after 160ms,
                  completed dots pop for 600ms with 90ms section staggering, and
                  confetti runs for 1200ms after 260ms. Return delays remain
                  180ms desktop or 400ms mobile. After entry, a restrained
                  7.2-second halo breath and number float share one loop start.
                  The shared entry-readiness, pending-card and dialog-open gates
                  pause motion; reduced motion shows the settled result. The
                  whole card stays the editor trigger, with no nested meter
                  button or editor remount. First-open observations live in the
                  authenticated journal-scoped local workspace’s checkInOpenedAt
                  map, using the existing day/period draft keys. openDialog
                  records the current instant once. setLocation also observes a
                  restored already-open check-in only on the screen actually
                  visited; dormant saved screens are not retrospectively marked
                  opened. Existing version-1 workspaces may omit the map.
                  Validated dates, periods and epoch-millisecond timestamps keep
                  invalid metadata separate from valid drafts. The bounded map
                  retains 8,192 observations without evicting earlier history;
                  quota failures remain visible through the existing storage
                  status. Close/reopen, refresh, draft reset and successful-save
                  cleanup preserve the opening record. This is device-local
                  tracking from now on, not cloud persistence or reconstructed
                  history. It neither creates a response nor grants completion
                  or a save; only a successful Save Check-In or reflection PATCH
                  advances the secondary saved-update time. Neither card has an
                  extra greeting, date, inline title icon, trailing chevron or
                  external section buttons. Zero outer margins and the intake
                  timeline’s 8px item gap remain. When actual intakes are
                  adjacent, a 4px inert spacer gives 12px visible clearance.
                  Empty/reflection-only days add none, and a final check-in has
                  no outside bottom spacer. The spacer has no artwork, observer
                  or entry-queue slot. One stable outer timeline owns the mixed
                  entrance sequence; its nested intake grid is passive,
                  preserving stack layout without two controllers reserving
                  entries out of order. Morning starts at 06:00 above the list.
                  At 17:00, Evening appears below the final intake while Morning
                  stays above the list until the next 06:00 reset. The layout
                  samples availability on refresh or navigation back to this
                  view; it adds no cutoff timer and stays stable during the
                  visit. A new tracking day or timezone resamples eligibility
                  while retaining the same keyed editors and the shared
                  day-reset clock. Both check-in hints stay on the lower row,
                  aligned with the title rather than the time column. Past-day
                  Morning precedes the intake list and Evening follows it.
                  Position is independent of draft or saved status. A keyed
                  editor keeps the open period and original day across rollover.
                  The shared Your Morning, Your Words / Your Day, Your Words
                  doorway uses the shared Plum/Lilac foundation, one Apricot
                  accent and neutral copy. A quiet blurred outer rim and finer
                  inner edge distinguish it from the ordinary form sections;
                  their paint stays behind content and does not change layout.
                  The title, leading icon tile and trailing controls align at
                  their top edges. Base sizes are 15px/20px for the single-line
                  heading, 40px for the tile, 28.333px for the two controls and
                  15.833px for their glyphs. The named journal-doorway
                  inline-size container reduces those sizes at 310px of content
                  width to 13px/35px/25px/14px, and at 260px to
                  11.75px/30px/24px/13.5px. This keeps the complete title on one
                  line without taking space from the opposing actions. Morning’s
                  real vector coffee mug sways by two degrees over 3.6 seconds.
                  Three curved steam paths rise and sway over 2.8 seconds with
                  0ms, 220ms and 440ms starts. Evening retains its ScribbleLoop
                  dance; both glyphs use a quiet theme-aware ink cycle. The tile
                  reuses AccentButtonSurface at 50% opacity over a neutral
                  reading base, with a restrained Lilac edge and softened halo.
                  Real artwork remains above the clipped paint. Read and Library
                  remain borderless neutral controls with 2.6-stroke glyphs.
                  Visibility, hidden tabs, writer and reader states pause
                  decoration; reduced motion keeps it still. A real
                  SecondaryButton opens the existing writer. Its local 56px base
                  height retains the shared responsive increments; an 18px
                  radius is passed to both the frame and specular rim. The
                  Accent face now uses the same Charcoal/Mint field, 13% tint
                  and mode-aware Mint/Ice/Teal rim as Log Intake. Local
                  background, foreground and dimmed face/rim overrides are
                  removed so the same shared pigments remain visible at this
                  existing size. Decorative journal-icon paint keeps its earlier
                  palette through a separate artwork helper. The surrounding
                  journal-panel backgrounds and decorations retain their
                  existing Apricot detail. These are local button paint changes;
                  Secondary behavior remains unchanged. Equal 22px outer rails
                  center the pencil-and-label group while the arrow stays at the
                  right. Local word, character and reading statistics use one
                  unboxed single line beneath it: 10.5px values, 10px labels and
                  a 14px line height. The surrounding 11.5px/600 guidance uses
                  an 18px line to explain Markdown, draft continuity, reading,
                  the saved-Journal threshold and the separate Save Check-In
                  action. Reading opens safe rendered Markdown from the current
                  draft; Edit entry closes the reader before returning to the
                  same writer. Manual Refresh synchronizes saved journal data
                  without replacing unfinished draft fields or making an AI
                  request. The existing ReflectionDialog and independent saving
                  controls retain their launcher ref. Writing supports up to
                  100,000 characters. Done returns to the check-in with the
                  draft; Save Check-In saves all responses. The plain writer
                  header has more top space, no heading icon or fade, and a
                  larger description clamped to three lines. Its context row
                  above the heading shows the full weekday, abbreviated month
                  and day without a year, then a dot and Reflection, with the
                  shared 44px close control opposite. Two icon-only toolbar rows
                  stay outside the text scroll area; mobile height follows
                  visualViewport. Top buttons use 33px targets and 2.6-stroke
                  Lucide glyphs, with 30px formatting buttons below. Pencil/Eye
                  share neutral coloring, Bookmark/BookmarkCheck reflect saved
                  state, and CloudCheck keeps Done’s existing celebration
                  timings, including the 700ms centered hold and downward
                  departure. Groups use Black at low opacity in light mode and
                  White at low opacity in dark mode; the top buttons share that
                  quiet neutral treatment. Active formatting uses a strong
                  neutral fill and follows the actual source/selection,
                  including code exclusions. Formatting taps preserve the caret
                  and keyboard; top actions blur the writing field. Info opens a
                  nested help dialog with Markdown examples and practical tips,
                  then restores focus to Info on close. FileDown starts a
                  trusted local .md download synchronously, followed by visual
                  preparing/downloading/ready feedback; it makes no network
                  request. Preview and reader never execute raw HTML or load
                  remote images automatically.
                </li>
                <li>
                  A logging streak counts days with intake records. A
                  check-in-only day remains available in History without adding
                  to the streak.
                </li>
              </ul>
            </Detail>
            <Detail
              title="Journal Links with @ and /"
              context="Two Triggers, One Local Catalogue"
            >
              <p>
                Both check-in writers recognize two unresolved markers at a
                collapsed caret. <code>@</code> searches saved medication names,
                active ingredients and the 19 manual medication categories.
                Categories mean labels such as Benzodiazepine or Sleep Aid;
                Tablet, Drops and other dosage forms remain separate
                presentation/counting units. <code>/</code> searches tracking
                days, Monday–Sunday ISO weeks and Morning/Evening journals.
                Archived medication matches stay available and are labeled.
                Medication usage orders names, with stable saved-order ties;
                ingredient matching and deduplication share case, combining-mark
                and whitespace normalization.
              </p>
              <p>
                Every source edit replaces the previous results with compact
                animated pending feedback. After 800ms without typing, lookup
                reads already-loaded AppData, with deterministic results bounded
                to twelve parent rows. No search API, AI call or background
                write is involved. A space anywhere in the live query closes
                autocomplete and leaves the prose unchanged; a marker followed
                immediately by whitespace is ignored by render-time resolution
                too. Compact inputs such as <code>/9Nov</code> work without
                interrupting the live menu.
              </p>
              <p>
                The source recognizer uses the textarea’s UTF-16 offsets,
                considers at most 160 source units after the trigger on one
                unresolved line and suspends during IME composition. Selected
                text, email addresses, escaped markers, existing Markdown links,
                inline/fenced code and protected syntax never open the menu. The
                popup follows the caret and stays within the visible writing
                pane during scroll, resize and mobile viewport changes. Reduced
                motion retains readable pending feedback without decoration.
              </p>
            </Detail>
            <Detail
              title="Selecting or Typing a Reference"
              context="Separate Insertion from Disclosure"
            >
              <p>
                A medication’s main row inserts that medication. Its separate
                disclosure reveals available intakes from the current tracking
                day, with their actual taken time, quantity/dose and route
                artwork. A day’s main row inserts the whole daily log; its
                disclosure offers saved Morning/Evening writing separately.
                Children start collapsed and use a quieter indented treatment.
                Opening a disclosure never inserts its parent link, and choosing
                the parent never forces open its children.
              </p>
              <ul>
                <li>
                  Up/Down moves through visible rows. Right opens a disclosure
                  or moves into its children; Left returns to the parent or
                  collapses it. Enter or Tab inserts the current row. Escape
                  dismisses only suggestions and does not close the writer.
                </li>
                <li>
                  Pointer selection preserves the textarea focus, caret and
                  mobile keyboard. A scrolling gesture cancels selection rather
                  than inserting whichever option happens to be underneath it.
                </li>
                <li>
                  Insertion escapes the readable label, encodes a validated
                  local destination and restores the caret after an ordinary
                  Markdown link. Completing mid-word consumes its remaining
                  suffix. The complete generated Markdown, including escaping
                  and URL length, must fit the 100,000-character source budget.
                </li>
              </ul>
              <p>
                Choosing a result is optional. Exact typed medication names,
                matching explicit strengths, ingredient names and category
                aliases resolve in Markdown prose without rewriting saved text.
                Ambiguous aliases and mismatched strengths remain ordinary prose
                until a specific menu result is chosen. Code, existing links,
                escaped markers and email addresses remain untouched. This
                render-only enrichment uses the same local catalogue and never
                changes autosave timing, submits a check-in or creates a new
                database record.
              </p>
            </Detail>
            <Detail
              title="Days, Weeks and Journal Periods"
              context="Concrete Dates, Stable Old Writing"
            >
              <ul>
                <li>
                  Day aliases include <code>/Today</code>,{" "}
                  <code>/Yesterday</code> and <code>/DayBeforeYesterday</code>.
                  The journal timezone and existing 06:00 reset define the
                  current tracking day. Today is included; future days are not
                  suggested.
                </li>
                <li>
                  Dates accept ISO <code>/2026-11-09</code>, day-first{" "}
                  <code>/09.11.2026</code> or <code>/09/11/2026</code>, and
                  yearless <code>/9.11</code> or <code>/9/11</code>. English
                  month names work as <code>/9Nov</code> or <code>/Nov9</code>;
                  spaced month forms also resolve when typed in Markdown prose.
                  Real calendar validity is checked before linking. Exact valid
                  days may link even without saved entries.
                </li>
                <li>
                  Week aliases include <code>/ThisWeek</code>,{" "}
                  <code>/LastWeek</code> and an explicit ISO week such as{" "}
                  <code>/2026-W46</code>. Links store that week’s Monday date,
                  with the ISO week year handled independently of calendar-year
                  boundaries. The current week is available.
                </li>
                <li>
                  Append <code>.Morning</code> or <code>.Evening</code> to a
                  day, for example <code>/Yesterday.Evening</code> or{" "}
                  <code>/2026-11-09.Morning</code>, to link that period’s
                  journal. A day disclosure offers saved nonempty notes; a
                  directly typed period link can also open an honest empty page.
                </li>
              </ul>
              <p>
                Autocomplete resolves its calendar choices against the current
                tracking day and inserts concrete dated destinations. Raw
                relative names and yearless dates left in prose instead use the
                original journal entry’s day as their reference anchor during
                rendering. A yearless date means its latest valid occurrence on
                or before that anchor; an explicit year retains its actual date.
                Moving between editor, preview, shared reader and dated journal
                pages therefore does not make older references drift forward as
                the current date changes.
              </p>
            </Detail>
            <Detail
              title="Seven Compact Reference Components"
              context="One Vocabulary across Preview and Reading"
            >
              <ul>
                <li>
                  Medication: saved vector artwork, name, strength, optional
                  ingredient and canonical colored category tiles.
                </li>
                <li>
                  Active ingredient: ingredient name, matching saved-name count
                  and combined category tiles. Its rendered destination is the
                  most-used matching medication’s active-ingredient section.
                </li>
                <li>
                  Category: the category’s canonical colored tile and label,
                  opening its dedicated medication-category page.
                </li>
                <li>
                  Intake: medication identity, actual taken time and route
                  artwork, with recorded quantity and dose context.
                </li>
                <li>
                  Day: an actual calendar date with limited saved intake and
                  check-in counts.
                </li>
                <li>
                  Week: ISO week number/year, full date range and count of
                  recorded days, without invented placeholder activity.
                </li>
                <li>
                  Journal: its date and Morning/Evening identity with compact
                  writing statistics, opening that specific saved note.
                </li>
              </ul>
              <p>
                All seven use a 30px single-line chip with 24px leading artwork,
                a 17px glyph and 9px corners. The exact background is
                <code> #79697b</code> at 40% opacity, with no card border or
                inset stroke. Names use 12px/650 type; compact metadata and the
                left
                <code> 4 meds /</code> count prefix use 10.25px. Generic kind
                labels are omitted; details remain in native titles and
                accessible names. Colored category markers occupy a bounded
                scrolling rail without wrapping. Fine-pointer hover and keyboard
                focus give the primary symbol a 720ms compress-and-pop, pastel
                glints and a restrained 2.6-second glow. The chip never changes
                layout, touch skips hover animation and reduced motion keeps
                artwork settled.
              </p>
              <p>
                All seven are phrasing content, so a component remains valid
                inside a paragraph, heading or list. Native links keep modifier
                clicks and same-tab navigation. A strict parser accepts only
                validated local medication-ID/ingredient queries, medication
                detail paths, canonical category paths, real dated daily-log
                paths with an optional intake ID, Monday week paths, and dated
                Morning/Evening journal paths. Stored references remain ordinary
                Markdown in drafts, saves and .md downloads. Unrecognized links
                retain normal external-link behavior; raw HTML never executes
                and remote images do not load automatically.
              </p>
            </Detail>
            <Detail
              title="Reference Destinations and Arrival"
              context="Locate the Record, Keep Its Context"
            >
              <p>
                Medication references reveal matching active and archived
                library cards without overwriting the saved Active/Archive
                choice. Show kit removes only reference parameters, preserving
                unrelated query context. An intake link follows the live
                record’s taken time in the current journal timezone, so a moved
                intake or timezone change still reaches Today or the correct
                dated daily log. A collapsed target group opens through its
                existing controller. Arrival waits for data/workspace readiness,
                the refresh curtain, group movement and stable card geometry,
                then focuses, centers above the mobile dock and briefly
                highlights the actual card. Reduced motion uses immediate
                scrolling. Unrelated restored editors close while keeping their
                raw drafts; missing records report an unavailable state.
              </p>
              <p>
                <code>/medications/ID</code> presents the saved definition,
                recorded routes, historical quantities, latest intakes and other
                saved names with the same normalized ingredient label. The{" "}
                <code>#active-ingredient</code> section explains product name,
                ingredient and form, links the FDA explanation and offers an
                intentional National Library of Medicine label lookup.
                Ingredient references choose the matching name with the most
                recorded intakes, including archived definitions, with
                saved-order ties.
              </p>
              <p>
                <code>/medications/categories/SLUG</code> has centered canonical
                artwork, a finite burst arrival and a quiet sway loop, sourced
                NIMH/MedlinePlus category background, matching saved medications
                and related ingredients. Membership comes only from explicit
                saved categories, with the existing legacy flags respected;
                names never infer a clinical category. Archived definitions
                remain visible. Decoration respects page readiness, visibility,
                hidden tabs and reduced motion. Amounts stay per medication and
                per counted form: milligrams from unrelated medicines are never
                combined into a category total.
              </p>
              <p>
                <code>/history/weeks/MONDAY</code> shows the full ISO range and
                actual saved days using the shared history cards.
                Reflection-only days remain eligible; empty weeks stay empty.
                Medication totals retain recorded strength snapshots, separate
                forms and historical fallback names for missing definitions.{" "}
                <code>/journal/DATE/morning</code> and{" "}
                <code>/journal/DATE/evening</code> read the actual saved note at
                any length, including writing below the main collection’s
                strictly-more-than-100-word threshold. Missing or empty notes
                have an explicit empty state and a dated Open Check-In link.
                These authenticated pages reuse the existing provider and safe
                Markdown renderer, with asynchronous validated route parameters;
                they add no API, AI request or database schema.
              </p>
            </Detail>
            <Detail
              title="Writing Saves & Quiet Autosave"
              context="Local First, Journal When Ready"
            >
              <p>
                Writing has two independent protections. Every edit immediately
                updates the existing local check-in draft, including unfinished
                Morning sleep values and the writer’s open state. Journal saves
                update only the reflection text for its original day and period.
                They never submit, normalize or clear the rest of the form. The
                save icon and the plain status below the editor report the
                journal state; the separate device-draft indicator continues to
                describe local persistence. The display guard compares current
                text with provider-confirmed writing and checks online state
                during render, preventing a stale saved message for one frame
                after an edit or while offline. It does not change the autosave
                controller, request limits or draft behavior.
              </p>
              <p>
                The footer has two compact rows separated by 3px, with no
                divider below persistence. Confirmed cloud status reads “Writing
                is up to date.” on the left; local-draft text precedes HardDrive
                on the right. Pending and saving use CloudBackup with only its
                arrow spinning, muted “Waiting to sync…” and “Syncing your
                writing…” copy, and accurate messages for faults. Words, a dot
                and reading time share the second row’s left side; characters
                sit right, with headings where space allows. The muted check-in
                hint is centered below with more top space. Status roles,
                writing-limit and guidance IDs stay linked to the editor.
              </p>
              <p>
                On narrow screens or coarse pointers, writer focus immediately
                hides the entire footer as a fallback before keyboard resizing
                is reported. It remains hidden through visualViewport shrink and
                keyboard closing, then returns on viewport expansion even when
                native keyboard dismissal retains textarea focus. Desktop focus
                keeps the footer visible. These layout changes preserve toolbar
                states, Done’s timings and all drafts.
              </p>
              <h4
                id={guideHeadingId(
                  "developer-writing-save",
                  "When A Request Is Worth Sending",
                )}
                data-guide-outline-level="3"
                data-guide-outline-label="When A Request Is Worth Sending"
              >
                When A Request Is Worth Sending
              </h4>
              <ul className={styles.bulletList}>
                <li>
                  Background saves wait for a two-second typing pause, with a
                  minimum 15 seconds between attempts. Continuous writing has a
                  30-second maximum wait. One owned timer schedules the next
                  eligible save; there is no polling interval and unchanged
                  writing sends no request.
                </li>
                <li>
                  Only one reflection request can be in flight. New edits stay
                  editable and are coalesced into the next snapshot. A
                  successful response acknowledges exactly the text that was
                  sent, so text typed while it was pending stays dirty. A full
                  check-in save drains and pauses reflection work before
                  submitting the frozen form, preventing a late patch after the
                  draft is cleared.
                </li>
                <li>
                  The manual save icon skips the typing delay. It stays disabled
                  when the text is current, another request is pending, the app
                  is offline or a server cooldown applies. BookmarkCheck stays
                  visible while the current text is saved; edits return the
                  control to Bookmark. This visual state does not change
                  autosave timing or local draft behavior.
                </li>
              </ul>
              <h4
                id={guideHeadingId(
                  "developer-writing-save",
                  "Small Payload, Safe Merge",
                )}
                data-guide-outline-level="3"
                data-guide-outline-label="Small Payload, Safe Merge"
              >
                Small Payload, Safe Merge
              </h4>
              <p>
                PATCH /api/daily-check-ins/reflection accepts the day, period,
                exact Markdown and expected saved timestamp. It runs inside the
                repository’s atomic mutation and replaces only note and its
                update timestamp. Mood, Energy, Stress, Sleep, What Helped,
                creation time and the opposite check-in remain untouched. New
                writing creates a note-only record with unknown optional values.
                An empty new note creates nothing. Clearing the last content
                removes only that empty period record; otherwise it retains the
                other saved fields. Repeating an already applied note is
                idempotent and does not advance its timestamp.
              </p>
              <h4
                id={guideHeadingId(
                  "developer-writing-save",
                  "Failure Is A State, Not A Retry Loop",
                )}
                data-guide-outline-level="3"
                data-guide-outline-label="Failure Is A State, Not A Retry Loop"
              >
                Failure Is A State, Not A Retry Loop
              </h4>
              <ul className={styles.bulletList}>
                <li>
                  A 429 response respects Retry-After, including an HTTP date.
                  The cooldown ends by enabling Save; it does not repeatedly
                  send requests. A new intentional edit can resume eligible
                  background work after that pause.
                </li>
                <li>
                  Offline and failed requests leave the complete local draft
                  intact. Save can retry once, or one online event can resume
                  eligible work. A restored sign-in never automatically replays
                  a write. Background saves are quiet and do not globally
                  disable the editor or show a toast for each attempt.
                </li>
                <li>
                  A version mismatch returns 409. Autosave pauses and refreshes
                  the saved journal for review. Legacy or restored local text
                  with an unknown/stale base also waits for explicit Save, so
                  merely opening an older device cannot silently overwrite newer
                  writing from another tab or phone.
                </li>
              </ul>
              <p>
                These rules bound background request frequency without promising
                a particular hosting quota. Closing the writing space returns to
                the same check-in; closing the entire form retains the local
                draft. Save Check-In remains the explicit way to submit all
                remaining fields together.
              </p>
            </Detail>
            <Detail
              title="Journal Library & Reading"
              context="Saved Pages, Drafts Kept Separate"
            >
              <p>
                The persistent Journal destination at <code>/journal</code>
                collects only saved notes with more than 100 Markdown-aware
                words. Exactly 100 words and unsaved drafts do not qualify. Both
                check-in periods contribute independently, but collection cards
                and the reader show no Morning/Evening labels. Titles come from
                the first usable Markdown heading, falling back to the date.
                Search checks title, writing and date locally; the first 20
                entries load with another 20 available per request.
              </p>
              <p>
                Collection entries reuse MedicationCardBase and its actual
                layered surface, 21px corners, 2.5px inward rim and framed
                notebook artwork. A single full-width list keeps the familiar
                intake-card rhythm. Each compact 106px row retains the date,
                15px title, one-line writing preview and local word/reading
                statistics. Long titles and previews truncate visually while the
                complete reading action stays accessible. The whole card opens
                the reader and keeps the shared entrance and keyboard focus
                behavior.
              </p>
              <p>
                The library reader displays saved text; the check-in doorway’s
                reader displays the current draft. Both use the same safe
                ReflectionMarkdown renderer and reading-focused dialog, without
                autosaving controls. Opening or reading writes nothing. Edit
                waits for the reader to close, then resumes the original day and
                internal period in the existing writer. A valid local draft is
                preserved field for field rather than replaced with saved text.
                The Journal route participates in normal workspace persistence.
              </p>
              <p>
                Manual Refresh synchronizes journal data while keeping raw
                drafts; it does not request generated summaries or advice. The
                former A Little Perspective section is no longer rendered or
                requested by either check-in. Its retained server endpoint and
                optional provider configuration are separate from the current
                library, reading and synchronization flows.
              </p>
            </Detail>
            <Detail
              title="Persistence & Installed-App Behavior"
              context="Keep Boundaries Intact"
            >
              <p>
                The journal repository separates journal IDs and uses versioned
                writes. State reconciliation runs inside the atomic mutation, so
                retrying after contention does not discard unrelated journal
                changes. Server API responses containing journal data are
                private and not stored in the service-worker cache.
              </p>
              <p>
                The installed app uses a web app manifest and service worker.
                That worker caches public installation assets and the offline
                page. It does not turn medication writes into a background
                queue; mutations need a connection and explicit result handling.
              </p>
            </Detail>
            <Detail
              title="Morning Sleep Journal"
              context="One Night, Clearly Recorded"
            >
              <p>
                Morning reuses the Evening card, responsive modal, Markdown
                launcher and Accent save action. Both cards share the same
                Plum/Lilac theme, 80px frame and two-row summary; the large Sun
                or Moon tile identifies the period. The journal editor stays
                first; structured sleep details follow in three compact
                sections. Time in bed and Sleep efficiency form one calculated
                summary row immediately above Save Check-In. A 1px separator at
                13% foreground visibility follows the preceding content after
                10px. The summary has 12px of top padding, with 16px between its
                values and Save; both estimates remain one compact row.
              </p>
              <p>
                Morning sits directly in the timeline without an extra greeting
                or heading. Its first recorded opening on this device leads the
                title in the shared intake time style; unknown history shows an
                em dash. The smaller line beneath records only the latest
                successful journal update, with a validated creation-time
                fallback for legacy saved records. Opening observations are
                durable, scoped local metadata and survive draft resets without
                counting as content or completion; they make no database write.
                The heading retains its 15px top inset and 3px left shift, or
                2px below 360px. The title-aligned lower invitation is “Still
                here. Take stock.”; Evening uses “Survived? Leave notes.” The
                right-hand 40px completion ring centers a single 13px/625 Lilac
                number at 94% opacity without a caption. The entire component is
                vertically centered with zero top margin; its 40px footprint
                starts 20px from the 80px card’s top. Its detail accent is exact
                Fuchsia900 in the artwork; the plain group face uses the shared
                muted outer rim and half-opacity identity inner rim. Dormant
                cards retain exactly one-third opacity, with no change to
                completion values, replay or entrance timing. Section dots share
                the rim’s deeper Plum pigment. Both cards keep the 80px frame,
                48px main artwork, shared double frame and coordinated progress
                replay. Accessible descriptions still distinguish saved data
                from local edits and identify unfinished sections. Morning’s
                availability, placement and shared entrance sequence remain
                unchanged.
              </p>
              <p>
                Supporting Morning and Evening sections share quiet, glow-free
                semantic panels. An inward softened Lilac band and finer edge
                organize the fields without becoming another prominent card.
                Their 14px vertical and 12px horizontal padding stays shared;
                focus within a panel strengthens its boundary while leaving the
                response controls as the primary task.
              </p>
              <div
                className={styles.tableScroll}
                tabIndex={0}
                role="region"
                aria-label="Morning sleep fields"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>What it records</th>
                      <th>Input behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>How the night felt</td>
                      <td>
                        Dream recall, current sleepiness, depth, restfulness and
                        overall quality
                      </td>
                      <td>
                        Five nullable whole-number 1–10 sliders, with explicit
                        endpoint descriptions and Clear actions
                      </td>
                    </tr>
                    <tr>
                      <td>The night’s timeline</td>
                      <td>
                        Lights out, getting up, minutes to fall asleep,
                        awakenings and total night-time awake minutes
                      </td>
                      <td>
                        Two local clock inputs plus whole-number counts; the
                        final wake-up is excluded from night awakenings
                      </td>
                    </tr>
                    <tr>
                      <td>Sleep &amp; the morning ahead</td>
                      <td>Total sleep and extra sleep wanted</td>
                      <td>
                        Separate hours/minutes pairs; zero is valid and blank
                        stays unknown
                      </td>
                    </tr>
                    <tr>
                      <td>Calculated summary</td>
                      <td>Time in bed and estimated sleep efficiency</td>
                      <td>
                        Derived from entered clock times and total sleep, never
                        another duplicate input
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Lights out at 23:00 and getting up at 07:00 describes an
                estimated 480-minute window. Reporting 7 hours 30 minutes asleep
                gives 450 ÷ 480 × 100 = 93.75%, displayed as 94%. These are
                neutral arithmetic summaries, without diagnostic thresholds or a
                recommended target. Missing inputs leave the result unknown;
                equal clock times mean zero rather than an invented 24 hours.
                Clock-only estimates do not represent precise instants over a
                daylight-saving change. Sleep longer than a known window is
                rejected instead of clamped to a misleading percentage.
              </p>
              <p>
                MorningSleepDraft keeps raw strings for all clock/count/duration
                fields and null for unanswered sliders. Hours and minutes become
                nullable integer totals only on explicit Save. Each duration is
                bounded to 1,440 minutes, minute components to 59, awakenings to
                100 and ratings to 1–10. Both browser and API enforce these
                rules. Zero responses are distinct from missing values. A
                partial form can save, including one rating or an explicit zero;
                a completely empty form cannot. Native range keyboard operation
                and individual Clear actions preserve optionality without
                preselecting a middle value.
              </p>
              <p>
                The optional morningSleep object is additive to DailyCheckIn.
                Its canonical totalSleepMinutes supplies the existing sleepHours
                compatibility value, keeping history summaries consistent.
                Omitting the new object in an older client preserves existing
                nested details; explicit null clears it. Legacy Morning hours
                seed the new duration fields, while existing notes, moods,
                Energy/Stress and What Helped remain intact. Evening keeps its
                original six sections. Energy and Stress now share Morning’s
                optional native 1–10 slider, endpoint captions, clear control,
                minimum-tap behavior and keyboard operation. Grouped sections,
                spacing, labels, hints and input heights follow Morning’s
                rhythm. Last Night has an accessible helper explaining that
                hours describe sleep before today. Per-field energyScale and
                stressScale store 5 or 10; absent metadata always means legacy
                five-point answers. Saved records and restored drafts retain
                their raw numbers and scale. Old answers project to 1/3/6/8/10
                only for slider display, with a brief legacy annotation;
                changing or clearing a field marks only that answer as
                ten-point. Full saves preserve untouched legacy counterparts.
                Scale-aware validation and completion accept both, while streak
                comparisons normalize into their existing five-point unit. No
                automatic record rewrite or migration runs. Its Last Night hours
                and optional Tonight’s bedtime share one balanced row, followed
                by full-width What Helped. The bedtime input uses the existing
                40px control shape, 14px left inset and centered native time
                fields, with no picker icon. It starts blank unless a saved
                value exists; 23:30 is only the timeline marker’s fallback, not
                an answer. A bedtime alone can save an Evening check-in without
                becoming another completion section. Explicit empty text sends
                null when another response remains; an older draft omitting
                bedtime leaves an existing saved clock untouched. Ordinary draft
                retention and explicit Save Check-In behavior remain unchanged.
                Morning’s five completion groups use saved data only; partially
                answered groups remain saved even when not yet complete. No
                database migration or automatic submission is required.
              </p>
            </Detail>
            <Detail title="Durable Form Drafts" context="Local To Each Journal">
              <p>
                JournalDraftProvider hydrates a versioned localStorage workspace
                before forms mount. The server derives its namespace from the
                authenticated journal ID, without exposing credentials. Inputs
                persist synchronously as raw values, including blank or
                unfinished fields. Drafts are separate for new forms, individual
                edit IDs, and past tracking days; successful saves clear only
                their own draft. Failed requests and closing a dialog retain it.
                Device-draft feedback stays centered below the main form action.
                Most forms keep Reset Draft there too; check-ins place their
                native Reset control beside Close in the header, retaining
                status feedback below Save without a second reset link. Each
                saved card uses its latest successful journal updatedAt, with a
                valid createdAt fallback for legacy records, in the journal
                timezone. Draft changes never advance that time. Missing,
                invalid or unzoned legacy timestamps use an unavailable-time
                description. The visible title/status/summary layout is shared
                by Morning and Evening. Record identity is the tracking day plus
                period: omitted stored/API periods mean Evening for
                compatibility. An atomic save updates only that pair, retaining
                its original createdAt and the other period’s responses. The
                Evening tracks Mood, Energy, Stress, Sleep, Notes and What
                Helped; Morning tracks Notes, Sleep Ratings, Sleep Schedule,
                Night Interruptions and Sleep Duration. Cards show live
                completion and a short next-step hint without personal values or
                excerpts; save/draft feedback remains accessible. It has one
                whole-card trigger and no separate section badges. An accessible
                draft description uses the shared field comparator against that
                period’s saved record: note, moods, energy, stress, helped and
                Evening sleep/bedtime, plus Morning’s raw sleep fields. Morning
                compares each field by value so object-key order cannot create a
                false change. Morning has separate draft, dialog, writer and
                scroll keys; the existing Evening keys remain unchanged.
                Opening, scrolling, writer visibility and base-version metadata
                alone are inert. A successful explicit Save Check-In or
                reflection PATCH advances saved feedback and its timestamp;
                other field edits retain local-draft feedback without adding a
                new autosave policy. An unsaved draft never counts as saved
                completion. Ordinary openings keep the dialog’s scroll memory.
                Closing returns focus to the same stable card: touch interaction
                leaves no outer ring, while fine-pointer keyboard focus has a
                quiet one-pixel inset cue.
              </p>
              <p>
                The workspace also remembers the last route, scroll position,
                anchor, open non-destructive dialog, medication filter, and
                history page length. First-visit onboarding and explicit deep
                links take precedence. Dialog generations prevent a late save
                from closing a newer editor. Intake drafts preserve their
                original timestamp and timezone, including seconds and repeated
                daylight-saving hours.
              </p>
              <p>
                Each dialog remembers its own scroll position across closing,
                refresh and switching between desktop dialog and mobile drawer.
                Writing Space stores independent source and preview positions.
                Scroll updates persist quietly without rerendering the journal.
                Color inspections also retain their preview, format and filters.
                The public install and create-journal dialogs store numeric
                positions only.
              </p>
              <p>
                Drafts have no age expiry and remain on that browser or
                installed app; they are not synchronized or automatically
                submitted. The workspace validates its version, routes, dialog
                descriptors, and bounded payloads. Unavailable storage falls
                back to memory with an honest status. Passwords, authentication
                tokens, and destructive confirmations never enter the workspace.
                The service worker still caches only public assets, not private
                journal responses.
              </p>
            </Detail>
          </div>
        </Section>

        <Section
          id="development"
          number="13"
          title="Local Development & Verification"
          context="Make It Reviewable"
          icon="create"
        >
          <div className={styles.readingCard} data-card-entry>
            <p>
              Use Node.js 22 or newer and install the committed dependency graph
              with <code>npm ci</code>. Read <code>AGENTS.md</code> and the
              relevant guides under <code>node_modules/next/dist/docs</code>{" "}
              before changing framework APIs; this repository’s installed
              Next.js version is the reference for its conventions.
            </p>
            <p>
              Development without a database URL uses the local file repository
              in <code>.data</code>. A configured database URL selects that
              database; production requires one. Follow the repository README
              and <code>.env.example</code> for setup, and use an isolated
              development journal with invented entries.
            </p>
          </div>
          <DeveloperCode
            label="Open The Project Locally"
            language="Shell"
            code={LOCAL_SETUP_EXAMPLE}
          />
          <div className={styles.detailGroup}>
            <Detail
              title="Choose Checks For The Change"
              context="Then Build"
              open
            >
              <p>
                Pure rules have Node tests under <code>src/lib</code> and
                <code> src/lib/server</code>. Use a focused test while
                developing, then run the appropriate project checks. Generated
                themes, palettes and icons have dedicated drift checks.
              </p>
              <DeveloperCode
                label="Project Verification Commands"
                language="Shell"
                code={VALIDATION_EXAMPLE}
              />
              <p>
                For a visible change, inspect both system modes and a narrow
                phone width. Include empty, filled and long-content states when
                the component uses them. Exercise focus, keyboard activation and
                reduced motion when behavior or animation changes.
              </p>
            </Detail>
            <Detail
              title="Regenerate From Source"
              context="Keep Artifacts Together"
            >
              <DeveloperCode
                label="Generated Asset Workflows"
                language="Shell"
                code={GENERATED_ASSETS_EXAMPLE}
              />
              <p>
                Commit the generator inputs and their generated output together.
                The medication palette generator reads the installed Tailwind
                palette and converts it to opaque sRGB hex; a package update can
                therefore require regenerating the swatches and reviewing their
                appearance.
              </p>
            </Detail>
            <Detail
              title="When A Visual Change Is Ready"
              context="A Practical Review"
            >
              <ul className={styles.bulletList}>
                <li>
                  The action is easy to find, text remains legible over its real
                  background, and controls fit at phone widths.
                </li>
                <li>
                  Primary and secondary content have a clear relationship;
                  values include their units and keep stable alignment.
                </li>
                <li>
                  Empty, loading, error and selected states have useful text and
                  accessible names.
                </li>
                <li>
                  Touch needs no hover, focus remains visible, and decorative
                  motion has a quiet alternative.
                </li>
                <li>
                  Any effect releases its timers, listeners, observers and
                  generated elements when finished or unmounted.
                </li>
                <li>
                  The change preserves recorded values and stored IDs unless its
                  scope explicitly includes a tested migration.
                </li>
              </ul>
            </Detail>
          </div>
        </Section>

        <Section
          id="github"
          number="14"
          title="GitHub & Contributions"
          context="Build It Together"
          icon="confetti"
        >
          <div className={styles.githubCard} data-card-entry>
            <div className={styles.githubHeading}>
              <GithubLogoIcon size={30} weight="duotone" aria-hidden="true" />
              <div className={styles.githubTitle}>
                <h3
                  id={guideHeadingId(
                    "developer-card",
                    "kingjulien1 / pill-happens",
                  )}
                  data-guide-outline-level="2"
                  data-guide-outline-label={"kingjulien1 / pill-happens"}
                >
                  kingjulien1 / pill-happens
                </h3>
                <span className={styles.repositoryTagline}>
                  <span
                    className={styles.repositorySeparator}
                    aria-hidden="true"
                  />
                  Care, in the making.
                </span>
              </div>
            </div>
            <p className={styles.repositoryDescription}>
              Explore the code behind the journal, trace its changes, and follow
              the conversations that shape each improvement. Whether it’s a
              stubborn bug, a clearer screen, or a small idea for easier daily
              logging, there’s room to help make the next version feel better.
            </p>
            <ExternalLink
              href={DEVELOPER_REPOSITORY}
              className={styles.repositoryAction}
            >
              Open The Repository
            </ExternalLink>
            <div className={styles.githubFooter}>
              <div className={styles.githubLinks}>
                <ExternalLink href={`${DEVELOPER_REPOSITORY}/commits/main`}>
                  Commits
                </ExternalLink>
                <ExternalLink href={`${DEVELOPER_REPOSITORY}/issues`}>
                  Issues
                </ExternalLink>
                <ExternalLink href={`${DEVELOPER_REPOSITORY}/pulls`}>
                  Pull Requests
                </ExternalLink>
                <ExternalLink href={developerSource("README.md")}>
                  README
                </ExternalLink>
              </div>
              <p className={styles.repositoryCredit}>
                made with <span aria-label="love">❤️</span> by{" "}
                <a
                  href="https://github.com/kingjulien1"
                  target="_blank"
                  rel="noreferrer"
                >
                  @kingjulien1
                </a>
              </p>
            </div>
          </div>
          <ol className={styles.contributionSteps}>
            {CONTRIBUTION_STEPS.map((step, index) => (
              <li key={step.title} data-card-entry>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3
                    id={guideHeadingId("developer-step", step.title)}
                    data-guide-outline-level="2"
                    data-guide-outline-label={step.title}
                  >
                    {step.title}
                  </h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.resourceGrid}>
            <ExternalLink
              href={`${DEVELOPER_REPOSITORY}/issues/new?template=bug_report.yml`}
              className={styles.resourceLink}
            >
              <ActionIcon name="retry" className="size-5" />
              <span>
                <strong>Report A Bug</strong>
                <small>Steps, Expected Result & Context</small>
              </span>
            </ExternalLink>
            <ExternalLink
              href={`${DEVELOPER_REPOSITORY}/issues/new?template=design_request.yml`}
              className={styles.resourceLink}
            >
              <ActionIcon name="log" className="size-5" />
              <span>
                <strong>Suggest A Change</strong>
                <small>Screen, Reference & Intended Feel</small>
              </span>
            </ExternalLink>
            <ExternalLink
              href={`${DEVELOPER_REPOSITORY}/compare`}
              className={styles.resourceLink}
            >
              <ActionIcon name="next" className="size-5" />
              <span>
                <strong>Open A Pull Request</strong>
                <small>Compare Your Focused Branch</small>
              </span>
            </ExternalLink>
            <ExternalLink
              href={developerSource("CONTRIBUTING.md")}
              className={styles.resourceLink}
            >
              <ActionIcon name="discover" className="size-5" />
              <span>
                <strong>Contribution Guide</strong>
                <small>Setup, Checks & Review Notes</small>
              </span>
            </ExternalLink>
          </div>
          <div className={styles.detailGroup}>
            <Detail
              title="What Makes A Useful Issue?"
              context="Enough To Reproduce"
            >
              <p>
                Include the screen, browser or installed-app context, viewport,
                system appearance and a short sequence that reproduces the
                behavior. State what happened and what you expected. Use
                synthetic medication names and records in screenshots or sample
                exports rather than posting personal journal content.
              </p>
              <p>
                For a design request, include the reference, the element you
                want to change, and the qualities to preserve. That keeps a
                visual discussion tied to a concrete component.
              </p>
            </Detail>
            <Detail
              title="What Belongs In A Pull Request?"
              context="A Reviewable Result"
            >
              <p>
                Start with the problem and resulting behavior. Add the relevant
                validation and before/after images for a visual change. Explain
                changes to stored data or generated assets, and point out any
                remaining limitation that affects the review.
              </p>
              <p>
                Use clear commits that describe one coherent change. Keep
                credentials, local journal files and personal exports out of
                commits. The project ignores environment files and
                <code> .data</code>; review your diff before pushing.
              </p>
            </Detail>
            <Detail
              title="Credit & Upstream Sources"
              context="Keep Attribution With The Work"
            >
              <p>
                Components use Next.js, React, Tailwind CSS and Base UI/shadcn
                patterns, with Phosphor and Lucide icon systems. The background
                and specular effect retain their upstream attribution in source.
                Review those source notices and the upstream terms when reusing
                third-party material.
              </p>
              <div className={styles.upstreamLinks}>
                <ExternalLink href="https://nextjs.org/docs">
                  Next.js
                </ExternalLink>
                <ExternalLink href="https://tailwindcss.com/docs">
                  Tailwind CSS
                </ExternalLink>
                <ExternalLink href="https://ui.shadcn.com/docs/components/base/drawer">
                  shadcn Drawer
                </ExternalLink>
                <ExternalLink href="https://reactbits.dev/backgrounds/grainient">
                  Grainient
                </ExternalLink>
                <ExternalLink href="https://reactbits.dev/components/specular-button">
                  Specular Button
                </ExternalLink>
              </div>
            </Detail>
          </div>
        </Section>
      </GuideOutline>

      <footer className={styles.footer}>
        <p>Keep the details thoughtful. Keep the daily action simple.</p>
        <div>
          <Link href="/guide">
            <ActionIcon name="back" className="size-3.5" />
            Journal Guide
          </Link>
          <ExternalLink href={DEVELOPER_REPOSITORY}>
            <GithubLogoIcon size={16} weight="regular" aria-hidden="true" />
            Repository
          </ExternalLink>
          <a href="#foundation">
            Back To The Foundation
            <ActionIcon name="collapse" className="size-3.5" />
          </a>
        </div>
      </footer>
    </article>
  );
}
