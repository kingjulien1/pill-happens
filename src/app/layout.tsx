import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pill happens · One day at a time", template: "%s · Pill happens" },
  description: "A quiet, private space to keep track. One day at a time.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Pill happens" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [ { media: "(prefers-color-scheme: light)", color: "#faf7f5" }, { media: "(prefers-color-scheme: dark)", color: "#1c171c" } ] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="ambient" aria-hidden="true"><div className="glow glow-1"/><div className="glow glow-2"/><div className="glow glow-3"/><div className="glow glow-4"/></div>{children}<Toaster position="top-center" richColors closeButton /></body></html>;
}
