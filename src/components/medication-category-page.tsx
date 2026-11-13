"use client";

import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { useJournal } from "@/components/journal-provider";
import { PageHeading, PageSurface } from "@/components/page-heading";
import { MedicationIndicatorMark } from "@/components/medication-indicator-mark";
import {
  ReferenceBackLink,
  ReferenceEmpty,
  ReferenceHero,
  ReferenceMedicationCard,
  ReferenceMetrics,
  ReferenceSectionHeading,
} from "@/components/journal-reference-detail-parts";
import {
  categoryRecordDetails,
  sameIngredientMedications,
} from "@/lib/journal-reference-details";
import {
  MEDICATION_CATEGORIES,
  getMedicationCategories,
  getMedicationCategory,
  type MedicationCategory,
} from "@/lib/medication-categories";
import styles from "./journal-reference-details.module.css";
import { MEDICATION_CATEGORY_NOTES } from "@/lib/medication-category-notes";

/** Category membership is exactly the user's saved metadata, across all dates. */
export function MedicationCategoryPage({
  category,
}: {
  category: MedicationCategory;
}) {
  const { data } = useJournal();
  if (!data) return null;
  const metadata = getMedicationCategory(category);
  const note = MEDICATION_CATEGORY_NOTES[category];
  const details = categoryRecordDetails(data, category);
  const archived = details.medications.filter(
    (medication) => medication.archived,
  ).length;
  const otherCategories = MEDICATION_CATEGORIES.filter(
    (item) =>
      item.value !== category &&
      data.medications.some((medication) =>
        getMedicationCategories(medication).includes(item.value),
      ),
  );
  return (
    <div className={styles.page} data-category-detail={category}>
      <ReferenceBackLink href="/medications">
        Medication library
      </ReferenceBackLink>
      <PageHeading
        title={metadata.label}
        context="Your medication categories"
        icon={<Layers3 />}
      >
        A little order for a lot of history. Every medication you saved with
        this label, with its own amounts and context.
      </PageHeading>
      <ReferenceHero
        artwork={<MedicationIndicatorMark kind={category} size={76} />}
        eyebrow="One of your saved categories"
        title={metadata.label}
      >
        {details.medications.length
          ? `${details.medications.length} saved ${details.medications.length === 1 ? "medication" : "medications"}${archived ? `, including ${archived} archived` : ""}. Follow a name to its ingredients, recorded routes and full history.`
          : "No medications carry this label yet. You can add it under Categories when editing a medication."}
      </ReferenceHero>
      <ReferenceMetrics
        items={[
          { value: details.medications.length, label: "saved medications" },
          { value: details.count, label: "recorded intakes" },
          { value: details.days.length, label: "tracking days" },
        ]}
      />
      <PageSurface className={styles.panel} data-card-entry>
        <h2 className={styles.sectionTitle}>About this category</h2>
        <p className={styles.body}>
          {note.overview}
          {note.source && (
            <>
              {" "}
              <a
                href={note.source.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {note.source.title}
              </a>
            </>
          )}
        </p>
        <p className={styles.body}>
          In your journal, <strong>{metadata.label}</strong> is a category you
          assign to medications. A category can include several saved names and
          active ingredients; a medication can carry several categories. Tablet,
          capsule or drops describe its form separately.
        </p>
        <p className={styles.body}>
          These records follow your current saved labels throughout your
          history. The amounts below stay with each medication, so different
          medicines and units keep their own meaning.
        </p>
      </PageSurface>
      <section
        className={styles.section}
        aria-label="Medications in this category"
      >
        <ReferenceSectionHeading
          title="Your medications"
          detail="Most logged first"
        />
        {details.records.length ? (
          details.records.map((record) => (
            <ReferenceMedicationCard
              key={record.medicationId}
              record={record}
            />
          ))
        ) : (
          <ReferenceEmpty title="A category waiting for its first name">
            Choose this category in a medication’s saved definition. Its
            existing intakes will appear here too.
          </ReferenceEmpty>
        )}
      </section>
      {details.ingredients.length > 0 && (
        <PageSurface className={styles.panel} data-card-entry>
          <h2 className={styles.sectionTitle}>Ingredients, connected</h2>
          <p className={styles.body}>
            Follow an ingredient to the most logged saved name that uses it. The
            linked page also gathers your other medications with the same
            ingredient label.
          </p>
          <div className={styles.tagRow}>
            {details.ingredients.map((ingredient) => {
              const primary = sameIngredientMedications(
                data,
                ingredient.name,
              )[0];
              return (
                primary && (
                  <Link
                    className={styles.tag}
                    href={`/medications/${encodeURIComponent(primary.id)}#active-ingredient`}
                    key={ingredient.name}
                  >
                    <span>{ingredient.name}</span>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                )
              );
            })}
          </div>
        </PageSurface>
      )}
      {otherCategories.length > 0 && (
        <PageSurface className={styles.panel} data-card-entry>
          <h2 className={styles.sectionTitle}>Elsewhere in your library</h2>
          <div className={styles.tagRow}>
            {otherCategories.map((item) => (
              <Link
                key={item.value}
                className={styles.tag}
                href={`/medications/categories/${item.value}`}
              >
                <MedicationIndicatorMark
                  kind={item.value}
                  size={22}
                  aria-hidden="true"
                />
                {item.shortLabel}
              </Link>
            ))}
          </div>
        </PageSurface>
      )}
    </div>
  );
}
