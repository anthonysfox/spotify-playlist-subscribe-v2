import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PlaylistFox",
    short_name: "PlaylistFox",
    description:
      "Subscribe to Spotify playlists and get notified when they're updated.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#CC5500",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
