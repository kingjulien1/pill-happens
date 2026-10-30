import type { Metadata } from "next";
import { GuidePage } from "@/components/guide-page";

export const metadata: Metadata = { title: "Guide & Getting Started" };

export default function Page() {
  return <GuidePage />;
}
