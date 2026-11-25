import { notFound } from "next/navigation";
import { JournalEntryPage } from "@/components/journal-entry-page";
import { isValidDayKey } from "@/lib/domain";

export const metadata = { title: "Your daily journal" };

export default async function Page({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  if (!isValidDayKey(day)) notFound();
  return <JournalEntryPage day={day} />;
}
