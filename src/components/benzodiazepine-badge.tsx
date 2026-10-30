import { MedicationClassBadge } from "@/components/medication-class-badge";

export function BenzodiazepineBadge({ className }: { className?: string }) {
  return <MedicationClassBadge kind="benzodiazepine" className={className} />;
}
