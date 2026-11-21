import { intakeHistoryIndex } from "./intake-history-index";
/** User-recorded route for an individual intake; never inferred from its form. */
export const INTAKE_ROUTE_VALUES = [
  "unspecified",
  "oral",
  "nasal",
  "sublingual",
  "buccal",
  "inhalation",
  "topical",
  "transdermal",
  "rectal",
  "injection",
  "other",
] as const;

export type IntakeRoute = (typeof INTAKE_ROUTE_VALUES)[number];

export const INTAKE_ROUTES = [
  { value: "unspecified", label: "Not specified" },
  { value: "oral", label: "Swallowed" },
  { value: "nasal", label: "Nasal" },
  { value: "sublingual", label: "Sublingual" },
  { value: "buccal", label: "Buccal" },
  { value: "inhalation", label: "Inhalation" },
  { value: "topical", label: "Topical" },
  { value: "transdermal", label: "Transdermal" },
  { value: "rectal", label: "Rectal" },
  { value: "injection", label: "Injection" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: IntakeRoute; label: string }[];

export function isIntakeRoute(value: unknown): value is IntakeRoute {
  return INTAKE_ROUTE_VALUES.some((route) => route === value);
}
import type { Intake } from "./domain";

/** Default new controls from recorded choices, without changing any saved entry. */
export function preferredIntakeRoute(
  medicationId: string,
  intakes: readonly Pick<Intake, "medicationId" | "route" | "takenAt">[],
): IntakeRoute {
  const history = intakeHistoryIndex(intakes).routes.get(medicationId);

  let preferred: IntakeRoute = "oral";
  let count = 0;
  let latest = -Infinity;
  // Stable catalog order breaks a complete tie, independently of input order.
  for (const route of INTAKE_ROUTE_VALUES) {
    const recorded = route === "unspecified" ? undefined : history?.get(route);
    if (
      recorded &&
      (recorded.count > count ||
        (recorded.count === count && recorded.latest > latest))
    ) {
      preferred = route;
      count = recorded.count;
      latest = recorded.latest;
    }
  }
  return preferred;
}

/** Stable catalog ties, with the most frequently recorded routes first. */
export function sortIntakeRoutesByUsage(
  medicationId: string,
  intakes: readonly Pick<Intake, "medicationId" | "route" | "takenAt">[],
  cachedOrder?: readonly IntakeRoute[],
) {
  if (cachedOrder)
    return cachedOrder
      .map((value) => INTAKE_ROUTES.find((route) => route.value === value)!)
      .filter(Boolean);
  const index = intakeHistoryIndex(intakes);
  const usage = medicationId ? index.routes.get(medicationId) : index.allRoutes;
  return INTAKE_ROUTES.map((route, position) => ({
    route,
    position,
    stat: route.value === "unspecified" ? undefined : usage?.get(route.value),
  }))
    .sort(
      (a, b) =>
        (b.stat?.count ?? 0) - (a.stat?.count ?? 0) ||
        (b.stat?.latest ?? -Infinity) - (a.stat?.latest ?? -Infinity) ||
        a.position - b.position,
    )
    .map(({ route }) => route);
}
