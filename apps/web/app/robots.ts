import type { MetadataRoute } from "next";

/**
 * Robots directives. Marketing pages are open; user-specific analysis
 * pages are blocked from indexing (their layouts also set noindex).
 */
export default function robots(): MetadataRoute.Robots {
  const base = "https://pactsafe.ai";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/analysis/", "/history", "/compare"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
