import {
  Brain,
  CircleEllipsis,
  Droplet,
  Flower2,
  Heart,
  HeartHandshake,
  HeartPulse,
  Leaf,
  MoonStar,
  ShieldCheck,
  ShieldPlus,
  Soup,
  Venus,
  Waves,
} from "lucide-react";
import { BrainIcon } from "@phosphor-icons/react/dist/ssr/Brain";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { YinYangIcon } from "@phosphor-icons/react/dist/ssr/YinYang";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { ShieldPlusIcon } from "@phosphor-icons/react/dist/ssr/ShieldPlus";
import { FlowerTulipIcon } from "@phosphor-icons/react/dist/ssr/FlowerTulip";
import { BowlFoodIcon } from "@phosphor-icons/react/dist/ssr/BowlFood";
import { ButterflyIcon } from "@phosphor-icons/react/dist/ssr/Butterfly";
import { DropIcon } from "@phosphor-icons/react/dist/ssr/Drop";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { WavesIcon } from "@phosphor-icons/react/dist/ssr/Waves";
import { LeafIcon } from "@phosphor-icons/react/dist/ssr/Leaf";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeCircle";
import type { MedicationIndicatorKind } from "@/components/medication-indicator";
import type { MedicationCategory } from "@/lib/medication-categories";

export type GeneralMedicationCategory = Exclude<
  MedicationCategory,
  MedicationIndicatorKind
>;

const lucideIcons = {
  antidepressant: HeartHandshake,
  hormone: Venus,
} as const;

const phosphorIcons = {
  antipsychotic: BrainIcon,
  "sleep-aid": MoonStarsIcon,
  "mood-stabilizer": YinYangIcon,
  "pain-relief": HeartbeatIcon,
  "anti-inflammatory": ShieldPlusIcon,
  allergy: FlowerTulipIcon,
  digestive: BowlFoodIcon,
  thyroid: ButterflyIcon,
  cardiovascular: HeartIcon,
  antibiotic: ShieldCheckIcon,
  anticonvulsant: WavesIcon,
  diabetes: DropIcon,
  supplement: LeafIcon,
  other: DotsThreeCircleIcon,
} satisfies Record<
  Exclude<GeneralMedicationCategory, keyof typeof lucideIcons>,
  typeof BrainIcon
>;

/** Stroke geometry is separate from the library's filled Phosphor artwork. */
const outlineIcons = {
  antipsychotic: Brain,
  "sleep-aid": MoonStar,
  "pain-relief": HeartPulse,
  "anti-inflammatory": ShieldPlus,
  allergy: Flower2,
  digestive: Soup,
  cardiovascular: Heart,
  antibiotic: ShieldCheck,
  anticonvulsant: Waves,
  diabetes: Droplet,
  supplement: Leaf,
  other: CircleEllipsis,
} satisfies Record<
  Exclude<
    GeneralMedicationCategory,
    keyof typeof lucideIcons | "mood-stabilizer" | "thyroid"
  >,
  typeof Brain
>;

/** Glyphs only; MedicationIndicatorMark owns every category's tile and color. */
export function MedicationCategoryGlyph({
  category,
  size = 16,
  strokeWidth = 2.5,
  className,
  outline = false,
}: {
  category: GeneralMedicationCategory;
  size?: number;
  strokeWidth?: number;
  className?: string;
  outline?: boolean;
}) {
  if (category === "antidepressant" || category === "hormone") {
    const Icon = lucideIcons[category];
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        aria-hidden="true"
        focusable="false"
        data-medication-category-glyph={category}
      />
    );
  }

  if (outline) {
    if (category === "mood-stabilizer" || category === "thyroid") {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          focusable="false"
          data-medication-category-glyph={category}
        >
          {category === "mood-stabilizer" ? (
            <>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9" />
              <g strokeWidth={Math.min(strokeWidth, 1.5)}>
                <circle cx="12" cy="7.5" r="1.3" />
                <circle cx="12" cy="16.5" r="1.3" />
              </g>
            </>
          ) : (
            <>
              <path d="M12 9C9 3 3 3 3 8c0 2.5 2 4 4.5 4.5C4 13 4 18 7 18c2 0 4-2 5-5 1 3 3 5 5 5 3 0 3-5-.5-5.5C19 12 21 10.5 21 8c0-5-6-5-9 1Z" />
              <path d="M12 9v5m0-5-2-3m2 3 2-3" />
            </>
          )}
        </svg>
      );
    }

    const Icon = outlineIcons[category];
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        aria-hidden="true"
        focusable="false"
        data-medication-category-glyph={category}
      />
    );
  }

  const Icon = phosphorIcons[category];
  return (
    <Icon
      size={size}
      weight="bold"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-medication-category-glyph={category}
    />
  );
}
