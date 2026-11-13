import { notFound } from "next/navigation";
import { MedicationDetailPage } from "@/components/medication-detail-page";
import { decodeJournalReferenceId } from "@/lib/journal-mentions";

export const metadata = { title: "Medication" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: segment } = await params;
  // Next 16.4 passes URI-encoded dynamic values to page components.
  const id = decodeJournalReferenceId(segment);
  if (!id) notFound();
  return <MedicationDetailPage id={id} />;
}
