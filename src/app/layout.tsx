import type { Metadata, Viewport } from "next";
import { JournalBackground } from "@/components/journal-background";
import { PwaProvider } from "@/components/pwa-provider";
import { AppearanceHead } from "@/components/appearance-head";
import {
  AppearanceProvider,
  AppearanceToaster,
} from "@/components/appearance-provider";
import { APP_THEME_VALUES } from "@/lib/app-theme";
import {
  PageRefreshHead,
  PageRefreshScreen,
} from "@/components/page-refresh-screen";
import "./globals.css";
import "./layout-spacing.css";
import "./menu-surfaces.css";
import "./choice-menus.css";
import "./action-button-palette.css";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <AppearanceHead />
        <PageRefreshHead />
      </head>
      <body>
        <PageRefreshScreen />
        <AppearanceProvider>
          <PwaProvider>
            <JournalBackground />
            {children}
            <AppearanceToaster />
          </PwaProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
