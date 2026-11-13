"use client";

import Link from "next/link";
import { ArrowUpRight, FlaskConical, PencilLine } from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { PageHeading, PageSurface } from "@/components/page-heading";
import { MedicationChoiceIcon } from "@/components/medication-choice-icon";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import {
  MedicationHeroArtwork,
  ReferenceBackLink,
  ReferenceEmpty,
  ReferenceHero,
  ReferenceMedicationCard,
  ReferenceMetrics,
  ReferenceSectionHeading,
  quantitySummary,
} from "@/components/journal-reference-detail-parts";
import { dayKey, formatDay, formatDose } from "@/lib/domain";
import {
  medicationRecordStats,
  sameIngredientMedications,
} from "@/lib/journal-reference-details";
import { INTAKE_ROUTES } from "@/lib/intake-routes";
import {
  getMedicationCategories,
  getMedicationCategory,
} from "@/lib/medication-categories";
import { getMedicationType } from "@/lib/medication-types";
import styles from "./journal-reference-details.module.css";

const ingredientSource =
  "https://www.fda.gov/drugs/generic-drugs/what-approval-process-generic-drugs";

export function MedicationDetailPage({ id }: { id: string }) {
  const { data } = useJournal();
  if (!data) return null;
  const record = medicationRecordStats(data, id);
  const medication = record.medication;
  if (!medication)
    return (
      <div className={styles.page}>
        <ReferenceBackLink href="/medications">
          Medication library
        </ReferenceBackLink>
        <PageHeading
          title="Medication unavailable"
          context="Your saved library"
        />
        <ReferenceEmpty title="This saved definition is no longer here">
          Any recorded intakes remain part of their daily logs. Open Past Days
          to find the history.
        </ReferenceEmpty>
        <Link href="/history" className={styles.action}>
          Open Past Days <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    );
  const ingredient = medication.activeIngredient?.trim();
  const related = ingredient ? sameIngredientMedications(data, ingredient) : [];
  const mostUsed = related[0];
  const others = related.filter((item) => item.id !== medication.id);
  const categories = getMedicationCategories(medication);
  const form = getMedicationType(medication.form);
  const localTime = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: data.settings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  return (
    <div className={styles.page} data-medication-detail={id}>
      <ReferenceBackLink href="/medications">
        Medication library
      </ReferenceBackLink>
      <PageHeading
        title={medication.name}
        context={ingredient || "Active ingredient not set"}
        icon={<FlaskConical />}
        actions={
          <Link
            href={`/medications?medication=${encodeURIComponent(id)}`}
            className={styles.action}
          >
            <PencilLine size={14} aria-hidden="true" />
            Edit
          </Link>
        }
      >
        The saved name, the ingredient behind it, and the history you actually
        recorded.
      </PageHeading>
      <ReferenceHero
        artwork={<MedicationHeroArtwork medication={medication} />}
        eyebrow={
          medication.archived
            ? "Archived saved definition"
            : "Current saved definition"
        }
        title={
          <>
            {formatDose(medication.strengthMg)} mg{" "}
            <span className={styles.unitLabel}>/ {form.unit}</span>
          </>
        }
      >
        {ingredient ? `${medication.name} · ${ingredient}` : medication.name}.{" "}
        {form.label}; default quantity{" "}
        {formatDose(medication.defaultQuantity ?? 1)}{" "}
        {medication.defaultQuantity === 1 ||
        medication.defaultQuantity === undefined
          ? form.unit
          : form.units}
        .
      </ReferenceHero>
      <ReferenceMetrics
        items={[
          { value: record.count, label: "recorded intakes" },
          { value: record.days.length, label: "tracking days" },
          {
            value: formatDose(record.totalMg),
            label: "mg logged · this medication",
          },
        ]}
      />
      {categories.length > 0 && (
        <section
          className={styles.section}
          aria-label="Saved medication categories"
        >
          <ReferenceSectionHeading title="Filed under" />
          <div className={styles.tagRow}>
            {categories.map((category) => (
              <Link
                className={styles.tag}
                key={category}
                href={`/medications/categories/${category}`}
              >
                <MedicationIndicatorMark
                  kind={category}
                  size={24}
                  aria-hidden="true"
                />
                {getMedicationCategory(category).label}
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <PageSurface
        id="active-ingredient"
        className={styles.panel}
        data-card-entry
      >
        <h2 className={styles.sectionTitle}>Active ingredient</h2>
        <p className={styles.ingredientName}>{ingredient || "Not added yet"}</p>
        <p className={styles.body}>
          A medication’s saved name identifies the product in your library. Its
          active ingredient describes the substance responsible for its effect.
          The form—such as a tablet or drops—and strength describe that
          particular preparation.{" "}
          <a href={ingredientSource} target="_blank" rel="noopener noreferrer">
            About ingredients and product names · FDA
          </a>
        </p>
        {ingredient ? (
          <>
            <p className={styles.body}>
              {related.length} saved{" "}
              {related.length === 1 ? "name uses" : "names use"} this ingredient
              label
              {mostUsed ? (
                <>
                  . <strong>{mostUsed.name}</strong> is your most logged
                  matching name
                </>
              ) : null}
              . Your recorded strengths and quantities remain separate for each
              medication.
            </p>
            <div className={styles.inlineActions}>
              <a
                href={`https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(ingredient)}`}
                className={styles.action}
                target="_blank"
                rel="noopener noreferrer"
              >
                Find official product labels{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </>
        ) : (
          <p className={styles.body}>
            Add the ingredient from your product label when editing this
            medication to connect other saved names using it.
          </p>
        )}
      </PageSurface>
      {others.length > 0 && (
        <section
          className={styles.section}
          aria-label="Other medications with this ingredient"
        >
          <ReferenceSectionHeading
            title="Same ingredient label"
            detail="Most logged first"
          />
          {others.map((item) => (
            <ReferenceMedicationCard
              key={item.id}
              record={medicationRecordStats(data, item.id)}
              featured={mostUsed?.id === item.id}
            />
          ))}
        </section>
      )}
      <PageSurface className={styles.panel} data-card-entry>
        <h2 className={styles.sectionTitle}>Your recorded amounts</h2>
        {record.count ? (
          <>
            <p className={styles.body}>
              {quantitySummary(record)} recorded in total. Milligrams use each
              intake’s saved strength and quantity, including earlier strengths.
            </p>
            <dl className={styles.detailList}>
              {record.quantities.map(
                ({ form: value, quantity, unit, units }) => (
                  <div key={value}>
                    <dt>{getMedicationType(value).label}</dt>
                    <dd>
                      {formatDose(quantity)} {quantity === 1 ? unit : units}
                    </dd>
                  </div>
                ),
              )}
              <div>
                <dt>Milligrams, this medication</dt>
                <dd>{formatDose(record.totalMg)} mg</dd>
              </div>
              {record.first && (
                <div>
                  <dt>First tracking day</dt>
                  <dd>
                    {formatDay(
                      dayKey(record.first.takenAt, data.settings.timezone),
                      { weekday: undefined, month: "short", year: "numeric" },
                    )}
                  </dd>
                </div>
              )}
              {record.last && (
                <div>
                  <dt>Latest tracking day</dt>
                  <dd>
                    {formatDay(
                      dayKey(record.last.takenAt, data.settings.timezone),
                      { weekday: undefined, month: "short", year: "numeric" },
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <p className={styles.body}>
            No intakes have been recorded for this medication yet. Saved
            defaults above are separate from actual intake history.
          </p>
        )}
      </PageSurface>
      {record.routes.length > 0 && (
        <PageSurface className={styles.panel} data-card-entry>
          <h2 className={styles.sectionTitle}>Recorded routes</h2>
          <dl className={styles.detailList}>
            {record.routes.map(({ route, count }) => (
              <div key={route}>
                <dt className={styles.route}>
                  <MedicationChoiceIcon kind="route" value={route} />
                  {INTAKE_ROUTES.find((item) => item.value === route)?.label}
                </dt>
                <dd>
                  {count} {count === 1 ? "intake" : "intakes"}
                </dd>
              </div>
            ))}
          </dl>
        </PageSurface>
      )}
      {record.count > 0 && (
        <PageSurface className={styles.panel} data-card-entry>
          <h2 className={styles.sectionTitle}>Latest in your timeline</h2>
          <p className={styles.body}>
            Open an intake to find its exact place in the daily log.
          </p>
          {record.intakes
            .slice(-5)
            .reverse()
            .map((intake) => {
              const day = dayKey(intake.takenAt, data.settings.timezone);
              return (
                <Link
                  key={intake.id}
                  href={`/history/${day}?intake=${encodeURIComponent(intake.id)}`}
                  className={styles.entryLink}
                >
                  <span>
                    <MedicationChoiceIcon
                      kind="route"
                      value={intake.route ?? "unspecified"}
                    />
                    <span>
                      {formatDay(day, { weekday: "short", month: "short" })}{" "}
                      <time dateTime={intake.takenAt}>
                        {localTime(intake.takenAt)}
                      </time>
                    </span>
                  </span>
                  <span>
                    {formatDose(intake.quantity * intake.strengthMg)} mg{" "}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
        </PageSurface>
      )}
    </div>
  );
}
