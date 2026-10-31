import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr/GithubLogo";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { ActionIcon, type ActionIconName } from "@/components/action-icon";
import { DeveloperCode } from "@/components/developer-code";
import { GuideColors } from "@/components/guide-colors";
import { HeadingText } from "@/components/heading-text";
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
        <h2 id={`${id}-title`}>
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
    <a href={href} target="_blank" rel="noreferrer" className={className}>
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
    <details className={styles.detail} open={open}>
      <summary>
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
    <article className={styles.page} data-developer-guide>
      <div className={styles.topLinks}>
        <Link href="/guide" className={styles.backLink}>
          <ActionIcon name="back" className="size-3.5" />
          Journal Guide
        </Link>
        <ExternalLink
          href={DEVELOPER_REPOSITORY}
          className={styles.repositoryLink}
        >
          <GithubLogoIcon size={15} weight="bold" aria-hidden="true" />
          Repository
        </ExternalLink>
      </div>

      <header className={styles.intro}>
        <span className={styles.eyebrow}>Pill Happens / Build Notes</span>
        <h1>
          <HeadingText
            title={
              <span className={styles.title}>
                <CodeIcon size={24} weight="bold" aria-hidden="true" />
                Developer Guide
              </span>
            }
            context="The Details Behind It"
            className="items-center"
          />
        </h1>
        <p>
          The colors, components and conventions that make this journal feel
          familiar. Inspect the live theme, follow a source file, or find the
          next place to contribute.
        </p>
        <div className={styles.paletteRibbon} aria-label="Application palette">
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

      <details className={styles.contentsBox} open>
        <summary>
          <span>
            <ActionIcon name="discover" className="size-4" />
            On This Page
          </span>
          <small>{DEVELOPER_SECTIONS.length} Sections</small>
          <ActionIcon name="expand" className={styles.detailCaret} />
        </summary>
        <nav className={styles.contents} aria-label="Developer Guide Contents">
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
        <div className={styles.readingCard}>
          <p>
            Peach replaces white. Ink replaces black. Flame and Rust bring warm
            depth, while Violet adds contrast. These five pigments live in
            <code> src/lib/app-theme.ts</code>; semantic roles turn them into
            surfaces, readable copy, boundaries, actions and feedback.
          </p>
          <div className={styles.principleGrid}>
            <div>
              <ActionIcon name="calendar" />
              <h3>Useful First</h3>
              <p>
                Make the next daily action easy to find. Keep quantities, times
                and editing behavior clear.
              </p>
            </div>
            <div>
              <ActionIcon name="sparkle" />
              <h3>Character In The Details</h3>
              <p>
                Use color, small icons and deliberate movement around a compact,
                predictable structure.
              </p>
            </div>
            <div>
              <ActionIcon name="settings" />
              <h3>One Source Of Truth</h3>
              <p>
                Reuse theme roles, stored appearance IDs and domain helpers
                instead of creating parallel rules.
              </p>
            </div>
          </div>
          <p>
            The application follows the device’s color scheme. The light and
            dark examples in this guide are previews; they do not change your
            app appearance.
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
          Copy a brand swatch, inspect a role in either mode, or export the full
          CSS and JSON. Alpha is preserved in values that include transparency.
        </p>
        <div className={styles.colorReference}>
          <GuideColors />
        </div>
        <div className={styles.note}>
          <ActionIcon name="flower" className="size-4" />
          <p>
            The five application pigments and the {MEDICATION_COLORS.length}{" "}
            medication swatches serve different purposes. Medication colors
            identify saved items; application roles organize the interface.
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
        <div className={styles.readingCard}>
          <p>
            Choose a role for the job a component performs, then pair it with
            its reading color. A primary action can be light in one mode and
            warm in another; its importance remains the same. A color name alone
            does not tell you which text belongs on it.
          </p>
          <dl className={styles.roleIndex}>
            {APP_THEME_GROUPS.map((group) => (
              <div key={group.id}>
                <dt>
                  {group.label}
                  <b>
                    {
                      APP_THEME_TOKENS.filter((role) => role.group === group.id)
                        .length
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
              Use <code>--action-background</code> with
              <code> --action-foreground</code> for the main action treatment,
              and <code>--secondary</code> with
              <code> --secondary-foreground</code> for supporting controls.
              Accent describes a quieter interactive surface.
            </p>
            <p>
              Keep keyboard focus visible through <code>--ring</code>. Borders
              and inputs use their dedicated roles. Success, warning, info and
              destructive treatments have paired foregrounds; include a label or
              icon so color is not the only signal.
            </p>
          </Detail>
          <Detail
            title="Transparent Values Need A Backdrop"
            context="Alpha Matters"
          >
            <p>
              An eight-digit hex value includes alpha: the last pair controls
              opacity. The same wash will look different on Peach, Ink, a card,
              or the moving field. The inspector displays the exact value and
              opacity rather than replacing it with an opaque approximation.
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
        <div className={styles.flow} aria-label="Theme generation flow">
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
        <div className={styles.readingCard}>
          <p>
            <code>src/app/globals.css</code> imports Tailwind, the animation
            utilities and generated <code>theme.css</code>. Its
            <code> @theme inline</code> mapping exposes the CSS roles as
            Tailwind utilities such as <code>bg-card</code>,
            <code> text-card-foreground</code> and <code>border-border</code>.
          </p>
          <p>
            Make a shared color change in <code>app-theme.ts</code>, then
            regenerate. The generator updates the application stylesheet and the
            theme block in the public offline page. Editing generated CSS
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
        <div className={styles.readingCard}>
          <p>
            The application uses the platform’s system sans-serif stack:
            <code>
              {" "}
              ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
              &quot;Segoe UI&quot;, sans-serif
            </code>
            . Headings stay compact and slightly heavier; context stays smaller,
            quieter and separated with a dot or slash.
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
              <dt>Headings</dt>
              <dd>
                24px is used for the compact guide and page title treatment;
                section labels are smaller.
              </dd>
            </div>
            <div>
              <dt>Body & Context</dt>
              <dd>
                Use readable body copy for explanations. Reserve the smallest
                type for short secondary labels.
              </dd>
            </div>
            <div>
              <dt>Numbers</dt>
              <dd>
                Tabular numerals keep changing counts and times steady. Include
                the unit and distinguish quantity from dose.
              </dd>
            </div>
            <div>
              <dt>Alignment</dt>
              <dd>
                Center icons, labels, separators and values on a shared row. Let
                long names wrap without pushing actions out of view.
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.shapeCard}>
          <div className={styles.shapeHeading}>
            <h3>A Small Family Of Shapes</h3>
            <span>Examples From The Interface</span>
          </div>
          <div className={styles.radiusSamples}>
            <div style={{ borderRadius: 10 }}>
              <b>10</b>
              <span>Small Detail</span>
            </div>
            <div style={{ borderRadius: 16 }}>
              <b>16</b>
              <span>Base Radius</span>
            </div>
            <div style={{ borderRadius: 21 }}>
              <b>21</b>
              <span>Intake Card</span>
            </div>
            <div style={{ borderRadius: 22 }}>
              <b>22</b>
              <span>Daily Action</span>
            </div>
          </div>
          <p>
            The generated base radius is <code>1rem</code>; Tailwind’s radius
            roles derive from it. Component recipes can choose their own radius.
            Preserve those dimensions when changing an effect or border so the
            layout keeps its rhythm.
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
            A useful spacing ladder / choose the gap for the relationship,
            rather than filling every gap with decoration.
          </p>
        </div>
      </Section>

      <Section
        id="layers"
        number="07"
        title="Layers, Glass & Light"
        context="Build The Composite"
        icon="sparkle"
      >
        <div className={styles.detailGroup}>
          <Detail
            title="The Log Intake Button"
            context="Three Background Layers"
            open
          >
            <p>
              The action keeps its established content, 64px height and 22px
              corners. Its background combines the following layers, listed from
              the base toward the viewer.
            </p>
            <ol className={styles.layerList}>
              <li>
                <span
                  className={styles.layerSwatch}
                  style={{
                    background:
                      "conic-gradient(from 50deg, #9a3412, #f97316, #6b2b17, #9a3412)",
                  }}
                />
                <div>
                  <strong>Multidirectional Base</strong>
                  <p>
                    Rust <code>#9a3412</code>, Flame <code>#f97316</code> and
                    warm brown <code>#6b2b17</code> form a moving spatial field.
                  </p>
                </div>
                <b>100%</b>
              </li>
              <li>
                <span
                  className={styles.layerSwatch}
                  style={{
                    background: "linear-gradient(135deg, #fed7aa, #f6b49c)",
                  }}
                />
                <div>
                  <strong>Diagonal Softness</strong>
                  <p>
                    Peach <code>#fed7aa</code> blends with <code>#f6b49c</code>{" "}
                    above the base.
                  </p>
                </div>
                <b>75%</b>
              </li>
              <li>
                <span
                  className={styles.layerSwatch}
                  style={{ background: "#fed7aa" }}
                />
                <div>
                  <strong>Peach Wash</strong>
                  <p>
                    A final <code>#fed7aa</code> overlay unifies the surface.
                  </p>
                </div>
                <b>30%</b>
              </li>
            </ol>
            <p>
              The moving 3px rim uses Rust <code>#9a3412</code>, Ink
              <code> #2a0f0a</code> and charcoal <code>#120f17</code>. A lighter
              Peach glow, <code>#ffe8cf</code>, lifts the edge from the page.
              WebGL and the CSS fallback share the same color controls.
            </p>
            <p>
              These component-specific recipe colors extend the local effect;
              they do not add new members to the five-color application palette.
              Keep content above the decorative layers and preserve pointer and
              focus behavior.
            </p>
            <ExternalLink
              href={developerSource("src/components/specular-rim.tsx")}
            >
              Inspect The Rim Source
            </ExternalLink>
          </Detail>
          <Detail title="Both Header Dropdowns" context="A Shared Warm Surface">
            <p>
              The navigation and streak dropdowns start with Ink
              <code> #2a0f0a</code>, then add a Rust <code>#9a3412</code> wash
              at 30% and Flame <code>#f97316</code> at 7%. Local Peach reading
              colors keep the text consistent over this dark composite in either
              device mode.
            </p>
            <p>
              Scope these overrides to the dropdown. Floating medication
              selects, reading cards and the canvas have separate roles and do
              not need to inherit this particular recipe.
            </p>
          </Detail>
          <Detail title="The Animated Background" context="Radial Grainient">
            <p>
              <code>JournalBackground</code> chooses the system color mode and
              uses the application’s background palette. Grainient is radial,
              with variation 16, saturation 1.01, silk 0.58 and softness 0.96.
              Pointer interaction and click swirl are disabled.
            </p>
            <div
              className={styles.tableScroll}
              tabIndex={0}
              role="region"
              aria-label="Background motion settings"
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
                    <td>0.85</td>
                    <td>1.3</td>
                  </tr>
                  <tr>
                    <td>Speed</td>
                    <td>2.8</td>
                    <td>5.6</td>
                  </tr>
                  <tr>
                    <td>Scale</td>
                    <td>0.3</td>
                    <td>0.42</td>
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
              Mobile receives more visible movement with a bounded rendering
              budget. Light mode keeps a dark center and stronger warm colors;
              the base canvas and reading surfaces adapt through their roles.
            </p>
          </Detail>
          <Detail
            title="Glass Is A Base, Color Is A Layer"
            context="Intake Cards"
          >
            <p>
              The intake card keeps a blurred glass base, a subtle static
              pattern, an Ink readability treatment and a selected-color wash.
              Its inside rim does not increase the outer card dimensions.
              Related background layers stay behind the real icon and content.
            </p>
            <p>
              Collapsed groups overlap complete ordinary cards with their
              natural content heights and corners. The visible rear cards shrink
              slightly by depth; opening restores full-size cards. Preserve
              whole faces when changing the stack, and avoid adding separate
              decorative borders to the rear layers.
            </p>
          </Detail>
        </div>
      </Section>

      <Section
        id="motion"
        number="08"
        title="Motion, Input & Accessibility"
        context="Delight With A Purpose"
        icon="shootingStar"
      >
        <div className={styles.readingCard}>
          <p>
            Continuous ambience, one-time arrivals and direct interaction are
            different jobs. Keep them coordinated without making a control
            depend on motion. Device preferences and page visibility are part of
            an effect’s lifecycle.
          </p>
          <dl className={styles.referenceList}>
            <div>
              <dt>Continuous Effects</dt>
              <dd>
                Pause work when hidden, out of view or disabled where the
                component supports it. Clean up animation frames, listeners,
                observers and graphics resources.
              </dd>
            </div>
            <div>
              <dt>One-Time Arrivals</dt>
              <dd>
                Use bounded, finite effects. The streak spotlight clears its
                generated particles after the celebration and uses a consumed
                history-entry marker.
              </dd>
            </div>
            <div>
              <dt>Reduced Motion</dt>
              <dd>
                Prefer a quiet static state. Preserve the information, focus
                destination and ability to complete the action.
              </dd>
            </div>
            <div>
              <dt>Touch & Hover</dt>
              <dd>
                Mobile has no hover animations. Desktop hover is scoped to a
                viewport of at least 768px with hover support and a fine
                pointer.
              </dd>
            </div>
            <div>
              <dt>Keyboard</dt>
              <dd>
                Use real links and buttons, descriptive names, visible focus,
                and predictable disclosure. Decorative icons and particles stay
                out of the accessibility tree.
              </dd>
            </div>
            <div>
              <dt>Forms & Feedback</dt>
              <dd>
                Keep labels attached to fields. Explain errors in text, retain
                drafts after a failed save, and distinguish a loading state from
                an empty result.
              </dd>
            </div>
          </dl>
        </div>
        <DeveloperCode
          label="Scope Decorative Motion & Hover"
          language="CSS"
          code={MOTION_EXAMPLE}
        />
      </Section>

      <Section
        id="icons"
        number="09"
        title="Icons, Emoji & Local Artwork"
        context="One Familiar Marker"
        icon="medications"
      >
        <div className={styles.readingCard}>
          <p>
            Interface actions use the project’s Phosphor-based
            <code> ActionIcon</code> mapping. Medication symbols combine Lucide
            icons, emoji and{" "}
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
                    stroke="#2a0f0a"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <strong>Color SVG</strong>
              <small>Flat Artwork Color</small>
            </div>
          </div>
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
                <code>src/lib/tablet-icons/geometry.ts</code>. Keep the 24 × 24
                Lucide-compatible viewBox, centered silhouette and simple stroke
                geometry.
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
                Check the resulting glyph at small sizes in search, Final Look,
                a medication row and an intake card. Preserve meaningful
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
              rather than arbitrary SVG markup or remote URLs.
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
              visible in the appropriate flows rather than asking the artwork to
              carry those details alone.
            </p>
          </Detail>
        </div>
      </Section>

      <Section
        id="architecture"
        number="10"
        title="A Map Of The Project"
        context="Find The Right File"
        icon="discover"
      >
        <div className={styles.readingCard}>
          <p>
            App Router pages compose the screens, shared components handle
            interaction, pure library modules hold domain and appearance rules,
            and server modules own authentication and persistence. Generated
            public assets stay connected to their source data.
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
              <code> onboarding.guidePending</code> flag. The daily route reads
              that flag and directs a first visit to <code>/guide#start</code>.
              An absent flag represents an existing journal and does not force a
              new introduction.
            </p>
            <p>
              The actual guide mount acknowledges its arrival through
              <code> POST /api/onboarding/guide</code>. The server updates that
              one journal through the existing versioned mutation. Guide links
              to the daily screen wait for the shared acknowledgement before
              navigating, so a fast first click can start the log immediately.
            </p>
            <p>
              This records opening the guide, not completing it. Returning
              visits go to the daily screen, and Guide remains available from
              navigation. The flag belongs to journal state rather than the
              browser’s local storage or the authentication cookie.
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
                boundaries.
              </li>
              <li>
                Consecutive intakes within a rolling 13-minute gap share a
                stack. Each intake extends the window; creation time does not
                decide membership.
              </li>
              <li>
                Dose is recorded quantity multiplied by the medication’s current
                strength. Editing a linked medication updates the presentation
                and recalculated dose of past intakes.
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
                A logging streak counts days with intake records. A
                check-in-only day remains available in History without adding to
                the streak.
              </li>
            </ul>
          </Detail>
          <Detail
            title="Persistence & Installed-App Behavior"
            context="Keep Boundaries Intact"
          >
            <p>
              The journal repository separates journal IDs and uses versioned
              writes. State reconciliation runs inside the atomic mutation, so
              retrying after contention does not discard unrelated journal
              changes. Server API responses containing journal data are private
              and not stored in the service-worker cache.
            </p>
            <p>
              The installed app uses a web app manifest and service worker. That
              worker caches public installation assets and the offline page. It
              does not turn medication writes into a background queue; mutations
              need a connection and explicit result handling.
            </p>
          </Detail>
        </div>
      </Section>

      <Section
        id="development"
        number="11"
        title="Local Development & Verification"
        context="Make It Reviewable"
        icon="create"
      >
        <div className={styles.readingCard}>
          <p>
            Use Node.js 22 or newer and install the committed dependency graph
            with <code>npm ci</code>. Read <code>AGENTS.md</code> and the
            relevant guides under <code>node_modules/next/dist/docs</code>{" "}
            before changing framework APIs; this repository’s installed Next.js
            version is the reference for its conventions.
          </p>
          <p>
            Development without a database URL uses the local file repository in{" "}
            <code>.data</code>. A configured database URL selects that database;
            production requires one. Follow the repository README and{" "}
            <code>.env.example</code> for setup, and use an isolated development
            journal with invented entries.
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
              <code> src/lib/server</code>. Use a focused test while developing,
              then run the appropriate project checks. Generated themes,
              palettes and icons have dedicated drift checks.
            </p>
            <DeveloperCode
              label="Project Verification Commands"
              language="Shell"
              code={VALIDATION_EXAMPLE}
            />
            <p>
              For a visible change, inspect both system modes and a narrow phone
              width. Include empty, filled and long-content states when the
              component uses them. Exercise focus, keyboard activation and
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
                Primary and secondary content have a clear relationship; values
                include their units and keep stable alignment.
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
        number="12"
        title="GitHub & Contributions"
        context="Build It Together"
        icon="confetti"
      >
        <div className={styles.githubCard}>
          <div className={styles.githubHeading}>
            <GithubLogoIcon size={30} weight="duotone" aria-hidden="true" />
            <div>
              <h3>kingjulien1 / pill-happens</h3>
              <p>The project source, history and review space.</p>
            </div>
          </div>
          <ExternalLink
            href={DEVELOPER_REPOSITORY}
            className={styles.repositoryAction}
          >
            Open The Repository
          </ExternalLink>
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
        </div>
        <ol className={styles.contributionSteps}>
          {CONTRIBUTION_STEPS.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
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
              behavior. State what happened and what you expected. Use synthetic
              medication names and records in screenshots or sample exports
              rather than posting personal journal content.
            </p>
            <p>
              For a design request, include the reference, the element you want
              to change, and the qualities to preserve. That keeps a visual
              discussion tied to a concrete component.
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

      <footer className={styles.footer}>
        <p>Keep the details thoughtful. Keep the daily action simple.</p>
        <div>
          <Link href="/guide">
            <ActionIcon name="back" className="size-3.5" />
            Journal Guide
          </Link>
          <a href="#foundation">
            Back To The Foundation
            <ActionIcon name="collapse" className="size-3.5" />
          </a>
        </div>
      </footer>
    </article>
  );
}
