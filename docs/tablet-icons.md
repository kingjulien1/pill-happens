# Tablet and dispenser icon library

The library contains **21 tintable outline drawings** and **22 fixed-color medication illustrations**, based on the supplied tablet and dispenser references. Together with the existing 16 generic SVGs, the picker offers 59 local SVG icons. Existing paths and saved identifiers stay stable, including the updated Euthyrox and Levomethasan artwork.

## Source and generated files

```text
src/lib/tablet-icons/
  geometry.ts                 Shared silhouettes, score lines, and vector imprints
  dispenser-geometry.ts       Separate pump-bottle and gel-dispenser silhouettes
  supplied-color-geometry.ts  Exact painted Levomethasan and Testavan artwork
  artwork.ts                  Names, aliases, relative sizes, and fixed palettes
src/lib/icon-names.ts         Component-name search and display-label formatting
src/lib/svg-icon-catalog.ts   Registered local artwork and searchable metadata
src/components/tablet-icons.tsx
                             Native Lucide-compatible outline components
src/components/medication-icon.tsx
                             Shared outline, color, legacy SVG, and emoji renderer
scripts/generate-tablet-icons.ts
                             Deterministic generation and drift checking
public/icons/medications/
  *.svg                      Existing generic artwork
  tablets/                   Stable library path; includes dispenser artwork
    outline/*.svg            Generated currentColor outlines
    color/*.svg              Generated fixed-color tablet artwork
```

Edit the source geometry and artwork definitions, then run:

```sh
npm run icons:tablets
npm run icons:tablets:check
```

The two tablet asset folders are generated outputs. Register a new shape in `geometry.ts`, add its outline and/or color definitions in `artwork.ts`, and regenerate. The catalog derives its searchable entries and labels automatically. Keep persisted IDs stable so existing medications retain their selected icon. The generator checks for missing, changed, or unexpected generated SVG files.

## The three shared round forms

Each form has three usable component names. Alternate names export the same component and find the same search result, keeping the picker free of duplicate drawings.

| Canonical component | Alternate component names       | Form                                      |
| ------------------- | ------------------------------- | ----------------------------------------- |
| `TabletMeridian`    | `TabletBisect`, `TabletEquator` | Normal round tablet with a centered score |
| `TabletPebble`      | `TabletPetite`, `TabletDotlet`  | Significantly smaller plain round tablet  |
| `TabletHalo`        | `TabletPlenum`, `TabletRoundel` | Larger plain round tablet                 |

The names are checked against the installed Lucide names and emoji display labels. The additional outline components are `TabletDualmark`, `TabletSplitlet`, `TabletScorecrest`, `TabletMinidot`, `TabletWideplain`, `TabletWideplainPlus`, `Viagra`, `Euthyrox`, `Tadalafil5`, `Tadalafil10`, `Tramal`, `Testavan`, and `Levomethasan`.

## Flat-color variants

| File/component name                | Display label    | Outline geometry                          | Flat palette |
| ---------------------------------- | ---------------- | ----------------------------------------- | ------------ |
| `bromazepam` / `Bromazepam`        | Bromazepam       | Tablet Meridian                           | Lime 300     |
| `diazepam` / `Diazepam`            | Diazepam         | Tablet Meridian                           | Sky 300      |
| `alprazolam` / `Alprazolam`        | Alprazolam       | Tablet Pebble                             | Blue 300     |
| `valium` / `Valium`                | Valium           | Tablet Halo                               | Zinc 300     |
| `ritalin` / `Ritalin`              | Ritalin          | Tablet Dualmark, A/B imprint              | Zinc 300     |
| `quetialan-100` / `Quetialan100`   | Quetialan 100mg  | Tablet Splitlet                           | Yellow 200   |
| `dominal-forte` / `DominalForte`   | Dominal Forte    | Tablet Scorecrest                         | Red 300      |
| `queatialan-25` / `Queatialan25`   | Queatialan 25mg  | Tablet Minidot                            | Red 400      |
| `queatialan-200` / `Queatialan200` | Queatialan 200mg | Tablet Wideplain                          | Zinc 300     |
| `venlafaxin` / `Venlafaxin`        | Venlafaxin       | Tablet Wideplain Plus                     | Zinc 300     |
| `viagra` / `Viagra`                | Viagra           | Rounded diamond with vector lettering     | Blue 400     |
| `euthyrox` / `Euthyrox`            | Euthyrox         | Round tablet with EM/50 imprint           | Zinc 300     |
| `tadalafil-5` / `Tadalafil5`       | Tadalafil 5mg    | Upright oval with centered 5 imprint      | Amber 400    |
| `tadalafil-10` / `Tadalafil10`     | Tadalafil 10mg   | Same oval with centered 10 imprint        | Blue 600     |
| `tramal` / `Tramal`                | Tramal           | Supplied amber bottle with metering pump  | Amber, cream, silver, green |
| `testavan` / `Testavan`            | Testavan         | Supplied gel dispenser with pump          | Green, charcoal, cream |
| `levomethasan` / `Levomethasan`    | Levomethasan     | Supplied round cross-scored tablet        | Ivory and warm score shading |

Single-pigment variants use fixed sRGB equivalents of the installed Tailwind palette, with `#D4D4D8` for their neutral tablets and transparent score/imprint cutouts. The supplied Tramal, Testavan and Levomethasan illustrations instead preserve their authored painted layers, detail strokes and shading as native vectors, with no raster image, filter or animation.

Tadalafil 5 uses Amber 400 (`#ffb900`); Tadalafil 10 uses a moderately dark Blue 600 (`#155dfc`). Their silhouette is shared, with separate vector numeral paths. Tramal preserves its amber bottle (`#874817`), cream pump/label, silver collar and green stripe. Testavan preserves its green pump (`#86CF83`), charcoal body, cream base and fine gray grip strokes. Levomethasan preserves its ivory face (`#F3EEE3`), lower depth circle and warm diagonal score shading. Catalog pigment metadata describes each illustration's principal color, rather than recoloring its other layers.

The medication names and relative appearances come from the supplied references. Selecting an icon changes appearance only: it does not fill medication names, strengths, quantities, or doses. Imprint text is artwork; the `50` on Euthyrox does not add a strength to its label or medication record.

## SVG and component behavior

Outline assets use Lucide's standard `xmlns`, `width="24"`, `height="24"`, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, and rounded caps/joins. All shapes are flattened and centered in that same viewport. Smaller silhouettes retain their relative size instead of being expanded to fill the frame. The extra Venlafaxin tablet is slightly larger than the Queatialan 200 shape.

Every silhouette is centered at `(12, 12)`, and each vertical tablet score runs through `x=12` with its midpoint at `y=12`. Euthyrox's EM/50 blocks sit on either side of that centered split, straightened from the reference photo. The Tadalafil numerals and Viagra wordmark are centered independently of their bodies; the wider “10” has additional breathing room. Dispensers retain distinct proportions, with Testavan narrower and taller in appearance than the Tramal bottle. All artwork fits the viewport at the app's 2.75 stroke width.

The Levomethasan outline represents four raised wedge-shaped quarters with deep diagonal valleys and finer cardinal crests. That outline is unchanged. Its colored version now uses the supplied tablet's separate face/depth circles and 36-degree rotated score layers. Testavan's colored version retains the supplied non-uniform matrix transform, including the grip stroke scaling. Group transforms are flattened onto the individual painted shapes without changing their appearance. Quartering marks are appearance only and do not set intake quantities.

The React outline exports use `createLucideIcon` and accept the same size, stroke, color, and other SVG props:

```tsx
import { TabletMeridian, TabletBisect, Euthyrox } from "@/components/tablet-icons";

<TabletMeridian size={24} strokeWidth={2} color="currentColor" />
<TabletBisect size={48} strokeWidth={2.75} />
<Euthyrox size={24} />
```

Inside the application, these outlines receive the same 2.75 stroke width and selected medication accent as the other Lucide icons. Colored variants render inline from the same geometry that generates their public SVGs. Single-pigment artwork uses instance-scoped cutout masks; supplied multi-pigment artwork renders its painted layers directly. The color picker still controls the surrounding medication accent; authored artwork colors stay fixed. The preview identifies the fixed palette and selected accent separately.

Outline and filled files can share a basename, as with `viagra.svg` and `euthyrox.svg`, because they live in separate folders. Their stored IDs are distinct: `svg:viagra` and `svg:color:viagra`, for example. Only registered identifiers are accepted by client/server validation.

Levomethasan and Testavan retain their persisted colored IDs, `svg:color:levomethasan` and `svg:color:testavan`, and canonical filenames. All existing selections therefore resolve the supplied artwork through the shared renderer, including archived medication records, the oldest intake rows, selectors, goals and restored notification snapshots. No log data or icon selections are rewritten. Their outline IDs and assets stay unchanged.

`getSvgIconAssetUrl` refreshes browser-cached colored assets using `/icons/medications/tablets/color/levomethasan.svg?v=tablet-3` and `/icons/medications/tablets/color/testavan.svg?v=pump-2`. The unchanged Levomethasan outline retains its earlier `facets-2` revision. Tramal retains `bottle-2`. Revisions change asset requests without changing the IDs stored in journals.

## Finding icons

Compensan has its own `svg:compensan` outline and `svg:color:compensan` colored entry, displayed as **Compensan • SVG** and **Compensan • Color**. Both reuse Iserlohn's capsule and center seam, rotated 45 degrees clockwise around `(12, 12)`; Iserlohn itself stays upright. Their files are `tablets/outline/compensan.svg` and `tablets/color/compensan.svg`.

The fixed Compensan pigment is `#fa5806` (**Red–Orange 500**): the hue of an equal OKLab blend of installed Tailwind Red400 and Orange300, raised to 500-level intensity with a small sRGB gamut adjustment. It is one flat pigment with a transparent center-seam cutout, using the same generator and SVG defaults as the other colored icons.

Existing Compensan medication records receive this icon once, on their next authenticated journal read or write. The saved rotation becomes zero because the geometry already includes the turn. The journal's `appearanceUpdates` marker preserves subsequent manual choices, and the creation cutoff excludes new medications. Every linked intake automatically uses that appearance, regardless of age; orphaned Compensan cards and older restored notification previews also receive the new artwork. This uses the existing atomic repository writes and requires no production credentials in the client or development workspace.

Search recognizes component names, display labels, slugs, aliases, and English/German keywords across local SVGs, Lucide icons, and emoji. Examples:

- `TabletMeridian`, `Tablet Bisect`, or `tablet-equator`
- `Quetialan100`, `Quetialan 100mg`, or `quetialan-100`
- Either `Quetialan` or `Queatialan` spelling for the numbered tablets
- `ViagraColor` or `EuthyroxColor` to find the fixed-color versions
- `HeartHandshake` for Lucide or `CherryBlossom` for emoji
- `Tadalafil5`, `Tadalafil 5mg`, `Tadalafil10Color`, `Tramal`, or `TestavanColor`
- `metered pump`, `dosierpumpe`, or `gel dispenser` for the dispenser artwork
- `Levomethasan`, `LevomethasanColor`, `quarter`, or `kreuzbruchrille` for the four-way scored tablet
- `outline` for the 16 tintable medication forms, `color` for the 17 fixed-color illustrations, or `svg` for all registered local artwork

Display labels capitalize words, replace hyphens with spaces, and append `mg` to numeric parts of tablet artwork names. Numbers in ordinary Lucide icon names keep their existing meaning and labels. Search aliases do not create extra picker entries or change stored icon IDs.

## Metered-pump medication type

Choose **Metered pump** for a liquid pump bottle or gel dispenser. Enter the medication's strength in **mg per pump** and the default number of **pumps per intake**. Intake controls offer 1–4 pump presets and increase/decrease by one pump. Selecting a dispenser icon only changes appearance; medication type and strength remain explicit choices.

New intake records store the counted medication type alongside the name and per-unit strength. Editing a medication later does not relabel an already recorded pump intake as tablets or change its dose. Correcting an intake while keeping its medication preserves that snapshot; switching its medication takes a fresh type/strength snapshot. Older records remain readable without a migration. The existing quantity × strength calculation stays the same; no bottle-volume or drop-to-pump conversion is inferred.
