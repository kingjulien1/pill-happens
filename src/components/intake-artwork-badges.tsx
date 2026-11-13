"use client";

import { useState, type CSSProperties } from "react";
import { IntakeRouteIcon } from "@/components/intake-route-icon";
import { MedicationTypeIcon } from "@/components/medication-icon";
import { getMedicationBadgePaint } from "@/lib/medication-badge-paint";
import { INTAKE_ROUTES, isIntakeRoute } from "@/lib/intake-routes";
import { getMedicationType, type MedicationType } from "@/lib/medication-types";
import styles from "./medication-card-icon.module.css";

/** One disclosure target keeps both compact badge faces keyboard accessible. */
export function IntakeArtworkBadges({
  form,
  route: value,
  hasIndicators,
  pigment,
  disabled = false,
}: {
  form?: MedicationType;
  route?: string;
  hasIndicators: boolean;
  pigment: string;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const route = isIntakeRoute(value) ? value : "unspecified";
  const formLabel = form ? getMedicationType(form).label : "Medicine";
  const routeLabel = INTAKE_ROUTES.find((item) => item.value === route)!.label;
  const description = `${formLabel}; intake route: ${routeLabel}`;
  const paint = getMedicationBadgePaint(pigment);

  return (
    <button
      type="button"
      className={styles.badgePair}
      style={
        {
          "--medication-badge-surface": paint.surface,
          "--medication-badge-copy": paint.copy,
          "--medication-badge-rim": paint.rim,
        } as CSSProperties
      }
      disabled={disabled}
      aria-label={`${expanded ? "Collapse" : "Expand"} badges: ${description}`}
      aria-expanded={expanded}
      title={description}
      data-intake-artwork-badges
      data-has-indicators={hasIndicators}
      data-expanded={expanded}
      onClick={(event) => {
        event.stopPropagation();
        setExpanded((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
        }
      }}
    >
      <span
        className={styles.pairedBadge}
        aria-hidden="true"
        data-intake-form-badge={form ?? "other"}
        data-medication-form-badge={form ?? "other"}
      >
        <MedicationTypeIcon
          type={form ?? "other"}
          strokeWidth={2.5}
          className={styles.formGlyph}
        />
      </span>
      <span
        className={styles.pairedBadge}
        aria-hidden="true"
        data-intake-route-badge={route}
      >
        <IntakeRouteIcon
          route={route}
          strokeWidth={2.5}
          className={styles.formGlyph}
        />
      </span>
    </button>
  );
}
