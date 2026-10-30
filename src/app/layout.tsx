import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { JournalBackground } from "@/components/journal-background";
import { PwaProvider } from "@/components/pwa-provider";
import { APP_THEME_VALUES } from "@/lib/app-theme";
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
    {
      media: "(prefers-color-scheme: light)",
      color: APP_THEME_VALUES.light.background,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: APP_THEME_VALUES.dark.background,
    },
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
            toastOptions={{
              style: {
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                borderColor: "var(--border)",
              },
            }}
          />
        </PwaProvider>
      </body>
    </html>
  );
}
