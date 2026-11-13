import { notFound } from "next/navigation";
import { MedicationCategoryPage } from "@/components/medication-category-page";
import { MEDICATION_CATEGORIES } from "@/lib/medication-categories";

export const metadata = { title: "Medication category" };

export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const savedCategory = MEDICATION_CATEGORIES.find(
    (item) => item.value === category,
  );
  if (!savedCategory) notFound();
  return <MedicationCategoryPage category={savedCategory.value} />;
}
