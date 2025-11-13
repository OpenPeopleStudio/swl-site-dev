import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Snow White Laundry · Staff Cortex",
    short_name: "SWL Staff",
    description:
      "Installable dashboard for Snow White Laundry staff scheduling, menu building, inventory, and Cortex reflections.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#05010A",
    theme_color: "#0E1B4F",
    orientation: "portrait",
    lang: "en-US",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Staff Dashboard",
        short_name: "Dashboard",
        url: "/",
      },
      {
        name: "Jump to Menu Builder",
        short_name: "Menu",
        url: "/staff/menu",
      },
      {
        name: "Jump to Events",
        short_name: "Events",
        url: "/staff/events",
      },
    ],
  };
}
