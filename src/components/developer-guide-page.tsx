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
  APP_LIGHT_SURFACES,
  APP_LIGHT_CANVAS,
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
import {
  DAILY_MOODS,
  DAILY_MOOD_CHOICES,
  DAILY_MOOD_FAMILIES,
} from "@/lib/daily-check-in";
import styles from "./developer-guide.module.css";

const WORKFLOW_SOURCES = [
  {
    title: "Shared Cards & History",
    description:
      "Start here when changing the daily timeline, medication library or Past Days. They share paint and artwork, while each screen keeps its own action.",
    files: [
      [
        "src/components/medication-card-base.tsx",
        "Shared card host, background and artwork slots",
      ],
      [
        "src/components/card-frame.module.css",
        "Shared inward rims, glass and light-mode reading veil",
      ],
      [
        "src/components/medication-card-icon.tsx",
        "Medication and check-in artwork frames, quantity fans and annotations",
      ],
      [
        "src/components/history-day-card.tsx",
        "Native day link, counts and saved-period summary",
      ],
      [
        "src/components/use-history-card-summary.ts",
        "Stable tracking-day eligibility and memoized display models",
      ],
      [
        "src/lib/history-card-cache.ts",
        "Journal-scoped snapshots, fingerprints, validation and deduplicated writes",
      ],
    ],
  },
  {
    title: "Navigation & Responsive Guides",
    description:
      "Navigation changes presentation at 768px; guides add their own topic navigation. Preserve native links, focus return and one scrolling surface.",
    files: [
      [
        "src/components/header-navigation.tsx",
        "Desktop directory menu and mobile navigation sheet",
      ],
      [
        "src/components/responsive-modal.tsx",
        "Shared drawer/dialog host and scroll restoration",
      ],
      [
        "src/components/guide-outline.tsx",
        "Guide topic search, current section and desktop outline",
      ],
      ["src/lib/guide-outline.ts", "Stable heading IDs and outline hierarchy"],
    ],
  },
  {
    title: "Drafts, Writing & Sessions",
    description:
      "Device drafts, saved writing and authentication have separate owners. Follow the relevant boundary before changing save or recovery behavior.",
    files: [
      [
        "src/lib/journal-drafts.ts",
        "Validated journal-scoped drafts, workspace state and cross-tab reconciliation",
      ],
      [
        "src/components/use-reflection-save.ts",
        "Quiet writing autosave and explicit retry coordination",
      ],
      [
        "src/lib/reflection-save.ts",
        "Save timing, version guards and failure states",
      ],
      [
        "src/lib/check-in-rating.ts",
        "Legacy and current rating-scale projection",
      ],
      [
        "src/lib/medication-categories.ts",
        "Manual category vocabulary and legacy compatibility",
      ],
      [
        "src/lib/session-recovery.ts",
        "Cookie-only probes and bounded session recovery",
      ],
      [
        "src/lib/server/security.ts",
        "Persistent-cookie policy and pure security checks",
      ],
    ],
  },
] as const;

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
          <h1>Developer Guide</h1>
          <p>
            Build on the journal’s shared components and preserve its recorded
            data. Start with the workflow below, then open the component detail
            you need. Live color references, source links and verification
            commands connect the visual system to the code that owns it.
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

        <details className={styles.contentsBox} data-guide-inline-contents>
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

        <nav
          className={styles.quickStart}
          aria-label="Developer starting points"
        >
          <a href="#development">
            <span>Run The Project</span>
            <small>Node, local storage and project checks</small>
            <ActionIcon name="next" className="size-4" />
          </a>
          <a
            href={`#${guideHeadingId("developer-detail", "Canvas & Color Layers")}`}
          >
            <span>Change A Card</span>
            <small>Shared frames, light/dark glass and artwork</small>
            <ActionIcon name="next" className="size-4" />
          </a>
          <a
            href={`#${guideHeadingId("developer-detail", "Writing Saves & Quiet Autosave")}`}
          >
            <span>Work On Saving</span>
            <small>
              Device drafts, writing autosave and explicit submissions
            </small>
            <ActionIcon name="next" className="size-4" />
          </a>
          <a href="#architecture">
            <span>Find The Owner</span>
            <small>Source index and domain contracts</small>
            <ActionIcon name="next" className="size-4" />
          </a>
        </nav>

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
                Text directly over the page canvas uses
                <code> --canvas-foreground</code> or
                <code> --canvas-muted-foreground</code>. A general muted reading
                color can disappear when moved from a card to a contrast island.
                Canvas copy is deep Plum in Light Mode and White in Dark Mode.
              </p>
            </Detail>
            <Detail title="Actions, Focus & Feedback" context="Clear Intent">
              <p>
                Button keeps standard semantic variants for ordinary controls,
                toolbars, links and guide utilities. Primary and Accent
                explicitly select intake appearance for main actions: a
                mode-aware Rose face, inward identity edge and restrained moving
                pink perimeter. Supporting icons and copy use the paired
                --daily-action-secondary-ink. Light actions use a rich raspberry
                contrast surface with light copy; Dark Mode keeps its existing
                paint. Today, Add Medication and dialog submissions use the
                shared TodayActionButton satin adapter over the same native
                button host. SecondaryButton keeps its quiet tonal surface and
                paired semantic foreground. All paths preserve one Base UI host
                and native behavior without making every small control look like
                the main intake action.
              </p>
              <p>
                Keep keyboard focus visible through <code>--ring</code>. Borders
                and inputs use their dedicated roles. Success, warning, info and
                destructive treatments have paired foregrounds; include a label
                or icon so color is not the only signal.
              </p>
            </Detail>
            <Detail title="Light Paper, Dark Ink" context="A Paired Appearance">
              <p>
                APP_LIGHT_SURFACES keeps the light appearance in the same family
                as the pink/plum interface. Its foundation is{" "}
                <code>{APP_LIGHT_SURFACES.foundation}</code>, card paper is{" "}
                <code>{APP_LIGHT_SURFACES.card}</code> and floating paper is{" "}
                <code>{APP_LIGHT_SURFACES.floating}</code>. Reading, raised,
                inset, quiet and selected surfaces each have dedicated roles
                rather than a single white wash. Primary ink is{" "}
                <code>{APP_LIGHT_SURFACES.ink}</code>; secondary copy uses{" "}
                <code>{APP_LIGHT_SURFACES.secondaryInk}</code>.
              </p>
              <p>
                Choose the surface and its paired foreground together. Input
                boundaries and focus rings remain distinct on rose/lilac paper;
                selected ratings use deep semantic primary ink. The root uses
                <code> {APP_LIGHT_CANVAS.base}</code> Rose/Lilac paper with a
                protective 90% glaze over the same passive violet shader. Dark
                Mode keeps its original deeper field and exact overlays. Local
                surfaces follow Light, Dark or System. Editing the light
                registry does not recolor personal medication symbols or change
                the dark role values. The live tables and inspectors below read
                the registry directly, including every light/dark HEX value.
              </p>
              <p>
                Light Mode is a full reading hierarchy: warm raised cards,
                recessed field wells, an opaque writing surface and distinct
                selected states. Primary copy and readable muted copy remain
                opaque; shadows use Plum rather than gray or black haze. Small
                labels, keyboard focus and input boundaries are tested after
                compositing. The mug, moon and notification bell keep deliberate
                dark artwork tiles with light ink, while page text, timestamps,
                dose calculations and status badges adapt to the lighter
                surroundings. Personal medication colors remain saved identities
                rather than becoming a second application theme.
              </p>
              <p>
                getAppCanvasCss supplies generated CSS, the prepaint head,
                loading curtain and offline page from one mode registry. A
                no-JavaScript OS fallback paints before hydration; the resolved
                appearance flag then owns the same declarations. Browser
                theme-color metadata follows the selected mode, including a
                manual selection opposite to the device. Offline restores that
                same device-local preference without reading journal data. Mode
                changes retain the shader instance and phase without modifying
                medication data, drafts or a notification timer.
              </p>
            </Detail>
            <Detail
              title="Transparent Values Need A Backdrop"
              context="Alpha Matters"
            >
              <p>
                An eight-digit hex value includes alpha: the last pair controls
                opacity. The same wash will look different on White, Plum, a
                card, or the root canvas. The inspector displays the exact value
                and opacity rather than replacing it with an opaque
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
                Today’s Log Intake action matches the 80px/21px intake-card
                reference. Today and Add Medication use the satin face: rich
                raspberry with light copy in Light Mode, and the established
                pale Lilac/deep Plum pairing in Dark Mode. Dialog submissions
                keep their shared specular adapter, with mode-aware Rose rim
                stops and readable secondary ink. The inspectable button
                reference below reports its source-defined layer values.
                Primary, Accent and dialog submission adapters opt into the
                main-action family. Small controls keep their semantic variants,
                while SecondaryButton stays quiet and tonal.
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
                copy pair above the mode-aware page canvas. Text inside cards,
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
                The directory contains Today, Journal, Past Days, Medications,
                Goals and Getting Started Guide. From 768px, HeaderNavigation
                uses a 420px anchored Base UI Menu with native links, arrow-key
                navigation and typeahead. Below 768px it uses the same
                responsive Drawer primitives as intake editing: a full-width
                bottom sheet with a swipe handle, safe-area clearance, modal
                focus containment and background scroll locking. Its scroll
                owner keeps every destination and footer tool reachable in short
                phone windows. Route or breakpoint changes close the previous
                host and preserve focus return to the current trigger.
              </p>
              <p>
                Today, Journal, Past Days, Medications and Goals are equal
                full-width destination cards in a single column on both layouts.
                Each title shares its row with a compact live count, while a
                two-line purpose description stays visible below it. A fine
                inset rule separates a small facts row: saved check-ins and the
                06:00 reset for Today, word count and latest page for Journal,
                latest historical day, archived medications or upcoming goals.
                Counts and summaries are derived only while the menu is open
                from already-loaded journal data; unavailable data keeps helpful
                context instead of inventing zeroes. Appearance and Close retain
                44px targets. A 50px layered brand tile ties the masthead to the
                destinations. Pink and Lilac selection washes add no extra
                borders, while keyboard focus remains independently visible.
              </p>
              <p>
                Navigation owns its own scoped surface in
                navigation-panel.module.css: dark mode starts from #211625 with
                #fdf1f7 copy and Pink/Lilac accents; light mode uses rose paper
                with deep Plum copy. This leaves the canonical menu roles
                available to Appearance and form selectors. The mobile sheet
                uses the intake forms’ shared dialog radius and bounded height,
                with dedicated safe-area padding. One navigationBody scroll
                owner contains its header, destinations and footer, so even
                short windows can reach every control without nested scrolling.
              </p>
              <p>
                The same 40px icon tile, 15–15.5px label and protected 18px
                trailing rail compose every destination, including Today.
                Desktop cards have a 91px minimum height; mobile uses 96px,
                growing naturally for wrapped purpose copy and facts. The
                trailing rail holds the current-page check or destination arrow.
                Long labels yield before the count badge, descriptions use at
                most two lines, and individual facts truncate without moving the
                arrow or adding horizontal scrolling. Routes and modified clicks
                keep their native semantics. Destinations enter with a
                restrained 380ms rise, offset by 32ms per item; reduced motion
                shows settled content. Hover remains limited to desktop fine
                pointers and never moves the icons.
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
                Getting Started has its own full-width supporting card beneath
                “A Little Help / At Your Pace,” with daily basics, installation
                and backup context. A separated Help &amp; Tools footer contains
                three shortcut tiles: Backups, Report a Bug and Developer.
                Mobile uses 62px stacked tiles; desktop uses 44px horizontal
                tools while the richer destination list keeps its own scroll
                area. Their CloudDownload, BugPlay and Braces glyphs use the
                Pink accent; accessible names retain their complete
                destinations. A quiet two-line note explains that the current
                place is remembered on this device. Every tool stays reachable
                through the sheet’s existing scroll owner; no decorative wash
                overlaps the links.
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
                AppearanceMenu uses a desktop Menu.SubmenuRoot by default.
                Inside the mobile navigation Drawer it uses a standalone
                nonmodal Menu.Root whose portal stays associated with the parent
                modal. The compact 320px appearance popup retains Light, Dark
                and Follow Your Device, palette samples, native radio keyboard
                handling and browser preference persistence. Closing it returns
                focus to Appearance; another Escape closes the parent directory.
                Selecting a theme does not unexpectedly dismiss navigation.
              </p>
              <p>
                Selecting a theme keeps Appearance and navigation open.
                Appearance’s Close or Escape dismisses only that popup and
                returns focus to its masthead trigger; another Escape closes the
                parent menu or mobile Drawer and returns focus to the live page
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
                <code> #7c3aed</code> with speed 0.86, detail 8 and brightness
                1.5. Mouse reaction and click swirls are disabled; there are no
                pointer listeners or interaction textures. Source is pinned to
                revision <code>d01aa91</code>, with its David Haz attribution
                and MIT + Commons Clause notice preserved at
                <code> public/licenses/react-bits.txt</code>.
              </p>
              <p>
                Dark Mode paint order is deliberate: the field first receives a
                light
                <strong> 4px blur</strong>, then Pink300 at exactly
                <strong> 21% opacity</strong>, then Purple900 at exactly
                <strong> 69% opacity</strong>. Only the canvas blurs; text,
                cards and controls remain sharp. A 12px overscan keeps blurred
                edges outside the viewport. The frozen
                <code> APP_IRIDESCENCE</code> settings and shared
                <code> APP_CANVAS_OVERLAY</code> keep the live field and
                fallback washes in agreement. The ready layer contains both the
                opaque shader and its washes, preventing an extra tint over the
                still when WebGL is unavailable.
              </p>
              <p>
                A final 7% wash blends Fuchsia300 and Violet400 in offset
                elliptical pools above the field. It drifts on a 34-second loop
                in both appearances. Reduced motion, the refresh screen and the
                offline page show the still gradient.
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
                APP_CANVAS_BY_MODE pairs the live overlay, still, foundation and
                reading inks for each appearance. Dark Mode retains its
                Plum/Black <code>#29213b</code> base, White primary copy and
                Lilac secondary copy. Light Mode uses
                <code> {APP_LIGHT_CANVAS.base}</code> paper, Plum
                <code> {APP_LIGHT_CANVAS.foreground}</code> copy and muted Plum
                <code> {APP_LIGHT_CANVAS.mutedForeground}</code>. A 90% paper
                glaze bounds the entire shader before quiet Rose/Lilac radial
                reflections. Unit checks exhaust every independent RGB bound and
                radial extreme for normal-copy contrast, including fallback
                colors. The same registry supplies pre-hydration, loading,
                offline and unsupported-WebGL views and mode-aware browser
                chrome. No shader reinitialization is needed when mode changes.
                Semantic cards, dialogs, menus and reading panels follow
                Appearance. Mobile dock fades, medication artwork, check-in
                motion and the notification surface remain independent of the
                root field.
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
                semantic fallback. The row remains 7px above the 80px Log Intake
                button, with the plain “Your journal, your pace, your way.”
                footer 10px below it. It has no link, uses 450 weight, and mixes
                the existing canvas-muted text color equally with transparency
                for half its former visibility. Natural wrapping still
                participates in the dock’s existing ResizeObserver measurement
                and page clearance; its entry animation remains independent of
                the text color.
              </p>
              <p>
                TodayActionButton gives prominent page actions and dialog
                submissions a satin surface while retaining the native
                PrimaryButton host, 80px height and intake-card 21px corners.
                The independent skin turns off both old moving-rim renderers. A
                10px inward frosted surround doubles the original 5px band
                without enlarging the measured hit target. The inner face
                follows the outer curve with an 11px radius and a fine Pink400
                border at 29% opacity. Its former bright reflections are
                replaced by restrained Violet400 at 5% in the upper left and
                Pink500 at 6% in the lower right. Soft directional contact
                shadows retain the raised face. Log Intake uses a larger face
                with a 6px inset, a 1⅔px outer line and a 4px inner line.
              </p>
              <p>
                TODAY_CONTROL_PAINT owns explicit light/dark pigment pairs. Dark
                mode uses a pale lilac face with deep plum text; light mode uses
                a rich plum face with pale lilac text. Supporting copy and the
                arrow use a quieter, readable ink in the same family. The
                original Tablets SVG, Log Intake label, dot, Jot it! aside and
                directional arrow remain; the same 23px leading glyph now rests
                in a 38px soft inset well. Its entrance and the content entrance
                retain independent transform owners. Mobile keeps one centered
                content row down to 320px and no hover feedback. Fine-pointer
                desktop hover adjusts only luminance and shadow; reduced motion
                removes those transitions, and reduced transparency replaces the
                frosted base with opaque paint.
              </p>
              <p>
                MedicationActionButton reuses this exact component for Add
                Medication with its existing creation symbol, label, dot, Set Up
                aside and arrow. DialogPrimaryButton composes the same satin
                component, 80px height, 21px corners, inset icon well and
                directional arrow for Save Medication, intake saves, check-ins,
                goals, preferences and sign-in. Explicit pending and custom
                glyphs retain their native submission behavior. Ordinary small
                controls and SecondaryButton keep their semantic variants; the
                new surface is scoped to the prominent page actions and the
                matching toolbar family.
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
                PageActionDock fixes both the mobile intake action and Add
                Medication directly to the document body, with the same fade
                stack, gutters, safe-area spacing and secondary note below. The
                medication note reads “Your medications, your defaults, your
                way.” Desktop places each action in the normal page flow at a
                maximum width of 446px. ResizeObserver measures its complete
                height, including a wrapped summary, text sizing and safe-area
                padding. That height plus 24px drives both the page’s bottom
                clearance and the viewport’s scroll padding, so the final entry
                and keyboard focus can clear it. Short windows reduce the dock’s
                outer padding to preserve reading room while retaining the
                control’s size and safe-area inset.
              </p>
              <p>
                Two pointer-inert layers soften the page behind the fixed mobile
                action. A long veil reaches 148% of the dock height: Plum mixed
                with 15% Purple900 starts at 74% opacity and tapers through six
                gentle stops to complete transparency. A shorter wash reaches
                118%, placing Fuchsia900 at 16% near the lower left and
                Violet900 at 18% near the lower right, then masking both away
                above the summary. This replaces the former four-layer stack,
                which approached full opacity at the bottom. Light Mode uses
                sunken Rose/Lilac paper at 86% with matching Rose and Lilac
                washes. The decorative layers add no layout height or input
                targets; safe-area clearance, page scroll reserve and the
                measured dock stay attached to the same fixed parent. Desktop
                has no mobile fade layers.
              </p>
              <p>
                Today also has a shorter, bright fade from the document top to
                the upper edge of the Wake-Up time value. Lilac and Pink200
                supply its light, with a faint Rose wash near the top right. The
                top fade uses 55% opacity in Dark Mode and 64% in Light Mode.
                Its absolute paint scrolls
                away with the header. ResizeObserver, viewport changes and font
                readiness keep its endpoint aligned without changing the page
                layout or intercepting input. The Medications page reuses
                PageTopFade with its heading as the measured endpoint. Both top
                fades are hidden at desktop widths.
              </p>
            </Detail>
            <Detail title="Canvas & Color Layers" context="Intake Cards">
              <p>
                Intake, Morning/Evening check-in, medication-library and Past
                Days cards share <code>MedicationCardBackground</code> and the
                selectors in <code>card-frame.module.css</code>. One clipped
                pane applies 96px standard/Safari backdrop blur. Dark Mode
                layers an 8% Pink200 wash and a 6% selected-color wash over
                transparent glass, using canvas-paired ink. Light Mode places 5%
                Pink and selected-color washes over an 82% reading-paper veil
                and switches to the paired reading ink. Reduced transparency and
                unsupported backdrop filtering use an opaque paired base. Folded
                rear copy stays hidden through stack state.
              </p>
              <p>
                Intake, Morning/Evening, medication-library and Past Days cards
                share the same 5⅓px inward outer band. Its pigment mixes two
                thirds of the existing neutral edge with one third of the inner
                identity color. Their identity band is 2⅔px, with 50%
                selected-color opacity in Dark Mode and 34% in Light Mode, plus
                a 0.4px tighter corner radius. A second copy sits within the
                thick outer band: 22.5% wider than the inner line (3.2667px), at
                half its alpha. Its center is one third outward from the thick
                band’s inner edge, producing an approximately 1.9222px inset
                from the card’s outside edge. A decorative, pointer-transparent
                shadow layer preserves those fractional dimensions; browser
                outlines round them to whole pixels. The original fine outside
                edge remains 1.5px at half the mixed outer pigment’s opacity,
                independently of the increased inner width. These paint layers
                leave the 80px baseline, 21px outer corners, padding, stack
                placement and hit targets intact. Collection cards receive these
                same paint layers without adopting intake-only interaction or
                animation markers. Medication library cards also share the
                intake icon rail, quantity marker, ingredient typography and
                dose alignment; their values describe saved defaults rather than
                an already-recorded dose. On Today, a separate native link
                overlays the main artwork and opens that medication’s detail
                route. The rest of the card remains an edit button, with no
                nested interactive elements. A folded group first reveals on
                ordinary activation; its visible icon then navigates. History
                cards keep their existing edit behavior.
              </p>
              <p>
                The Medications opening uses a compact 24px title on phones,
                21px below 360px, and 32px from 640px. Its 44px/48px artwork
                stage and saved-count summary align on the same centered row.
                Below it, the 14px/500 library heading states the total
                medication count, opposite a centered, noninteractive summary of
                active and archived counts. There is no Active button or saved
                archive-view filter: all definitions remain visible, active
                first and usage-ranked within each status. A compact Archived
                divider identifies the later group; its cards remain editable
                and can be restored from the usual editor. Explicit medication
                and ingredient journal references keep their own query
                filtering. The notice that edits update all past logs uses an
                explicit 37%-opacity card surface without dimming its icon or
                text.
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
                The Medications heading keeps its palette visible on phones
                rather than hiding the entire strip when the total has two
                digits. Mobile shows up to three bars, reduced to two for wider
                counts or very narrow screens. The title yields a little space;
                exact totals and the full palette description remain accessible.
                Saved names truncate before their full-opacity category rail,
                preserving a minimum gap instead of wrapping the top row.
              </p>
              <p>
                GuideOutline keeps the desktop On This Page rail outside the
                reading column. Smaller screens get a persistent topic control
                with the current section and a searchable hierarchy in the
                shared responsive modal: a drawer on phones and a dialog on
                wider screens. Topic links open closed detail ancestors and
                retain stable fragments. Scroll tracking updates the current
                item and its parents without rewriting the URL. The inline
                contents remain available before enhancement; the desktop rail
                scrolls independently within the main content.
              </p>
              <p>
                Outside Today, the two 46px page icon controls use a Pink950
                foundation with a separate Mauve900 overlay at exactly 67% in
                both color modes. Their icons and both inward edges use
                full-opacity Pink400. The local headerButton paint preserves its
                3px inward bevel, 14px corners, 32px glass blur and restrained
                contact shadow. Hover, open and keyboard-focus edges retain the
                same Pink400 pigment. Glyphs stay still during hover;
                navigation, Today links and directional pull gestures keep their
                original behavior.
              </p>
              <p>
                These overrides live only in today-controls.module.css, so the
                main action and critical loader keep their own paint. The
                underlying HEADER_CONTROL_PAINT still aliases
                TODAY_CONTROL_PAINT and supplies literal light/dark pigments
                before hydration. Tablet score lines and pull feedback use the
                opaque composite of 67% Mauve900 and 33% Pink950 to match their
                button face. Keyboard focus retains its offset ring and dark
                backing; disabled states retain native semantics. Hit areas,
                gesture thresholds and animation ownership are unchanged.
              </p>
              <p>
                Today alone uses three centered header columns: a 46px control,
                a flexible calendar and a matching 46px control. The full
                weekday is 18px/700 in primary canvas ink; the centered date
                beneath is 10px/450 at 56% ink. Both use the journal’s timezone
                and 06:00 tracking-day boundary. The buttons reuse the main
                action’s exact face, ink, Pink400 inner edge and faint Violet/
                Pink corner washes, with its 10px surround scaled to 5.75px for
                the smaller controls. Other routes retain their original header.
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
                Header tablet circles use the new opaque mixed ink for fill and
                stroke; their scores use the solid coffee-tile base rather than
                its layered background value. These scoped rules account for
                BrandMark’s inline palette, so its nested artwork cannot retain
                the old Pink by accident. The navigation glyph follows the same
                mixed foreground. The menu masthead uses its destination tiles’
                surface and ink, while sign-in branding keeps its own palette.
                The loading core shares the page controls’ new face and rims.
                The page header mark stays 34.5px in its 46px control. The panel
                masthead’s separate 32.4px/43.2px pair keeps the same
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
                the branding button opens Today instead; the navigation menu has
                no separate refresh action.
              </p>
              <p>
                A rightward branding pull opens Medications with in-app
                navigation and remembers it as the last screen. Already on
                Medications, it only settles back without navigating, scrolling
                or changing drafts. Both gestures retain an 8px slop, 1.5 axis
                dominance and a resisted offset capped at 84px, with a
                deliberate 340px release threshold. Each pointer-down captures
                the available physical travel with a 16px screen-edge inset; a
                narrow phone or short landscape viewport can use a shorter
                threshold so the gesture remains reachable. Viewport changes
                cannot move that captured goal during the pull. After slop,
                intent can change freely between down and right; a neutral
                diagonal is recoverable and does not cancel the gesture. Only
                reaching the threshold commits the chosen axis. That lock
                survives opposite-axis drift and even retraction to zero, so a
                later direction cannot replace it. Release still requires
                reaching the captured threshold along the locked axis; pulling
                back cancels the action without unlocking. Coalesced samples are
                processed in order and final pointer-up coordinates pass through
                the same transition, preserving fast threshold crossings between
                paints. Pointer capture tolerates interrupted Safari touches;
                the completed gesture is cleared before releasing capture. The
                following dragged or cancelled pointer click is suppressed;
                ordinary taps and keyboard activation open Today through the
                same native button.
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
                route <code>/</code>, dropping any current query or fragment. It
                first calls <code>{'workspace.rememberDestination("/")'}</code>,
                preserving raw drafts while clearing Today’s remembered dialog
                and making this explicit destination take precedence over screen
                resume. Unavailability or a pending gesture release blocks
                another activation. Taps and keyboard activation do not reload
                the document. A rightward pull still opens Medications; when
                already there, its release plays the existing return burst
                without navigating, scrolling or changing drafts. A committed
                downward release enters the full-page refresh handoff, including
                its separate 1500ms outbound hold. Native button identity, refs,
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
                core keeps its three-rim setup and mode-aware header palette.
                Dark Mode retains the 87%-alpha Fuchsia900 foundation, 31% cup
                surface and brighter Purple-mixed glyph. Light Mode uses pale
                Rose glass with deeper raspberry artwork and soft reflected
                light. Critical declarations are generated from the same frozen
                paint object, with literal fallbacks for every Tailwind and
                palette color before app CSS arrives. The cup surface stays on
                its own clipped layer; plain base and score colors remain valid
                in SVG strokes and color-mix. The full-screen backdrop instead
                shares the application’s violet Iridescence fallback beneath
                Pink300 at 21% and Purple900 at 69% in Dark Mode, and the
                luminous paper glaze in Light Mode. Header and loading artwork
                share the same paint under system and explicit Appearance
                preferences; external styles do not replace it with the old
                Purple action face. Local artwork glow and particles retain
                their own choreography without changing the root field’s clock.
              </p>
              <p>
                A loading-only veil reaches 79% opacity outside a circular focus
                opening. The inner 128px radius is completely clear;
                intermediate 12%, 40% and 68% alpha stops feather toward an
                outer radius of <code>clamp(168px, 49vmin, 460px)</code>. Dark
                Mode uses Mauve900 and Light Mode uses pale Rose/Lilac paper,
                preserving the core’s breathing room while larger screens retain
                a broader soft transition. A second, faint Violet300 8% /
                Pink300 4.5% reflected halo breathes between 68% and full layer
                opacity over 8.8 seconds, beginning on the existing loop clock.
                Reduced motion settles it and retains the mode-aware veil.
              </p>
              <p>
                Shared focus coordinates align the veil, existing aura and
                scene: 50% / 44% normally, 50% / 39% on short screens, and 27% /
                42% in short landscape. The veil is a separate passive layer
                below all foreground artwork, copy and links, including the
                charged face and particles. Direct radial alpha gradients work
                in critical CSS before app styles arrive, without mask or
                backdrop-filter support. The shade is present immediately;
                neither its paint nor its decorative halo changes the original
                loading, release, scroll or handoff clock.
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
                MedicationCard composes the same two-row identity for recorded
                intakes, medication-library entries and read-only change
                previews. Intake headings show time, medication name and a
                compact route/form/category rail; the lower row keeps active
                ingredient and dose arithmetic. Library headings remove the old
                Default prefix, while a small colored form badge accompanies the
                ingredient below. Library cards and Past Days day links now opt
                into the same shared intake glass surface and frame described
                above. This includes the 5⅓px inward mixed rim, 2⅔px identity
                band, faint copied rim and separate 1.5px outside edge, with
                mode-specific washes and reading ink. Paint remains independent
                of the icon pigment or a fixed-color SVG, and native full-card
                activation opens the appropriate editor.
              </p>
              <p>
                The shared details fill a 56px artwork stage inside the 80px
                card. Names retain compact 15px/650 typography; intake times use
                13.5px/700 at roughly 75% foreground. Both rows remain
                single-line, with the name truncating before its bounded,
                horizontally scrollable indicator rail. The route, form and
                category symbols sit close together in primary outline ink, with
                a dot separating the route/form pair from categories; filled
                form helpers are suppressed. An intake route is an explicitly
                recorded value, never inferred from medication form. The
                ingredient begins at the lower row’s left edge; quantity ×
                strength and total dose stay protected at the right. Known
                ingredients retain primary ink and weight, while Unspecified
                stays quieter. Library forms use a compact selected-color shadcn
                Badge with an appropriate outline glyph rather than a plain
                Tablets label. Library headings protect at least 12px between
                the truncated name and indicator rail, with 6px between
                full-opacity category symbols. The bounded rail scrolls
                horizontally when needed. The layout preserves long-value titles
                and full accessible descriptions.
              </p>
              <p>
                Each saved intake is one native full-card edit button. The
                data-intake-card-action marker preserves stack keyboard
                disclosure and reference-arrival focus. Decorative artwork and
                glyphs remain hidden from assistive technology; accessible
                descriptions retain the actual route, form, quantity and dose.
                The new optional MedicationCard intakeRoute prop is shared with
                notification snapshots, so the recorded route appears in the
                original card design without a separate route badge outside it.
                Disabled cards keep the native disabled state.
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
                keeps a 48px artwork anchor, 30px glyph and 56px rail at all
                breakpoints; the front starts at a fixed 4px inset and never
                shrinks. Rear frames begin with 20% exposure of their own
                smaller widths, then compress only those exposed edges into the
                remaining 4px of rail. This bounds the fan without scaling its
                main artwork. Cards keep an 80px baseline; only an unusually
                long quantity adds headroom above the artwork, preserving both
                text rows and their reserved clearances.
              </p>
              <p>
                Decorative artwork stops at three frames, independently of the
                recorded amount. MedicationQuantityBadge now displays the total
                as × n in primary ink at the artwork’s top-left, without a badge
                background: 2.5 units reads × 2.5, not +1.5. Its 10px caption
                uses the stored number directly; long legacy values wrap instead
                of shrinking to 7px, rounding or being ellipsized. A separate
                tooltip uses that same exact number. Ordinary labels sit at top
                1px/left 0 within the 56px rail, clear of the pill’s glyph.
                Labels longer than nine characters get an in-flow strip above
                the 48px artwork; the settle response follows the glyph’s center
                rather than the enlarged rail. Non-unit positive fractions are
                also represented; an ordinary quantity of one needs no extra
                label, and invalid/nonpositive values omit it. The old top-left
                form overlay moves into the heading rail.
                MedicationCardIconFrame now hosts both medication glyphs and the
                animated coffee/moon artwork. Intake, check-in,
                medication-library and Past Days artwork use a 6px inward glass
                rim at 28% combined alpha (20% selected color plus 8% primary
                ink), with 96px standard/Safari backdrop blur. Its opaque face
                is clipped to a 6px-padded content box to expose the glass ring.
                The 1px saturated family-400/500 inner rim stays at 78%, inset
                6.75px with a 9.25px radius and a 0.75px gap. Morning uses a
                warm Rose400 identity while Evening uses a cool Violet400
                identity through the same MedicationCardBase, card-frame
                borders, 96px glass pane and the same faint selected-color tint
                as a matching intake. Both share the mode-specific washes, light
                reading veil and reduced-transparency fallback. Their former
                independent background and drawn icon-frame overlays are
                removed; coffee steam, moon movement and the delayed ambient
                handoff remain. Standalone previews retain their 3.5px outer
                frame. The shared base retains a 48px tile. One inner
                entrance owner animates the whole fan, while the quantity label
                enters separately and grouped disclosure never remounts its
                frames. Recorded intake faces now paint a centred 60px surface
                around that anchor, retaining the 6px outer stroke and the
                glyph’s original coordinates. The saturated inner ring grows
                outward to 1.85px while preserving its inner edge; a matching
                ring sits two thirds into the outer rim. A 37% overlay uses that
                same family pigment. These intake-only styles also cover
                historical entries, notification snapshots and Final Look.
              </p>
              <p>
                The recorded-intake heading rail starts with an atomic route and
                physical-form pair, using the normal 2px inter-icon gap. A dot
                with balanced side spacing separates this pair from the
                medication categories. Entries without categories omit the dot.
                Every glyph uses a 13px viewport, primary ink, no fill and a
                2.5px stroke, including custom route SVGs. The bounded rail
                remains horizontally scrollable, preserving the name’s space.
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
                The mounted MedicationCard path renders route and form in the
                heading rail. Its artwork overlay is the plain total-quantity
                annotation described above, outside the spinning wrapper and
                without a counter surface or corner form tile. Today, historical
                intakes and read-only notification intake previews share this
                presentation. Library defaults can determine the decorative fan
                but do not gain the annotation; appearance heroes, history
                summaries and check-in artwork stay single frames. Reduced
                motion shows the settled artwork.
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
                journal sample. Normal journal cards retain the 96px glass
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
                tile system for all 19 manually selected categories. Shared
                medication cards use the category glyphs as primary-ink outlines
                in their heading rail; selectors and linked references retain
                colored category tiles. The rail displays every selected label,
                including on the oldest linked intake. A bounded horizontal rail
                preserves the single-line heading when many labels are selected;
                categories are not replaced by a count or silently omitted.
                Journal medication and ingredient references reuse the same
                glyphs and palettes. Current manual metadata is authoritative;
                names never infer classification. The three quantity-summary
                categories remain independent of this complete display catalog.
                The medication editor’s selected summary uses a scoped{" "}
                <code>{'presentation="form"'}</code> instead: real shadcn Badge
                pills show plain primary-color glyphs without their colored
                tiles. A 4/3 layout scale enlarges the pills and text; each side
                has 12px padding above a more visible neutral fill. Glyphs
                shrink by 32% before sharing that scale, keeping them compact.
                Priority labels remain first, followed by up to three general
                labels and an accessible overflow count. The Categories dropdown
                and shared card, goal and streak markers retain their existing
                presentation.
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
                single-line rows. The first-row name yields to the bounded
                indicator rail. Library and appearance-preview cards use a
                compact selected-color Badge with an outline form glyph before
                the active ingredient below. Its width is capped at 48% of that
                flexible label region, and both labels can ellipsize. Actual
                intake rows keep form and recorded route in the top rail, so the
                lower row starts with the ingredient and protects the dose
                arithmetic at the right. Full names and labels remain available
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
                other selects retain their existing presentation. Selected and
                keyboard-focused options have no enclosing border, outline or
                shadow. Keyboard focus instead underlines the label and
                strengthens its warm fill. Other sits below a short inset
                separator and an 8px gap, with quieter text until selected.
                Categories lists all 19 options without a search field in a
                256px popup, constrained to the viewport. Its fixed header and
                footer sit outside the listbox; only the options scroll. An
                inset separator precedes the footer with 8px spacing on each
                vertical side. Clear and Done share subtle 28px
                foreground-tinted controls with compact labels and tiny leading
                Trash/CheckCheck icons. Clear always appends a dot and the
                selected count, including 0, and is disabled when empty. The
                centered “19 options” count stays between the buttons. Multiple
                selection keeps the menu open, normalizes the stored order and
                preserves native typeahead, Escape and focus return. Old drafts
                with a category search string still restore their selections;
                that obsolete string is ignored. Medication choices keep their
                saved artwork, exact strengths and contextual “This intake”
                caption. Quantity and draft behavior stay connected to the
                existing controls.
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
                visible descriptions align to the title’s text column. Reader
                and writing-help headers also begin with text; body artwork and
                action icons stay in place. The headerActions slot places native
                controls beside Close; check-in Reset Draft uses the same 44px
                styling. Its footer keeps draft feedback without a duplicate
                Reset link. Native dismissal, focus return and scroll memory
                remain with the existing primitives.
              </p>
              <p>
                Dialog heading sections use 7/12 of their previous top padding,
                a 5/12 reduction, while keeping their text and action sizes.
                Headers are part of the content flow: title, supporting copy and
                header controls scroll out of view together. Mobile drawers
                place the header inside the same remembered scroller as the
                form, matching desktop dialogs. Edit Intake omits the duplicate
                Update Entry context and keeps its existing description directly
                beneath the title. Heading artwork is omitted; medication
                selectors and functional action icons retain their purpose.
                Reader, writing-help and confirmation dialogs use the same
                compact top-spacing rule and whole-content scrolling. Shared
                modal scroll hosts disable browser scroll anchoring, so header
                reflow at the drawer/dialog breakpoint cannot overwrite a
                remembered numeric position before the new layout restores it.
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
                Dialog saves delegate through DialogPrimaryButton to
                TodayActionButton on the shared Button host. Today, page-level
                Add Medication and submissions all share the full 80px height,
                21px corners and mode-paired satin face, inward edge and inset
                icon treatment, without restyling ordinary small controls.
                Pending replaces the leading glyph and keeps native
                submission/disabled behavior. Dialog action clearance and the
                separate keyboard focus ring remain available; the submission
                adapter enforces the main action’s geometry even when older
                callers still supply compact utility classes.
              </p>
              <p>
                Intake and history week groups share the same 8px spacing token
                and complete mounted card faces. Their Reveal/Collapse control
                keeps a 44px native touch area and a compact measured label
                notch. The sentence reads naturally—Reveal 3 intakes, Collapse 3
                intakes, or the corresponding days wording—with only the number
                emphasized. Both side chevrons use a heavier stroke. The control
                has no background; its rim matches the group frame without
                changing layout or the hit target. Keyboard focus stays visible,
                and changing open state preserves the count and intrinsic label
                measurements.
              </p>
              <p>
                Every actual intake group and Past Days week group shares the
                existing 24px glass blur at 78% effect opacity. Above it, static
                Pink300 at 6% and Purple300 at 8% form separate tint layers. The
                8/3px frame stroke is painted inward with an inset box-shadow,
                avoiding WebKit rounding a fractional native border down to 2px.
                Its pigment mixes 84% card foreground and 16% Pink400, then uses
                22% opacity. No border/outset increases layout. Pink begins
                fading about 62% through the last visible card and reaches zero
                at the glass bottom; Purple starts at 50% and ends around 92%
                through that card. Hidden/capped cards do not determine these
                endpoints. useIntakeGroupSurface observes visible slot
                transforms, natural heights, label and surface sizes, with a
                requestAnimationFrame loop only during disclosure movement. The
                old animated medication gradient and 11% cup wash are removed.
                Existing entry timing fades the static shell together; reduced
                transparency removes blur and reduced motion settles the
                surface.
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
                use opaque rose/lilac paper with deep Plum copy. Foregrounds
                remain opaque and independently paired. Registry tests composite
                translucent panels over the moving ramps and neutral extremes,
                then check normal text at 4.5:1 or better. Component decoration
                may add depth, but it must not replace that readable base.
              </p>
              <p>
                Past-day links now reuse the intake card’s full 80px frame, 21px
                corners, 5⅓px inward mixed rim, 2⅔px identity edge and separate
                1.5px fine outside stroke. MedicationCardBackground supplies the
                same mode-aware glass, Pink/selected-color washes and light
                reading-paper veil as the timeline and library. Artwork follows
                the first chronologically taken medication, including its saved
                icon and rotation; reflection-only days retain Morning or
                Evening artwork. Month/day and weekday share the top row with
                pill/Benzo totals; Logs, unique Meds and saved check-in periods
                occupy the lower row. No reflection prose, dose-goal judgment or
                quantity fan appears. Full dates, counts and medication names
                remain accessible, and the entire face stays a native day link.
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
                Multi-day weeks reuse the intake stack’s measured card
                positions, inward glass frame, quiet static pink/purple tint,
                notched footer and dual chevrons. Activating a folded stack
                reveals its days; after opening, each original card remains a
                native day link. Reveal/Collapse preserve mounted faces and
                keyboard focus, and reduced motion settles immediately. A
                one-day week needs no disclosure. Expansion and the recorded-day
                loading budget resume from the journal-scoped history view,
                independently of form drafts.
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
            Journal-scoped browser storage preserves notices and their exact
            active-time countdown across reloads and app restarts, while
            confirmed logout clears the matching queue.
          </p>
          <p className={styles.sectionIntro}>
            Light Mode uses opaque reading paper with soft Rose/Lilac tints,
            deep Plum text and stronger status colors. The bell keeps its dark
            artwork tile and light outline; only its check uses the success
            pigment. Expanded previews, footer actions and countdown badges use
            the same paired reading roles. Surface changes never change the
            stored timer, hold-to-pause behavior or Undo ownership.
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
                selectable geometry. Nose’s shortened bridge fits a square 24×24
                viewport while keeping the reference profile recognizable.
                Lucide-compatible defaults use a 2px currentColor stroke, no
                fill and rounded caps and joins. The stored svg:nose key follows
                the existing allowlisted catalog and inline-vector rendering
                path. English and German aliases include nose, nasal, nostril
                and Nase; selecting or tinting it needs no special image
                conversion. Angled Tablet uses svg:tablet-angled for a tilted
                elliptical face, a single score and a visible sidewall,
                following only the rear pill of the supplied reference. Its
                Lucide-compatible SVG and native inline renderer share the exact
                same unfilled geometry. Intake form glyphs reuse that shape.
                Their shared glyph includes filled helper geometry; the
                recorded-intake rail explicitly suppresses fills and applies a
                2.5px primary-ink stroke. Other saved appearances retain their
                own settings. The earlier circular svg:tablet-single remains
                selectable with its stored ID and aliases unchanged. Branding
                and the Pills count marker retain the original two-tablet
                symbol.
              </p>
              <p>
                Swallowed entries store the <code>oral</code> route. Today,
                Past Days, previews and route selectors resolve it to Lucide’s
                Mouth icon at render time. The original SVG URL also serves
                that artwork for older references.
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
            {[...SOURCE_GROUPS, ...WORKFLOW_SOURCES].map((group) => (
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
                  display-only. Morning’s Got up field updates the first marker;
                  an existing saved Evening bedtime can inform the last. Evening
                  no longer offers a bedtime input. Unknown values retain the
                  display fallback. These clocks do not create answers, reorder
                  intakes or change the 06:00 boundary.
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
                  The morning card and writing dialog share a Lucide coffee mug.
                  On the card it tips into place, rebounds, then settles as the
                  three steam strokes begin their staggered loop. Reduced motion
                  shows the settled mug.
                </li>
                <li>
                  EveningMoon owns its entrance and permanent motion together. A
                  2.4-second curved approach grows and rolls into the first
                  floating swing, with matching pose, velocity and acceleration
                  at the handoff. The 10.8-second nonlinear loop slows near its
                  raised turning points and gathers speed through the center; a
                  small lagging tilt keeps the crescent from moving like a rigid
                  metronome. Browser-native animation timelines preserve phase
                  when the page is hidden, the card goes offscreen or a dialog
                  opens, and are cancelled on unmount. The moon shares the mug’s
                  pale Rose200 ink while retaining its Violet artwork frame.
                  Short-lived colored stars keep their separate bounded
                  scheduler and wait until the entrance has completed. Reduced
                  motion shows a still crescent and static stars. No per-frame
                  React render or JavaScript animation loop is needed. The
                  sampled motion model is cached and immutable; focused unit
                  checks protect the entrance handoff, loop seam, bounded travel
                  and trailing tilt.
                </li>
                <li>
                  Check-in tiles retain their 1560ms arrival. Morning keeps its
                  spin-and-settle illustration response; its steam opens 300ms
                  later through the existing nonvisual ambient clock. Evening
                  receives a separate nonvisual entry signal at the tile’s
                  start, so the moon’s own entrance flows directly into its loop
                  instead of waiting for the older shared spin or ambient pause.
                  Evening omits that shared symbol animation and settle
                  flourish. A keyed scene replays both clocks, while page/dialog
                  pauses hold their progress.
                </li>
                <li>
                  Morning and Evening check-ins share the same large-logo
                  layout: an 80px frame, 21px corners and a 48px artwork tile in
                  a 56px stage. Both use a quiet translucent face above the
                  flowing page background with a shared check-in color. The
                  mixed rim and
                  2⅔px identity band paint inward; the identity alpha follows
                  the light/dark recipe above. Filled coffee and crescent
                  artwork distinguish the periods. Both illustrations sit on a
                  dark tile. The sleep and mood summaries use the shared card
                  foreground in both appearances. The steam, stars and entry
                  motion retain their own timing. Details and icon stages
                  remain 56px, the tile 48px
                  and symbol holder 30px. A single two-thirds scale on the
                  illustration owner makes both scenes exactly one third
                  smaller, including their steam, stars and motion travel. The
                  moon’s 30px source becomes 20px visually without changing the
                  shared tile, card measurements, 11px artwork-to-copy clearance
                  (7px below 360px) or 8px trailing inset. SavedCheckInHeading
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
                  truncate before the right-hand summary. The upper row pairs a
                  bed or smile with an icon for an empty, drafted or saved
                  check-in. The lower row uses the intake card’s number and unit
                  styles for recorded sleep duration or the selected mood count.
                  An unanswered field offers Add sleep or Add moods. Changed
                  drafts take precedence, including cleared values. The whole
                  card opens its editor. The former animated indicator remains
                  available in <code>CheckInCardProgress</code>.
                  First-open observations live in the
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
                  doorway pairs a gently steaming coffee icon with reading and library
                  controls. Its writing action uses the Today button frame with
                  the check-in section’s fuchsia-violet inner edge. Copy Writing
                  and Refresh sit on opposite sides of the paragraph count.
                  The morning and evening sections share an 8% tinted gradient,
                  an introductory caption and two small footer notes.
                  Local word, character and reading
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
                  all responses. The compact writer header has no heading icon
                  or fade, and a larger description clamped to three lines. Its
                  context row above the heading shows the full weekday,
                  abbreviated month and day without a year, then a dot and
                  Reflection, with the shared 44px close control opposite. The
                  heading and two icon-only toolbar rows scroll with the source
                  and preview. The source grows with its content rather than
                  adding an inner scrollbar; split view also uses that shared
                  vertical viewport. The footer and keyboard-aware viewport
                  handling stay separate. Mobile height follows visualViewport.
                  Top buttons use 33px targets and 2.6-stroke Lucide glyphs,
                  with 30px formatting buttons below. Pencil/Eye share neutral
                  coloring, Bookmark/BookmarkCheck reflect saved state, and
                  CloudCheck keeps Done’s existing celebration timings,
                  including the 700ms centered hold and downward departure.
                  Groups use Black at low opacity in light mode and White at low
                  opacity in dark mode; the top buttons share that quiet neutral
                  treatment. Active formatting uses a strong neutral fill and
                  follows the actual source/selection, including code
                  exclusions. Formatting taps preserve the caret and keyboard;
                  top actions blur the writing field. Info opens a nested help
                  dialog with Markdown examples and practical tips, then
                  restores focus to Info on close. FileDown starts a trusted
                  local .md download synchronously, followed by visual
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
                pane during scroll, resize and mobile viewport changes. Writing
                Space intersects that room with its shared scroll viewport,
                watches its scroll and hides suggestions for an offscreen caret.
                Reduced motion retains readable pending feedback without
                decoration.
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
                Full check-in submissions protect writing with the same
                expectedUpdatedAt precondition inside the repository mutation.
                Different existing prose needs an exact version match; older
                clients can create a record or save unchanged writing, but
                cannot replace newer text without review. A stale version cannot
                revive a deleted record. Both writing and full-form saves
                advance versions monotonically, including writes in the same
                millisecond. Submissions drain their own autosave before reading
                its latest acknowledged base, and successful cleanup retains any
                observed newer local draft. This protects against stale
                full-form saves; it does not provide an archive of historical
                notes or an atomic transaction across browser tabs.
              </p>
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
              <p>
                Authentication uses a persistent HTTP-only, SameSite=Lax cookie
                with a maximum age of 400 days and Secure in production. Valid
                state loads and cookie-only session probes reapply the cookie
                policy; signed tokens renew at most daily. Browser site-data
                retention can end a session earlier. Password or signing-secret
                changes revoke the corresponding sessions, and credentials never
                enter the draft store or history-card snapshots.
              </p>
              <p>
                The provider rechecks after focus, visible-page return, pageshow
                and reconnection, coalescing concurrent loads. A visible window
                also probes every six hours without loading journal records.
                Only an explicit unauthenticated result can finish recovery as
                signed out; unavailable servers preserve the current view with
                retry feedback. Recovery can retry a journal GET, but a failed
                mutation always needs an intentional retry. Sign-in and sign-out
                use document navigation to discard stale authenticated route
                responses.
              </p>
            </Detail>
            <Detail
              title="Morning Sleep Journal"
              context="One Night, Clearly Recorded"
            >
              <p>
                Morning reuses the Evening card, responsive modal, Markdown
                launcher and Accent save action. Both cards share the same
                period-specific Rose400 or Violet400 identity, shared glass,
                80px frame and two-row summary; the coffee cup or Moon artwork
                identifies the period. The journal editor stays first;
                structured sleep details follow in three compact sections. Time
                in bed and Sleep efficiency form one calculated summary row
                immediately above Save Check-In. A 1px separator at 13%
                foreground visibility follows the preceding content after 10px.
                The summary has 12px of top padding, with 16px between its
                values and Save; both estimates remain one compact row.
              </p>
              <p>
                The Morning dialog starts with Your Morning, Your Words,
                followed by its five optional sleep ratings, schedule,
                interruptions and duration fields. Its card keeps first opening
                separate from latest saved update, with an em dash only when
                opening history is unknown. Both period cards retain their
                Rose/Violet identity frames and dark artwork tiles, with
                matching pale Rose200 cup/moon illustrations at two-thirds of
                their former size. The right-hand summary shows recorded sleep
                in hours and minutes, including durations from older entries.
                Local drafts and saved responses stay distinct, and both cards
                retain their shared 80px frame and entry/ambient motion gates.
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
                The optional morningSleep object remains additive to
                DailyCheckIn. Its totalSleepMinutes supplies the sleepHours
                compatibility value; older clients that omit the object preserve
                existing details, and explicit null clears it. Evening now
                exposes five completion groups: Notes, Mood, Energy, Stress and
                What Helped. The former Sleep & Tonight inputs are removed from
                the Evening UI, while saved sleepHours and bedtime remain intact
                in records, exports and compatible drafts. Energy and Stress use
                optional native 1–10 sliders with endpoint captions and Clear.
                Their energyScale/stressScale metadata stays 5 or 10; missing
                metadata means a legacy five-point answer. Old values project to
                1/3/6/8/10 for slider display only. Editing or clearing changes
                that field to the new scale; untouched counterparts retain their
                original raw values and scale. Comparison helpers normalize into
                the existing five-point unit, so no bulk migration or silent
                rewriting is needed.
              </p>
            </Detail>
            <Detail
              title="Evening Feelings Library"
              context="Five Visible Completion Groups"
            >
              <p>
                Evening exposes Notes, Mood, Energy, Stress and What Helped. Its
                feelings library contains {DAILY_MOODS.length} stable mood IDs
                across {DAILY_MOOD_FAMILIES.length} families:{" "}
                {DAILY_MOOD_FAMILIES.map((family) => family.label).join(", ")}.
                The picker displays {DAILY_MOOD_CHOICES.length} curated choices.
                Search maps close alternatives to their curated choices.
                Historical selections use the full registry for validation and
                display, including when editing earlier entries. DailyMoodIcon
                uses those stored IDs to render Lucide symbols in the picker,
                saved previews, journals and summaries.
              </p>
              <p>
                Search matches labels, IDs, keywords, family names and retired
                near-synonyms immediately. The compact search and Shuffle
                controls share their background and inset border treatment.
                Removable selections stay beneath the scrolling palette during
                searches. Any number of distinct registered feelings can be
                selected. rankDailyMoods counts each mood once per saved check-in
                and sorts the registry by descending usage. The picker reverses
                that order for its least-used-first view, then filters to active
                or selected IDs.
                Equal-frequency choices use a deterministic day-seeded shuffle.
                Shuffle gives those ties a new seeded mix. Searching and
                shuffling reset only the results viewport, preserving selected
                moods and the parent form scroll.
              </p>
              <p>
                The default Evening completion catalog excludes Sleep, while an
                explicit legacy sleep section remains queryable. Removing Sleep
                &amp; Tonight from the form never deletes historical sleepHours
                or bedtime values. Evening saves omit both hidden fields; the
                atomic server update retains their latest saved values,
                including after a newer clock save in another session. Old
                incomplete draft values cannot block saving or overwrite that
                record. Explicit clears from legacy clients retain their
                meaning. Morning remains the place to add new sleep details.
                Optional Energy and Stress use 1–10 ratings, retaining legacy
                five-point scale metadata until edited.
              </p>
              <p>
                Your Day, Your Mood contains the mood picker and Energy/Stress
                ratings in one section. Its outside heading matches Your Day,
                Your Words. A divider separates the two parts within their
                shared frame. Family metadata supplies the
                related choice colors. Selection feedback respects reduced
                motion, and hover effects apply to desktop fine pointers.
              </p>
            </Detail>
            <Detail
              title="Private Past-Day Card Cache"
              context="Newest Three Stay Live"
            >
              <p>
                <code>useHistoryCardSummary</code> memoizes display models for
                the day links used in Past Days and week details. Older recorded
                past days can reuse a versioned device-local snapshot. The three
                newest recorded past days always derive from current journal
                state; Today, future dates and empty dates never use snapshots.
                The live set is recalculated from the journal timezone and 06:00
                boundary, including when days are added or removed. Sparse days
                and check-in-only days count as recorded days; this is not a
                three-calendar-day cutoff.
              </p>
              <p>
                The key combines history-card cache version, authenticated
                workspace scope and tracking day. A source fingerprint covers
                the displayed intake values, relevant live medication
                identities, strengths, colors, symbols, categories and check-in
                completion. Reads require both scope and an exact fingerprint
                match. A medication edit, backfill, correction or removal
                therefore makes an old snapshot ineligible immediately; no TTL
                can leave edited medication details stale. Newly live days
                remove only their own cache key. Switching journals cannot read
                another scope.
              </p>
              <p>
                Source models depend on journal data and the requested date;
                cache eligibility depends on the stable tracking-day key. A new
                clock object on a minute tick or focus refresh therefore does
                not rescan or rewrite unchanged summaries. Persistence compares
                the serialized record before writing, so remounting a card can
                reuse the existing snapshot without storage churn. Moving past
                the 06:00 boundary still updates eligibility.
              </p>
              <p>
                Snapshots contain card counts, artwork identity and accessible
                summary labels. They exclude raw intake notes, journal prose,
                passwords and session material. This is localStorage, not an
                encrypted backup, service-worker response cache or shared server
                cache. Missing, malformed, obsolete or unavailable storage falls
                back to live rendering without blocking a day link. Nested
                timestamps, medication artwork, colors and count values are
                validated before a snapshot reaches a card. The formatted date
                must match the requested day, including for reflection-only days
                whose other fingerprint inputs can be identical. See{" "}
                <ExternalLink
                  href={developerSource("src/lib/history-card-cache.ts")}
                >
                  history-card-cache.ts
                </ExternalLink>{" "}
                and{" "}
                <ExternalLink
                  href={developerSource(
                    "src/components/use-history-card-summary.ts",
                  )}
                >
                  use-history-card-summary.ts
                </ExternalLink>
                . Focused tests cover live-day membership, 06:00 rollover,
                journal isolation, relevant-edit invalidation, write
                deduplication, malformed snapshots and storage failures.
              </p>
            </Detail>
            <Detail title="Durable Form Drafts" context="Local To Each Journal">
              <p>
                JournalDraftProvider hydrates a versioned, journal-scoped
                localStorage workspace before forms mount. The server derives
                its namespace from the authenticated journal ID, without
                exposing credentials. Raw unfinished inputs survive closing,
                reloads and app relaunches. New forms, individual edit IDs and
                past tracking days have separate drafts; successful saves clear
                only their own draft, while failed requests retain it.
                Medication and check-in forms place Reset beside Close;
                medication Archive/Restore also remains in that header. The
                check-in heading separates first recorded opening from latest
                successful save, and opening metadata never claims a save or
                completion. Evening tracks five visible groups—Notes, Mood,
                Energy, Stress and What Helped—while Morning tracks Notes, Sleep
                Ratings, Sleep Schedule, Night Interruptions and Sleep Duration.
                Sleep/bedtime fields from legacy Evening records remain stored
                even though the inputs are hidden. Draft comparisons use values,
                not object-key order; base-version metadata, scrolling and
                writer visibility alone are inert. Closing returns focus to the
                same card and never submits an unfinished form.
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
                Writing Space stores independent source and preview positions on
                its shared content scroller; write and split modes use the
                source key, while preview mode uses the preview key. Scroll
                updates persist quietly without rerendering the journal. Color
                inspections also retain their preview, format and filters. The
                public install and create-journal dialogs store numeric
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
              With no database URL or password configured, development opens
              without sign-in and writes to <code>.data/state.json</code>.
              Additional local password journals use
              <code> .data/journals.json</code>. Connecting a database selects
              that database and requires <code>APP_PASSWORD</code> plus a
              <code> SESSION_SECRET</code> of at least 32 characters. Production
              also requires the database and never falls back to local files.
              Use an isolated journal with invented entries.
            </p>
            <p>
              The development and production servers bind to
              <code> 127.0.0.1</code>. <code>npm run dev</code> starts the local
              editor loop; <code>npm run build</code> followed by
              <code> npm start</code> checks the production server with its
              required configuration. Copy environment settings from{" "}
              <ExternalLink href={developerSource(".env.example")}>
                .env.example
              </ExternalLink>{" "}
              into your local environment and restart after changes. The{" "}
              <ExternalLink href={developerSource("package.json")}>
                package scripts
              </ExternalLink>{" "}
              are the command reference; <code>npm run secrets</code> generates
              credentials when you choose to enable authentication.
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
