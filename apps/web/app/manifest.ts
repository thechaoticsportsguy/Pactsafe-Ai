import type { MetadataRoute } from "next";

/**
 * Web app manifest. Lets users install PactSafe AI as a PWA on mobile
 * and desktop. Icons are served by the existing /icon.svg and
 * /apple-icon.svg routes.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PactSafe AI",
    short_name: "PactSafe",
    description:
      "AI contract review for freelancers. Spot red flags, missing protections, and draft negotiation language in under a minute.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07080c",
    theme_color: "#07080c",
    categories: ["business", "productivity", "legal"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Analyze a contract",
        short_name: "Analyze",
        description: "Start a new contract analysis",
        url: "/analyze",
      },
      {
        name: "History",
        short_name: "History",
        description: "View past analyses",
        url: "/history",
      },
    ],
  };
}
