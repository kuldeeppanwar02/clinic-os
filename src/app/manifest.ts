import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dr SR Panwar Clinic",
    short_name: "Dr SR Panwar",
    description:
      "Hindi-first multi-clinic PWA — appointment booking, walk-in token, live queue status aur staff dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7efe1",
    theme_color: "#0f6b63",
    lang: "hi-IN",
    orientation: "portrait",
    categories: ["medical", "health", "productivity"],
    icons: [
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
