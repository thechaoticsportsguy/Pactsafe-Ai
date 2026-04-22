"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  ArrowRight,
  X,
  Upload,
  ScanSearch,
  FileCheck2,
  Lock,
  Eye,
  Gavel,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Shield,
  ChevronDown,
  Palette,
  PenLine,
  Megaphone,
  Briefcase,
  Camera,
  Code2,
  ShieldCheck,
  GitFork,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import { FaqJsonLd, SoftwareAppJsonLd } from "@/components/StructuredData";
import {
  SectionEditorial,
  SectionHeader,
} from "@/components/primitives/Section";
import {
  Reveal,
  fadeInUp,
  staggerChildren,
} from "@/components/primitives/Motion";

// ---------------------------------------------------------------------------
// Main landing component
// ---------------------------------------------------------------------------
export default function PactSafeLanding() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SoftwareAppJsonLd />
      <FaqJsonLd />
      <AnnouncementBar
        text="New: changelog, shareable analysis links, and PWA install."
        ctaLabel="See what's shipped"
        href="/changelog"
      />
      <TopNav variant="editorial" />
      <main id="main-content" className="flex-1">
        <Hero />
        <HeroStats />
        <TrustBar />
        <HowItWorks />
        <SampleReport />
        <WhatWeCatch />
        <UseCases />
        <Security />
        <RealClauses />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <MobileStickyCTA />
      <BackToTop />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back to top — desktop-only floating button, appears after 50% scroll
// ---------------------------------------------------------------------------
function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setShow(total > 0 && window.scrollY / total > 0.5);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="hidden md:flex fixed bottom-6 right-6 z-20 h-11 w-11 items-center justify-center bg-ink-800 text-beige-50 shadow-panel hover:bg-ink-700 hover:-translate-y-0.5 transition-all animate-fade-in"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sticky mobile CTA — fixed at bottom on mobile after hero
// ---------------------------------------------------------------------------
function MobileStickyCTA() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (dismissed) return;
      setShow(window.scrollY > 520);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [dismissed]);

  if (!show || dismissed) return null;
  return (
    <div className="md:hidden fixed inset-x-3 bottom-3 z-30 animate-fade-in-up">
      <div className="flex items-center gap-2 border border-ink-800 bg-beige-50 p-2 shadow-panel">
        <div className="flex-1 pl-2">
          <p className="text-[11px] font-medium text-ink-800">
            Ready to analyze?
          </p>
          <p className="text-[10px] text-ink-500">
            Free · under 60 seconds
          </p>
        </div>
        <Link
          href="/analyze"
          className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 bg-ink-800 px-3 text-xs font-medium text-beige-50 transition-colors hover:bg-ink-700"
        >
          Start now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center text-ink-500 hover:bg-ink-800/5 hover:text-ink-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero — two-column editorial marketing block, pdf.online-inspired.
//
// Left column  (HeroCopy):
//   eyebrow pill → serif display headline → supporting paragraph →
//   primary/secondary CTA pair. The column ends on the CTAs; the
//   4-cell stats row lives below as its own <HeroStats /> band.
//
// Right column (HeroVisual):
//   custom 2-color line illustration (cream + ink) showing four
//   labeled product-capability scenes around a books + shield +
//   contracts composition, sitting at 95% opacity behind a dashed
//   "drop a contract" card that links to /analyze. The illustration's
//   center is intentional negative space for the dropzone. Hidden on
//   mobile (md:flex) so the dropzone doesn't crowd narrow viewports.
//
// Direction change note: this replaces the previous hero — a dark
// product-card showing three real red flags from the Handshake
// fixture (FLAG_PREVIEWS) — with a decorative illustration + upload
// card pattern. Trades product-proof-in-hero for a more conventional
// illustrated-SaaS aesthetic. A placeholder testimonial card sat
// below the CTA pair in an earlier iteration; removed once the
// display-type scale went up (CTA pair is the column's last child
// now). A real testimonial will land later once we have permission
// to attribute one.
//
// Font note: the h1 uses inline fontFamily: Fraunces/Times fallback.
// Fraunces isn't wired through next/font yet; Times will render until
// it is. Wire it in app/layout.tsx in a follow-up and swap the inline
// style for font-serif.
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="bg-beige-100 border-b border-ink-800/10 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-8 py-16 md:py-20 md:px-12 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-12 md:gap-20 items-center">
        <HeroCopy />
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroCopy() {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="inline-flex items-center gap-2 self-start bg-ink-800 text-beige-100 px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-beige-100" />
        <span className="text-[11px] tracking-[0.16em] uppercase font-medium">
          Grounded AI · Every claim cited
        </span>
      </div>

      <h1
        className="text-ink-800 text-[44px] md:text-[68px] leading-[1.02] font-medium tracking-[-0.04em]"
        style={{ fontFamily: "'Fraunces', 'Times New Roman', serif" }}
      >
        Read every clause. Like a lawyer would.
      </h1>

      <p className="text-ink-700 text-lg leading-[1.5] max-w-lg">
        Paste any contract. In under 60 seconds, get a plain-English
        risk report — every red flag tied to the exact clause in your
        document. No lawyer fees. No data retained.
      </p>

      <div className="flex flex-wrap gap-3 items-center">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 bg-ink-800 text-beige-100 px-7 py-3.5 text-sm font-medium hover:bg-ink-700 transition-colors"
        >
          Analyze a contract <span className="text-base">→</span>
        </Link>
        <Link
          href="/demo"
          className="inline-flex items-center bg-transparent text-ink-800 border border-ink-800 px-7 py-3.5 text-sm font-medium hover:bg-ink-800/5 transition-colors"
        >
          See sample report
        </Link>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center min-h-[380px]">
      {/* Background illustration layer — atmospheric, hidden on
          narrow viewports so it doesn't compete with the dropzone.
          opacity-90 keeps the labeled-scene text in the illustration
          legible without drowning the dropzone. HeroIllustration is
          constrained to its grid column (w-full max-w-[560px]) — a
          previous version pulled it outward to clear the dropzone,
          but that clipped the right-side scenes off the viewport on
          narrower desktops. Some dropzone/illustration overlap in
          the middle is the accepted trade-off. */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-90 hidden md:flex pointer-events-none"
        aria-hidden="true"
      >
        <HeroIllustration />
      </div>

      {/* Foreground dropzone card — a real link, not a working
          dropzone. Clicking routes to /analyze where the actual
          upload flow lives. */}
      <Link
        href="/analyze"
        className="relative bg-beige-50 border-2 border-dashed border-ink-800/40 shadow-panel p-10 w-full max-w-[400px] flex flex-col items-center gap-4 hover:border-ink-800/60 hover:bg-beige-100 transition-colors"
      >
        <div className="w-14 h-14 bg-ink-800 text-beige-100 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="text-ink-800 text-lg font-medium">
          Drop a contract to start
        </div>
        <div className="text-ink-600 text-[13px]">
          PDF · DOCX · TXT · up to 10 MB
        </div>
        <div className="inline-flex items-center gap-2 bg-ink-800 text-beige-100 px-5 py-2.5 text-sm font-medium mt-2">
          Choose file
        </div>
        <div className="flex items-center gap-1.5 text-ink-500 text-[11px] mt-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Files stay private
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroIllustration — custom 2-color (cream + ink) line illustration
// showing four labeled product-capability scenes ("Read every clause,"
// "Spot risks instantly," "Understand complex terms," "Get clear
// summaries") around a books + shield + contracts composition. Lives
// at /public/hero-illustration.png. The center of the illustration is
// intentional negative space — the dropzone card sits there in the
// HeroVisual stack. Decorative only: alt="" + aria-hidden skips it
// for screen readers. priority preloads it since it's above the fold.
//
// Sizing rationale: w-full max-w-[560px] keeps the illustration
// contained inside its grid column. A previous iteration used
// w-[130%] + -mx-[15%] to push the corner scenes outward past the
// dropzone's edges, but on desktops narrower than ~1440px that pull
// shoved the right-side scenes past the viewport edge and clipped
// them. Accepting a bit of dropzone/illustration overlap in the
// middle is the lesser evil — content disappearing off the page is
// a layout bug, overlap is a composition choice. h-auto lets the
// aspect ratio drive height; the parent flex+items-center centers
// it vertically. The hero section also carries overflow-x-hidden
// as a defensive safeguard against future sizing regressions.
// ---------------------------------------------------------------------------
function HeroIllustration() {
  return (
    <Image
      // ?v=N cache-bust: bump the integer whenever the PNG is
      // replaced so browsers and Next's image optimizer treat it as a
      // new asset and don't serve a stale cached copy.
      src="/hero-illustration.png?v=2"
      alt=""
      width={1401}
      height={1123}
      aria-hidden="true"
      className="w-full h-auto max-w-[560px] object-contain"
      priority
      draggable={false}
    />
  );
}

// ---------------------------------------------------------------------------
// HeroStats — the 4-cell stats band that used to live at the bottom of
// HeroCopy. Pulled out into its own <section> so the hero's left
// column ends cleanly on the CTA pair and the stats read as a
// distinct band under the fold. Slightly darker beige (beige-200)
// visually separates it from the hero above without breaking palette.
// ---------------------------------------------------------------------------
function HeroStats() {
  const stats: [string, string][] = [
    ["Free", "No account"],
    ["60s", "Avg scan"],
    ["Cited", "Every claim"],
    ["0%", "Retained"],
  ];
  return (
    <section className="bg-beige-200 border-b border-ink-800/10">
      <div className="mx-auto max-w-7xl px-8 md:px-12 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map(([v, l]) => (
          <div key={l}>
            <div className="text-ink-800 text-2xl font-medium tracking-[-0.02em]">
              {v}
            </div>
            <div className="text-ink-600 text-[10px] uppercase tracking-[0.12em] font-medium mt-1.5">
              {l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust bar — honest product stats + tech stack
// ---------------------------------------------------------------------------
function TrustBar() {
  const items = [
    { k: "Free", v: "no account required" },
    { k: "< 60 s", v: "average review time" },
    { k: "6", v: "contract types supported" },
    { k: "0 %", v: "data sold or trained on" },
  ];
  return (
    <SectionEditorial
      tone="warm"
      divider="both"
      pad="md"
      reveal={false}
    >
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4">
        {items.map((item) => (
          <div key={item.k} className="text-center md:text-left">
            <p className="text-2xl font-medium tracking-tight text-ink-800 tabular-nums md:text-[32px]">
              {item.k}
            </p>
            <p className="mt-1 text-xs text-ink-500 md:text-sm">
              {item.v}
            </p>
          </div>
        ))}
      </div>

      {/* Powered-by row */}
      <div className="mt-8 flex flex-col gap-4 border-t border-ink-800/10 pt-8 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
          Powered by
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-700">
          <span className="inline-flex items-center gap-1.5">
            Anthropic Claude
          </span>
          <span className="inline-flex items-center gap-1.5">
            Groq · Llama&nbsp;3.3
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitFork className="h-3.5 w-3.5" />
            Open source on GitHub
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            TLS 1.3 · AES-256
          </span>
        </div>
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// How it works — 3 steps. Uses Framer Motion staggerChildren so the
// row animates in as one coordinated group rather than three
// independent Reveals. Card-level motion still respects
// prefers-reduced-motion via the globals.css reset.
// ---------------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Drop your contract",
      body: "Paste text or upload a PDF, DOCX, or TXT. Everything stays private — we never train on your files.",
    },
    {
      icon: ScanSearch,
      title: "AI scans every clause",
      body: "Every risk we flag is tied to the exact clause in your contract — grounded citations, no hallucinations, verifiable against the document itself.",
    },
    {
      icon: FileCheck2,
      title: "Get a clear report",
      body: "Risk score, ranked issues, plain-English explanations, and negotiation language you can copy-paste.",
    },
  ];
  return (
    <SectionEditorial id="how-it-works" tone="cream" divider="bottom">
      <SectionHeader
        eyebrow="How it works"
        title="From contract to clarity in three steps"
        body="No legalese. No waiting on lawyers. No $500 bills."
      />

      <motion.div
        className="mt-14 grid gap-5 md:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerChildren}
      >
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            variants={fadeInUp}
            className="group border border-ink-800/10 bg-beige-50 p-6 transition-colors hover:border-ink-800/30 md:p-7"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center border border-ink-800 bg-ink-800 text-beige-50">
                <s.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="font-mono text-xs text-ink-500">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-medium tracking-tight text-ink-800">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {s.body}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Sample report — the product output, rendered as a dark "screenshot"
// card on a beige section. The dark card is a deliberate editorial
// choice: we want the product to read as the product wherever it
// appears, and both the hero screenshot and /demo keep workspace-ish
// palettes for the same reason. Framing around it is editorial.
// ---------------------------------------------------------------------------
function SampleReport() {
  return (
    <SectionEditorial id="features" tone="warm" divider="bottom">
      <SectionHeader
        eyebrow="What you get"
        title="A legal-grade report, built for humans"
        body="Risk score. Red flags. Missing protections. Negotiation language. All in one scannable view."
      />

      <Reveal className="mt-14">
        <div className="mx-auto max-w-5xl border border-ink-800 bg-ink-800 p-5 text-beige-50 md:p-7">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-beige-50/10 pb-4">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]/80" />
            </div>
            <p className="ml-2 font-mono text-xs text-beige-50/60">
              pactsafe.ai / analysis / freelance-services-agreement.pdf
            </p>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-beige-50/70">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
              Complete
            </div>
          </div>

          {/* top row: score + summary */}
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="bg-beige-100 p-5 text-ink-800 md:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-500">
                Overall risk
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-medium tabular-nums">72</span>
                <span className="text-sm text-ink-500">/ 100</span>
                <span className="ml-auto inline-flex items-center border border-[#f97316]/50 bg-[#f97316]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#c2410c]">
                  High risk
                </span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden bg-ink-800/10">
                <div
                  className="h-full"
                  style={{
                    width: "72%",
                    background:
                      "linear-gradient(90deg, #f97316, #ef4444)",
                  }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-beige-50 px-2.5 py-2">
                  <p className="text-ink-500">Red flags</p>
                  <p className="mt-0.5 font-medium tabular-nums text-ink-800">
                    7
                  </p>
                </div>
                <div className="bg-beige-50 px-2.5 py-2">
                  <p className="text-ink-500">Missing</p>
                  <p className="mt-0.5 font-medium tabular-nums text-ink-800">
                    4
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-beige-100 p-5 text-ink-800 md:col-span-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-500">
                Plain-English summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                This agreement{" "}
                <mark className="bg-[#ef4444]/15 px-1 text-[#991b1b]">
                  lets the client cancel at any time with no kill fee
                </mark>
                , grants them full IP ownership before you&rsquo;re even
                paid, and caps your liability at{" "}
                <mark className="bg-[#f97316]/15 px-1 text-[#9a3412]">
                  unlimited
                </mark>
                . Payment terms are net-60 with no late-fee protection.
                Negotiate before signing.
              </p>
            </div>
          </div>

          {/* flags */}
          <div className="mt-4 grid gap-4 md:grid-cols-2" id="sample-flags">
            <div className="bg-beige-50 p-5 text-ink-800">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  Top red flags
                </h4>
                <span className="inline-flex items-center border border-[#ef4444]/50 bg-[#ef4444]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#991b1b]">
                  2 critical
                </span>
              </div>
              <ul className="space-y-2.5">
                <SampleFlag
                  tone="critical"
                  title="Unlimited liability"
                  body="Section 9 exposes you to unlimited damages with no cap."
                />
                <SampleFlag
                  tone="critical"
                  title="IP transfer before payment"
                  body="Client owns all work on delivery, not on full payment."
                />
                <SampleFlag
                  tone="high"
                  title="Termination without kill fee"
                  body="Client may cancel any time with no compensation for work done."
                />
                <SampleFlag
                  tone="medium"
                  title="Unlimited revisions"
                  body="Scope says 'until client is satisfied.' No revision cap."
                />
              </ul>
            </div>

            <div className="bg-beige-50 p-5 text-ink-800">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  Missing protections
                </h4>
                <span className="inline-flex items-center border border-[#eab308]/60 bg-[#eab308]/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#854d0e]">
                  4 missing
                </span>
              </div>
              <ul className="space-y-2">
                {[
                  "Late payment fee clause",
                  "Upfront deposit (25–50%)",
                  "Defined revision rounds",
                  "Liability cap (fees paid)",
                ].map((m) => (
                  <li
                    key={m}
                    className="flex items-start gap-2 text-sm text-ink-700"
                  >
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#eab308]" />
                    {m}
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-ink-800/10 pt-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  Suggested negotiation
                </p>
                <div className="bg-beige-100 p-3 font-mono text-[13px] leading-relaxed text-ink-800">
                  &ldquo;Before we proceed, we&rsquo;ll need a 50% upfront
                  deposit, a liability cap equal to fees paid, and IP
                  transfer on final payment rather than delivery.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionEditorial>
  );
}

function SampleFlag({
  tone,
  title,
  body,
}: {
  tone: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
}) {
  // Inline hex maps — these mini-flags sit inside the dark ink-800
  // product screenshot on a beige-50 sub-surface, so we want the
  // severity colors to read at high contrast against cream, not
  // against the workspace palette's severity-*-text tokens (which are
  // tuned for dark backgrounds).
  const bar: Record<typeof tone, string> = {
    critical: "bg-[#ef4444]",
    high: "bg-[#f97316]",
    medium: "bg-[#eab308]",
    low: "bg-[#10b981]",
  };
  const icon: Record<typeof tone, string> = {
    critical: "text-[#991b1b]",
    high: "text-[#9a3412]",
    medium: "text-[#854d0e]",
    low: "text-[#166534]",
  };
  return (
    <li className="flex gap-3">
      <span className={cn("w-0.5 flex-shrink-0", bar[tone])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn("h-3.5 w-3.5 flex-shrink-0", icon[tone])}
          />
          <p className="text-sm font-medium leading-tight text-ink-800">
            {title}
          </p>
        </div>
        <p className="mt-1 text-xs leading-snug text-ink-500">{body}</p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// What we catch — common traps grid
// ---------------------------------------------------------------------------
function WhatWeCatch() {
  const traps = [
    {
      icon: Gavel,
      title: "IP ownership traps",
      body: "Catches clauses that transfer your work before the client pays in full.",
    },
    {
      icon: Clock,
      title: "Payment & kill fees",
      body: "Flags vague payment terms, missing deposits, and cancellation without compensation.",
    },
    {
      icon: ScanSearch,
      title: "Scope creep language",
      body: "Detects unlimited revisions, vague deliverables, and 'satisfaction' clauses.",
    },
    {
      icon: Shield,
      title: "Liability & indemnity",
      body: "Warns when you're on the hook for unlimited damages or client-side mistakes.",
    },
    {
      icon: AlertOctagon,
      title: "Exclusivity & non-compete",
      body: "Spots overly broad clauses that could block your other client work.",
    },
    {
      icon: Eye,
      title: "Missing protections",
      body: "Tells you what a fair contract should have — and what's quietly missing.",
    },
  ];
  return (
    <SectionEditorial tone="cream" divider="bottom">
      <SectionHeader
        eyebrow="Risk coverage"
        title="We catch the traps buried in the fine print."
        body="Tuned for the contracts people actually sign — contractor agreements, NDAs, employment offers, SaaS terms, service agreements, and freelance SOWs."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {traps.map((t) => (
          <div
            key={t.title}
            className="h-full border border-ink-800/10 bg-beige-50 p-6 transition-colors hover:border-ink-800/30"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center bg-ink-800 text-beige-50">
              <t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-base font-medium tracking-tight text-ink-800">
              {t.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {t.body}
            </p>
          </div>
        ))}
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Use cases — targeted at freelancer personas
// ---------------------------------------------------------------------------
function UseCases() {
  const personas = [
    {
      icon: Palette,
      role: "Designers",
      line: "Protect your IP. Catch unlimited revisions. Never transfer work before payment.",
    },
    {
      icon: PenLine,
      role: "Writers & copywriters",
      line: "Spot rights-grab clauses, ghost edits, and kill-fee loopholes.",
    },
    {
      icon: Camera,
      role: "Creators & videographers",
      line: "Flag usage-rights overreach, perpetual licenses, and missing deposits.",
    },
    {
      icon: Briefcase,
      role: "Consultants",
      line: "Cap your liability, tighten scope, and control termination terms.",
    },
    {
      icon: Megaphone,
      role: "Marketers & social",
      line: "Check deliverables, approval rounds, and non-compete language.",
    },
    {
      icon: Code2,
      role: "Developers & agencies",
      line: "Secure source ownership, warranty terms, and subcontractor rights.",
    },
  ];
  return (
    <SectionEditorial id="use-cases" tone="warm" divider="bottom">
      <SectionHeader
        eyebrow="Built for independents"
        title="Freelancers, creators, and small teams"
        body="PactSafe is tuned to the contracts you actually sign — not corporate M&A paperwork."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => (
          <div
            key={p.role}
            className="h-full border border-ink-800/10 bg-beige-50 p-6 transition-colors hover:border-ink-800/30"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center border border-ink-800 text-ink-800">
                <p.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-base font-medium tracking-tight text-ink-800">
                  {p.role}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">
                  {p.line}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Security — privacy reassurance. Single big editorial card.
// ---------------------------------------------------------------------------
function Security() {
  const items = [
    {
      icon: Lock,
      title: "Encrypted in transit and at rest",
      body: "All uploads are TLS-encrypted and stored with industry-standard AES-256.",
    },
    {
      icon: Eye,
      title: "We don't train on your contracts",
      body: "Your files are never used to train models. Ever. Delete anytime.",
    },
    {
      icon: ShieldCheck,
      title: "Not legal advice — but close",
      body: "Built on public legal patterns. For bet-the-company deals, still call a lawyer.",
    },
  ];
  return (
    <SectionEditorial tone="cream" divider="bottom">
      <div className="mx-auto max-w-5xl border border-ink-800/10 bg-beige-50 p-8 md:p-14">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center bg-ink-800 text-beige-50">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
              Privacy & security
            </p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight text-ink-800 md:text-3xl">
              Your contracts stay yours.
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="border-t border-ink-800/10 pt-6 md:border-t-0 md:pt-0"
            >
              <it.icon
                className="h-5 w-5 text-ink-800"
                strokeWidth={1.75}
              />
              <h3 className="mt-3 text-sm font-medium text-ink-800">
                {it.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Real clauses — what PactSafe actually catches in contracts we've tested
// ---------------------------------------------------------------------------
function RealClauses() {
  const examples = [
    {
      tone: "critical" as const,
      contract: "Freelance Services Agreement",
      label: "Unlimited IP transfer",
      clause:
        '"All work product, including drafts, concepts, and unused variations, shall become the sole property of Client upon creation, irrespective of payment status."',
      explanation:
        "Client owns everything you make — even before paying. If they ghost mid-project, they still walk away with your work.",
    },
    {
      tone: "critical" as const,
      contract: "Consulting Agreement",
      label: "Uncapped liability",
      clause:
        '"Consultant shall indemnify and hold harmless Company from any and all damages, losses, or liabilities arising from the services, without limitation."',
      explanation:
        "No liability cap means a single bad outcome could bankrupt you. A fair contract caps this at fees paid.",
    },
    {
      tone: "high" as const,
      contract: "SaaS MSA",
      label: "Auto-renewal trap",
      clause:
        '"This Agreement shall automatically renew for successive one-year terms unless Customer provides written notice at least 90 days prior to expiration."',
      explanation:
        "90-day pre-notice windows are designed to trap you. Calendar it — or miss it and you're locked in for another year.",
    },
    {
      tone: "high" as const,
      contract: "NDA",
      label: "Perpetual confidentiality",
      clause:
        '"Recipient shall maintain the confidentiality of all Confidential Information in perpetuity following termination of this Agreement."',
      explanation:
        'Most NDAs should expire in 2–5 years. "Perpetuity" is an unusual ask and worth negotiating down.',
    },
    {
      tone: "medium" as const,
      contract: "Design SOW",
      label: "Unlimited revisions",
      clause:
        '"Contractor shall provide revisions as reasonably requested by Client until Client is satisfied with the final deliverable."',
      explanation:
        '"Until satisfied" is a black hole. Fair SOWs cap revisions at 2–3 rounds with hourly fees beyond that.',
    },
    {
      tone: "medium" as const,
      contract: "Vendor Terms",
      label: "Net-60 with no late fee",
      clause:
        '"Payment terms are Net 60 from receipt of properly-submitted invoice. No late fees or interest shall accrue on overdue balances."',
      explanation:
        "Net-60 is borderline predatory for a solo freelancer. No late-fee clause means zero leverage if they stall.",
    },
  ];

  // Severity accents on editorial cards — tinted hex picked to read
  // on cream (not dark) surfaces. Border stays ink-800/10 on every
  // card so the grid reads as one coherent set; the accent lives on
  // the side bar + label text only.
  type ClauseTone = "critical" | "high" | "medium";
  const toneMeta: Record<
    ClauseTone,
    { chip: string; bar: string; label: string; chipBg: string; chipText: string }
  > = {
    critical: {
      chip: "Critical",
      bar: "bg-[#ef4444]",
      label: "text-[#991b1b]",
      chipBg: "bg-[#ef4444]/10 border-[#ef4444]/40",
      chipText: "text-[#991b1b]",
    },
    high: {
      chip: "High",
      bar: "bg-[#f97316]",
      label: "text-[#9a3412]",
      chipBg: "bg-[#f97316]/10 border-[#f97316]/40",
      chipText: "text-[#9a3412]",
    },
    medium: {
      chip: "Medium",
      bar: "bg-[#eab308]",
      label: "text-[#854d0e]",
      chipBg: "bg-[#eab308]/10 border-[#eab308]/50",
      chipText: "text-[#854d0e]",
    },
  };

  return (
    <SectionEditorial tone="warm" divider="bottom">
      <SectionHeader
        eyebrow="Real examples"
        title="What PactSafe actually catches"
        body="Not marketing fluff — real clause patterns we flag, pulled from contracts we've analyzed in testing."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {examples.map((ex) => {
          const meta = toneMeta[ex.tone];
          return (
            <div
              key={ex.label}
              className="flex h-full border border-ink-800/10 bg-beige-50"
            >
              <span
                aria-hidden
                className={cn("w-1 flex-shrink-0", meta.bar)}
              />
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      meta.chipBg,
                      meta.chipText,
                    )}
                  >
                    {meta.chip}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                    {ex.contract}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-4 text-sm font-medium tracking-tight",
                    meta.label,
                  )}
                >
                  {ex.label}
                </p>
                <blockquote className="mt-3 border-l-2 border-ink-800/20 pl-3 font-mono text-[13px] leading-relaxed text-ink-800">
                  {ex.clause}
                </blockquote>
                <p className="mt-4 text-xs leading-relaxed text-ink-600">
                  {ex.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-ink-500">
        These are real clause patterns from sample contracts — not
        customer quotes or testimonials.
      </p>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
function FAQ() {
  const faqs = [
    {
      q: "Is this a replacement for a lawyer?",
      a: "No. PactSafe flags risks and gives you negotiation starting points — but for high-stakes or precedent-setting deals, you should still consult a licensed attorney. Think of it as your first line of defense, not your only line.",
    },
    {
      q: "What kinds of contracts can I analyze?",
      a: "NDAs, freelance SOWs, service agreements, consulting contracts, MSAs, employment offers, vendor terms, and creative licensing agreements. Anything under 200 pages.",
    },
    {
      q: "How private is my data?",
      a: "Uploads are TLS 1.3-encrypted in transit and AES-256-encrypted at rest. We set zero-retention flags on all LLM API calls, and your contracts are never used to train any model. You can delete any analysis from your history with one click and the underlying file is purged within 24 hours. See the Security page for the full breakdown.",
    },
    {
      q: "How accurate is the analysis?",
      a: "PactSafe catches patterns across 50+ well-known risk categories with high precision. It won't catch everything a domain-specialist attorney would — we're a screening tool, not a replacement. On tested freelance contracts, we typically surface the top risks a lawyer would flag in a first-read review.",
    },
    {
      q: "Which file formats are supported?",
      a: "PDF, DOCX, and TXT files up to 10 MB on the Free tier (25 MB on Pro, 50 MB on Team). You can also paste raw contract text directly — no upload needed.",
    },
    {
      q: "Do I need an account?",
      a: "No. You can analyze a contract without signing up. Accounts are optional and unlock history, search, comparison across analyses, and the negotiation composer.",
    },
    {
      q: "What models do you use?",
      a: "Primary analysis runs on Groq + Llama 3.3 70B for speed. Anthropic Claude is available as a fallback provider. We pick whichever gives the best precision for the contract type, with zero-retention enforced at the API layer.",
    },
    {
      q: "Can I use this for client contracts I send out?",
      a: "Yes — running your own outbound contracts through PactSafe is one of the best use cases. You'll catch the language you accidentally made too client-friendly and tighten protections before you send it.",
    },
    {
      q: "What about non-English contracts?",
      a: "Right now we're tuned for English (US and UK). Contracts in other languages will run, but the analysis quality drops. We plan to add Spanish, French, and German next.",
    },
    {
      q: "What happens if the model gets something wrong?",
      a: "It will sometimes miss things or raise soft alarms on safe clauses. Every flag shows the exact quoted text so you can judge it yourself. The risk score is a starting point for negotiation, not a verdict.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No annual lock-ins. Cancel from your account settings; we'll honor a pro-rata refund for the current month if you're on Pro or Team, and you get a 30-day money-back guarantee on your first paid month.",
    },
    {
      q: "Is this built by a law firm?",
      a: "No. PactSafe is built by engineers who got tired of signing lopsided contracts. That's why we're very explicit: we're a tool, not a law firm. The risk patterns are grounded in publicly documented legal best practices.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SectionEditorial id="faq" tone="cream" divider="bottom">
      <SectionHeader eyebrow="FAQ" title="Answers, straight up" />
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-ink-800/10 border border-ink-800/10 bg-beige-50">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-beige-100"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium text-ink-800">
                  {f.q}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 flex-shrink-0 text-ink-500 transition-transform",
                    isOpen && "rotate-180 text-ink-800",
                  )}
                />
              </button>
              {isOpen && (
                <div className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-ink-600">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Final CTA — inverted ink-800 section. Beige text and a beige-on-ink
// primary CTA invert the hero's color relationship so the page reads
// as a deliberate bookend rather than a continuation of the cream
// surfaces above.
// ---------------------------------------------------------------------------
function FinalCTA() {
  return (
    <SectionEditorial tone="inverted" divider="none">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-beige-300">
          One less thing to worry about
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight text-beige-50 md:text-h2">
          The next contract you sign
          <br className="hidden md:block" />
          <span className="text-beige-300"> shouldn&rsquo;t cost you sleep.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-beige-200">
          Analyze your first contract in under a minute. No account, no
          credit card, no catch.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center gap-2 bg-beige-50 px-7 py-3.5 text-sm font-medium text-ink-800 transition-colors hover:bg-beige-100"
          >
            Analyze a contract
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/#how-it-works"
            className="inline-flex items-center justify-center gap-2 border border-beige-50 px-7 py-3.5 text-sm font-medium text-beige-50 transition-colors hover:bg-beige-50 hover:text-ink-800"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-6 text-xs text-beige-300/80">
          PDF · DOCX · TXT · up to 10 MB · private by default
        </p>
      </div>
    </SectionEditorial>
  );
}
