import {
  ArrowDownToLine,
  ArrowUpToLine,
  CircleHelp,
  Ellipsis,
  Hand,
  Layers2,
  MessageCircle,
  Pill,
  Syringe,
  Wind,
} from "lucide-react";
import { MedicationGlyph } from "@/components/medication-icon";
import { isIntakeRoute, type IntakeRoute } from "@/lib/intake-routes";

const routeIcons = {
  unspecified: CircleHelp,
  oral: ArrowDownToLine,
  nasal: null,
  sublingual: Pill,
  buccal: MessageCircle,
  inhalation: Wind,
  topical: Hand,
  transdermal: Layers2,
  rectal: ArrowUpToLine,
  injection: Syringe,
  other: Ellipsis,
} as const satisfies Record<IntakeRoute, typeof Pill | null>;

/** The same native route artwork serves recorded intakes and route choices. */
export function IntakeRouteIcon({
  route: value,
  className,
  strokeWidth = 2.25,
}: {
  route?: string;
  className?: string;
  strokeWidth?: number;
}) {
  const route = isIntakeRoute(value) ? value : "unspecified";
  const Icon = routeIcons[route];
  return Icon ? (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={16}
      strokeWidth={strokeWidth}
      className={className}
    />
  ) : (
    <MedicationGlyph icon="svg:nose" className={className} />
  );
}
