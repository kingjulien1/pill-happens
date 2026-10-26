import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { JournalBackground } from "@/components/journal-background";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pill happens · One day at a time",
    template: "%s · Pill happens",
  },
  description: "A quiet, private space to keep track. One day at a time.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pill happens",
  },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ed" },
    { media: "(prefers-color-scheme: dark)", color: "#120f17" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <JournalBackground />
        {children}
        <Toaster theme="system" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
