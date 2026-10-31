import { redirect } from "next/navigation";
import { TodayPage } from "@/components/journal-pages";
import { authenticatedJournal } from "@/lib/server/auth";
import { journalRepository } from "@/lib/server/database";
import { journalNeedsGettingStarted } from "@/lib/server/guide-onboarding";

export default async function Page() {
  const journalId = await authenticatedJournal();
  if (!journalId) redirect("/login");
  if (await journalNeedsGettingStarted(journalRepository(), journalId))
    redirect("/guide#start");
  return <TodayPage />;
}
