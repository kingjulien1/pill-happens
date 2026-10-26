import { TodayPage } from "@/components/journal-pages";
import { getJournalEncouragement } from "@/lib/server/encouragement";
export default function Page() {
  return <TodayPage encouragement={getJournalEncouragement()} />;
}
