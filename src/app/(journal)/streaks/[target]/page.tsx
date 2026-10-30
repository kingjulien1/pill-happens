import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StreakMilestonePage } from "@/components/streak-pages";
import { isStreakMilestoneTarget } from "@/lib/streak-milestones";

export const metadata: Metadata = { title: "Streak Milestone" };

export default async function Page({
  params,
}: {
  params: Promise<{ target: string }>;
}) {
  const { target: value } = await params;
  const target = Number(value);
  if (
    !/^\d+$/.test(value) ||
    String(target) !== value ||
    !isStreakMilestoneTarget(target)
  )
    notFound();
  return <StreakMilestonePage target={target} />;
}
