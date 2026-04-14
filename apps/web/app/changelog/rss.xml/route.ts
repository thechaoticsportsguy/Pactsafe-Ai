/**
 * RSS feed for the changelog. Served at /changelog/rss.xml.
 * Entries are kept in sync with the changelog page manually.
 */

export const dynamic = "force-static";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pactsafe.ai";

interface Entry {
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  id: string;
}

const ENTRIES: Entry[] = [
  {
    id: "demo-route",
    date: "2026-04-14",
    title: "Sample report route",
    body: "New /demo page renders a full realistic analysis from pre-baked data so visitors can explore the output without hitting the API.",
  },
  {
    id: "announcement-faq",
    date: "2026-04-14",
    title: "Announcement bar, expanded FAQ, pricing trust strip",
    body: "Top-of-page announcement bar links to the changelog. Landing FAQ expanded to 12 questions. Pricing gains a trust strip (30-day refund, Stripe billing, private by default).",
  },
  {
    id: "compare-delta",
    date: "2026-04-14",
    title: "Compare delta verdict, changelog, print styles",
    body: "Compare page now shows a clear winner verdict and per-stat deltas. New /changelog route listing every ship. Analysis results have clean print styles.",
  },
  {
    id: "share-links",
    date: "2026-04-14",
    title: "Shareable analysis links, back to top, Ctrl+K",
    body: "Copy link button on every analysis. Back-to-top button on the landing. History search focuses on Ctrl+K.",
  },
  {
    id: "pwa-shortcuts",
    date: "2026-04-14",
    title: "PWA install, keyboard shortcuts, history filters",
    body: "PactSafe is now installable as a PWA. Press ? to open the keyboard shortcuts help. History page gained risk-tier filters.",
  },
  {
    id: "seo-a11y",
    date: "2026-04-14",
    title: "SEO and accessibility pass",
    body: "robots.txt, sitemap.xml, full JSON-LD structured data, skip-to-content link, and better per-page metadata.",
  },
  {
    id: "production-chrome",
    date: "2026-04-14",
    title: "Legal pages, toasts, error boundaries",
    body: "Real /privacy, /terms, /security, /contact pages with hand-written content. Toast system for copy feedback. Proper 404 and error boundaries.",
  },
  {
    id: "premium-redesign",
    date: "2026-04-14",
    title: "Premium redesign",
    body: "Complete overhaul of the landing, analyze, and results pages with a refined design system, new sections, and sticky section nav.",
  },
];

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toUTCString();
}

export async function GET(): Promise<Response> {
  const now = toRfc822(ENTRIES[0]?.date ?? "2026-04-14");

  const items = ENTRIES.map((e) => {
    const link = `${SITE_URL}/changelog#${e.id}`;
    return `
    <item>
      <title>${escape(e.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${toRfc822(e.date)}</pubDate>
      <description>${escape(e.body)}</description>
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PactSafe AI — Changelog</title>
    <link>${SITE_URL}/changelog</link>
    <atom:link href="${SITE_URL}/changelog/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Everything we&apos;ve shipped on PactSafe AI.</description>
    <language>en-US</language>
    <lastBuildDate>${now}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
