import { DeveloperCode } from "@/components/developer-code";
import { ActionIcon } from "@/components/action-icon";
import { MedicationChoiceIcon } from "@/components/medication-choice-icon";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import { guideHeadingId } from "@/lib/guide-outline";
import { CONTENT_CLEARANCE_BANDS } from "@/lib/layout-spacing";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-content-spacing.module.css";

const tiers = [
  {
    key: "primary",
    label: "Basic",
    property: "gap",
    token: "--content-min-gap-primary",
    purpose: "Between independently readable groups.",
    example:
      "A medication name and its category rail, or an ingredient/type group and its dose.",
  },
  {
    key: "secondary",
    label: "Secondary",
    property: "secondaryGap",
    token: "--content-min-gap-secondary",
    purpose: "Between connected pieces of one group.",
    example:
      "Neighboring category marks and both inner gaps in compact Type and Categories triggers.",
  },
  {
    key: "tertiary",
    label: "Smallest",
    property: "tertiaryGap",
    token: "--content-min-gap-tertiary",
    purpose: "Inside a miniature icon/caption unit.",
    example:
      "A 12px decorative glyph and 10px caption, or similarly tiny inline metadata.",
  },
] as const;

const rowRecipe = `.card-row {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--content-min-gap-primary);
}

.card-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-indicators {
  display: inline-flex;
  flex: 0 0 auto;
  gap: var(--content-min-gap-secondary);
}

.tiny-icon-caption {
  display: inline-flex;
  align-items: center;
  gap: var(--content-min-gap-tertiary);
  font-size: 10px;
}

.tiny-icon-caption > svg {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
}

/* Existing --content-min-gap consumers use the Basic tier. */`;

const triggerRecipe = `/* Compact Type and Categories triggers. */
.compact-select-trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12px;
  align-items: center;
  column-gap: var(--content-min-gap-secondary);
  padding-inline-start: calc(var(--content-min-gap-secondary) + 6px);
  padding-inline-end: 10px;
}

.select-value {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--content-min-gap-secondary);
}

.select-value-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.select-value > svg,
.select-chevron {
  flex-shrink: 0;
}

.select-chevron {
  width: 12px;
  height: 12px;
}`;

function Heading({ children }: { children: string }) {
  return (
    <h4
      id={guideHeadingId("developer-clearance", children)}
      data-guide-outline-level="3"
      data-guide-outline-label={children}
    >
      {children}
    </h4>
  );
}

export function GuideContentSpacing() {
  const first = CONTENT_CLEARANCE_BANDS[0];
  const last = CONTENT_CLEARANCE_BANDS[CONTENT_CLEARANCE_BANDS.length - 1];

  return (
    <article
      className={`${guideStyles.readingCard} ${styles.reference}`}
      data-content-spacing-reference
    >
      <h3
        id="minimum-content-spacing"
        data-guide-outline-level="2"
        data-guide-outline-label="Three Tiers Of Protected Content Spacing"
      >
        Three Tiers Of Protected Content Spacing
      </h3>
      <p>
        Space explains which things belong together. This shared system gives
        independent content, connected details and the smallest icon/label units
        three closely related gaps. Each tier grows by just half a CSS pixel at
        every viewport breakpoint. A name, value or control keeps a clear edge
        without turning a compact row into a loose collection of pieces.
      </p>

      <Heading>Choose The Relationship First</Heading>
      <p>
        Start with what the reader should recognize as one unit. Use Basic to
        separate that unit from another independent group, Secondary for related
        pieces within it, and Smallest for its tightest pairing. The difference
        stays modest: neighboring tiers are always 1.5px apart, with 3px between
        Basic and Smallest. Choose a tier by the relationship, then use its
        token consistently wherever that relationship repeats.
      </p>
      <div className={styles.tiers}>
        {tiers.map((tier) => (
          <div key={tier.key}>
            <strong>{tier.label}</strong>
            <span className={styles.range}>
              {first[tier.property]}–{last[tier.property]}
              <small> CSS px</small>
            </span>
            <code>{tier.token}</code>
            <p>{tier.purpose}</p>
            <small>{tier.example}</small>
          </div>
        ))}
      </div>
      <p>
        <code>--content-min-gap</code> remains an alias of the Basic token, so
        existing cards retain the same contract. New component rules can name
        their intended tier explicitly. The journal card uses Basic on both
        rows: medication name versus category marks above, and ingredient/type
        versus dose below.
      </p>

      <Heading>Every Breakpoint, Every Tier</Heading>
      <p>
        These are minimum-width viewport bands. Unprefixed values apply below
        640px; each later row replaces all three values from its threshold
        upwards. The table uses CSS pixels, with rem thresholds shown at a 16px
        initial text size. The two widest bands extend the same progression used
        by the guide layouts.
      </p>
      <div
        className={styles.tableScroll}
        tabIndex={0}
        role="region"
        aria-label="Content spacing at all eight viewport bands; scroll horizontally if needed"
      >
        <table>
          <caption>
            All tiers grow by 0.5px at each transition. Basic − Secondary and
            Secondary − Smallest both stay at 1.5px.
          </caption>
          <thead>
            <tr>
              <th scope="col">CSS viewport</th>
              <th scope="col">Starts at</th>
              <th scope="col">Basic</th>
              <th scope="col">Secondary</th>
              <th scope="col">Smallest</th>
            </tr>
          </thead>
          <tbody>
            {CONTENT_CLEARANCE_BANDS.map((band) => (
              <tr key={band.min}>
                <th scope="row">{band.label}</th>
                <td>{band.min === 0 ? "Base" : `${band.min / 16}rem`}</td>
                <td>{band.gap}px</td>
                <td>{band.secondaryGap}px</td>
                <td>{band.tertiaryGap}px</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Heading>Why The Steps Stay Small</Heading>
      <p>
        A wider viewport gives the surrounding layout more room, but a category
        mark still belongs beside the same name. A half-pixel increase makes
        that separation a little calmer at every band while preserving the
        grouping. Across the entire ladder each tier grows by only 3.5px.
        Fractional CSS pixels are intentional layout values; leave them intact
        rather than rounding each component independently.
      </p>
      <p>
        The three tiers share one progression, so their hierarchy never flips at
        a breakpoint. The values are project design choices for compact journal
        rows, selectors and metadata. They are separate from the larger spacing
        rhythm used for page sections and card padding.
      </p>

      <Heading>Live Examples At This Viewport</Heading>
      <p>
        These specimens consume the actual CSS tokens. Resize the viewport
        across a threshold to change their gaps; their text and icons keep the
        same composition. The first example also demonstrates a flexible name
        yielding space to a fixed category rail.
      </p>
      <div className={styles.examples}>
        {tiers.map((tier) => (
          <div
            className={styles.example}
            key={tier.key}
            data-content-spacing-tier={tier.key}
          >
            <div className={styles.exampleHeading}>
              <strong>{tier.label}</strong>
              <code>{tier.token}</code>
            </div>
            <div
              className={`${styles.exampleRow} ${styles[tier.key]} ${tier.key === "secondary" ? styles.compactTrigger : ""}`}
              data-content-spacing-sample
              data-compact-choice-trigger={
                tier.key === "secondary" || undefined
              }
            >
              {tier.key === "primary" ? (
                <>
                  <span
                    className={styles.flexible}
                    title="A deliberately long medication name that yields to its class marks"
                  >
                    A deliberately long medication name that yields to its class
                    marks
                  </span>
                  <span className={`${styles.fixed} ${styles.markers}`}>
                    <MedicationIndicatorMark kind="benzodiazepine" size={22} />
                    <MedicationIndicatorMark kind="opioid" size={22} />
                    <MedicationIndicatorMark kind="stimulant" size={22} />
                  </span>
                </>
              ) : tier.key === "secondary" ? (
                <>
                  <span className={styles.compactValue}>
                    <MedicationChoiceIcon kind="type" value="tablet" />
                    <span className={styles.flexible}>Tablet</span>
                  </span>
                  <ActionIcon name="expand" className={styles.chevron} />
                </>
              ) : (
                <>
                  <ActionIcon name="medications" className={styles.tinyGlyph} />
                  <span className={`${styles.flexible} ${styles.tinyCaption}`}>
                    Tablet
                  </span>
                </>
              )}
            </div>
            <small>{tier.purpose}</small>
          </div>
        ))}
      </div>

      <Heading>Protect The Gap, Then Truncate</Heading>
      <p>
        Reserve the independent value, category group or action first. Keep its
        width and the Basic gap, then give the text the remaining space. A flex
        child needs <code>min-width: 0</code> to shrink below its content width;
        a grid track needs <code>minmax(0, 1fr)</code>. For the shared card’s
        single-line rows, combine that flexible width with hidden text overflow,
        <code> white-space: nowrap</code> and an ellipsis.
      </p>
      <ol>
        <li>
          <strong>Medication row:</strong> category markers retain their size.
          The name truncates before it reaches their protected gap.
        </li>
        <li>
          <strong>Ingredient row:</strong> the dose remains independent. Within
          the ingredient/type group, the compact type badge after the dot yields
          first. Its 25px minimum protects the form icon and a small text
          glimpse; the ingredient yields next when necessary. Both rows stay
          single-line.
        </li>
        <li>
          <strong>Extreme values:</strong> an unusually long numeric group can
          truncate within its own bounded region. Preserve the full value in the
          control’s accessible name and an appropriate text alternative; keep
          titles as an additional pointer aid.
        </li>
      </ol>
      <p>
        An ellipsis changes visual presentation, not the saved medication name
        or dose. Avoid solving a long label by shrinking an icon, removing the
        gap or allowing a third card row. Text in ordinary guide paragraphs can
        wrap naturally; the two-row rule belongs to the card composition.
      </p>

      <Heading>Understand The Three Spaces In A Trigger</Heading>
      <p>
        A selection trigger has an outer inset, an internal icon/label gap and
        clearance before its trailing chevron. Measure them independently:
      </p>
      <dl className={styles.anatomy}>
        <div>
          <dt>Edge → content</dt>
          <dd>
            The compact Type and Categories triggers use Secondary plus 6px for
            the leading inset, and 10px on the trailing side. This padding
            places the first glyph comfortably inside the border; it remains
            independent of the spacing between that glyph and its label.
          </dd>
        </div>
        <div>
          <dt>Icon → label</dt>
          <dd>
            These compact triggers use Secondary between their 20px icon tile
            and label. Give the glyph a fixed size and let the label shrink
            inside the flexible value group. Reserve Smallest for genuinely
            miniature pairs, such as a 12px glyph with a 10px caption.
          </dd>
        </div>
        <div>
          <dt>Value → chevron</dt>
          <dd>
            Compact Type and Categories triggers also use Secondary before their
            trailing chevron. Reserve its grid column or prevent flex shrinking,
            then truncate the value before that gap. Normally sized triggers may
            use Basic when their content needs a wider separation. The chevron
            retains its width as the selected label changes.
          </dd>
        </div>
      </dl>
      <p>
        The Secondary specimen above shows the actual compact trigger anatomy:
        the same tier separates icon from label and value from chevron, with a
        larger leading inset outside both. Related metadata inside an open menu
        row can also use Secondary without borrowing the trigger’s padding. Keep
        each control family’s alignment consistent across its closed, expanded
        and search-result states.
      </p>

      <Heading>Type, Layout And Targets Are Separate Decisions</Heading>
      <p>
        These tokens control small inline relationships. Section margins,
        paragraph spacing, field heights and card padding keep their own
        structural roles. Responsive <code>clamp()</code> can scale a heading’s
        typography between bounded sizes; it does not replace the protected
        spacing ladder or the text’s truncation rules.
      </p>
      <p>
        A 5px Smallest gap does not define a touch target. Interactive controls
        still need their full hit area, readable type and visible keyboard
        focus. Preserve space for the focus outline and avoid clipping it with a
        parent overflow rule. A small decorative icon may sit inside a much
        larger button; measure the interactive box separately from its glyph.
        Keep the same spacing in light and dark appearances rather than using
        color or opacity to compensate for crowded geometry.
      </p>

      <Heading>Viewport Tokens, Local Component Width</Heading>
      <p>
        The CSS viewport chooses the tier values. A compact card inside a
        desktop dialog still receives that desktop band, even if the card is
        narrower than a phone layout. Its text must yield to the reserved gap.
        Browser zoom can change the available CSS viewport and therefore the
        active band; physical screen pixels and device names do not choose it.
      </p>
      <p>
        Container queries can rearrange a local component when its own width
        needs another layout. Keep the shared gap contract through that change.
        In a compact single-line row, flexible tracks and truncation usually
        solve the width constraint. A larger container can have additional free
        space, while the protected distance remains the minimum.
      </p>

      <Heading>Two Recipes, The Same Tokens</Heading>
      <DeveloperCode
        label="Three-tier card content spacing"
        language="css"
        code={rowRecipe}
      />
      <DeveloperCode
        label="Compact Type and Categories trigger spacing"
        language="css"
        code={triggerRecipe}
      />

      <Heading>Writing Tools: One Gap For Every Icon</Heading>
      <p>
        The writing workspace has one deliberately tighter relationship: a row
        of neighboring icon-only tools. A single local token,
        <code> --writer-tool-gap</code>, owns the space between the view toggle,
        save and Done actions, between Help and Download, and between every
        Markdown formatting button. A larger icon, a selected tool or a loading
        spinner never changes this distance. Keeping one rhythm lets the eye
        follow the tools without mistaking a different gap for a different
        group.
      </p>
      <div
        className={styles.tableScroll}
        tabIndex={0}
        role="region"
        aria-label="Writing icon spacing at each viewport band"
      >
        <table>
          <caption>
            One shared adjacent-icon gap, gently increasing and capped at 6px.
          </caption>
          <thead>
            <tr>
              <th scope="col">Viewport band</th>
              <th scope="col">Icon gap</th>
              <th scope="col">Behavior</th>
            </tr>
          </thead>
          <tbody>
            {CONTENT_CLEARANCE_BANDS.map((band, index) => (
              <tr key={band.min}>
                <th scope="row">{band.label}</th>
                <td>{4 + Math.min(index, 4) * 0.5}px</td>
                <td>
                  {index >= 4
                    ? "Capped; wider space belongs to the page."
                    : "The same gap in both action groups and the format rail."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        This is a local tool rhythm, rather than a fourth global content tier.
        Basic, Secondary and Smallest still protect readable text and
        independent content elsewhere. The writing action row uses free space
        between its left and right groups; that separation is intentionally
        flexible. Inside either group, and inside the formatting rail, adjacent
        buttons always share the token. Outer panel padding and the vertical
        pause between rows have their own jobs and must not be substituted for
        the icon gap.
      </p>
      <ul>
        <li>
          <strong>Sizes stay explicit.</strong> Main action and close squares
          are 42px, becoming 44px for coarse pointers. Formatting squares remain
          more compact at 34px, or 38px for coarse pointers. Neither selection
          nor an animated glyph changes those measured boxes. Corner radii
          continue to use the shared control and compact tokens.
        </li>
        <li>
          <strong>Keep the action row readable.</strong> View, Save and Done
          belong together on the left; Help and Download sit on the right. Split
          view joins the left group only from 900px. Buttons contain icons
          alone, with meaningful accessible names and native title hints. The
          view toggle describes the destination; save availability reflects real
          unsaved writing rather than a decorative active state.
        </li>
        <li>
          <strong>Scroll the tools, never wrap them.</strong> The formatting
          rail keeps a single horizontal row. Touch users can swipe it, and
          toolbar arrow keys move focus through offscreen tools. Focus scrolls
          only as far as needed. The dialog itself never gains horizontal
          scrolling. A keyboard outline sits inside each tile so the rail cannot
          clip it.
        </li>
        <li>
          <strong>Use color to explain state.</strong> Formatting tiles have a
          faint fuchsia base; an actual active format uses fuchsia-400 with a
          white glyph. There is no selection border. Active state is derived
          from the current source and selection, including keyboard edits, and
          code regions shield their literal Markdown from false active marks. A
          playful click rebound is separate from that persistent state.
        </li>
        <li>
          <strong>Make motion temporary.</strong> The shared notebook glyph
          morphs between writing and reading without remounting its paths. Save
          changes from disk to orbit to a check and returns after 1.5 seconds.
          All of these effects retain the same button geometry. The panel’s
          moving accent wash uses 14% opacity in light mode and 8% in dark over
          a subtle Violet tint. It pauses when hidden and becomes static for
          reduced motion.
        </li>
      </ul>
      <DeveloperCode
        label="Writing tools share one spacing owner"
        language="css"
        code={`.writing-tools { --writer-tool-gap: 4px; }
.action-group, .formatting-rail { gap: var(--writer-tool-gap); }
.formatting-rail { display: flex; flex-wrap: nowrap; overflow-x: auto; }
@media (min-width: 640px) { .writing-tools { --writer-tool-gap: 4.5px; } }
@media (min-width: 768px) { .writing-tools { --writer-tool-gap: 5px; } }
@media (min-width: 1024px) { .writing-tools { --writer-tool-gap: 5.5px; } }
@media (min-width: 1280px) { .writing-tools { --writer-tool-gap: 6px; } }
/* All wider bands retain 6px. Do not override the groups independently. */`}
      />

      <Heading>Verify The Boundaries And The Difficult Content</Heading>
      <p>
        Start at 320px and 390px, then inspect both sides of every transition:
        639/640, 767/768, 1023/1024, 1279/1280, 1535/1536, 1919/1920 and
        2559/2560px. The intended change at each boundary is only 0.5px in every
        tier. Test intermediate widths, a short landscape viewport and enlarged
        text too.
      </p>
      <ul>
        <li>
          Use a long medication name and ingredient, all three category marks, a
          long selected value, large quantities and a narrow nested preview.
        </li>
        <li>
          Measure the actual boxes, not text shadows or transparent SVG margins.
          Check card-to-marker clearance, icon-to-label distance, chevron
          position and both trigger insets independently.
        </li>
        <li>
          Open and close selects, stacks and dialogs. Confirm that truncation,
          draft text and keyboard focus survive those state changes.
        </li>
        <li>
          Check both color appearances, keyboard navigation, touch and 200%
          text. Essential controls remain usable without hover.
        </li>
      </ul>
      <p className={styles.maintenance}>
        Edit the values in <code>src/app/layout-spacing.css</code> and keep
        <code> src/lib/layout-spacing.ts</code> aligned. The catalog’s
        <code> gap</code> field remains Basic for existing readers;
        <code> secondaryGap</code> and <code>tertiaryGap</code> document the
        other tiers. This guide derives its table from that catalog and its
        specimens from the actual CSS, so review both when changing a band.
      </p>
    </article>
  );
}
