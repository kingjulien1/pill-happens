import type { Metadata } from "next";
import { StreaksPage } from "@/components/streak-pages";
import { parseStreakSpotlightTarget } from "@/lib/streak-spotlight";

export const metadata: Metadata = { title: "Your Streaks" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const target = parseStreakSpotlightTarget((await searchParams).spotlight);
  return <StreaksPage spotlightTarget={target} />;
}
