import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Rocket,
  Wrench,
  Shield,
  GitFork,
  ArrowRight,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Everything we've shipped on PactSafe AI — new features, improvements, and fixes. Updated as we ship.",
};

type EntryKind = "feature" | "improvement" | "fix" | "security";

interface Entry {
  date: string;
  kind: EntryKind;
  title: string;
  body: string;
  tags?: string[];
}

/**
 * Changelog entries. These are hand-curated from real commits —
 * no fake history, no marketing fluff. When you ship something user-
 * visible, add an entry at the top.
 */
const ENTRIES: Entry[] = [
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Shareable analysis links + back to top",
    body: "Every analysis now has a Copy link button. Copy the URL, paste it in Slack or email, and the recipient lands straight on the report. On the landing page, a floating back-to-top button appears after you scroll past the halfway mark.",
    tags: ["results", "landing"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Keyboard shortcuts help, ⌘K search, PWA install",
    body: "Press ? anywhere to see the new keyboard shortcuts modal. On the history page, ⌘/Ctrl+K focuses the search box. PactSafe is now installable as a PWA on desktop and mobile via the web manifest.",
    tags: ["a11y", "pwa"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Risk filters on history",
    body: "Filter your past analyses by risk tier — Low, Moderate, High, Critical — with live counts on each chip. Search and filters compose.",
    tags: ["history"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Pricing page, product schema",
    body: "New /pricing route with three tiers, a full feature comparison table, and a billing FAQ. Product and AggregateOffer JSON-LD is rendered for rich search results.",
    tags: ["marketing", "seo"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Privacy, Terms, Security, Contact pages",
    body: "Four real legal / support pages with hand-written content — no lorem ipsum, no placeholder. The security page explains exactly how we handle encryption, retention, and LLM calls. Contact supports multiple topics and routes to the right inbox.",
    tags: ["trust", "legal"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Toast system, error boundaries, 404 page",
    body: "Copy-to-clipboard actions and other feedback events now surface as stacked toasts. Added proper not-found and error pages with recovery CTAs and reference IDs so you know what to report if something breaks.",
    tags: ["ux"],
  },
  {
    date: "2026-04-14",
    kind: "improvement",
    title: "Paste from clipboard, drag & drop in hero",
    body: "The landing hero now accepts dragged files directly and has a one-click paste-from-clipboard button. The same flow is available on the analyze page.",
    tags: ["hero"],
  },
  {
    date: "2026-04-14",
    kind: "improvement",
    title: "Mobile sticky CTA and section nav",
    body: "After you scroll past the hero on mobile, a sticky 'Ready to analyze?' CTA appears at the bottom. On the results page, a horizontally-scrolling chip row keeps the section nav accessible below the desktop breakpoint.",
    tags: ["mobile"],
  },
  {
    date: "2026-04-14",
    kind: "feature",
    title: "Premium redesign",
    body: "Complete overhaul of the landing, analyze, and results pages. New design system (layered surfaces, shadow scale, display typography), new marketing sections (how it works, live sample report, use cases, security, FAQ), and a sticky section nav on results.",
    tags: ["design"],
  },
  {
    date: "2026-04-14",
    kind: "security",
    title: "Zero-retention flags on all LLM calls",
    body: "We now explicitly request zero-retention on every Anthropic and Groq API call. Your contracts are never used for training — this is enforced in code, not just in marketing.",
    tags: ["privacy"],
  },
  {
    date: "2026-04-14",
    kind: "improvement",
    title: "Switched inference to Groq + Llama 3.3 70B",
    body: "The primary analysis path now runs on Groq's Llama 3.3 70B (up from 3.1) for faster first-pass scoring. Anthropic Claude remains available as a fallback provider.",
    tags: ["backend"],
  },
  {
    date: "2026-04-14",
    kind: "fix",
    title: "Vercel + Fly.io deploy reliability",
    body: "Fixed CORS regex for Vercel previews, replaced WebSocket polling with short-interval HTTP polling for more reliable job tracking, and cleaned up SQLModel GUID handling for SQLite compatibility.",
    tags: ["infra"],
  },
];

// Tone for kind pills on cream backgrounds. Darker text variants
// keep contrast legible against beige-50; the border reads as a thin
// tint rather than a glow. Matches RealClauses pattern on /landing.
const KIND_META: Record<
  EntryKind,
  { label: string; icon: React.ElementType; tintClass: string }
> = {
  feature: {
    label: "New",
    icon: Sparkles,
    // Use the solid ink eyebrow for "feature" — it reads as a headline
    // stamp on the card, matching the section hero eyebrow.
    tintClass: "bg-ink-800 text-beige-50 border-ink-800",
  },
  improvement: {
    label: "Improved",
    icon: Rocket,
    tintClass: "bg-[#10b981]/10 text-[#166534] border-[#10b981]/40",
  },
  fix: {
    label: "Fixed",
    icon: Wrench,
    tintClass: "bg-[#eab308]/10 text-[#854d0e] border-[#eab308]/40",
  },
  security: {
    label: "Security",
    icon: Shield,
    tintClass: "bg-[#ef4444]/10 text-[#991b1b] border-[#ef4444]/40",
  },
};

export default function ChangelogPage() {
  // Group entries by date for visual clustering
  const grouped = ENTRIES.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main id="main-content" className="flex-1 bg-beige-100">
        {/* Hero */}
        <section className="relative">
          <div className="container-app pt-16 pb-12 md:pt-24">
            <Badge variant="eyebrow">Changelog</Badge>
            <h1 className="mt-5 max-w-3xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
              What we&rsquo;ve shipped
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 md:text-body-lg">
              Every release, hand-written from real commits. No spin. No
              roadmap fiction. If it&rsquo;s here, it&rsquo;s live.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://github.com/thechaoticsportsguy/Pactsafe-Ai"
                target="_blank"
                rel="noreferrer"
              >
                <Button palette="editorial" variant="secondary" size="sm">
                  <GitFork className="h-3.5 w-3.5" />
                  View on GitHub
                </Button>
              </a>
              <Link href="/analyze">
                <Button palette="editorial" variant="primary" size="sm">
                  Try the latest
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Entries */}
        <section className="relative border-t border-ink-800/10 py-14">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              {dates.map((date) => {
                const dateEntries = grouped[date];
                return (
                  <div key={date} className="mb-12 last:mb-0">
                    <div className="sticky top-14 z-10 -mx-1 mb-5 flex items-center gap-3 bg-beige-100 px-1 py-2">
                      <time
                        dateTime={date}
                        className="text-[11px] font-medium uppercase tracking-[0.15em] tabular-nums text-ink-500"
                      >
                        {formatDate(date)}
                      </time>
                      <div className="h-px flex-1 bg-ink-800/10" />
                    </div>
                    <div className="space-y-4">
                      {dateEntries.map((e) => {
                        const meta = KIND_META[e.kind];
                        return (
                          <article
                            key={e.title}
                            className="group border border-ink-800/10 bg-beige-50 p-6 transition-colors hover:bg-beige-50/80"
                          >
                            <div className="flex items-start gap-4">
                              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center bg-ink-800 text-beige-50">
                                <meta.icon
                                  className="h-4 w-4"
                                  strokeWidth={2}
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex items-center border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em]",
                                      meta.tintClass,
                                    )}
                                  >
                                    {meta.label}
                                  </span>
                                  {e.tags?.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center border border-ink-800/10 bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-ink-600"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <h2 className="mt-2 text-base font-medium tracking-tight text-ink-800">
                                  {e.title}
                                </h2>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                                  {e.body}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-14 max-w-3xl border border-ink-800/10 bg-beige-50 p-6 text-center">
              <p className="text-sm text-ink-800">
                Want to follow along as we ship?
              </p>
              <p className="mt-1.5 text-xs text-ink-500">
                Star the repo on GitHub or drop us a line.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <a
                  href="https://github.com/thechaoticsportsguy/Pactsafe-Ai"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button palette="editorial" variant="secondary" size="sm">
                    <GitFork className="h-3.5 w-3.5" />
                    Star on GitHub
                  </Button>
                </a>
                <Link href="/contact">
                  <Button palette="editorial" variant="primary" size="sm">
                    Request a feature
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
