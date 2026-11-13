import type { ReactNode } from "react";
import { ActionIcon } from "@/components/action-icon";
import { DeveloperCode } from "@/components/developer-code";
import { guideHeadingId } from "@/lib/guide-outline";
import {
  GUIDE_LAYOUT_BANDS,
  GUIDE_RESPONSIVE_SOURCES as sources,
  GUIDE_WIDTH_STEPS,
} from "@/lib/guide-responsive";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-responsive-reference.module.css";

const conventions = [
  ["Base", "Unprefixed · every width", "xs · below 576px"],
  ["Small", "sm · 640px / 40rem", "sm · 576px"],
  ["Medium", "md · 768px / 48rem", "md · 768px"],
  ["Large", "lg · 1024px / 64rem", "lg · 992px"],
  ["Extra large", "xl · 1280px / 80rem", "xl · 1200px"],
  ["Largest default", "2xl · 1536px / 96rem", "xxl · 1400px"],
] as const;

const layoutRecipe = `/* Shortened guide layout; wider bands increase caps and gaps. */
.guide-layout {
  display: grid;
  min-width: 0;
}

@media (min-width: 64rem) {
  .guide-layout {
    grid-template-columns: minmax(0, 3fr) minmax(18rem, 1fr);
    gap: 2rem;
  }
}

@media (min-width: 80rem) {
  .guide-layout { gap: 3rem; }
}

.guide-prose { max-inline-size: 68ch; }
.guide-content { min-inline-size: 0; }

/* Keep intrinsically wide examples inside their own scroll area. */
.code-or-table { max-inline-size: 100%; overflow-x: auto; }`;

function Subheading({
  children,
  level = 2,
  id,
}: {
  children: string;
  level?: 2 | 3;
  id?: string;
}) {
  const props = {
    id: id ?? guideHeadingId("developer-responsive", children),
    "data-guide-outline-level": String(level),
    "data-guide-outline-label": children,
  };
  return level === 2 ? (
    <h3 {...props}>{children}</h3>
  ) : (
    <h4 {...props}>{children}</h4>
  );
}

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ActionIcon name="external" className="size-3.5" />
    </a>
  );
}

export function GuideResponsiveReference() {
  return (
    <section
      id="responsive-layout"
      className={`${guideStyles.section} ${styles.reference}`}
      aria-labelledby="responsive-layout-title"
    >
      <div className={guideStyles.sectionHeading}>
        <h2
          id="responsive-layout-title"
          data-guide-outline-level="1"
          data-guide-outline-label="Responsive Layout & Breakpoints"
          data-guide-outline-target="responsive-layout"
        >
          <ActionIcon name="settings" className="size-[18px]" />
          Responsive Layout &amp; Breakpoints
        </h2>
        <span>
          <b>07</b> / Room To Read
        </span>
      </div>

      <p className={styles.sectionIntro}>
        A breakpoint changes the arrangement when the content needs more room.
        Between those points, the layout remains fluid. These two guides share a
        deliberately spacious reading system: generous type, bounded paragraphs
        and an unboxed contents rail that appears only when it can be
        comfortably readable. The journal itself keeps its compact, familiar
        layout.
      </p>

      <article className={styles.card} data-card-entry>
        <Subheading>Familiar Breakpoint Conventions</Subheading>
        <p>
          Tailwind and Bootstrap provide familiar starting points, but their
          labels do not describe identical widths. This project uses Tailwind’s
          default viewport thresholds, then adds two wider guide-specific bands.
          These are framework conventions, rather than a universal device-size
          standard or a ranking of the most popular screen sizes.
        </p>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Framework breakpoint comparison; scroll horizontally if needed"
        >
          <table>
            <caption>Default minimum widths, measured in CSS pixels</caption>
            <thead>
              <tr>
                <th scope="col">Band</th>
                <th scope="col">Tailwind · used here</th>
                <th scope="col">Bootstrap · comparison</th>
              </tr>
            </thead>
            <tbody>
              {conventions.map(([name, tailwind, bootstrap]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{tailwind}</td>
                  <td>{bootstrap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.sources}>
          <Source href={sources.tailwind}>Tailwind responsive design</Source>
          <Source href={sources.bootstrap}>Bootstrap breakpoints</Source>
        </div>
        <div className={styles.paired}>
          <div>
            <Subheading level={3}>Minimum Width, Upwards</Subheading>
            <p>
              Unprefixed styles are the starting layout at every size. A
              <code> md:</code> change begins at 768px and continues above it
              until another rule replaces that property. It does not mean
              “tablets only.” Keep one consistent ladder so neighboring layouts
              do not compete at slightly different thresholds.
            </p>
          </div>
          <div>
            <Subheading level={3}>Viewport, Not Device Label</Subheading>
            <p>
              The available browser viewport drives the layout. A narrow desktop
              window can use the same arrangement as a phone. Physical display
              pixels and screenshot scale do not set the breakpoint; browser
              zoom and window size can change the available CSS viewport.
            </p>
          </div>
        </div>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading>The Eight Guide Layouts</Subheading>
        <p>
          The numbers below describe the shared design contract. A cap is the
          maximum inner width of content plus navigation; the safe gutter sits
          outside that cap. A smaller viewport always wins, so these widths
          never force the page beyond its available space. Rem equivalents below
          assume a 16px initial text size.
        </p>
        <div className={styles.bands}>
          {GUIDE_LAYOUT_BANDS.map((band) => (
            <div key={band.name} className={styles.band}>
              <div className={styles.bandTop}>
                <Subheading level={3}>{band.name}</Subheading>
                <code>{band.token}</code>
              </div>
              <strong className={styles.bandWidth}>
                {band.min === 0
                  ? "Below 640"
                  : `${band.min.toLocaleString("en-US")}+`}
                <small> CSS px</small>
              </strong>
              <p>{band.intent}</p>
              <dl>
                <div>
                  <dt>Starts at</dt>
                  <dd>
                    {band.min === 0 ? "Base styles" : `${band.min / 16}rem`}
                  </dd>
                </div>
                <div>
                  <dt>Inner width cap</dt>
                  <dd>{band.cap}px</dd>
                </div>
                <div>
                  <dt>Safe gutter / side</dt>
                  <dd>{band.gutter}px</dd>
                </div>
                <div>
                  <dt>Contents</dt>
                  <dd>{band.sidebar ? "Right rail" : "Inline links"}</dd>
                </div>
                {band.sidebar && (
                  <div>
                    <dt>Column gap</dt>
                    <dd>{band.gap}px</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          The 1920px and 2560px bands extend this project’s guides. They are not
          additional Tailwind defaults. Breakpoints describe available room;
          phone, tablet and desktop names remain convenient shorthand.
        </p>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading
          id={guideHeadingId(
            "developer-responsive",
            "How The Two-Step Width Cap Works",
          )}
        >
          How The One-Step Width Cap Works
        </Subheading>
        <p>
          “One size smaller” uses this project’s width ladder. Starting at
          640px, the guide selects the inner cap one entry earlier in the
          ladder: 1280 → 1152, for example. Each of the eight existing layouts
          gains one width step; the viewport bands stay the same. This leaves
          room around the page while keeping the actual reading area
          substantially wider than the journal.
        </p>
        <p
          className={styles.widthLadder}
          aria-label="Project width ladder in CSS pixels"
        >
          {GUIDE_WIDTH_STEPS.map((width, index) => (
            <span key={width}>
              {index > 0 && <i aria-hidden="true">→</i>}
              <code>{width}</code>
            </span>
          ))}
        </p>
        <div className={styles.paired}>
          <div>
            <Subheading level={3}>Inner Cap And Outer Gutters</Subheading>
            <p>
              The outer shell adds two safe gutters to the inner cap, then
              centers that shell. At 1280px, a 1152px inner cap plus two 40px
              gutters makes a 1232px outer shell. The remaining 48px is shared
              equally outside it. Safe-area insets can increase the padding on
              devices that need extra edge protection.
            </p>
          </div>
          <div>
            <Subheading level={3}>A Fluid Base</Subheading>
            <p>
              Below 640px, the inner cap is 512px with 16px gutters. At a 390px
              viewport, that leaves 358px of content. This fluid base avoids
              cramped mobile margins and an awkward shrink when the small-screen
              band begins. Caps limit growth; they are never a minimum width.
            </p>
          </div>
        </div>
        <div
          className={styles.tableScroll}
          tabIndex={0}
          role="region"
          aria-label="Desktop guide column dimensions; scroll horizontally if needed"
        >
          <table>
            <caption>Column dimensions once the contents rail fits</caption>
            <thead>
              <tr>
                <th scope="col">Viewport</th>
                <th scope="col">Inner cap</th>
                <th scope="col">Reading column</th>
                <th scope="col">Gap</th>
                <th scope="col">Contents rail</th>
              </tr>
            </thead>
            <tbody>
              {GUIDE_LAYOUT_BANDS.filter((band) => band.sidebar).map((band) => {
                const rail = Math.max(288, (band.cap - band.gap) / 4);
                return (
                  <tr key={band.min}>
                    <th scope="row">{band.min}px</th>
                    <td>{band.cap}px</td>
                    <td>{band.cap - band.gap - rail}px</td>
                    <td>{band.gap}px</td>
                    <td>{rail}px</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          The rail takes roughly a quarter of the usable columns, with an 18rem
          minimum. At 1024px, the 896px cap holds a 576px reading column, a 32px
          gap and a 288px rail. The rail minimum takes priority at both 1024px
          and 1280px. Increasing the viewport beyond a band’s cap adds
          surrounding space until the next band begins.
        </p>
        <div className={styles.sources}>
          <Source href={sources.maxWidth}>
            Tailwind maximum-width utilities
          </Source>
        </div>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading>Let Content Decide Its Arrangement</Subheading>
        <div className={styles.paired}>
          <div>
            <Subheading level={3}>Wider Grids, Bounded Paragraphs</Subheading>
            <p>
              Extra space belongs to paired steps, specimens, reference cards
              and useful comparisons. Paragraphs keep a comfortable reading
              measure rather than stretching across a large monitor. Long
              headings wrap naturally; examples and tables receive their own
              horizontal scroll region when their structure genuinely needs one.
            </p>
          </div>
          <div>
            <Subheading level={3}>Viewport Shell, Local Components</Subheading>
            <p>
              Use viewport queries for the page’s main column and rail. A card
              nested inside that column has less room than the viewport itself;
              give its children flexible minimums or use a container query when
              their arrangement must follow the card’s own width. Check the
              actual space before adding another column.
            </p>
          </div>
        </div>
        <DeveloperCode
          label="A shortened guide grid"
          language="css"
          code={layoutRecipe}
        />
        <p>
          <code>minmax(0, 3fr)</code> allows the reading column to shrink below
          a long child’s intrinsic width. Pair it with <code>min-width: 0</code>{" "}
          on grid children and local overflow on code blocks. Flexible gaps and
          bounded <code>clamp()</code> typography can smooth the space between
          layout changes without introducing a new breakpoint for every detail.
        </p>
        <div className={styles.sources}>
          <Source href={sources.mdn}>MDN responsive design</Source>
        </div>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading>A Contents Rail With Room To Breathe</Subheading>
        <p>
          Below 1024px, the contents stay in the reading flow. At 1024px and
          above, they move into a separate, background-free right column. The
          rail has no panel fill, blur or colored hover tile. A quiet vertical
          rule, clearly differentiated heading levels and an active marker
          provide orientation while the page canvas supplies the paired text
          contrast.
        </p>
        <div className={styles.paired}>
          <div>
            <Subheading level={3}>Hierarchy You Can Scan</Subheading>
            <p>
              Main topics begin at 16px, subsections at 15px and deeper entries
              at 14px, scaling up on wider layouts. Weight, indentation and
              muted ink reinforce the three levels. Links retain a 44px minimum
              target height. A long title can wrap; it should never force the
              rail into tiny type or push the page sideways.
            </p>
          </div>
          <div>
            <Subheading level={3}>Sticky Within The Guide</Subheading>
            <p>
              The rail stays beside the reading area and stops when the guide’s
              main content ends, before the footer. A tall outline scrolls
              inside its own viewport. Following a nested link opens its
              containing disclosures, updates the native URL fragment and
              preserves browser history. Highlighting the active link scrolls
              only the outline.
            </p>
          </div>
        </div>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading>Test The Gaps, Not Just The Presets</Subheading>
        <p>
          A responsive design must survive the sizes between its named bands.
          Drag the viewport slowly through each transition, then check the
          content most likely to break: a long medication name, an expanded
          disclosure, a code example, a table, a long search result and a short
          landscape window. Check both system color modes and a reduced-motion
          preference.
        </p>
        <div className={styles.paired}>
          <div>
            <Subheading level={3}>A Practical Width Sweep</Subheading>
            <ul>
              <li>Start at 320px and 390px for narrow reading and controls.</li>
              <li>
                Check 639/640 and 767/768px around the inline layout changes.
              </li>
              <li>Check 1023/1024px for the inline-to-rail handoff.</li>
              <li>Check 1279/1280px for the wider cap and column gap.</li>
              <li>
                Check 1535/1536, 1919/1920 and 2559/2560px for the widest
                layouts.
              </li>
              <li>Try intermediate widths and a short viewport height too.</li>
            </ul>
          </div>
          <div>
            <Subheading level={3}>Zoom And Input Are Separate Axes</Subheading>
            <p>
              Increase text to 200% and inspect a 320 CSS-pixel-wide reflow
              equivalent. At a 1280px starting viewport, 400% zoom is a useful
              equivalent check. Keep two-dimensional tables locally scrollable
              while surrounding text reflows. This is a testing target, not a
              claim that a whole application has passed an accessibility audit.
            </p>
            <p>
              A wide screen can still use touch. Keep essential actions
              available without hover, show keyboard focus and gate optional
              hover effects by pointer capability. Test Tab, Enter, native
              fragment links and browser Back as well as clicking with a mouse.
            </p>
          </div>
        </div>
        <div className={styles.sources}>
          <Source href={sources.reflow}>W3C guidance on reflow</Source>
        </div>
      </article>

      <article className={styles.card} data-card-entry>
        <Subheading>Where To Change This System</Subheading>
        <dl className={styles.sourceMap}>
          <div>
            <dt>
              <code>src/lib/guide-responsive.ts</code>
            </dt>
            <dd>
              Named bands, documented caps, gutters and the rail media query.
            </dd>
          </div>
          <div>
            <dt>
              <code>src/components/guide-shell.module.css</code>
            </dt>
            <dd>Guide-only shell width, edge padding and calm page canvas.</dd>
          </div>
          <div>
            <dt>
              <code>src/components/guide-outline.module.css</code>
            </dt>
            <dd>
              Reading/rail grid, sticky boundary, type hierarchy and link
              targets.
            </dd>
          </div>
          <div>
            <dt>
              <code>src/components/guide-outline.tsx</code>
            </dt>
            <dd>
              Outline collection, active location and fragment navigation.
            </dd>
          </div>
        </dl>
        <p className={styles.note}>
          Keep the reference data and CSS in agreement when changing a band.
          Recheck both guides, their footers and one ordinary journal route; a
          guide layout change should not silently widen the rest of the app.
        </p>
      </article>
    </section>
  );
}
