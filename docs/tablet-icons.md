# Tablet and dispenser icon library

The library contains **15 tintable outline drawings** and **16 fixed-color medication illustrations**, based on the supplied tablet and dispenser references. Together with the existing 12 generic SVGs, the picker offers 43 local SVG icons. Existing paths and saved identifiers stay stable, including the updated Euthyrox artwork.

## Source and generated files

```text
src/lib/tablet-icons/
  geometry.ts                 Shared silhouettes, score lines, and vector imprints
  dispenser-geometry.ts       Separate pump-bottle and gel-dispenser silhouettes
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

The names are checked against the installed Lucide names and emoji display labels. The additional outline components are `TabletDualmark`, `TabletSplitlet`, `TabletScorecrest`, `TabletMinidot`, `TabletWideplain`, `TabletWideplainPlus`, `Viagra`, `Euthyrox`, `Tadalafil5`, `Tadalafil10`, `Tramal`, and `Testavan`.

## Flat-color variants

| File/component name                | Display label    | Outline geometry                      | Flat palette |
| ---------------------------------- | ---------------- | ------------------------------------- | ------------ |
| `bromazepam` / `Bromazepam`        | Bromazepam       | Tablet Meridian                       | Lime 300     |
| `diazepam` / `Diazepam`            | Diazepam         | Tablet Meridian                       | Sky 300      |
| `alprazolam` / `Alprazolam`        | Alprazolam       | Tablet Pebble                         | Blue 300     |
| `valium` / `Valium`                | Valium           | Tablet Halo                           | Zinc 300     |
| `ritalin` / `Ritalin`              | Ritalin          | Tablet Dualmark, A/B imprint          | Zinc 300     |
| `quetialan-100` / `Quetialan100`   | Quetialan 100mg  | Tablet Splitlet                       | Yellow 200   |
| `dominal-forte` / `DominalForte`   | Dominal Forte    | Tablet Scorecrest                     | Red 300      |
| `queatialan-25` / `Queatialan25`   | Queatialan 25mg  | Tablet Minidot                        | Red 400      |
| `queatialan-200` / `Queatialan200` | Queatialan 200mg | Tablet Wideplain                      | Zinc 300     |
| `venlafaxin` / `Venlafaxin`        | Venlafaxin       | Tablet Wideplain Plus                 | Zinc 300     |
| `viagra` / `Viagra`                | Viagra           | Rounded diamond with vector lettering | Blue 400     |
| `euthyrox` / `Euthyrox`            | Euthyrox         | Round tablet with EM/50 imprint       | Zinc 300     |
| `tadalafil-5` / `Tadalafil5`       | Tadalafil 5mg    | Upright oval with centered 5 imprint  | Amber 400    |
| `tadalafil-10` / `Tadalafil10`     | Tadalafil 10mg   | Same oval with centered 10 imprint    | Blue 600     |
| `tramal` / `Tramal`                | Tramal           | Shoulder bottle with metering pump    | Amber 700    |
| `testavan` / `Testavan`            | Testavan         | Slender gel dispenser with pump       | Zinc 300     |

Colors use static sRGB equivalents of the installed Tailwind palette. All neutral tablets use the specifically requested `#D4D4D8`. Every filled SVG has one visible paint color; score lines and imprints are transparent cutouts. There are no shadows, highlights, gradients, textures, or photographic irregularities in the artwork.

Tadalafil 5 uses Amber 400 (`#ffb900`); Tadalafil 10 uses a moderately dark Blue 600 (`#155dfc`). Their silhouette is shared, with separate vector numeral paths. Tramal uses Amber 700 (`#bb4d00`) for its simplified amber bottle, including its pump. Testavan uses the same neutral Zinc 300 as the white tablets. Both dispensers keep a single flat pigment with transparent collar and label details, rather than reproducing photographic packaging text or multiple materials.

The medication names and relative appearances come from the supplied references. Selecting an icon changes appearance only: it does not fill medication names, strengths, quantities, or doses. Imprint text is artwork; the `50` on Euthyrox does not add a strength to its label or medication record.

## SVG and component behavior

Outline assets use Lucide's standard `xmlns`, `width="24"`, `height="24"`, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, and rounded caps/joins. All shapes are flattened and centered in that same viewport. Smaller silhouettes retain their relative size instead of being expanded to fill the frame. The extra Venlafaxin tablet is slightly larger than the Queatialan 200 shape.

Every silhouette is centered at `(12, 12)`, and each straight tablet score runs vertically through `x=12` with its midpoint at `y=12`. Euthyrox's EM/50 blocks sit on either side of that centered split, straightened from the reference photo. The Tadalafil numerals and Viagra wordmark are centered independently of their bodies; the wider “10” has additional breathing room. Dispensers retain distinct proportions, with Testavan narrower and taller in appearance than the Tramal bottle. All artwork fits the viewport at the app's 2.75 stroke width.

The React outline exports use `createLucideIcon` and accept the same size, stroke, color, and other SVG props:

```tsx
import { TabletMeridian, TabletBisect, Euthyrox } from "@/components/tablet-icons";

<TabletMeridian size={24} strokeWidth={2} color="currentColor" />
<TabletBisect size={48} strokeWidth={2.75} />
<Euthyrox size={24} />
```

Inside the application, these outlines receive the same 2.75 stroke width and selected medication accent as the other Lucide icons. Filled variants render their generated SVG file without a tint, mask, or filter in the shared glyph renderer. The color picker still controls their surrounding medication accent; the tablet pigment stays fixed. The preview identifies the fixed palette and the selected accent separately.

Outline and filled files can share a basename, as with `viagra.svg` and `euthyrox.svg`, because they live in separate folders. Their stored IDs are distinct: `svg:viagra` and `svg:color:viagra`, for example. Only registered identifiers are accepted by client/server validation.

## Finding icons

Search recognizes component names, display labels, slugs, aliases, and English/German keywords across local SVGs, Lucide icons, and emoji. Examples:

- `TabletMeridian`, `Tablet Bisect`, or `tablet-equator`
- `Quetialan100`, `Quetialan 100mg`, or `quetialan-100`
- Either `Quetialan` or `Queatialan` spelling for the numbered tablets
- `ViagraColor` or `EuthyroxColor` to find the fixed-color versions
- `HeartHandshake` for Lucide or `CherryBlossom` for emoji
- `Tadalafil5`, `Tadalafil 5mg`, `Tadalafil10Color`, `Tramal`, or `TestavanColor`
- `metered pump`, `dosierpumpe`, or `gel dispenser` for the dispenser artwork
- `outline` for the 15 tintable medication forms, `color` for the 16 fixed-color illustrations, or `svg` for all registered local artwork

Display labels capitalize words, replace hyphens with spaces, and append `mg` to numeric parts of tablet artwork names. Numbers in ordinary Lucide icon names keep their existing meaning and labels. Search aliases do not create extra picker entries or change stored icon IDs.

## Metered-pump medication type

Choose **Metered pump** for a liquid pump bottle or gel dispenser. Enter the medication's strength in **mg per pump** and the default number of **pumps per intake**. Intake controls offer 1–4 pump presets and increase/decrease by one pump. Selecting a dispenser icon only changes appearance; medication type and strength remain explicit choices.

New intake records store the counted medication type alongside the name and per-unit strength. Editing a medication later does not relabel an already recorded pump intake as tablets or change its dose. Correcting an intake while keeping its medication preserves that snapshot; switching its medication takes a fresh type/strength snapshot. Older records remain readable without a migration. The existing quantity × strength calculation stays the same; no bottle-volume or drop-to-pump conversion is inferred.
