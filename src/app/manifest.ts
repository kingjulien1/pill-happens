import type { MetadataRoute } from "next";
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
    background_color: "#f6f2f4",
    theme_color: "#120f17",
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
