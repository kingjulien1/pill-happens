import { notFound } from "next/navigation";
import { isValidDayKey } from "@/lib/domain";
import { DayPage } from "@/components/journal-pages";
export default async function Page({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  if (!isValidDayKey(day)) notFound();
  return <DayPage day={day} />;
}
