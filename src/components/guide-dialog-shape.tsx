import { DeveloperCode } from "@/components/developer-code";
import { ActionIcon } from "@/components/action-icon";
import { developerSource } from "@/lib/developer-guide";
import { guideHeadingId } from "@/lib/guide-outline";
import guideStyles from "./developer-guide.module.css";
import styles from "./guide-dialog-shape.module.css";

const tiers = [
  {
    name: "Surface",
    value: 21,
    token: "--dialog-radius-surface",
    className: "surfaceSample",
    use: "Dialog shells, substantial inner panels and menu surfaces.",
    reason:
      "The same outer curve as the intake card and grouped intake container. A spacious frame stays recognizably rectangular.",
  },
  {
    name: "Control",
    value: 12,
    token: "--dialog-radius-control",
    className: "controlSample",
    use: "Standard 40px fields, selects, the amount-stepper shell, time reset and close controls.",
    reason:
      "A clear, rounded rectangle at control height, with enough straight edge to avoid the capsule silhouette.",
  },
  {
    name: "Compact",
    value: 8,
    token: "--dialog-radius-compact",
    className: "compactSample",
    use: "28px inset amount buttons, 32px quantity presets, compact menu choices and small supporting actions.",
    reason:
      "The same visual family at a smaller scale. Less curvature leaves the small control’s content and edges easy to recognize.",
  },
] as const;

const tokenRecipe = `/* Surface curvature follows the existing journal card. */
--dialog-radius-surface: var(--intake-card-radius); /* 21px */
--dialog-radius-control: 12px;
--dialog-radius-compact: 8px;

/* Pick a role; keep height and padding independent. */
.dialog-panel {
  border-radius: var(--dialog-radius-surface);
}

.dialog-input {
  height: 40px;
  border-radius: var(--dialog-radius-control);
}

.amount-stepper {
  box-sizing: border-box;
  height: 40px;
  padding: 5px;
  border: 1px solid var(--input);
  border-radius: var(--dialog-radius-control);
}

.amount-stepper-button {
  width: 28px;
  height: 28px;
  border-radius: var(--dialog-radius-compact);
}

.quantity-preset {
  height: 32px;
  border-radius: var(--dialog-radius-compact);
}`;

const nestedRecipe = `/* Concentric layers share a center of curvature. */
.close-target {
  width: 44px;
  height: 44px;
  border-radius: var(--dialog-radius-control); /* 12px */
}

.close-target::before {
  position: absolute;
  inset: 4px;
  border-radius: max(0px, calc(var(--dialog-radius-control) - 4px));
  /* The 36px painted tile has an 8px radius. */
}

/* General rule for a genuinely inset rounded layer:
   inner radius = max(0px, outer radius - total inset).
   Use the layer's actual border/padding inset, not its text gap. */`;

function Heading({ children }: { children: string }) {
  return (
    <h4
      id={guideHeadingId("developer-dialog-shape", children)}
      data-guide-outline-level="3"
      data-guide-outline-label={children}
    >
      {children}
    </h4>
  );
}

/** Static geometry reference; no specimen can change a journal or open a form. */
export function GuideDialogShape() {
  return (
    <article
      className={`${guideStyles.readingCard} ${styles.reference}`}
      data-dialog-shape-reference
    >
      <h3
        id="dialog-corner-radius"
        data-guide-outline-level="2"
        data-guide-outline-label="Dialog Corners & Nested Shapes"
      >
        Dialog Corners &amp; Nested Shapes
      </h3>
      <p>
        Dialogs use one family of softly rounded rectangles. The journal’s
        existing <strong>21px intake-card corner</strong> is the reference for
        the outer shell, grouped card containers and substantial dialog
        surfaces. Smaller controls express that same shape with less radius,
        rather than becoming fully rounded pills. The result stays consistent
        from an Edit Intake stepper to a medication picker or writing dialog.
      </p>
      <p>
        Consistency means a shared rule and recognizable silhouette. It does not
        mean giving a 32px choice and a spacious dialog the same raw number.
        Their different heights need three deliberate roles:{" "}
        <strong>21px</strong> for a surface, <strong>12px</strong> for a
        standard control and <strong>8px</strong> for a compact choice.
      </p>

      <Heading>The Shape In Context</Heading>
      <p>
        This static specimen consumes the dialog radius tokens. Its controls
        retain the real 40px field, 28px inset-button and 32px preset heights,
        so the difference in curvature can be judged at the scale used by the
        form. The frame uses the same 21px value as an intake card. These
        examples illustrate geometry and do not submit or edit anything.
      </p>
      <div
        className={styles.specimen}
        role="img"
        aria-label="Rounded-rectangle specimen: 21 pixel outer frame, 12 pixel corners on 40 pixel fields, and 8 pixel corners on inset 28 pixel amount buttons and 32 pixel quantity choices. Amount Taken shows 0.5 tablets and a calculated 3 milligrams."
        data-dialog-shape-sample="surface"
      >
        <div className={styles.specimenHeading}>
          <span>
            <strong>Edit Intake</strong>
            <small>One shape family</small>
          </span>
          <span className={styles.closeTarget} data-dialog-shape-sample="close">
            <ActionIcon name="close" className="size-[18px]" />
          </span>
        </div>
        <span className={styles.fieldLabel}>Medication</span>
        <span className={styles.input} data-dialog-shape-sample="control">
          <span>Example medication</span>
          <ActionIcon name="expand" className="size-3.5" />
        </span>
        <span className={styles.fieldLabel}>Amount Taken</span>
        <div className={styles.stepper} data-dialog-shape-sample="control">
          <span className={styles.stepperAction}>
            <ActionIcon name="subtract" />
          </span>
          <span className={styles.amountContent}>
            <span className={styles.amountValue}>0.5</span>
            <small>tablets</small>
            <i aria-hidden="true">·</i>
            <span className={styles.amountDose}>
              3 <small>mg</small>
            </span>
          </span>
          <span className={styles.stepperAction}>
            <ActionIcon name="add" />
          </span>
        </div>
        <div className={styles.presets}>
          {["¼", "½", "1", "2"].map((value) => (
            <span
              key={value}
              className={value === "½" ? styles.selectedPreset : undefined}
              data-dialog-shape-sample="compact"
            >
              {value}
            </span>
          ))}
        </div>
        <span className={styles.specimenCaption}>
          21px frame <i aria-hidden="true">·</i> 12px controls
          <i aria-hidden="true">·</i> 8px choices
        </span>
      </div>

      <Heading>Choose A Radius By Role</Heading>
      <div className={styles.tiers}>
        {tiers.map((tier) => (
          <section key={tier.name} className={styles.tier}>
            <div className={styles.tierTop}>
              <strong>{tier.name}</strong>
              <span className={styles.value}>
                {tier.value}
                <small>px</small>
              </span>
            </div>
            <span className={styles[tier.className]} aria-hidden="true" />
            <code>{tier.token}</code>
            <p>{tier.use}</p>
            <small>{tier.reason}</small>
          </section>
        ))}
      </div>
      <dl className={styles.anatomy}>
        <div>
          <dt>Surface → 21px</dt>
          <dd>
            The dialog or drawer’s free outer corners, substantial nested panels
            and menu surfaces share the card’s curve. Accent save actions use
            the proportional action recipe below, with their face, animated edge
            and glow following the same effective contour.
          </dd>
        </div>
        <div>
          <dt>Control → 12px</dt>
          <dd>
            Medication, Intake Route, Amount Taken, date and time use the same
            standard control shape. Amount Taken’s outer shell contains its
            editable quantity, unit, calculated mg dose and smaller inset
            buttons. The time-reset button and close hit area retain the 12px
            role. A square control keeps its glyph centered.
          </dd>
        </div>
        <div>
          <dt>Compact → 8px</dt>
          <dd>
            The amount field’s 28px minus/plus buttons use 8px corners, as do
            its 32px quantity presets. Menu rows, small secondary actions and
            compact choices follow the same smaller role. A selected item keeps
            its normal shape; selection is expressed through its fill, label and
            checkmark, not a new radius or selection border.
          </dd>
        </div>
      </dl>
      <DeveloperCode
        label="Dialog radius roles"
        language="css"
        code={tokenRecipe}
      />
      <p>
        The amount shell’s 1px border and 5px padding leave exactly 28px for
        each inset button: <code>40 − 2 × 1 − 2 × 5 = 28</code>. Each button has
        the same clearance at its outer side, top and bottom; a centered 14px
        icon keeps the smaller action legible. Quantity and calculated dose
        share the central reading row, for example{" "}
        <strong>0.5 tablets · 3 mg</strong> for a 6 mg tablet. The quantity
        remains editable; the mg amount is a calculated companion.
      </p>

      <Heading>Why One Raw Value Would Become A Pill</Heading>
      <p>
        A corner radius is limited by the box that contains it. With uniform
        corners, a requested 21px radius on a 40px-high field is reduced by the
        browser to 20px: half the height. A 32px-high choice reaches the same
        limit at 16px. Both shapes become capsules even though their class name
        may suggest an ordinary rounded rectangle.
      </p>
      <div className={styles.comparison}>
        <div>
          <span className={styles.capsule} aria-hidden="true" />
          <strong>21px requested / 40px high</strong>
          <small>Clamped to a capsule at 20px.</small>
        </div>
        <div>
          <span className={styles.rectangle} aria-hidden="true" />
          <strong>12px requested / 40px high</strong>
          <small>Rounded corners with a readable straight edge.</small>
        </div>
      </div>
      <p>
        The 12px standard role leaves 16px of straight vertical edge on a 40px
        control; the 8px compact role leaves the same 16px on a 32px choice.
        This shared proportion makes the controls feel related without
        flattening every corner or reproducing the old pill shape. Large
        surfaces have enough height to use the full 21px reference naturally.
      </p>

      <Heading>Insets Keep Nested Corners Concentric</Heading>
      <p>
        A border, inner face or inset background is part of the same shape. Its
        corner should follow the outer curve at a smaller radius. Use
        <code> inner radius = max(0, outer radius − inset)</code>, where inset
        is the actual distance from the outer edge to that layer. Do not give
        every stacked paint layer the full outer radius: that pinches the
        corners and can make an animated rim look uneven.
      </p>
      <div className={styles.nestedExample}>
        <span className={styles.closeTarget} aria-hidden="true">
          <ActionIcon name="close" className="size-[18px]" />
        </span>
        <div>
          <strong>44px target / 12px outer radius</strong>
          <p>
            A 4px inset creates a 36px painted tile with an 8px radius. The
            target remains 44px; only the quiet background sits farther in.
          </p>
        </div>
      </div>
      <p>
        The same calculation applies to a 21px frame with a 4px inner layer: its
        concentric inner curve is 17px. That derived value is geometry, rather
        than a fourth shape tier to reuse on unrelated components. Border width,
        inset and radius should come from the same component recipe so a later
        size change keeps them coordinated.
      </p>
      <DeveloperCode
        label="Concentric close-control geometry"
        language="css"
        code={nestedRecipe}
      />

      <Heading>Radius, Padding And Clearance Are Independent</Heading>
      <p>
        Radius describes the boundary. Padding positions content inside it.
        Protected content spacing separates neighboring groups. Changing one
        does not automatically change either of the others. Keep the existing
        field heights, left insets, text alignment and minimum-gap tokens when
        applying the new curve; increasing padding to disguise an oversized
        radius wastes room without fixing the shape.
      </p>
      <p>
        Equally inset inner paint uses concentric corners, but a normal field
        inside a padded dialog is an independent control. Choose its 12px role
        rather than subtracting the dialog’s entire content padding from 21px.
        The nested-radius equation belongs to aligned layers sharing one
        outline, not every descendant in the DOM. A text link can remain
        visually unboxed while retaining an appropriate keyboard focus area.
      </p>

      <Heading>One Policy Across Dialogs And Portaled Menus</Heading>
      <p>
        Use the shared dialog and drawer primitives for the shell, then the
        radius roles for their controls and nested panels. The policy applies to
        intake and medication forms, goals, preferences, evening check-ins, the
        writing space and the guide’s color inspector. A nested dialog should
        not introduce a different corner system merely because it has a
        different size or purpose.
      </p>
      <p>
        Selects and category menus can render in a portal outside the dialog’s
        DOM subtree. Their menu surface and choice rows need the shared roles
        explicitly, rather than relying only on descendant selectors. Closed
        triggers, open menus, selected rows and search results should remain
        part of the same family. Reusable button paint must also consume the
        effective radius so its face, animated edge and glow do not disagree.
        Dialog roots provide <code>--dialog-action-radius</code> for layered
        actions that follow the surface role. Accent supplies its own
        height-proportional default, so it does not inherit a fixed 21px corner
        merely by sitting inside a dialog. A compact supporting button can use
        the shared
        <code> --dialog-button-radius</code> override or its compact corner
        marker; it does not need a new hardcoded corner value.
      </p>
      <p>
        Prefer these semantic tokens to a new local <code>rounded-full</code>, a
        large inherited utility or an unrelated inline radius. The generated
        theme’s <code>--radius: 1rem</code> remains the general Tailwind base;
        the dialog roles are the explicit policy for dialog geometry. Do not
        change that global base to fix one form, because unrelated pages can
        depend on it. When a caller chooses an explicit component radius, keep
        that effective value attached to all of its paint layers.
      </p>

      <Heading>Responsive Layout Does Not Need New Corners</Heading>
      <p>
        The three radius values stay fixed across the guide’s viewport bands. A
        wider screen can change a dialog’s available width, padding or
        arrangement; it does not need a larger curve on the same 40px field.
        Light and dark modes share the same dimensions, too. Color and
        translucency distinguish their surfaces without moving an edge.
      </p>
      <p>
        Accent is the deliberate proportional exception for a larger action. Its
        fixed intake-card/action design reference is 80px high with 21px
        corners, so the shared ratio is <code>21 / 80 = 0.2625</code>. Today’s
        shorter 74px action uses that ratio for its 19.425px corners; it does
        not change Accent’s reference. Default Accent height grows from 72px
        through 0.75px steps to a 75.75px cap; its radius follows{" "}
        <code>actual height × 0.2625</code>, from 18.9px to 19.884375px. That
        keeps the same silhouette as the action grows instead of introducing
        another fixed radius tier. The outer frame, rim and aura use one
        effective value, while the face inside a 1.5px inset uses
        <code> outer radius − 1.5px</code>. The explicit radius API remains
        available for a deliberate caller choice, with all layers following it.
        The inherited dialog surface token does not override this default.
        Compare the live specimens and computed band values in the{" "}
        <a
          className={guideStyles.textLink}
          href={`#${guideHeadingId("developer-buttons", "Eight Layouts, Six Size Steps")}`}
        >
          button size reference
        </a>
        .
      </p>
      <p>
        Preserve genuinely functional shapes: a radio marker, switch thumb,
        decorative dot, symbol artwork and a drawer’s slim drag handle are still
        circles or capsules where their role requires it. A drawer edge attached
        to the viewport stays square at that attachment while its free top
        corners follow the 21px surface role. These exceptions express function;
        they are not alternate input or button styles.
      </p>

      <Heading>Review The Rendered Shape</Heading>
      <ol>
        <li>
          <strong>Check the final CSS value.</strong> Inspect the computed
          radius on the actual dialog, field, stepper, preset and selected menu
          row. A source utility can be overridden by a component module, an
          inline style or a generated radius token.
        </li>
        <li>
          <strong>Inspect every state.</strong> Open, selected, disabled,
          focused and restored-draft states keep the same geometry. Native
          date/time text should remain vertically centered with its intended
          left inset; rounding must not clip an AM/PM segment or a focus ring.
        </li>
        <li>
          <strong>Check small and spacious layouts.</strong> Include narrow
          phone widths, desktop dialogs, both appearances and portaled menus.
          Keyboard focus and the close button’s hit area remain independent of
          the visible background tile.
        </li>
        <li>
          <strong>Follow the border through motion.</strong> The inside face and
          moving border should share a contour. Preserve the button’s intended
          field animation and clipping boundaries; corner unification does not
          require altering its colors, motion or layer order.
        </li>
      </ol>
      <p className={styles.maintenance}>
        Start in{" "}
        <a
          href={developerSource("src/app/dialog-shape.css")}
          target="_blank"
          rel="noreferrer"
        >
          shared radius tokens
        </a>
        , then inspect the{" "}
        <a
          href={developerSource("src/components/responsive-modal.tsx")}
          target="_blank"
          rel="noreferrer"
        >
          responsive shell
        </a>{" "}
        and the{" "}
        <a
          href={developerSource("src/components/dialog-close.module.css")}
          target="_blank"
          rel="noreferrer"
        >
          close-control layers
        </a>
        . Keep this reference, its specimen and the owning component recipes in
        sync when the shared policy changes.
      </p>
    </article>
  );
}
