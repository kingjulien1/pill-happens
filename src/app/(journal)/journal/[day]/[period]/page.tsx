import { notFound } from "next/navigation";
import { JournalEntryPage } from "@/components/journal-entry-page";
import { isValidDayKey } from "@/lib/domain";

export const metadata = { title: "Your journal page" };

export default async function Page({
  params,
}: {
  params: Promise<{ day: string; period: string }>;
}) {
  const { day, period } = await params;
  if (!isValidDayKey(day) || (period !== "morning" && period !== "evening"))
    notFound();
  return <JournalEntryPage day={day} period={period} />;
}
