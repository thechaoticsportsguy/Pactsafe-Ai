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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const KIND_META: Record<
  EntryKind,
  { label: string; icon: React.ElementType; tone: "accent" | "success" | "warning" | "danger" }
> = {
  feature: { label: "New", icon: Sparkles, tone: "accent" },
  improvement: { label: "Improved", icon: Rocket, tone: "success" },
  fix: { label: "Fixed", icon: Wrench, tone: "warning" },
  security: { label: "Security", icon: Shield, tone: "danger" },
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
      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden bg-hero">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] bg-grid-dot"
          />
          <div className="container-app pt-16 md:pt-24 pb-10">
            <Badge tone="accent" size="xs">
              <Sparkles className="h-3 w-3" />
              Changelog
            </Badge>
            <h1 className="mt-4 text-3xl md:text-[48px] md:leading-[1.05] font-semibold tracking-tight text-gradient max-w-3xl">
              What we&rsquo;ve shipped
            </h1>
            <p className="mt-5 max-w-2xl text-base text-foreground-muted leading-relaxed">
              Every release, hand-written from real commits. No spin. No
              roadmap fiction. If it&rsquo;s here, it&rsquo;s live.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://github.com/thechaoticsportsguy/Pactsafe-Ai"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  <GitFork className="h-3.5 w-3.5" />
                  View on GitHub
                </Button>
              </a>
              <Link href="/analyze">
                <Button size="sm">
                  Try the latest
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="relative py-14">
          <div className="container-app">
            <div className="mx-auto max-w-3xl">
              {dates.map((date) => {
                const dateEntries = grouped[date];
                return (
                  <div key={date} className="mb-12 last:mb-0">
                    <div className="sticky top-20 z-10 flex items-center gap-3 -mx-1 px-1 py-2 bg-background/80 backdrop-blur-xl mb-5">
                      <time
                        dateTime={date}
                        className="text-xs font-semibold uppercase tracking-wider text-foreground-muted tabular-nums"
                      >
                        {formatDate(date)}
                      </time>
                      <div className="h-px flex-1 bg-border-subtle/60" />
                    </div>
                    <div className="space-y-4">
                      {dateEntries.map((e) => {
                        const meta = KIND_META[e.kind];
                        return (
                          <article
                            key={e.title}
                            className="group rounded-xl border border-border-subtle bg-surface/40 p-6 transition-colors hover:bg-surface-2/40"
                          >
                            <div className="flex items-start gap-4">
                              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                                <meta.icon
                                  className="h-4 w-4"
                                  strokeWidth={2}
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge tone={meta.tone} size="xs">
                                    {meta.label}
                                  </Badge>
                                  {e.tags?.map((t) => (
                                    <Badge key={t} tone="neutral" size="xs">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                                <h2 className="mt-2 text-base font-semibold tracking-tight text-foreground">
                                  {e.title}
                                </h2>
                                <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
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

            <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-border bg-surface/40 p-6 text-center">
              <p className="text-sm text-foreground">
                Want to follow along as we ship?
              </p>
              <p className="mt-1.5 text-xs text-foreground-muted">
                Star the repo on GitHub or drop us a line.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href="https://github.com/thechaoticsportsguy/Pactsafe-Ai"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <GitFork className="h-3.5 w-3.5" />
                    Star on GitHub
                  </Button>
                </a>
                <Link href="/contact">
                  <Button size="sm">
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
