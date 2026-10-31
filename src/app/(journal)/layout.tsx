import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { configurationReady, authenticatedJournal } from "@/lib/server/auth";
import { JournalProvider } from "@/components/journal-provider";
import { AppShell } from "@/components/app-shell";
import { PageRefreshProvider } from "@/components/page-refresh";
import { JournalDraftProvider } from "@/components/journal-drafts";
export const dynamic = "force-dynamic";
export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const journalId = configurationReady() ? await authenticatedJournal() : null;
  if (!journalId) redirect("/login");
  const scope = createHash("sha256")
    .update(`pill-workspace-v1:${journalId}`)
    .digest("hex");
  return (
    <JournalProvider>
      <JournalDraftProvider key={scope} scope={scope}>
        <PageRefreshProvider>
          <AppShell>{children}</AppShell>
        </PageRefreshProvider>
      </JournalDraftProvider>
    </JournalProvider>
  );
}
