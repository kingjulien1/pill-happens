import { redirect } from "next/navigation";
import { configurationReady, isAuthenticated } from "@/lib/server/auth";
import { JournalProvider } from "@/components/journal-provider";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configurationReady() || !(await isAuthenticated())) redirect("/login");
  return (
    <JournalProvider>
      <AppShell>{children}</AppShell>
    </JournalProvider>
  );
}
