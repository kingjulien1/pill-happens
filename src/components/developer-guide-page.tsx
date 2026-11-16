import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { Button } from "@/components/ui/button";
import { DeveloperCode } from "@/components/developer-code";
import { GuideColors } from "@/components/guide-colors";
import { GuideButtons } from "@/components/guide-buttons";
import { GuideOutline } from "@/components/guide-outline";
import { GuideResponsiveReference } from "@/components/guide-responsive-reference";
import { GuideContentSpacing } from "@/components/guide-content-spacing";
import { GuideDialogShape } from "@/components/guide-dialog-shape";
import { GuideMenuSurfaces } from "@/components/guide-menu-surfaces";
import { GuideNotifications } from "@/components/guide-notifications";
import { GuideNotificationDemo } from "@/components/guide-notification-demo";
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
                Text directly over the fixed dark canvas uses
                <code> --canvas-foreground</code> or
                <code> --canvas-muted-foreground</code>. A general muted reading
                color can disappear when moved from a card to the canvas.
              </p>
            </Detail>
            <Detail title="Actions, Focus & Feedback" context="Clear Intent">
              <p>
                Button defaults to standard semantic variants: ordinary
                controls, toolbar actions, links and guide utilities do not
                receive intake decoration. Primary, Accent and
                DialogPrimaryButton explicitly select the intake appearance for
                main actions, with its opaque Purple/canvas face, Purple 700
                inner edge and quiet Pink/Purple/Fuchsia perimeter. Only that
                appearance uses Purple 500 at 75% color alpha through
                <code> --daily-action-secondary-ink</code>. SecondaryButton uses
                a quiet tonal surface paired with its semantic foreground.
                Standard filled actions use <code>--action-background</code> /{" "}
                <code>--action-foreground</code>; secondary, outline, ghost,
                destructive and link variants retain distinct emphasis. All
                paths preserve one Base UI host and its native behavior without
                requiring every control to share one painted surface.
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
                card, or the root canvas. The inspector displays the exact
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
            <Button
              navigation
              nativeButton={false}
              render={<Link href="/" />}
              className="h-auto"
            >
              <ActionIcon name="navToday" className="size-3.5" />
              Try The Daily Log
              <ActionIcon name="next" className="size-3.5" />
            </Button>
            <Button
              navigation
              nativeButton={false}
              render={<Link href="/medications" />}
              className="h-auto"
            >
              <ActionIcon name="navMedications" className="size-3.5" />
              Medication Appearance
              <ActionIcon name="next" className="size-3.5" />
            </Button>
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
                Today’s main Log Intake action uses the opaque foundation color
                with a 40% Purple 950 tint. Its solid surface omits decorative
                background layers; the independent specular rim uses nearby
                Pink, Purple and Fuchsia shades at 30% opacity for a quieter
                moving edge. A Purple 700 inner band remains distinct beneath
                it. Text follows the page foreground, while the icons and “Jot
                it!” use Purple 500 at 75% color alpha in both modes. Native
                behavior and the existing entry animation remain attached to the
                same control. Primary, Accent and dialog submission adapters
                explicitly opt into this main-action paint. Standard compact
                controls and the tonal SecondaryButton keep quieter surfaces,
                while sharing the native host and interaction safeguards.
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
                copy pair above the fixed dark canvas. Text inside cards,
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
                Medications, Goals and Getting Started Guide. From 768px it uses
                an anchored 350px Base UI menu, capped at the viewport width
                minus 24px, with arrow-key navigation and typeahead. Below 768px
                it uses a real centered Dialog, up to 400px wide within the same
                viewport clearance. Its native anchors retain ordinary link
                behavior, while the modal owns focus containment, background
                scroll locking, and real DialogTitle, DialogDescription and
                DialogClose controls.
              </p>
              <p>
                The panel masthead uses a 43.2px logo tile with 32.4px BrandMark
                artwork and 13.5px corners, preserving the three-quarter artwork
                proportion. Its surface and ink come from the same tonal
                Rose/menu roles as the destination tiles. Tablet carriers retain
                their percentage geometry and 4.8-second loop. Your Journal uses
                17px/650 text, reducing to 16px below 360px, with 10px
                supporting copy. Appearance and Close sit opposite it on the
                same centered grid row with 44px targets, 17px glyphs, 12px
                corners and a 4px gap. The inset introductory separator stays
                inside the panel’s compact masthead.
              </p>
              <p>
                The mobile Dialog derives its own{" "}
                <code>--navigation-surface</code> from 68% semantic menu surface
                and 32% foundation Black in both modes. Destination tiles and
                state fills derive from that darker base. This local recipe
                leaves the canonical menu roles available to the separate
                Appearance popup. Normally only destinations scroll between the
                masthead and footer; at viewport heights of 560px or less, the
                full navigation becomes one scroll owner so every destination
                and footer action remains reachable.
              </p>
              <p>
                Destination rows are 48px high with 12px corners, 32px leading
                tiles and 20px artwork. Their 20px trailing rail holds a 16px
                ArrowUpRight or an 18px current-page CircleCheck. Selected and
                hovered rows use tonal Rose/Lilac fields above the resolved
                navigation surface; hover uses half the active-hover field
                opacity. These pointer-inert fields stay behind text, preserve
                their first paint and add no layout border. Keyboard focus
                remains independently visible, historical days select Past Days,
                and reduced motion keeps decoration still.
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
                right. Their contextual CloudDownload, BugPlay and Braces glyphs
                measure 0.9em and inherit the text’s full color with no extra
                icon-opacity multiplier. Labels can truncate while accessible
                names remain complete. The helper paragraph starts 12px below
                the link row, uses 70% opacity and clamps to two lines. Its
                pointer-inert bottom wash measures the footer height plus 7px
                and ends 7px below it, so the transparent top meets the footer
                separator instead of extending into the final destination. The
                wash holds a 14% Rose tint through 55%, drops to 6% at 82% and
                reaches zero at its top; it adds no hit target or layout height.
              </p>
              <p>
                Navigation keys its host by pathname and responsive layout. A
                route or breakpoint change therefore closes the old host, while
                one shared trigger ref points focus return at the live page
                control. Following a destination skips that return so it cannot
                steal focus from the arriving page. Native links preserve
                modified clicks; desktop menu items retain typeahead, and mobile
                links use ordinary Tab navigation.
              </p>
              <p>
                AppearanceMenu defaults to a desktop Menu.SubmenuRoot;
                navigation passes <code>nested</code> false for a standalone
                nonmodal Menu.Root inside the mobile Dialog. The default
                Menu.Portal stays associated with the Dialog portal. The popup
                is 320px wide within viewport clearance, with a 60px masthead,
                52px option rows and 44px trigger/Close targets; Close keeps a
                smaller 28px visible face. Its own semantic menu surface remains
                separate from the darker mobile navigation recipe. Light, Dark
                and Follow Your Device retain their radio checks, palette
                samples and browser preference persistence.
              </p>
              <p>
                Selecting a theme keeps Appearance and navigation open.
                Appearance’s Close or Escape dismisses only that popup and
                returns focus to its masthead trigger; another Escape closes the
                parent menu or mobile Dialog and returns focus to the live page
                trigger. Closing navigation or pressing outside dismisses the
                Appearance popup too. Base UI retains radio arrow-key handling,
                collision placement and the layered focus behavior in both
                hosts.
              </p>
            </Detail>
            <Detail
              title="The Iridescence Background"
              context="Violet Field &amp; Layered Tints"
            >
              <p>
                <code>JournalBackground</code> mounts one passive React Bits
                Iridescence field at the root, shared across every route and
                appearance mode. The native WebGL2 shader uses
                <code> #7c3aed</code> with the upstream speed 1, detail 8 and
                brightness 1.5. Mouse reaction and click swirls are disabled;
                there are no pointer listeners or interaction textures. Source
                is pinned to revision <code>d01aa91</code>, with its David Haz
                attribution and MIT + Commons Clause notice preserved at
                <code> public/licenses/react-bits.txt</code>.
              </p>
              <p>
                Paint order is deliberate: the field first receives a light
                <strong> 4px blur</strong>, then Pink300 at exactly
                <strong> 21% opacity</strong>, then Purple900 at exactly
                <strong> 69% opacity</strong>. Only the canvas blurs; text,
                cards and controls remain sharp. A 12px overscan keeps blurred
                edges outside the viewport. The frozen
                <code> APP_IRIDESCENCE</code> settings and shared
                <code> APP_CANVAS_OVERLAY</code> keep the live field and fallback
                washes in agreement. The ready layer contains both the opaque
                shader and its washes, preventing an extra tint over the still
                when WebGL is unavailable.
              </p>
              <p>
                Hidden documents and offscreen backgrounds pause their animation
                clock without consuming hidden time. Live reduced-motion changes
                settle on a still frame; disabling the preference resumes the
                field without a jump. Context loss immediately reveals the CSS
                fallback, and restoration rebuilds GPU resources. Unmounting
                cancels frames, disconnects observers and releases the context.
                Mobile rendering is capped at DPR 1.25 and 750,000 backing-store
                pixels; desktop uses DPR 1.5 and 1,800,000 pixels. This limits
                GPU work without changing the shader’s aspect ratio or motion
                speed on slower devices.
              </p>
              <p>
                A smooth violet still beneath the same two washes is shared by
                pre-hydration, loading, offline and unsupported-WebGL views.
                <code> --app-canvas-base</code> stays at Plum/Black
                <code> #29213b</code> for the underlying foundation and browser
                chrome; <code>--app-canvas-background</code> contains that full
                fallback and <code>--app-canvas-overlay</code> the two washes.
                White <code>#ffffff</code> primary copy and Lilac
                <code> #ded8ec</code> secondary copy retain tested contrast even
                at the shader’s brightest possible output. Semantic cards,
                dialogs, menus and reading panels continue to follow Appearance.
                Mobile dock fades, medication artwork, check-in motion and the
                notification surface remain independent of the root field.
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
                button, with the plain “Your journal, your pace, your way.”
                footer 10px below it. It has no link, uses 450 weight, and mixes
                the existing canvas-muted text color equally with transparency
                for half its former visibility. Natural wrapping still
                participates in the dock’s existing ResizeObserver measurement
                and page clearance; its entry animation remains independent of
                the text color.
              </p>
              <p>
                The Today action is 74px high at every breakpoint, with a
                proportional 19.425px corner radius. It opts into
                <code>{' surface="solid"'}</code> and an independent
                <code> rim</code>. The face is the fully opaque
                <code> --background</code> plus Purple 950 at 40%, exposed
                through
                <code> --daily-action-face</code> without the old field, glaze
                or tint components. The shared
                <code> --daily-action-inner-edge</code> supplies Purple 700. Its
                crisp 2px band runs from 6.5px to 8.5px inside the face, leaving
                a 1px gap after the moving 5.5px outer rim. That rim is about
                83.3% thicker than its former 3px width; its 30% opacity and
                nearby Pink 300, Purple 300 and Fuchsia 300 stops are unchanged.
                Both the GPU layer and CSS fallback consume the same thickness
                and opacity, with the fallback hidden once the GPU renders
                successfully. The explicit intake appearance defaults to a 2px
                CSS rim; Primary keeps its 3px default. Secondary and ordinary
                controls have no animated perimeter. Today and the library’s Add
                Medication action opt into the GPU renderer. Motion retains its
                existing hidden, offscreen, disabled and reduced-motion guards.
                Text and icon colors adapt to the resolved theme; primary labels
                retain readable foreground ink. Focus draws inward, while the
                soft exterior glow stays separate from the border geometry.
              </p>
              <p>
                The library’s Add Medication button uses the same PrimaryButton
                configuration as the live Today action: the solid face, shared
                theme style, 74px height, 19.425px radius and 5.5px GPU/CSS rim.
                Its 25px creation-symbol frame, main label, dot, secondary “Set
                up” aside and trailing arrow use the same content classes,
                spacing and mode-aware ink. MedicationActionButton keeps the
                pending loader, “Saving…” label, disabled state and forwarded
                native-button or navigation behavior.
              </p>
              <p>
                The main label uses the page foreground. The Tablets mark, arrow
                and aside use
                <code> --daily-action-secondary-ink</code>: Purple 500 #ad46ff
                with 75% alpha encoded in the color itself. The aside and icon
                elements add no further opacity multiplier. The optional pills
                variant of IntakeLogSymbol uses a 23px Lucide Tablets glyph at
                2.5 stroke, with no spark. Its 5px left shift stays independent
                of the existing entry transforms. The same button primitive
                retains the click action, focus and disabled behavior.
                PrimaryButton and Accent explicitly request intake paint through
                the shared Button host. SecondaryButton keeps its supporting
                geometry with a quiet tonal surface and inherited semantic ink;
                ordinary controls retain their own variants. Desktop places the
                section 44px after the entries with 20px bottom padding. Mobile
                uses <code>max(0px, env(safe-area-inset-bottom))</code> for
                bottom clearance, with a 4px minimum in short landscape windows.
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
                Four pointer-inert layers sit behind the fixed mobile action.
                The two outer fades now reach 160% of the dock height and taper
                across their full distance, with no long opaque plateau. Their
                base/accent opacities are 66%/20% in light mode and 84%/34% in
                dark mode. Above them, an inner fade reaches 104% of the dock at
                55% opacity, a 37.5% increase. The nearest fade layer reaches
                72% at 60% opacity. Both use multiple gradual stops ending in
                complete transparency. All four layers use the shared
                <code> --app-canvas-base</code> at <code>#29213b</code>, so no
                separate Blue, Apricot, Slate or Gray patch changes the page
                color beneath them. The taller decoration moves the fade’s upper
                edge upward without moving the button or enlarging the measured
                dock. Footer copy uses light ink over this stronger dark fade.
                Safe-area clearance, page scroll reserve and native input
                behavior stay attached to the same fixed parent, and desktop has
                no mobile fade layers.
              </p>
            </Detail>
            <Detail
              title="Canvas & Color Layers"
              context="Intake Cards"
            >
              <p>
                Actual intake cards composite their selected medication color
                at 8% over a fully opaque foundation. Light mode keeps
                <code> --background</code>; dark mode lifts that base with 12%
                canonical Lilac and 88% background for a softer Plum face.
                This single medication-color tint preserves the saved swatch
                without introducing a second pink base layer. Text and artwork
                keep their own full opacity. Folded cards cannot show through
                the opaque face above them.
              </p>
              <p>
                Intake and Morning/Evening check-in cards share one inward
                frame: a 4px neutral band followed by a 2px identity band at
                50% opacity. The second band starts 4px inside the measured
                edge, and both follow the existing card radius. The neutral
                band uses 10% foreground ink. This geometry adds no outside
                border area and preserves the existing card size, stack layout,
                keyboard focus and entry animation. Library and appearance
                previews retain their own surface recipes.
              </p>
              <p>
                The Medications opening uses a 28px title, increasing to 32px
                from 640px and reducing to 26px below 360px. Its leading tile
                grows from 44px to 48px at 640px; the PillBottle glyph is always
                one pixel smaller than the title at 25px, 27px or 31px. Title,
                artwork and saved-count summary share a centered row, while the
                description keeps its own text column.
              </p>
              <p>
                After page-entry readiness, the artwork tile grows and fades
                into place over 760ms, rebounding through 1.10, 0.97, 1.035 and
                its final scale. The glyph starts 120ms later, turns 720° over
                980ms and uses the same scale rebound. Its first playful rock
                waits another 250ms after that entrance finishes. Each 920ms
                rock follows a nonlinear path. Later starts are randomized three
                to six seconds apart, measured start to start: the rest after
                completion subtracts the rock’s 920ms duration. Visibility,
                hidden tabs and page readiness gate playback; an observer also
                holds it while any dialog or drawer portal is open. Resuming
                chooses a fresh delay. Reduced motion shows the settled artwork.
              </p>
              <p>
                The Medications heading pairs up to six narrow rounded color
                swatches with a compact bold saved count. Resolve saved pigments
                and deduplicate by HEX before applying the cap. Ordering keeps
                manual Benzo priority, record frequency, latest valid taken time
                and library order; archived entries remain eligible. Empty
                libraries show zero with no invented colors. Accessible context
                retains exact saved/active totals and visible accent names, even
                when large visual counts use compact notation. The decorative
                strip shows at most three swatches below 480px and hides below
                360px so the heading row stays compact. At least two formatted
                characters set <code>data-kit-count-wide</code>, hiding the
                palette below 480px. At least three characters separately set
                <code> data-kit-count-long</code>, hiding the visual Meds suffix
                below 360px; two-character counts keep that label. Its full
                palette description and exact totals remain accessible.
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
                of the shared header. Both controls and the loading core use
                <code> HEADER_CONTROL_PAINT</code>: Fuchsia 900 at 87% alpha
                beneath the former coffee tile’s Rose/Iris surface on a
                separate 31%-opacity layer. This preserves the whole gradient
                composition while fading only that layer. A 24px backdrop blur
                sits beneath the paint. Hover, focus and open states retain the
                same face in both themes, with a separate keyboard focus ring.
                Menu-specific layouts determine each popup’s interior dimensions.
              </p>
              <p>
                Icon ink brightens the mug’s #c1b6cc with 20% White, then adds
                Purple 400 at 67%. Both controls share a 2.5px main rim mixed
                with 30% Pink 200, the blurred outer rim at 5⅓% alpha (one third
                less than its former 8%), and a 1px inner rim in the mixed icon
                color at 67%. These are decorative paint layers, so the 46px
                control and its hit area do not grow. The resting rim is not
                multiplied again by the gesture controller’s edge alpha.
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
                Header tablet circles use the new opaque mixed ink for fill
                and stroke; their scores use the solid coffee-tile base rather
                than its layered background value. These scoped rules account
                for
                BrandMark’s inline palette, so its nested artwork cannot retain
                the old Pink by accident. The navigation glyph follows the same
                mixed foreground. The menu masthead uses its destination tiles’
                surface and ink, while sign-in branding keeps its own palette.
                The loading core shares the page controls’ new face and rims.
                The page header mark stays 34.5px in its 46px control. The
                panel masthead’s separate 32.4px/43.2px pair keeps the same
                three-quarter ratio. Orbit, approach and spin still share the
                same base keyframes. A 7.2-second header cycle runs at
                two-thirds of the menu’s 4.8-second speed, with unchanged
                endpoint geometry.
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
                Both page controls keep the same opaque mug-colored edge while
                resting, hovered, focused, open or pulled. A separate inset edge
                and outer halo provide the refresh control’s ready feedback. The
                2.5px border geometry, 8% blurred decorative rim at 0.8px blur
                and separate 60% focus outline are preserved. The refresh module
                reads a local surface override in every interaction state,
                keeping its background aligned with navigation without changing
                the palette of other branding components. The coffee mug keeps
                its unchanged <code> --check-in-mug-ink</code> token and
                original literal fallback.
              </p>
              <p>
                Visibility, reduced-motion, offscreen and refresh-unavailable
                state pause or settle the header loop. Cleanup disconnects
                observation and listeners. The critical refresh curtain has its
                own compact tablet duet, separate from the header and menu brand
                loops. Its existing phase handoff remains attached to committed
                downward pulls and their guarded full-document reload. Pressing
                the branding button opens Today instead; the navigation menu
                has no separate refresh action.
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
                pointer click is suppressed; ordinary taps and keyboard
                activation open Today through the same native button.
              </p>
              <p>
                The original getIntakeBrandStyle() retains its two-value
                contract for existing callers; getBrandThemeStyle() extends that
                paint with aliases derived from the action palette. The page
                topbar and loading core override those pigments locally with
                their shared Purple face and Violet edge. Menu, sign-in and
                recovery marks keep their separate paint, sizes, labels and
                native link/button behavior. The 46px page button retains its
                shared face and opaque Violet border throughout rest, pulling,
                readiness and release. No colored wash covers the pills. The
                pills turn through 540 degrees while shrinking across a 1–88px
                visual exchange. RefreshCcw appears across 56–112px and grows
                with pull progress. Both directions use that same 23px icon with
                a 2.65 stroke, including the ready state. A separate 160ms
                exchange follower is capped at 112/340 physical progress before
                easing, so even an immediate threshold crossing still shows the
                conversion. This visual clock does not delay the authoritative
                gesture or its release guard. Retraction while the pointer
                remains held reverses the exchange and progress-driven glyph
                rotation continuously. Actual release or cancellation holds the
                last painted glyph angle as it shrinks and fades, so decreasing
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
                pops retain their compact celebration choreography and existing
                Pink reflection aliases. The page refresh glyph, filled pills
                and base border use the mug’s #c1b6cc ink, with the coffee tile
                surface behind the pills and its solid base in their scores.
                Shared getBrandThemeStyle() aliases continue to color the other
                branding contexts, including their glow, corona, sheen and
                animated accents. The loading curtain has its own scoped Violet
                spark palette. Opacity, geometry and every existing animation
                curve remain unchanged. The finite crossing burst stays
                throttled against threshold jitter.
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
                traces stay close to the button and retain their existing
                per-context reflection aliases.
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
                Clicking or pressing the branding button opens the clean Today
                route <code>/</code>, dropping any current query or fragment.
                It first calls{" "}
                <code>{'workspace.rememberDestination("/")'}</code>, preserving
                raw drafts while clearing Today’s remembered dialog and making
                this explicit destination take precedence over screen resume.
                Unavailability or a pending gesture release blocks another
                activation. Taps and keyboard activation do not reload the
                document. A rightward pull still opens Medications; when already
                there, its release plays the existing return burst without
                navigating, scrolling or changing drafts. A committed downward
                release enters the full-page refresh handoff, including its
                separate 1500ms outbound hold. Native button identity, refs,
                keyboard handling and dragged-click suppression stay intact.
              </p>
              <p>
                The shared divider matches the topbar’s full padded width,
                including both guides’ wider content caps. Its 2px thickness and
                20.8%-opacity canvas foreground stay consistent across the
                middle, a 35% relative visibility reduction from 32%; a 0.35px
                blur softens the line over a 12px standard/Safari backdrop blur.
                Only the first and last clamp(18px, 5%, 32px) fade to
                transparent, preserving its quiet glass edge. Existing 16px
                vertical clearance increases to 20px from 640px, with safe-area
                padding and guide sidebar offsets unchanged.
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
                46px internal world paints a 115px shared header face, then
                settles into the same 1.25× charged pose at 143.75px. RefreshCw
                starts with 57.5px artwork; the face’s 1.25× spring and nested
                1.14× icon scale compound to 81.9375px in the charged pose. The
                core uses the same 87%-alpha Fuchsia 900 foundation, 31% cup
                surface, brighter Purple-mixed glyph and three-rim setup as the
                live header. Critical declarations are generated from the same
                frozen paint object, with literal fallbacks for every Tailwind
                and palette color before app CSS arrives. The cup surface stays
                on its own clipped layer; plain base and score colors remain
                valid in SVG strokes and color-mix. The full-screen backdrop
                instead shares the application’s violet Iridescence fallback
                beneath Pink300 at 21% and Purple900 at 69% in both modes.
                Header and loading artwork share the same paint
                under system and explicit Appearance preferences; external
                styles do not replace it with the old Purple action face.
                Local artwork glow and particles retain their own choreography
                without changing the root field’s clock.
              </p>
              <p>
                The refresh symbol begins at zero size in the center and grows
                while spinning rapidly clockwise: 540 degrees in the first
                300ms, then a 250ms brake from 1800 to 1200 degrees per second.
                The remainder of the 1200ms arrival holds that moderate speed
                without resetting its angle. The button’s analytically sampled
                spring, including its 3.4 icon-scale cap, now overshoots and
                rebounds in place. Three layered waves, eight rays, 18 particles
                in four shape variants and inner pops use the branding burst’s
                geometry and timing at the larger scale. This finite threshold
                response happens once per intentional refresh. The visible title
                remains the compact 13px/450 “Loading. Allegedly...” line above
                two quieter lines. The first footer line, “Your journal, your
                pace, your way.”, now uses 450 weight and 20% ink, half its
                previous 40% muted visibility. The second footer line and two
                random destination links retain their existing 40% ink
                treatment. Decorative artwork is hidden from assistive
                technology, while a single polite status describes the load; the
                links remain available for navigation.
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
                geometry and glyph frame. Actual intakes use the selected
                palette swatch from <code>--entry-color</code> at 8% over the
                opaque foundation color, lifted with 12% Lilac in dark mode.
                Today, historical intakes and read-only notification intake
                previews share that paint. The tint is independent of darker icon
                ink and fixed-color SVG artwork. Their 4px neutral frame and 2px
                identity band sit entirely inside the card, with the identity
                pigment at 50% opacity. Check-ins use that same inward frame
                with their own main artwork pigment;
                library and journal surfaces retain their own paint. Their
                native button opens the appropriate editor; Archive and Restore
                live beside Reset Draft and Close in the medication header.
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
                with 40% outside. Its 16px phone size and 17.6px size from 768px
                stay fixed while rear exposure compresses within the 56px rail.
                White outlines use a 2px Lucide stroke, with no filled areas.
                Tablet retains the tilted, scored svg:tablet-angled
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
                its opacity, with all vertical centers aligned. Every quantity
                keeps a 48px front frame, 30px glyph and 56px rail at all
                breakpoints; the front starts at a fixed 4px inset and never
                shrinks. Rear frames begin with 20% exposure of their own
                smaller widths, then compress only those exposed edges into the
                remaining 4px of rail. This bounds the fan without scaling its
                main artwork or moving badge anchors. Card height stays 80px;
                text keeps both single-line rows and their reserved clearances.
              </p>
              <p>
                Decorative rendering stops at three frames: one front and two
                rear copies. Exact quantities remain in the dose and accessible
                description. Actual intake cards add a compact +x counter for
                the recorded quantity minus one, not the capped layer count:
                2 becomes +1, 2.5 becomes +1.5 and 10 becomes +9. Quantities
                at or below one and invalid values omit it. One inner entrance
                wrapper animates the complete fan while its outer rail stays
                still. Keyed internal frames
                never replay entrance animations during
                group disclosure. Invalid or missing decorative quantities use
                one frame without rewriting any medication or intake.
              </p>
              <p>
                Card artwork uses a brief spin, full-size rebound and restrained
                end-state response. <code>CardIconSettle</code> supplies a soft
                halo, two rounded-square ripples and four small flecks in the
                artwork’s color. The response fits inside the existing card
                entrance budget: main icons use 1320ms and rear icons 1095ms,
                while their parent cards retain 1440ms and 1200ms. Folded
                previews suppress these decorative entries. Saved glyph rotation
                and the quantity fan’s layout stay independent of the motion.
              </p>
              <p>
                The small corner form badge sits outside the spinning wrapper.
                It has its own 520ms opacity fade and 1.5px slide, without scale
                or rotation. Its visible size is 25% larger than before: 16px on
                mobile and 17.6px on desktop. The opposite category glyphs keep
                their existing sizes. Cards without category glyphs use the same
                enlarged form badge. Reduced motion shows the settled artwork
                and badge without response effects.
                The quantity counter mirrors the form badge around the fixed
                48px front artwork, on the same vertical center and with the same
                16px/17.6px anchor box. Its quiet 12px-high face uses 8px tabular
                numerals (7px for longer values), 65% foreground ink and a 9%
                foreground/semantic-base surface, without a border. Long values
                grow inward, keeping at least 2px before the form symbol and
                the time column clear; the full count stays in the native title
                and recorded dose. It follows the form badge’s separate fade/slide
                and never spins or repeats on rear layers. Today, historical
                intake cards and read-only notification intake previews share
                the counter. Library defaults, appearance heroes, history
                summaries and check-in artwork do not gain it.
              </p>
              <p>
                Appearance groups the symbol search and compact rounded color
                samples, preserving their quiet selection treatment. Final Look
                is an independent sibling section rather than another panel
                inside Appearance. Its visible showcase has 44px of clearance
                above and 44px before Save Medication; the save gap is reduced
                by one third from its earlier 66px. Both sections share one
                stateful component, so search, color, preview motion and Undo
                remain connected. Final Look reuses the actual shared
                medication-card surface, reflecting the saved icon, chosen
                pigment, shape and intake content. Its section surface uses
                semantic reading roles rather than a separate warm overlay that
                could obscure the artwork.
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
                complete display catalog. The medication editor’s selected
                summary uses a scoped <code>{'presentation="form"'}</code> instead:
                real shadcn Badge pills show plain primary-color glyphs without
                their colored tiles. A 4/3 layout scale enlarges the pills and
                text; each side has 12px padding above a more visible neutral
                fill. Glyphs shrink by 32% before sharing that scale, keeping
                them compact. Priority labels remain first, followed by up to
                three general labels and an accessible overflow count. The
                Categories dropdown and shared card, goal and streak markers
                retain their existing presentation.
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
                tinted wrapper. Selected rows keep the “· selected” caption,
                stronger warm fill and checkmark. Only Type and Categories keep
                the label and caption together on the left with a 12px gap.
                Labels stay on one line and truncate instead of wrapping. A
                minimum 32px rail clearance separates the text from a 14px
                CircleCheckBig at a 14px trailing inset. The shared SelectItem
                accepts an optional indicator for these two pickers; Route and
                other selects retain
                their existing presentation. Selected and keyboard-focused
                options have no enclosing border, outline or shadow. Keyboard
                focus instead underlines the label and strengthens its warm
                fill. Other sits below a short inset separator and an 8px gap,
                with quieter text until selected. Categories lists all 19
                options without a search field in a 256px popup, constrained to
                the viewport. Its fixed header and footer sit outside the
                listbox; only the options scroll. An inset separator precedes
                the footer with 8px spacing on each vertical side. Clear and
                Done share subtle 28px foreground-tinted controls with compact
                labels and tiny leading Trash/CheckCheck icons. Clear always
                appends a dot and the selected count, including 0, and is
                disabled when empty. The centered “19 options” count stays
                between the buttons. Multiple selection keeps the menu open,
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
                24px from 768px, without leading title artwork. Context follows
                beneath the title in 12px copy without a dot or slash, and
                visible descriptions align to the title’s text column.
                Reader and writing-help headers also begin with text; body
                artwork and action icons stay in place. The headerActions slot
                places native controls beside Close; check-in Reset Draft uses
                the same 44px styling. Its footer keeps draft feedback without a
                duplicate Reset link. Native dismissal, focus return and scroll
                memory remain with the existing primitives.
              </p>
              <p>
                Dialog heading sections use 7/12 of their previous top padding,
                a 5/12 reduction, while keeping their text and action sizes.
                Headers are part of the content flow: title, supporting copy
                and header controls scroll out of view together. Mobile drawers
                place the header inside the same remembered scroller as the
                form, matching desktop dialogs. Edit Intake omits the duplicate
                Update Entry context and keeps its existing description directly
                beneath the title. Heading artwork is omitted; medication
                selectors and functional action icons retain their purpose.
                Reader, writing-help and confirmation dialogs use the same
                compact top-spacing rule and whole-content scrolling.
                Shared modal scroll hosts disable browser scroll anchoring, so
                header reflow at the drawer/dialog breakpoint cannot overwrite
                a remembered numeric position before the new layout restores it.
              </p>
              <p>
                Medication dialogs use their own slightly higher, compact header
                with a longer visible description. Reset Draft and the edit-only
                Archive or Restore action sit beside Close. The paired actions
                have a 2px gap, followed by 8px before Close. All three controls
                use 17/24 of the top bar’s 46px control and 23px glyph sizes:
                approximately 32.5833px and 16.2917px. Their existing colors and
                borderless treatment stay intact; other dialog headers keep
                their shared geometry. Reset and status changes open separate
                confirmations, initially focusing Keep Editing. Pending work
                blocks repeated submission and dismissal, while an inline error
                keeps a failed action available to retry. Focus returns to its
                trigger, or to Close when resetting disables that trigger.
                Closing the editor returns to its original list card or Add
                Medication; archiving an opener that leaves the visible list
                falls back to the stable Add action.
              </p>
              <p>
                Dialog save actions delegate through DialogPrimaryButton to
                AccentButton, explicitly selecting intake appearance on the
                shared Button host and keeping 14.25px/700 foreground text and
                matching 22px PencilSparkles/ArrowRight glyphs at a 2.5 stroke.
                The label inherits the resolved foreground; its icons use Purple
                500 secondary ink at 75% alpha. The wrapper multiplies actual
                responsive Accent height by 0.74, then derives its corners from
                the fixed 21/80 design ratio. Heights therefore run from 53.28px
                to 56.055px and default radii from 13.986px to 14.7144375px.
                This changes layout geometry rather than scaling a finished
                button. Standalone Accent actions remain 72–75.75px high with
                18.9–19.884375px corners; page-level Add Medication instead
                shares Today’s solid paint, 74px height, 19.425px radius, 5.5px
                moving rim and internal label/icon/aside/arrow spacing. Its
                secondary “Set up” copy describes the creation dialog it opens.
                Save Medication retains the compact dialog wrapper. Today
                remains 74px high with 19.425px corners. An explicit radius
                override remains available. The solid face and both inward edges
                follow the effective radius, without a separate field, glaze or
                aura renderer. Pending replaces only the leading glyph with a
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
                Every actual intake group and Past Days week group uses the
                same full-face glass layer: 24px backdrop blur with 1.08
                saturation at 78% effect opacity. A separate 11% tint of the
                coffee icon tile’s shared --check-in-art-base pigment sits above
                the blur and below the cards; the former 9% secondary wash is
                replaced and medication-color gradients remain hidden. The rim
                grows from 1.5px to 2px, a one-third increase, with its extra
                0.5px entirely outward. A -0.5px inset and 21.5px outer radius
                preserve the previous inner edge, 8px spacing and measured card
                bounds. The glass wrapper permits overflow while its paint child
                retains rounded clipping. The frame’s measured disclosure notch
                stays independent of the blur/tint and the label’s own border
                and 44px target remain unchanged. Both group contexts inherit
                these tokens; standalone cards and form sections keep their own
                surfaces. The existing 360ms frameGather entrance fades the
                decorative shell together without changing its scheduler or
                adding a background loop. Reduced transparency disables blur;
                reduced motion shows the settled surface. Folded cards retain
                90% opacity and controls retain their existing feedback.
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
              context="Full Component Reference"
            >
              <p>
                The shared notification system has its own complete reference:{" "}
                <Link href="#notifications" className={styles.textLink}>
                  Notifications &amp; Undo
                </Link>
                . It covers the public API, six notification kinds, stack reveal
                separate from detail expansion, independent progressive clocks,
                countdown urgency, icon and exit motion, accessibility,
                server-checked Undo and the tests that protect those behaviors.
                Try the real component with synthetic data, then copy the
                integration examples into a client event handler.
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
          id="notifications"
          number="11"
          title="Notifications & Undo"
          context="Contract, Motion & Recovery"
          icon="sparkle"
        >
          <p className={styles.sectionIntro}>
            Reveal a notification stack first, then open the chosen card’s
            details. Every notice keeps its own countdown, with an eased finish,
            Rose urgency and a short final grace; the reference below separates
            clock, stack, motion and server-checked recovery ownership.
          </p>
          <GuideNotifications>
            <GuideNotificationDemo />
          </GuideNotifications>
        </Section>

        <Section
          id="icons"
          number="12"
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
                rather than arbitrary SVG markup or remote URLs. There are 57
                custom SVG choices: 16 original tintable drawings, 20 tablet or
                dispenser outlines and 21 fixed-color variants. The colored
                variants render inline from shared <code>TABLET_SHAPES</code>
                geometry and fixed catalog palettes. Each instance owns unique
                local SVG mask IDs and luminance masks for transparent imprints
                and score lines. All 49 earlier stored IDs, colors, filenames
                and aliases remain stable; the eight new choices are additive.
                Every asset remains vector geometry, with no bitmap conversion
                or font dependency.
              </p>
              <p>
                Xanax, Iserlohn, Desloratadin and Atarax each have an outline
                and a colored SVG under their own name. Xanax is a horizontal
                oval with equal-height UPJOHN and 90 vector imprints. Iserlohn
                is a violet capsule with a center seam; Desloratadin is a blue
                round tablet with a centered 5; Atarax is a slender, scored
                white tablet. White artwork uses Zinc 300
                <code> #D4D4D8</code>, violet uses Violet 300
                <code> #c4b4ff</code>, and blue uses Sky 400
                <code> #00bcff</code>. Color variants paint one flat pigment
                with transparent details, without shading or highlights.
              </p>
              <p>
                Stored values follow <code>svg:xanax</code> and
                <code> svg:color:xanax</code>, with the same pattern for each
                name. The named <code>Xanax</code>, <code>Iserlohn</code>,
                <code> Desloratadin</code> and <code>Atarax</code> exports use
                <code> createLucideIcon</code> and the same source geometry as
                their assets: a 24×24 viewport, default 2px currentColor stroke,
                no fill, and rounded caps and joins. Fine vector imprints retain
                proportional strokes. UI callers keep their normal size and
                stroke overrides. Search indexes both variants, their component
                names and labels, imprints such as UPJOHN 90, and useful English
                and German shape/color terms. Picker totals count each variant
                separately; outline tint and saved icon rotation keep their
                existing behavior.
              </p>
              <p>
                Nose, Single Tablet and Angled Tablet retain their original
                selectable geometry. Nose’s shortened bridge fits a square 24×24 viewport while keeping the
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
          number="13"
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
                  MorningCoffee keeps its filled cup still while three thicker
                  steam curls travel through separate horizontal lanes. Their
                  vertical coordinates use y = 29 + 0.75 × (old y − 29), making
                  the curves 25% shorter about the mug rim while preserving X
                  coordinates and stroke thickness. Firework tips, warmth and
                  reveal coordinates follow the same height mapping; particle
                  sizes, one-second reveal and lane clocks stay unchanged. The
                  1.4px guide strokes support 2.1px travelling threads, with a
                  brighter fine highlight and soft halo. Each curl finishes in a
                  small firework at its swaying tip: a bright center, soft glow
                  and fine expanding ring release colorful stars, rays and
                  specks. Pink, Fuchsia, Lilac and Iris mix with warm Amber,
                  Orange and Aqua accents; the sparks arc outward and dissolve
                  over roughly 1.5 seconds. Each burst shares its wisp’s 8.6-,
                  9.3- or 8.9-second CSS clock and phase offset, igniting at 62%
                  of that cycle. The fireworks sit outside the steam mask, with
                  a one-second reveal gate that avoids showing a partial burst
                  on arrival. A small Pink light stays within the cup’s 23px
                  top rim, clipped to a 23px by 5px area above its edge. The
                  large rising glow plume and its gradient, feather filter and
                  mask are removed. The mug, steam and firework paths retain
                  their sizes and clocks. The rim light fades in over 2.2 seconds
                  after the shared ambient handoff, 300ms after the main-icon
                  entry finishes. The curved lines reveal upward over one
                  second. Dialog, offscreen and hidden-page
                  pauses hold these effects; keyed artwork replay restarts them.
                  Reduced motion keeps settled steam and glow while hiding the
                  fireworks. No extra JavaScript timer or animation frame loop
                  owns these flourishes.
                </li>
                <li>
                  EveningMoon follows a 16.8-second native animation containing
                  two 8.4-second nonlinear pendulum swings. A cached RK4 solver
                  samples the 21-degree arc: the crescent accelerates through
                  its low center and slows at the raised turning points. A
                  damped 3.2-second torsion spring follows the angle, giving the
                  body a small inertial lag instead of an independent eased
                  wiggle. One slow lean and 2.2% depth change distinguish the
                  two swings. The 225 sampled poses join at the same position,
                  tilt, scale and momentum, with no rest or settling reset.
                  Translation reaches about 4.12px to either side; the moon’s
                  filled geometry, 30px stage and C1B6CC pigment stay intact.
                  Two browser-native timelines are created once per mounted
                  moon and only pause/play as the existing ambient, dialog,
                  offscreen and hidden-page gates change. Their phase survives
                  those pauses; unmount cancels both. Reduced motion presents
                  the settled crescent and static stars. Existing short-lived
                  colored stars retain their own bounded scheduler. Physics
                  generation is cached, with no per-frame React work or new
                  JavaScript animation loop. Unit checks compare the period
                  with an independent pendulum integral and verify energy,
                  lag, bounded motion and the periodic spring seam.
                </li>
                <li>
                  Check-in artwork keeps its 1560ms main entrance and a toned
                  down spin-and-settle response. A nonvisual CSS clock opens
                  the ambient gate only 300ms after that entrance ends; the
                  coffee animation and the EveningMoon JavaScript star queue
                  both wait for it. A keyed scene resets the gate on replay,
                  while page/dialog pauses hold the shared clock. The moon
                  sways over a slow 30-second cycle with quint-like easing,
                  roughly ±8° rotation and ±1.4px horizontal travel. A separate
                  15-second vertical arc places its low point at each center
                  crossing. Stars keep their own brief, quieter twinkles.
                </li>
                <li>
                  Morning and Evening check-ins share the same large-logo
                  layout: an 80px frame, 21px corners and a 48px artwork tile in
                  a 56px stage. Both use a quiet translucent face above the
                  flowing page background. A shared 4px neutral frame and a 2px
                  identity band at 50% opacity paint entirely inward. Filled
                  coffee and crescent artwork distinguish the periods; their
                  colors, entry motion, ambient loops and progress replay stay
                  independent of this plain card face. Section dots retain the
                  deeper Plum pigment. Details and icon stages remain 56px, the
                  tile 48px and symbol holder 30px, with 11px artwork-to-copy clearance
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
                  status. Every local workspace write reconciles the latest
                  validated same-journal opening history, retaining the earliest
                  instant per day and period. An older tab’s location or
                  pagehide write cannot replace that history with an empty map.
                  Close/reopen, refresh, draft reset and successful-save cleanup
                  preserve the opening record. This is device-local tracking
                  from now on, not cloud persistence or reconstructed history.
                  It neither creates a response nor grants completion or a save;
                  only a successful Save Check-In or reflection PATCH advances
                  the secondary saved-update time. Neither card has an extra
                  greeting, date, inline title icon, trailing chevron or
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
                  height retains the shared responsive increments and its 18px
                  radius. This supporting launcher uses a quiet semantic
                  secondary surface and paired foreground, without an animated
                  perimeter, intake glow or Purple action ink. Its layout and
                  writer behavior stay intact. Decorative journal-icon paint
                  keeps its earlier palette through a separate artwork helper.
                  The surrounding journal-panel backgrounds and decorations
                  retain their existing Apricot detail. These are local button
                  paint changes; Secondary behavior remains unchanged. Equal
                  22px outer rails center the pencil-and-label group while the
                  arrow stays at the right. Local word, character and reading
                  statistics use one unboxed single line beneath it: 10.5px
                  values, 10px labels and a 14px line height. The surrounding
                  11.5px/600 guidance uses an 18px line to explain Markdown,
                  draft continuity, reading, the saved-Journal threshold and the
                  separate Save Check-In action. Reading opens safe rendered
                  Markdown from the current draft; Edit entry closes the reader
                  before returning to the same writer. Manual Refresh
                  synchronizes saved journal data without replacing unfinished
                  draft fields or making an AI request. The existing
                  ReflectionDialog and independent saving controls retain their
                  launcher ref. Writing supports up to 100,000 characters. Done
                  returns to the check-in with the draft; Save Check-In saves
                  all responses. The compact writer header has no
                  heading icon or fade, and a larger description clamped to
                  three lines. Its context row above the heading shows the full
                  weekday, abbreviated month and day without a year, then a dot
                  and Reflection, with the shared 44px close control opposite.
                  The heading and two icon-only toolbar rows scroll with the
                  source and preview. The source grows with its content rather
                  than adding an inner scrollbar; split view also uses that
                  shared vertical viewport. The footer and keyboard-aware
                  viewport handling stay separate. Mobile height follows
                  visualViewport. Top buttons use 33px
                  targets and 2.6-stroke Lucide glyphs, with 30px formatting
                  buttons below. Pencil/Eye share neutral coloring,
                  Bookmark/BookmarkCheck reflect saved state, and CloudCheck
                  keeps Done’s existing celebration timings, including the 700ms
                  centered hold and downward departure. Groups use Black at low
                  opacity in light mode and White at low opacity in dark mode;
                  the top buttons share that quiet neutral treatment. Active
                  formatting uses a strong neutral fill and follows the actual
                  source/selection, including code exclusions. Formatting taps
                  preserve the caret and keyboard; top actions blur the writing
                  field. Info opens a nested help dialog with Markdown examples
                  and practical tips, then restores focus to Info on close.
                  FileDown starts a trusted local .md download synchronously,
                  followed by visual preparing/downloading/ready feedback; it
                  makes no network request. Preview and reader never execute raw
                  HTML or load remote images automatically.
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
                pane during scroll, resize and mobile viewport changes. Writing
                Space intersects that room with its shared scroll viewport,
                watches its scroll and hides suggestions for an offscreen caret.
                Reduced
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
                Exactly empty writing begins with a visual H1 such as{" "}
                <code># Sat, Nov 14 --</code>, followed by one newline and the
                default caret at the start of line two. The date comes from the
                entry’s explicit tracking day, without a year; reopening an
                older day after midnight or the 06:00 reset does not rename it.
                The scaffold stays outside the raw draft until the first typing,
                formatting or mention insertion. Opening alone triggers no
                autosave, unsaved-content state or completion credit. Existing
                writing, including whitespace-only drafts, remains byte-for-byte
                unchanged. Empty writing in an otherwise saved check-in can use
                the same scaffold without changing its other responses. Initial
                caret placement never focuses the input or resets later
                selections on the same field.
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
              <h4
                id={guideHeadingId(
                  "developer-writing-save",
                  "Daily Editing Of Finished Journals",
                )}
                data-guide-outline-level="3"
                data-guide-outline-label="Daily Editing Of Finished Journals"
              >
                Daily Editing Of Finished Journals
              </h4>
              <p>
                The optional scheduled editor reviews saved, nonempty notes from
                completed past tracking days in one explicitly configured
                journal. The current day and device drafts stay untouched. Its
                policy corrects clear grammar or severe syntax while retaining
                the writer’s voice, facts, medication names, numbers and dose
                context, uncertainty, negation and existing links. Independent
                validation rejects questionable output. The complete body stays
                present, with no added advice. The one dated H1 carries a
                few-word summary, limited to 12 words and 110 characters. A
                changed entry receives a refreshed summary of its entire current
                body rather than retaining a stale title. Other authored H1
                titles become H2 without losing their text; additional H2
                headings or separators stay minimal. New links must match
                allowlisted existing app references, with no newly introduced
                external URLs.
              </p>
              <p>
                Source/output hashes and the editing-policy version skip
                unchanged reviewed notes. The job takes at most eight entries
                per run within a 240-second work budget, with a 45-second
                provider timeout and a ten-minute lease against overlapping
                work. Applying a result atomically compares the original note
                and its saved timestamp; a concurrent edit is skipped rather
                than overwritten. Failed reviews preserve the original, keep
                safe hash-based failure metadata and defer unchanged retries
                from 48 hours up to seven days; editing the note makes it
                immediately eligible again. This is separate from typing
                autosave and manual Refresh.
              </p>
              <p>
                Original and output Markdown remain in{" "}
                <code>AppData.journalEditing.revisions</code>, with hashes,
                timestamps and policy metadata, and are included in the normal
                private <code>/api/export</code> response. An authenticated,
                same-origin <code>POST /api/journal/editing/restore</code> with{" "}
                <code>{'{ "revisionId": "…" }'}</code> restores only that
                revision’s original note when the current note still matches its
                edited hash. Intervening writing stays intact and returns a
                conflict. This adds no separate restoration screen or backup
                import. Deployment configuration below supplies the job’s
                explicit journal scope; originals remain available independently
                of scheduler timing.
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
                check-in periods contribute independently, without labeling the
                preview’s own Morning/Evening period. Search still checks saved
                title, writing and date locally; the first 20 entries load with
                another 20 available per request. Authored titles and body
                excerpts never enter the preview DOM, including accessible
                labels and tooltips; those cards expose only date, word count
                and reading time before the reader opens.
              </p>
              <p>
                JournalPreviewCard composes MedicationCardBase with a quiet
                accent wash, 21px corners, a neutral 4px inward rim and a 1.5px
                inner color band at 32% opacity; no border grows outside the
                card. Its JournalPreviewArtwork reuses the check-in’s 56px
                stage, 48px tile and 30px motion wrapper around a 32px open
                book. Colored pages, a tucked bookmark and a small glint breathe
                slowly after the shared arrival/settle response. Rose, Lilac,
                Iris, Apricot, Orchid and Aqua pairs are chosen by a stable
                FNV-1a hash of the entry ID, so edits, filtering and pagination
                keep the same colors without hydration randomness. Artwork
                pauses offscreen, when hidden, while the reader is open and
                under reduced motion.
              </p>
              <p>
                The pure <code>journal-preview-references</code> helper reuses
                the reader’s canonical typed-marker and explicit Markdown-link
                rules. It deduplicates all seven supported reference families in
                source order and uses live entity metadata for labels rather
                than quoted journal prose. Code, HTML, images and unrelated
                external links do not become preview chips. A compact Linked
                Here footer provides independent anchors in a horizontal rail,
                as siblings of the reader button rather than nested controls. An
                absent reference list leaves no empty footer. The primary
                metadata action still opens the saved reader, preserving the
                shared card entrance and keyboard focus behavior.
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
                Most forms keep Reset Draft there too; medication and check-in
                forms place their native Reset control beside Close in the
                header, retaining status feedback below Save without a second
                reset link. Each saved card uses its latest successful journal
                updatedAt, with a valid createdAt fallback for legacy records, in
                the journal timezone. Draft changes never advance that time. Missing,
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
                Medication Reset Draft is enabled only for the form’s validated
                local draft, scoped to <code>med:new</code> or its exact
                <code> med:edit:id</code> key. Header availability and the reset
                callback come from that form’s existing single draft hook
                through a ref bridge; the header does not create another draft
                store. Confirming reset restores the form’s starting values and
                clears only that draft. Saved medications, past intakes and
                unrelated drafts remain unchanged. Remounting the appearance
                scene also clears its transient Surprise Me Undo state. Save
                Medication remains an explicit server submission; changing
                archived status uses the existing medication PATCH and its Undo
                receipt without submitting unsaved form fields.
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
                Shared-origin tabs reconcile drafts and first-open observations
                before local writes. Each store tracks explicit draft set/clear
                operations and applies only those deltas to the latest validated
                durable records. Untouched stale copies cannot overwrite another
                tab’s draft or resurrect one removed by Reset or a successful
                save. Failed writes retain pending operations for retry, with
                honest memory/error feedback. Opening history is an append-only
                union of earliest valid instants within its existing limit.
              </p>
              <p>
                The stable store.synchronize() method reads without writing and
                emits only when protected content or persistence status changes.
                JournalDraftProvider calls it after hydration and for matching
                storage events, focus, pageshow and visible-page return. Each
                tab keeps its own route, dialog, stack and scroll state. This
                prevents a background tab’s page-state flush from erasing an
                unsaved check-in time; it never submits a response or advances
                the journal’s saved-update timestamp.
              </p>
              <p>
                Each dialog remembers its own scroll position across closing,
                refresh and switching between desktop dialog and mobile drawer.
                Writing Space stores independent source and preview positions
                on its shared content scroller; write and split modes use the
                source key, while preview mode uses the preview key.
                Scroll updates persist quietly without rerendering the journal.
                Color inspections also retain their preview, format and filters.
                The public install and create-journal dialogs store numeric
                positions only.
              </p>
              <p>
                Drafts have no age expiry and remain on that browser or
                installed app; they are not synchronized across devices or
                automatically submitted. The workspace validates its version,
                routes, dialog descriptors, and bounded payloads. Unavailable
                storage falls back to memory with an honest status. Passwords,
                authentication tokens, and destructive confirmations never enter
                the workspace. The service worker still caches only public
                assets, not private journal responses.
              </p>
            </Detail>
          </div>
        </Section>

        <Section
          id="development"
          number="14"
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
              title="Daily Editing Configuration"
              context="One Explicit Journal, Server Only"
            >
              <p>
                Vercel invokes <code>/api/cron/journal-editing</code> once a day
                on the UTC schedule <code>15 5 * * *</code>, after Vienna’s
                06:00 tracking-day reset. Hobby execution can vary within the
                scheduled hour. This is best-effort daily work, not an
                exact-minute deadline; remaining eligible notes can be caught by
                a later run.
              </p>
              <p>
                Set <code>JOURNAL_EDITING_JOURNAL_ID</code> to the exact one
                journal to edit. The endpoint requires a server-side{" "}
                <code>OPENAI_API_KEY</code>, <code>DATABASE_URL</code> and an
                independent <code>CRON_SECRET</code> of at least 32 characters.
                Vercel supplies that secret as bearer authorization. Scope is
                never inferred from a browser session or password. Missing or
                invalid configuration fails closed. The optional{" "}
                <code>JOURNAL_EDITING_MODEL</code> defaults to{" "}
                <code>gpt-5.4-mini</code> and is separate from the retained
                insights endpoint’s <code>OPENAI_MODEL</code>. Redeploy after
                changing environment values; none belongs in a browser-prefixed
                variable, committed file or example export.
              </p>
              <p>
                This optional operation sends eligible saved writing and
                relevant medication/reference context to the configured
                provider. Reading, local previews and manual Refresh do not make
                that request. The daily job preserves revision history so an
                owner can inspect the exact original and edited Markdown.
              </p>
              <DeveloperCode
                label="Daily Editing Cron Entry"
                language="JSON Fragment"
                code={`{
  "crons": [
    {
      "path": "/api/cron/journal-editing",
      "schedule": "15 5 * * *"
    }
  ]
}`}
              />
              <p>
                Merge this entry with the existing <code>vercel.json</code>
                configuration, preserving its framework and region settings.
                Once configured, an owner-authorized first pass can use the same
                cron endpoint to process eligible backlog. Later daily
                invocations continue any remaining work.
              </p>
            </Detail>
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
          number="15"
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
                patterns, with Phosphor and Lucide icon systems. The optional
                Grainient renderer and active specular effect retain their
                upstream attribution in source. Review those source notices and
                the upstream terms when reusing third-party material.
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
                <ExternalLink href="https://reactbits.dev/backgrounds/iridescence">
                  Iridescence
                </ExternalLink>
                <ExternalLink href="https://reactbits.dev/backgrounds/grainient">
                  Grainient (Optional)
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
