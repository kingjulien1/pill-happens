import type { Metadata } from "next";
import { DeveloperGuidePage } from "@/components/developer-guide-page";

export const metadata: Metadata = { title: "Developer Guide & Design System" };

export default function Page() {
  return <DeveloperGuidePage />;
}
