import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  MessageSquareQuote,
  ArrowRight,
  Download,
  Clock,
  BookOpen,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RiskGauge from "@/components/RiskGauge";
import FlagList from "@/components/FlagList";
import GreenFlagList from "@/components/GreenFlagList";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import type { AnalysisResult, GreenFlag, RedFlag } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Sample report",
  description:
    "See what a PactSafe AI contract analysis looks like on a real freelance services agreement — risk score, red flags, missing protections, and negotiation draft.",
  alternates: {
    canonical: "/demo",
  },
};

// ---------------------------------------------------------------------------
// Pre-baked sample analysis. Not fetched — rendered statically so visitors
// can explore the full product without hitting the API.
// ---------------------------------------------------------------------------

const SAMPLE_RED_FLAGS: RedFlag[] = [
  {
    clause:
      "All work product, including drafts, concepts, and unused variations, shall become the sole property of Client upon creation, irrespective of payment status.",
    explanation:
      "This transfers IP to the client the moment you create it — before any payment. If the client walks away mid-project, they own your work and you're left holding the bag.",
    severity: "CRITICAL",
    page: 3,
  },
  {
    clause:
      "Consultant shall indemnify and hold harmless Company from any and all damages, losses, or liabilities arising from the services, without limitation.",
    explanation:
      "Unlimited liability means a single downstream mistake could put you in personal financial ruin. Industry standard is to cap liability at total fees paid.",
    severity: "CRITICAL",
    page: 7,
  },
  {
    clause:
      "Client may terminate this Agreement at any time upon written notice, without obligation to compensate Contractor for work in progress.",
    explanation:
      "Termination for convenience with no kill fee is predatory. A fair contract compensates for work done up to the termination date.",
    severity: "HIGH",
    page: 5,
  },
  {
    clause:
      "Contractor shall provide revisions as reasonably requested by Client until Client is satisfied with the final deliverable.",
    explanation:
      "‘Until satisfied’ is a black hole. Every fair SOW caps revisions at 2–3 rounds, with hourly fees beyond that.",
    severity: "HIGH",
    page: 2,
  },
  {
    clause:
      "Payment terms are Net 60 from receipt of properly-submitted invoice. No late fees or interest shall accrue on overdue balances.",
    explanation:
      "Net-60 is borderline predatory for a solo freelancer. No late-fee clause means you have zero leverage if the client stalls.",
    severity: "MEDIUM",
    page: 4,
  },
  {
    clause:
      "Contractor shall not provide similar services to any competitor of Client for a period of twelve (12) months following termination of this Agreement.",
    explanation:
      "A 12-month non-compete on 'similar services' could block your entire freelance income. Non-competes for independent contractors are often unenforceable — push back hard.",
    severity: "MEDIUM",
    page: 9,
  },
];

const SAMPLE_GREEN_FLAGS: GreenFlag[] = [
  {
    clause:
      "Client shall reimburse Contractor for pre-approved travel and material expenses incurred in the performance of the services, within 30 days of submission.",
    explanation:
      "Expense reimbursement with a clear timeline. This is a good clause — protect it during negotiation.",
    page: 6,
  },
  {
    clause:
      "This Agreement shall be governed by the laws of the State of California, and any disputes shall be resolved through binding arbitration in San Francisco County.",
    explanation:
      "Governing law and dispute venue are both specified. That's better than silent, even if you'd prefer your own state.",
    page: 11,
  },
];

const SAMPLE_RESULT: AnalysisResult = {
  contract_type: "Freelance Services Agreement",
  risk_score: 72,
  overall_summary:
    "This contract heavily favors the client. It transfers IP ownership before payment, caps your liability at unlimited, lets the client walk away with no kill fee, and requires unlimited revisions 'until satisfied'. Payment terms are Net-60 with no late-fee protection. The 12-month non-compete is likely unenforceable for an independent contractor but should still be negotiated out. Do not sign without pushing back on at least the critical items.",
  red_flags: SAMPLE_RED_FLAGS,
  missing_protections: [
    "Upfront deposit (25–50% typical for freelance SOWs)",
    "Liability cap equal to fees paid",
    "Defined revision rounds with hourly rate for overages",
    "Kill fee or termination-for-convenience compensation",
    "Late-payment interest clause (typically 1.5% per month)",
    "Portfolio usage rights for the finished work",
  ],
  negotiation_suggestions: [
    "Add a 50% upfront deposit before work commences, balance due on delivery.",
    "Cap total liability at the aggregate fees paid under this agreement.",
    "Transfer IP ownership on full payment, not on creation.",
    "Cap revisions at 3 rounds, $150/hour thereafter.",
    "Add a kill fee equal to 50% of remaining unpaid fees if client terminates for convenience.",
    "Strike the 12-month non-compete; it's unenforceable and blocks future income.",
    "Add a 1.5%/month late fee on any overdue balance.",
  ],
  model_used: "llama-3.3-70b-versatile",
  provider: "groq",
  error: null,
  truncated: false,
  green_flags: SAMPLE_GREEN_FLAGS,
  sub_scores: {
    fairness: 28,
    clarity: 54,
    protection: 22,
    payment_safety: 34,
  },
};

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="marketing" />
      <main id="main-content" className="flex-1">
        {/* Demo banner */}
        <div className="border-b border-accent/30 bg-accent/[0.08]">
          <div className="container-app flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  This is a sample report.
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted leading-relaxed">
                  Rendered from pre-baked data so you can explore the full
                  output without waiting for an analysis.
                </p>
              </div>
            </div>
            <Link href="/analyze" className="flex-shrink-0">
              <Button size="sm">
                Try with your contract
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="container-app py-10 md:py-14">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="accent" size="xs">
                    <Sparkles className="h-3 w-3" />
                    {SAMPLE_RESULT.contract_type}
                  </Badge>
                  <Badge tone="neutral" size="xs">
                    sample
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl md:text-[28px] font-semibold tracking-tight truncate max-w-2xl">
                  sample-freelance-agreement.pdf
                </h1>
                <p className="mt-1.5 text-xs text-foreground-muted flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Analyzed in 47 seconds
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Button variant="outline" size="sm" disabled>
                  <Download className="h-3.5 w-3.5" />
                  Export PDF
                </Button>
                <Link href="/analyze">
                  <Button size="sm">
                    Try it yourself
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Top strip */}
            <div className="grid gap-4 lg:grid-cols-3">
              <RiskGauge
                score={SAMPLE_RESULT.risk_score}
                className="lg:col-span-2"
              />
              <div className="rounded-xl border border-border bg-surface/70 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  At a glance
                </p>
                <dl className="mt-4 space-y-3">
                  <StatRow
                    label="Red flags"
                    value={SAMPLE_RESULT.red_flags.length}
                    tone="critical"
                  />
                  <StatRow label="Critical issues" value={2} tone="critical" />
                  <StatRow label="High severity" value={2} tone="high" />
                  <StatRow
                    label="Missing protections"
                    value={SAMPLE_RESULT.missing_protections.length}
                    tone="warning"
                  />
                  <StatRow
                    label="In your favor"
                    value={SAMPLE_RESULT.green_flags!.length}
                    tone="success"
                  />
                </dl>
              </div>
            </div>

            {SAMPLE_RESULT.sub_scores && (
              <ScoreBreakdown scores={SAMPLE_RESULT.sub_scores} />
            )}

            {/* Sections */}
            <div className="space-y-10">
              {/* Summary */}
              <section>
                <SectionHeader icon={Sparkles} title="Plain-English summary" />
                <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-surface/20 p-6">
                  <p className="text-base leading-relaxed text-foreground/95">
                    {SAMPLE_RESULT.overall_summary}
                  </p>
                </div>
              </section>

              {/* Red flags */}
              <section>
                <SectionHeader
                  icon={AlertTriangle}
                  title="Red flags"
                  count={SAMPLE_RESULT.red_flags.length}
                />
                <FlagList flags={SAMPLE_RESULT.red_flags} />
              </section>

              {/* Missing protections */}
              <section>
                <SectionHeader
                  icon={ShieldCheck}
                  title="Missing protections"
                  count={SAMPLE_RESULT.missing_protections.length}
                />
                <div className="rounded-xl border border-border bg-surface/70 divide-y divide-border/60 overflow-hidden">
                  {SAMPLE_RESULT.missing_protections.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-4">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-warning/40 bg-warning/10 text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {m}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Green flags */}
              <section>
                <SectionHeader
                  icon={CheckCircle2}
                  title="In your favor"
                  count={SAMPLE_RESULT.green_flags!.length}
                />
                <GreenFlagList flags={SAMPLE_RESULT.green_flags!} />
              </section>

              {/* Negotiation */}
              <section>
                <SectionHeader
                  icon={MessageSquareQuote}
                  title="Negotiation suggestions"
                  count={SAMPLE_RESULT.negotiation_suggestions.length}
                />
                <div className="rounded-xl border border-border bg-surface/70 p-5">
                  <ul className="space-y-2.5">
                    {SAMPLE_RESULT.negotiation_suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-foreground/90"
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent ring-1 ring-accent/20 tabular-nums">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-16 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface-2 to-surface p-8 md:p-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Your turn
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              See what PactSafe flags in your contract.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm text-foreground-muted leading-relaxed">
              Free to start. No account required. Get a full report like this
              one in under a minute.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/analyze">
                <Button size="lg" className="w-full sm:w-auto">
                  Analyze a contract
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {typeof count === "number" && (
        <Badge tone="neutral" size="xs">
          {count}
        </Badge>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "critical" | "high" | "warning" | "success";
}) {
  const colorMap = {
    critical: "text-severity-critical",
    high: "text-severity-high",
    warning: "text-warning",
    success: "text-success",
  } as const;
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-foreground-muted">{label}</dt>
      <dd
        className={`text-base font-semibold tabular-nums ${colorMap[tone]}`}
      >
        {value}
      </dd>
    </div>
  );
}
