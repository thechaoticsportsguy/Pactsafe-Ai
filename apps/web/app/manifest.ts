import type { MetadataRoute } from "next";

/**
 * Web app manifest. Lets users install PactSafe AI as a PWA on mobile
 * and desktop. Icons are served by the dynamic Next.js routes at
 * `app/icon.tsx` (32×32) and `app/apple-icon.tsx` (180×180) — both
 * render the same geometric LogoMark SVG so the browser-tab favicon,
 * iOS home-screen icon, and in-app mark are always pixel-identical.
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
    background_color: "#111111",
    theme_color: "#111111",
    categories: ["business", "productivity", "legal"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
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
