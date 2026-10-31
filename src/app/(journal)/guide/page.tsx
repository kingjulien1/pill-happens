import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuidePage } from "@/components/guide-page";
import { GuideOnboardingBoundary } from "@/components/guide-onboarding";
import { authenticatedJournal } from "@/lib/server/auth";
import { journalRepository } from "@/lib/server/database";
import { journalNeedsGettingStarted } from "@/lib/server/guide-onboarding";

export const metadata: Metadata = { title: "Guide & Getting Started" };

export default async function Page() {
  const journalId = await authenticatedJournal();
  if (!journalId) redirect("/login");
  const pending = await journalNeedsGettingStarted(
    journalRepository(),
    journalId,
  );
  return (
    <GuideOnboardingBoundary pending={pending}>
      <GuidePage />
    </GuideOnboardingBoundary>
  );
}
