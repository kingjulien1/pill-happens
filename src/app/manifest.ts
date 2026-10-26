import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pill happens",
    short_name: "Pill happens",
    description: "One day at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#120f17",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
