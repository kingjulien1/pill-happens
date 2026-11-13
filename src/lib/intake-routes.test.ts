import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntakeRouteIcon } from "../components/intake-route-icon";
import { MedicationGlyph } from "../components/medication-icon";
import type { Intake } from "./domain";
import {
  INTAKE_ROUTES,
  isIntakeRoute,
  preferredIntakeRoute,
} from "./intake-routes";

const entry = (
  route: Intake["route"],
  takenAt: string,
  medicationId = "medication-a",
): Pick<Intake, "medicationId" | "route" | "takenAt"> => ({
  medicationId,
  route,
  takenAt,
});

test("Swallowed is the displayed oral route without introducing a new stored key", () => {
  assert.equal(
    INTAKE_ROUTES.find(({ value }) => value === "oral")?.label,
    "Swallowed",
  );
  assert.equal(isIntakeRoute("oral"), true);
  assert.equal(isIntakeRoute("swallowed"), false);
});

test("recorded-route artwork stays native and preserves the shared custom nose", () => {
  for (const { value } of INTAKE_ROUTES) {
    const markup = renderToStaticMarkup(
      createElement(IntakeRouteIcon, {
        route: value,
        className: "route-glyph",
      }),
    );
    assert.match(markup, /^<svg\b/);
    assert.match(markup, /viewBox="0 0 24 24"/);
    assert.match(markup, /stroke="currentColor"/);
    assert.match(markup, /aria-hidden="true"/);
    assert.doesNotMatch(markup, /<(?:image|filter|canvas|foreignObject)\b/);
  }
  assert.equal(
    renderToStaticMarkup(
      createElement(IntakeRouteIcon, {
        route: "nasal",
        className: "native-nose",
      }),
    ),
    renderToStaticMarkup(
      createElement(MedicationGlyph, {
        icon: "svg:nose",
        className: "native-nose",
      }),
    ),
  );
  const oral = (strokeWidth?: number) =>
    renderToStaticMarkup(
      createElement(IntakeRouteIcon, { route: "oral", strokeWidth }),
    );
  assert.match(oral(), /stroke-width="2\.25"/);
  assert.match(oral(2.5), /stroke-width="2\.5"/);
});

test("missing and unrecognized recorded routes show Not specified rather than an inferred route", () => {
  const render = (route?: string) =>
    renderToStaticMarkup(createElement(IntakeRouteIcon, { route }));
  const unspecified = render("unspecified");
  for (const value of [undefined, "", "unknown", "tablet", "drops"])
    assert.equal(render(value), unspecified);
  assert.notEqual(render("oral"), unspecified);
  assert.match(unspecified, /lucide-circle-question-mark/);
});

test("new route preferences fall back to oral without any specified medication history", () => {
  assert.equal(preferredIntakeRoute("medication-a", []), "oral");
  assert.equal(
    preferredIntakeRoute("medication-a", [
      entry(undefined, "2026-11-03T10:00:00Z"),
      entry("unspecified", "2026-11-03T11:00:00Z"),
      entry("nasal", "2026-11-03T12:00:00Z", "another-medication"),
      entry("unregistered" as Intake["route"], "2026-11-03T13:00:00Z"),
    ]),
    "oral",
  );
});

test("preferences count records for the medication, allowing a plurality rather than a majority", () => {
  const history = [
    entry("nasal", "2026-11-01T10:00:00Z"),
    entry("nasal", "2026-11-01T11:00:00Z"),
    entry("nasal", "2026-11-01T12:00:00Z"),
    entry("oral", "2026-11-03T10:00:00Z"),
    entry("oral", "2026-11-03T11:00:00Z"),
    entry("sublingual", "2026-11-03T12:00:00Z"),
    entry("sublingual", "2026-11-03T13:00:00Z"),
    ...Array.from({ length: 10 }, () =>
      entry("oral", "2026-11-04T10:00:00Z", "another-medication"),
    ),
  ];
  const original = structuredClone(history);
  assert.equal(preferredIntakeRoute("medication-a", history), "nasal");
  assert.equal(
    preferredIntakeRoute("medication-a", [...history].reverse()),
    "nasal",
  );
  assert.deepEqual(history, original);
});

test("tied counts use the latest taken instant, then stable route order", () => {
  assert.equal(
    preferredIntakeRoute("medication-a", [
      entry("nasal", "2026-11-03T12:00:00Z"),
      entry("oral", "2026-11-03T12:30:00+01:00"),
    ]),
    "nasal",
  );
  const equalInstants = [
    entry("sublingual", "2026-11-03T12:00:00Z"),
    entry("oral", "2026-11-03T13:00:00+01:00"),
    entry("nasal", "2026-11-03T12:00:00Z"),
  ];
  assert.equal(preferredIntakeRoute("medication-a", equalInstants), "oral");
  assert.equal(
    preferredIntakeRoute("medication-a", equalInstants.reverse()),
    "oral",
  );
});

test("invalid old timestamps do not outrank a real instant or destabilize a tie", () => {
  assert.equal(
    preferredIntakeRoute("medication-a", [
      entry("oral", "invalid"),
      entry("nasal", "2026-11-03T12:00:00Z"),
    ]),
    "nasal",
  );
  assert.equal(
    preferredIntakeRoute("medication-a", [
      entry("nasal", "invalid"),
      entry("oral", "invalid"),
    ]),
    "oral",
  );
});
