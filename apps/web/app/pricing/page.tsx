import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Minus,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Shield,
  Lock,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { PricingProductJsonLd } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, honest pricing for PactSafe AI. Free forever for your first few contracts. Upgrade for unlimited analyses and team features.",
};

interface Tier {
  name: string;
  price: string;
  period?: string;
  blurb: string;
  icon: React.ElementType;
  highlighted?: boolean;
  cta: { label: string; href: string };
  features: string[];
  footer?: string;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Perfect for the occasional contract. No card required.",
    icon: Sparkles,
    cta: { label: "Analyze a contract", href: "/analyze" },
    features: [
      "3 contract analyses per month",
      "Risk score + red flag report",
      "Plain-English summary",
      "PDF export",
      "Up to 10 MB per file",
    ],
    footer: "No credit card, no trial expiry.",
  },
  {
    name: "Pro",
    price: "$15",
    period: "per month",
    blurb: "For freelancers who sign contracts every week.",
    icon: Zap,
    highlighted: true,
    cta: { label: "Start with Pro", href: "/analyze" },
    features: [
      "Unlimited analyses",
      "Full negotiation composer",
      "Side-by-side contract compare",
      "History & search",
      "Priority processing queue",
      "Advanced risk patterns",
      "Email support",
    ],
    footer: "Cancel anytime. Prorated.",
  },
  {
    name: "Team",
    price: "$39",
    period: "per seat / month",
    blurb: "For agencies and small teams reviewing deals together.",
    icon: Users,
    cta: { label: "Talk to sales", href: "/analyze" },
    features: [
      "Everything in Pro",
      "Shared workspace & comments",
      "Seat management",
      "SSO (Google, Okta)",
      "API access",
      "Custom risk rules",
      "Priority support",
    ],
    footer: "Minimum 3 seats.",
  },
];

interface ComparisonRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  team: string | boolean;
}

const COMPARISON: { section: string; rows: ComparisonRow[] }[] = [
  {
    section: "Core analysis",
    rows: [
      {
        label: "Contracts per month",
        free: "3",
        pro: "Unlimited",
        team: "Unlimited",
      },
      { label: "Risk score & red flags", free: true, pro: true, team: true },
      { label: "Plain-English summary", free: true, pro: true, team: true },
      {
        label: "Missing protections report",
        free: true,
        pro: true,
        team: true,
      },
      {
        label: "Advanced risk patterns",
        free: false,
        pro: true,
        team: true,
      },
      {
        label: "Green flag detection",
        free: false,
        pro: true,
        team: true,
      },
    ],
  },
  {
    section: "Workflow",
    rows: [
      { label: "PDF export", free: true, pro: true, team: true },
      { label: "JSON export", free: false, pro: true, team: true },
      { label: "Negotiation composer", free: false, pro: true, team: true },
      { label: "Contract compare", free: false, pro: true, team: true },
      { label: "History & search", free: "7 days", pro: "Forever", team: "Forever" },
      { label: "File size limit", free: "10 MB", pro: "25 MB", team: "50 MB" },
    ],
  },
  {
    section: "Team & integrations",
    rows: [
      { label: "Shared workspace", free: false, pro: false, team: true },
      { label: "Comments & mentions", free: false, pro: false, team: true },
      { label: "SSO (Google, Okta)", free: false, pro: false, team: true },
      { label: "API access", free: false, pro: false, team: true },
      {
        label: "Custom risk rules",
        free: false,
        pro: false,
        team: true,
      },
    ],
  },
  {
    section: "Support",
    rows: [
      {
        label: "Help center",
        free: true,
        pro: true,
        team: true,
      },
      {
        label: "Email support",
        free: false,
        pro: true,
        team: true,
      },
      {
        label: "Priority response",
        free: false,
        pro: false,
        team: true,
      },
    ],
  },
];

const PRICING_FAQS = [
  {
    q: "Can I try Pro before committing?",
    a: "Yes. Every new account gets a 14-day Pro trial — no credit card required. You can cancel anytime; if you don't, you'll roll back to the Free tier automatically.",
  },
  {
    q: "What happens if I exceed the Free limit?",
    a: "You'll see a friendly prompt to upgrade. Existing analyses stay accessible; you just can't start a new one until the next month or until you upgrade.",
  },
  {
    q: "Do you offer discounts for students or nonprofits?",
    a: "Yes — 50% off Pro for verified students and registered nonprofits. Email us with your .edu address or 501(c)(3) registration.",
  },
  {
    q: "Can I switch plans later?",
    a: "Anytime. Upgrades are prorated to the day; downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is my data safe on all plans?",
    a: "Yes. Every tier — including Free — gets TLS encryption in transit, AES-256 at rest, and a strict no-training policy on your contracts.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PricingProductJsonLd />
      <TopNav variant="marketing" />
      <main id="main-content" className="flex-1">
        <Hero />
        <TrustStrip />
        <Tiers />
        <Comparison />
        <Guarantees />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] bg-grid-dot"
      />
      <div className="container-app pt-16 md:pt-24 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
          <Sparkles className="h-3 w-3" />
          Simple, honest pricing
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl md:text-[54px] md:leading-[1.05] font-semibold tracking-tightest text-gradient">
          Free forever for your first few contracts.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base md:text-lg text-foreground-muted leading-relaxed">
          Pay only if you sign a lot of deals. No seat minimums on Pro, no
          annual lock-in, no surprise overages.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust strip — small badges under the hero
// ---------------------------------------------------------------------------
function TrustStrip() {
  const items = [
    {
      icon: RefreshCw,
      title: "30-day refund",
      body: "No questions asked on your first paid month.",
    },
    {
      icon: CreditCard,
      title: "Stripe-powered billing",
      body: "We never touch your card. Cancel anytime.",
    },
    {
      icon: Lock,
      title: "Private by default",
      body: "Encrypted end-to-end. Never used for training.",
    },
  ];
  return (
    <section className="relative pt-2 pb-10">
      <div className="container-app">
        <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-border-subtle bg-surface/40 p-5">
          {items.map((it) => (
            <div key={it.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
                <it.icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {it.title}
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted leading-relaxed">
                  {it.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------
function Tiers() {
  return (
    <section className="relative pb-20">
      <div className="container-app">
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <TierCard key={t.name} tier={t} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-foreground-subtle">
          Prices in USD. VAT may apply. All plans include encryption in transit
          & at rest and a strict no-training policy on your contracts.
        </p>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 transition-all",
        tier.highlighted
          ? "border-accent/40 bg-gradient-to-b from-accent/[0.08] via-surface/80 to-surface shadow-glow-lg"
          : "border-border bg-surface/60 hover:border-white/10",
      )}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge tone="accent" size="sm">
            Most popular
          </Badge>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1",
            tier.highlighted
              ? "bg-accent/15 text-accent ring-accent/30"
              : "bg-accent/10 text-accent ring-accent/20",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
      </div>

      <p className="mt-4 text-sm text-foreground-muted leading-relaxed min-h-[40px]">
        {tier.blurb}
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {tier.price}
        </span>
        {tier.period && (
          <span className="text-sm text-foreground-muted">{tier.period}</span>
        )}
      </div>

      <Link href={tier.cta.href} className="mt-6">
        <Button
          variant={tier.highlighted ? "primary" : "outline"}
          size="md"
          className="w-full"
        >
          {tier.cta.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>

      <ul className="mt-7 space-y-2.5">
        {tier.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2.5 text-sm text-foreground/90"
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                tier.highlighted
                  ? "bg-accent/15 text-accent"
                  : "bg-success/15 text-success",
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {tier.footer && (
        <p className="mt-6 pt-5 border-t border-border/50 text-xs text-foreground-subtle">
          {tier.footer}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------
function Comparison() {
  return (
    <section className="relative py-20 md:py-28 bg-section">
      <div className="container-app">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Every feature, side by side
          </p>
          <h2 className="mt-3 text-3xl md:text-[40px] md:leading-[1.1] font-semibold tracking-tight text-gradient">
            Compare plans in detail
          </h2>
        </div>

        <div className="mt-14 overflow-x-auto overflow-y-hidden rounded-2xl border border-border bg-surface/40 no-scrollbar">
          <div className="min-w-[720px]">
          {/* Header row */}
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center px-6 py-5 border-b border-border/70">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Feature
            </div>
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={cn(
                  "text-center",
                  t.highlighted && "text-accent",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold",
                    t.highlighted ? "text-accent" : "text-foreground",
                  )}
                >
                  {t.name}
                </p>
                <p className="text-[10px] text-foreground-subtle mt-0.5 tabular-nums">
                  {t.price}
                  {t.period ? ` / ${t.period.replace("per ", "")}` : ""}
                </p>
              </div>
            ))}
          </div>

          {COMPARISON.map((section) => (
            <div key={section.section}>
              <div className="bg-surface/60 px-6 py-2.5 border-t border-border/60 border-b border-border/40">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  {section.section}
                </p>
              </div>
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center px-6 py-3.5 border-t border-border/40 hover:bg-surface-2/30 transition-colors"
                >
                  <div className="text-sm text-foreground/90">{row.label}</div>
                  <Cell v={row.free} />
                  <Cell v={row.pro} highlighted />
                  <Cell v={row.team} />
                </div>
              ))}
            </div>
          ))}
          </div>
        </div>
        <p className="mt-3 md:hidden text-center text-[11px] text-foreground-subtle">
          ← Scroll horizontally to compare →
        </p>
      </div>
    </section>
  );
}

function Cell({
  v,
  highlighted,
}: {
  v: string | boolean;
  highlighted?: boolean;
}) {
  return (
    <div className="flex justify-center">
      {typeof v === "boolean" ? (
        v ? (
          <span
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full",
              highlighted
                ? "bg-accent/15 text-accent"
                : "bg-success/15 text-success",
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center text-foreground-subtle">
            <Minus className="h-3 w-3" />
          </span>
        )
      ) : (
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            highlighted ? "text-accent" : "text-foreground/85",
          )}
        >
          {v}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guarantees row
// ---------------------------------------------------------------------------
function Guarantees() {
  const items = [
    {
      icon: Shield,
      title: "30-day refund",
      body: "Not happy? Full refund on Pro or Team in the first 30 days, no questions asked.",
    },
    {
      icon: Zap,
      title: "Cancel anytime",
      body: "No annual contracts, no cancellation fees. Switch or leave whenever you need to.",
    },
    {
      icon: Sparkles,
      title: "Private by default",
      body: "Encrypted end-to-end, never used for training, delete any analysis instantly.",
    },
  ];
  return (
    <section className="relative py-20 md:py-24">
      <div className="container-app">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((i) => (
            <div
              key={i.title}
              className="rounded-xl border border-border-subtle bg-surface/40 p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                <i.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {i.title}
              </h3>
              <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
                {i.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
function FAQ() {
  return (
    <section className="relative py-20 md:py-28 bg-section">
      <div className="container-app">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Billing FAQ
          </p>
          <h2 className="mt-3 text-3xl md:text-[40px] md:leading-[1.1] font-semibold tracking-tight text-gradient">
            Still got questions?
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-3xl grid gap-3">
          {PRICING_FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-surface/40 overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-medium text-foreground marker:content-none hover:bg-surface-2/50 transition-colors">
                {f.q}
                <span className="ml-auto text-foreground-muted group-open:rotate-180 transition-transform">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm text-foreground-muted leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------
function CTA() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-app">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-surface-2 to-surface p-10 md:p-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(124,92,252,0.25), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Start free. Upgrade when it's worth it.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-foreground-muted">
              No trial clock, no credit card, no catch. Just a cleaner contract
              review the next time you need one.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/analyze">
                <Button size="lg" className="w-full sm:w-auto">
                  Analyze a contract
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
