import { notFound, redirect } from "next/navigation";
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
  redirect(`/journal/${day}`);
}
