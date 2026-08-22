import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LOKR",
    short_name: "LOKR",
    description: "Your own encrypted information locker.",
    start_url: "/",
    display: "standalone",
    background_color: "#452D21",
    theme_color: "#452D21",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
