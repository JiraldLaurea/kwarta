import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kwarta",
    short_name: "Kwarta",
    description: "Personal budget tracking dashboard",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    // Register the installed app as a share target so an alert can be shared
    // from GCash / Maya / the SMS app straight into the Review Inbox. Text
    // shares arrive as query params on /app (handled client-side); no service
    // worker needed. Silent auto-capture still requires the native build.
    // Next's manifest type models share_target.params as an array, but the Web
    // Share Target spec (and browsers) expect the object form below — emit the
    // correct shape and cast past the mistyped field.
    share_target: {
      action: "/app",
      method: "get",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    } as unknown as MetadataRoute.Manifest["share_target"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
