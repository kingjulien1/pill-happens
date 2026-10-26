import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pill happens",
    short_name: "Pill happens",
    description: "One day at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f5",
    theme_color: "#9d516c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
