import { BrainIcon } from "@phosphor-icons/react/dist/ssr/Brain";
import { MoonStarsIcon } from "@phosphor-icons/react/dist/ssr/MoonStars";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { SunHorizonIcon } from "@phosphor-icons/react/dist/ssr/SunHorizon";
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
import { PillIcon } from "@phosphor-icons/react/dist/ssr/Pill";
import { TagIcon } from "@phosphor-icons/react/dist/ssr/Tag";
import type { MedicationCategory } from "@/lib/medication-categories";
import { cn } from "@/lib/utils";

const icons = {
  benzodiazepine: PillIcon,
  opioid: TagIcon,
  antidepressant: SunHorizonIcon,
  antipsychotic: BrainIcon,
  "sleep-aid": MoonStarsIcon,
  stimulant: LightningIcon,
  "mood-stabilizer": YinYangIcon,
  "pain-relief": HeartbeatIcon,
  "anti-inflammatory": ShieldPlusIcon,
  allergy: FlowerTulipIcon,
  digestive: BowlFoodIcon,
  thyroid: ButterflyIcon,
  hormone: DropIcon,
  cardiovascular: HeartIcon,
  antibiotic: ShieldCheckIcon,
  anticonvulsant: WavesIcon,
  diabetes: DropIcon,
  supplement: LeafIcon,
  other: DotsThreeCircleIcon,
} satisfies Record<MedicationCategory, typeof PillIcon>;

export function MedicationCategoryIcon({
  category,
  className,
}: {
  category: MedicationCategory;
  className?: string;
}) {
  const Icon = icons[category];
  return (
    <Icon
      size={16}
      weight="bold"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    />
  );
}
