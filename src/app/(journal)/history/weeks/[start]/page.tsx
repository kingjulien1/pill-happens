import { notFound } from "next/navigation";
import { HistoryWeekPage } from "@/components/history-week-page";
import { isIsoWeekStart } from "@/lib/journal-reference-details";

export const metadata = { title: "A week in your journal" };

export default async function Page({
  params,
}: {
  params: Promise<{ start: string }>;
}) {
  const { start } = await params;
  if (!isIsoWeekStart(start)) notFound();
  return <HistoryWeekPage start={start} />;
}
