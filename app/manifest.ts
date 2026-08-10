import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Party Games",
    short_name: "Party Games",
    description:
      "Multiplayer party games for friends.",

    start_url: "/",

    display: "standalone",

    background_color: "#0b0b0f",

    theme_color: "#0b0b0f",

    orientation: "portrait",

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}