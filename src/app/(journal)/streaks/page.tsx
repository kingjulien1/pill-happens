import type { Metadata } from "next";
import { StreaksPage } from "@/components/streak-pages";

export const metadata: Metadata = { title: "Your Streaks" };

export default function Page() {
  return <StreaksPage />;
}
