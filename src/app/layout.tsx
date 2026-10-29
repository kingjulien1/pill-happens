import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { JournalBackground } from "@/components/journal-background";
import { PwaProvider } from "@/components/pwa-provider";
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
  icons: {
    apple: [
      {
        url: "/icons/app/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2f4" },
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
        <PwaProvider>
          <JournalBackground />
          {children}
          <Toaster
            theme="system"
            position="top-center"
            richColors
            closeButton
          />
        </PwaProvider>
      </body>
    </html>
  );
}
