import type { MetadataRoute } from "next";
import { APP_CANVAS_BASE } from "@/lib/app-theme";
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
    background_color: APP_CANVAS_BASE,
    theme_color: APP_CANVAS_BASE,
    share_target: {
      action: "/share-sleep-report",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "sleep-report",
            accept: [
              "image/png",
              ".png",
              "image/jpeg",
              ".jpg",
              ".jpeg",
              "image/webp",
              ".webp",
              "image/gif",
              ".gif",
              "image/avif",
              ".avif",
              "image/heic",
              ".heic",
              "image/heif",
              ".heif",
            ],
          },
        ],
      },
    },
    file_handlers: [
      {
        action: "/?open-sleep-report=1",
        accept: {
          "image/png": [".png"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/webp": [".webp"],
          "image/gif": [".gif"],
          "image/avif": [".avif"],
        },
      },
    ],
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
