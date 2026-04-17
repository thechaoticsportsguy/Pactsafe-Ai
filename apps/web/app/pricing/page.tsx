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
import { Button } from "@/components/primitives/Button";
import { Badge } from "@/components/primitives/Badge";
import {
  SectionEditorial,
  SectionHeader,
} from "@/components/primitives/Section";
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
      <TopNav variant="editorial" />
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
// Hero — cream band, centered headline, no purple glow.
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative bg-beige-100">
      <div className="container-app pt-16 pb-10 md:pt-24 md:pb-14 text-center">
        <div className="inline-flex">
          <Badge variant="eyebrow">Simple, honest pricing</Badge>
        </div>
        <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
          Free forever for your first few contracts.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-600 md:text-body-lg">
          Pay only if you sign a lot of deals. No seat minimums on Pro, no
          annual lock-in, no surprise overages.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust strip — 3 reassurances sitting directly below the hero.
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
    <section className="relative bg-beige-100 pb-10">
      <div className="container-app">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-0 border border-ink-800/10 bg-beige-50 sm:grid-cols-3">
          {items.map((it, i) => (
            <div
              key={it.title}
              className={cn(
                "flex items-start gap-3 p-5",
                i > 0 && "sm:border-l sm:border-ink-800/10",
              )}
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-ink-800 text-beige-50">
                <it.icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-800">{it.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">
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
// Tiers — three editorial cards, Pro inverted to ink-800.
// ---------------------------------------------------------------------------
function Tiers() {
  return (
    <SectionEditorial tone="cream" divider="top" pad="lg">
      <div className="grid gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <TierCard key={t.name} tier={t} />
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-ink-500">
        Prices in USD. VAT may apply. All plans include encryption in transit
        &amp; at rest and a strict no-training policy on your contracts.
      </p>
    </SectionEditorial>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon;
  const dark = !!tier.highlighted;

  return (
    <div
      className={cn(
        "relative flex flex-col border p-7",
        dark
          ? "border-ink-800 bg-ink-800 text-beige-50"
          : "border-ink-800/10 bg-beige-50 text-ink-800",
      )}
    >
      {dark && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center bg-beige-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-ink-800">
            Most popular
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center",
            dark
              ? "bg-beige-50/10 text-beige-50"
              : "bg-ink-800 text-beige-50",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3
          className={cn(
            "text-lg font-medium tracking-tight",
            dark ? "text-beige-50" : "text-ink-800",
          )}
        >
          {tier.name}
        </h3>
      </div>

      <p
        className={cn(
          "mt-4 min-h-[40px] text-sm leading-relaxed",
          dark ? "text-beige-200" : "text-ink-600",
        )}
      >
        {tier.blurb}
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span
          className={cn(
            "text-4xl font-medium tracking-tight tabular-nums",
            dark ? "text-beige-50" : "text-ink-800",
          )}
        >
          {tier.price}
        </span>
        {tier.period && (
          <span
            className={cn(
              "text-sm",
              dark ? "text-beige-200" : "text-ink-500",
            )}
          >
            {tier.period}
          </span>
        )}
      </div>

      <Link href={tier.cta.href} className="mt-6 w-full">
        {dark ? (
          // Inverted CTA on the dark card: beige solid with ink text
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-center gap-2 bg-beige-50 px-5 text-[13px] font-medium text-ink-800 transition-colors hover:bg-beige-100"
          >
            {tier.cta.label}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <Button
            palette="editorial"
            variant="secondary"
            size="md"
            className="w-full"
          >
            {tier.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </Link>

      <ul className="mt-7 space-y-2.5">
        {tier.features.map((f) => (
          <li
            key={f}
            className={cn(
              "flex items-start gap-2.5 text-sm",
              dark ? "text-beige-100" : "text-ink-700",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center",
                dark
                  ? "bg-beige-50 text-ink-800"
                  : "bg-ink-800 text-beige-50",
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {tier.footer && (
        <p
          className={cn(
            "mt-6 pt-5 text-xs",
            dark
              ? "border-t border-beige-50/15 text-beige-200"
              : "border-t border-ink-800/10 text-ink-500",
          )}
        >
          {tier.footer}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison table — beige-50 inside warm band.
// ---------------------------------------------------------------------------
function Comparison() {
  return (
    <SectionEditorial tone="warm" divider="top" pad="lg">
      <SectionHeader
        align="center"
        eyebrow="Every feature, side by side"
        title="Compare plans in detail"
      />

      <div className="no-scrollbar mt-12 overflow-x-auto overflow-y-hidden border border-ink-800/10 bg-beige-50">
        <div className="min-w-[720px]">
          {/* Header row */}
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-b border-ink-800/10 px-6 py-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
              Feature
            </div>
            {TIERS.map((t) => (
              <div key={t.name} className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    t.highlighted ? "text-ink-800" : "text-ink-700",
                  )}
                >
                  {t.name}
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-ink-500">
                  {t.price}
                  {t.period ? ` / ${t.period.replace("per ", "")}` : ""}
                </p>
              </div>
            ))}
          </div>

          {COMPARISON.map((section) => (
            <div key={section.section}>
              <div className="border-t border-ink-800/10 bg-beige-100 px-6 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-500">
                  {section.section}
                </p>
              </div>
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-t border-ink-800/10 px-6 py-3.5"
                >
                  <div className="text-sm text-ink-700">{row.label}</div>
                  <Cell v={row.free} />
                  <Cell v={row.pro} highlighted />
                  <Cell v={row.team} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-500 md:hidden">
        ← Scroll horizontally to compare →
      </p>
    </SectionEditorial>
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
              "inline-flex h-5 w-5 items-center justify-center",
              highlighted
                ? "bg-ink-800 text-beige-50"
                : "bg-ink-800/10 text-ink-800",
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </span>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center text-ink-400">
            <Minus className="h-3 w-3" />
          </span>
        )
      ) : (
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            highlighted ? "text-ink-800" : "text-ink-700",
          )}
        >
          {v}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guarantees row — 3 reassurances in cream.
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
    <SectionEditorial tone="cream" divider="top" pad="lg">
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.title}
            className="border border-ink-800/10 bg-beige-50 p-6"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center bg-ink-800 text-beige-50">
              <i.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-base font-medium tracking-tight text-ink-800">
              {i.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              {i.body}
            </p>
          </div>
        ))}
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// FAQ — beige-50 accordion cards on a warm band.
// ---------------------------------------------------------------------------
function FAQ() {
  return (
    <SectionEditorial tone="warm" divider="top" pad="lg">
      <SectionHeader
        align="center"
        eyebrow="Billing FAQ"
        title="Still got questions?"
      />
      <div className="mx-auto mt-12 grid max-w-3xl gap-3">
        {PRICING_FAQS.map((f) => (
          <details
            key={f.q}
            className="group overflow-hidden border border-ink-800/10 bg-beige-50"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink-800 transition-colors marker:content-none hover:bg-beige-100">
              {f.q}
              <span className="ml-auto text-ink-500 transition-transform group-open:rotate-180">
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
            <div className="px-5 pb-5 text-sm leading-relaxed text-ink-600">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </SectionEditorial>
  );
}

// ---------------------------------------------------------------------------
// Final CTA — inverted ink-800, matches FinalCTA pattern on landing.
// ---------------------------------------------------------------------------
function CTA() {
  return (
    <SectionEditorial tone="inverted" pad="xl">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-medium tracking-tightest text-beige-50 md:text-h2 md:leading-[1.05]">
          Start free. Upgrade when it&rsquo;s worth it.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-beige-200">
          No trial clock, no credit card, no catch. Just a cleaner contract
          review the next time you need one.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/analyze">
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 bg-beige-50 px-7 text-[15px] font-medium text-ink-800 transition-colors hover:bg-beige-100 sm:w-auto"
            >
              Analyze a contract
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/#how-it-works">
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 border border-beige-50/40 px-7 text-[15px] font-medium text-beige-50 transition-colors hover:border-beige-50 hover:bg-beige-50/5 sm:w-auto"
            >
              See how it works
            </button>
          </Link>
        </div>
      </div>
    </SectionEditorial>
  );
}
