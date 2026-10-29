import { createLucideIcon, type IconNode, type LucideIcon } from "lucide-react";
import { TABLET_SHAPES } from "@/lib/tablet-icons/geometry";

/** The same geometry generates the checked-in SVGs and these Lucide components. */
function tabletIcon(shape: keyof typeof TABLET_SHAPES): LucideIcon {
  const nodes = TABLET_SHAPES[shape].nodes.map(
    ([tag, attributes], index) =>
      [tag, { ...attributes, key: `${shape}-${index}` }] as IconNode[number],
  );
  return createLucideIcon(shape, nodes);
}

export const TabletMeridian = tabletIcon("tablet-meridian");
export const TabletPebble = tabletIcon("tablet-pebble");
export const TabletHalo = tabletIcon("tablet-halo");
export const TabletDualmark = tabletIcon("tablet-dualmark");
export const TabletSplitlet = tabletIcon("tablet-splitlet");
export const TabletScorecrest = tabletIcon("tablet-scorecrest");
export const TabletMinidot = tabletIcon("tablet-minidot");
export const TabletWideplain = tabletIcon("tablet-wideplain");
export const TabletWideplainPlus = tabletIcon("tablet-wideplain-plus");
export const Viagra = tabletIcon("viagra");
export const Euthyrox = tabletIcon("euthyrox");
export const Tadalafil5 = tabletIcon("tadalafil-5");
export const Tadalafil10 = tabletIcon("tadalafil-10");
export const Tramal = tabletIcon("tramal");
export const Testavan = tabletIcon("testavan");

/** Searchable alternative names reuse the canonical drawing and component. */
export const TabletBisect = TabletMeridian;
export const TabletEquator = TabletMeridian;
export const TabletPetite = TabletPebble;
export const TabletDotlet = TabletPebble;
export const TabletPlenum = TabletHalo;
export const TabletRoundel = TabletHalo;

export const TABLET_OUTLINE_COMPONENTS = {
  "tablet-meridian": TabletMeridian,
  "tablet-pebble": TabletPebble,
  "tablet-halo": TabletHalo,
  "tablet-dualmark": TabletDualmark,
  "tablet-splitlet": TabletSplitlet,
  "tablet-scorecrest": TabletScorecrest,
  "tablet-minidot": TabletMinidot,
  "tablet-wideplain": TabletWideplain,
  "tablet-wideplain-plus": TabletWideplainPlus,
  viagra: Viagra,
  euthyrox: Euthyrox,
  "tadalafil-5": Tadalafil5,
  "tadalafil-10": Tadalafil10,
  tramal: Tramal,
  testavan: Testavan,
} satisfies Record<keyof typeof TABLET_SHAPES, LucideIcon>;
