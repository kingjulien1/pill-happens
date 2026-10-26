import { TodayPage } from "@/components/journal-pages";
import { getStreakIcon } from "@/lib/server/encouragement";
export default function Page() {
  return <TodayPage streakIcon={getStreakIcon()} />;
}
