import type { MetadataRoute } from "next";
import { APP_THEME_VALUES } from "@/lib/app-theme";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pill happens",
    short_name: "Pill happens",
    description: "One day at a time.",
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    prefer_related_applications: false,
    background_color: APP_THEME_VALUES.light.background,
    theme_color: APP_THEME_VALUES.dark.background,
    icons: [
      {
        src: "/icons/app/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
