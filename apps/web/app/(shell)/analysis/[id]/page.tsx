"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Download,
  FileJson,
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  MessageSquareQuote,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Info,
  RefreshCw,
  Link2,
  Check,
  Columns2,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import RiskGauge from "@/components/RiskGauge";
import FlagList from "@/components/FlagList";
import GreenFlagList from "@/components/GreenFlagList";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ClauseHighlighter from "@/components/ClauseHighlighter";
import NegotiationComposer from "@/components/NegotiationComposer";
import UploadProgress from "@/components/UploadProgress";
import {
  exportJsonUrl,
  exportPdfUrl,
  getJob,
  subscribeToJob,
} from "@/lib/api";
import type { JobStatusResponse, RedFlag } from "@/lib/schemas";
import { displayRiskScore, isEmptyAnalysis } from "@/lib/review";
import { cn } from "@/lib/cn";

type SectionKey =
  | "summary"
  | "flags"
  | "missing"
  | "green"
  | "negotiate"
  | "clauses";

interface SectionDef {
  key: SectionKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

const ALL_SECTIONS: SectionDef[] = [
  { key: "summary", label: "Summary", shortLabel: "Summary", icon: Sparkles },
  { key: "flags", label: "Red flags", shortLabel: "Flags", icon: AlertTriangle },
  {
    key: "missing",
    label: "Missing protections",
    shortLabel: "Missing",
    icon: ShieldCheck,
  },
  {
    key: "green",
    label: "In your favor",
    shortLabel: "In favor",
    icon: CheckCircle2,
  },
  {
    key: "negotiate",
    label: "Negotiation",
    shortLabel: "Negotiate",
    icon: MessageSquareQuote,
  },
  {
    key: "clauses",
    label: "Clause highlighter",
    shortLabel: "Clauses",
    icon: FileText,
  },
];

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { toast } = useToast();

  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFlag, setActiveFlag] = React.useState<number | null>(null);
  const [activeSection, setActiveSection] =
    React.useState<SectionKey>("summary");
  const [linkCopied, setLinkCopied] = React.useState(false);

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1600);
      toast({
        tone: "success",
        message: "Link copied",
        description: "Send it to your counterpart or client.",
      });
    } catch {
      toast({
        tone: "error",
        message: "Couldn't copy link",
        description: "Your browser blocked clipboard access.",
      });
    }
  }

  const result = job?.result ?? null;
  const hasGreen = !!result?.green_flags && result.green_flags.length > 0;

  // Sections shown depend on whether backend returned optional fields.
  const sections = React.useMemo<SectionDef[]>(() => {
    return ALL_SECTIONS.filter((s) => (s.key === "green" ? hasGreen : true));
  }, [hasGreen]);

  // scroll-spy for side nav
  React.useEffect(() => {
    const handler = () => {
      const current = sections
        .map((s) => {
          const el = document.getElementById(`section-${s.key}`);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { key: s.key, top: rect.top };
        })
        .filter(Boolean) as { key: SectionKey; top: number }[];

      const above = current.filter((c) => c.top <= 140);
      if (above.length > 0) {
        setActiveSection(above[above.length - 1].key);
      } else if (current.length > 0) {
        setActiveSection(current[0].key);
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  // initial load + live subscription if not yet done
  React.useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const j = await getJob(jobId);
        setJob(j);
        if (j.status !== "completed" && j.status !== "failed") {
          cleanup = subscribeToJob(
            jobId,
            (ev) => {
              setJob((prev) =>
                prev
                  ? {
                      ...prev,
                      status: ev.status,
                      result: ev.partial ?? prev.result,
                    }
                  : prev,
              );
              if (ev.status === "completed" || ev.status === "failed") {
                getJob(jobId).then(setJob).catch(() => {});
              }
            },
            () => {},
          );
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => cleanup();
  }, [jobId]);

  function scrollToSection(key: SectionKey) {
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveSection(key);
  }

  if (error) {
    return (
      <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-severity-critical mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-severity-critical">
              Could not load analysis
            </h2>
            <p className="mt-1 text-sm text-foreground/80">{error}</p>
            <div className="mt-3">
              <Link href="/analyze">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-32 w-full md:col-span-2" />
          <div className="skeleton h-32 w-full" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  const stillRunning =
    job.status !== "completed" && job.status !== "failed";

  const critical =
    result?.red_flags.filter((f) => f.severity === "CRITICAL").length ?? 0;
  const high =
    result?.red_flags.filter((f) => f.severity === "HIGH").length ?? 0;

  // Empty-analysis detection — backends can return status=completed with
  // zero flags and an empty summary (LLM returned nothing usable). Swap
  // the default dashboard for an explicit recovery state so we don't
  // render the "50/100 moderate" bug from the old flow.
  const emptyResult = !!result && isEmptyAnalysis(result);
  const displayScore = result ? displayRiskScore(result) : 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs text-foreground-muted">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All analyses
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="accent" size="xs">
              <Sparkles className="h-3 w-3" />
              {result?.contract_type ?? "Analyzing…"}
            </Badge>
            {result?.provider && (
              <Badge tone="neutral" size="xs">
                {result.provider}
              </Badge>
            )}
            {result?.truncated && (
              <Badge tone="warning" size="xs">
                Truncated
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl md:text-[28px] font-semibold tracking-tight truncate max-w-2xl">
            {job.filename ?? "Pasted contract"}
          </h1>
          <p className="mt-1.5 text-xs text-foreground-muted flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Analyzed {new Date(job.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <Link href={`/analysis/${jobId}/live`}>
            <Button variant="outline" size="sm" disabled={!result}>
              <PlayCircle className="h-3.5 w-3.5" />
              Live scan
            </Button>
          </Link>
          <Link href={`/analysis/${jobId}/review`}>
            <Button variant="outline" size="sm" disabled={!result}>
              <Columns2 className="h-3.5 w-3.5" />
              Split-pane review
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={copyShareLink}
            disabled={!result}
          >
            {linkCopied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Copy link
              </>
            )}
          </Button>
          <a href={exportJsonUrl(jobId)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" disabled={!result}>
              <FileJson className="h-3.5 w-3.5" />
              JSON
            </Button>
          </a>
          <a href={exportPdfUrl(jobId)} target="_blank" rel="noreferrer">
            <Button size="sm" disabled={!result}>
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </a>
        </div>
      </div>

      {stillRunning && (
        <UploadProgress
          status={job.status}
          message="Analyzing your contract…"
          progress={job.status === "analyzing" ? 0.6 : 0.25}
        />
      )}

      {job.status === "failed" && (
        <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-severity-critical mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-severity-critical">
                Analysis failed
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {job.error ?? "Something went wrong processing your contract."}
              </p>
              <div className="mt-3">
                <Link href="/analyze">
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && emptyResult && (
        <div className="rounded-2xl border border-warning/40 bg-warning/[0.06] p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning ring-1 ring-warning/30">
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Analysis came back empty
              </h2>
              <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed max-w-2xl">
                We finished the scan but the model didn&rsquo;t return any
                flagged clauses, missing protections, or summary content.
                This usually means the extracted text was too short or the
                upstream model rate-limited. Try again — or re-upload a
                different format of the same contract.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/analyze">
                  <Button size="sm">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run a new analysis
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="sm" variant="outline">
                    See a sample report instead
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && !emptyResult && (
        <>
          {/* Top strip: Risk + key counts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <RiskGauge score={displayScore} className="lg:col-span-2" />
            <div className="rounded-xl border border-border bg-surface/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                At a glance
              </p>
              <dl className="mt-4 space-y-3">
                <StatRow
                  label="Red flags"
                  value={result.red_flags.length}
                  tone={
                    result.red_flags.length === 0
                      ? "success"
                      : critical > 0
                        ? "critical"
                        : "warning"
                  }
                />
                <StatRow
                  label="Critical issues"
                  value={critical}
                  tone={critical > 0 ? "critical" : "success"}
                />
                <StatRow
                  label="High severity"
                  value={high}
                  tone={high > 0 ? "high" : "success"}
                />
                <StatRow
                  label="Missing protections"
                  value={result.missing_protections.length}
                  tone={
                    result.missing_protections.length === 0
                      ? "success"
                      : "warning"
                  }
                />
                {hasGreen && (
                  <StatRow
                    label="In your favor"
                    value={result.green_flags!.length}
                    tone="success"
                  />
                )}
              </dl>
            </div>
          </div>

          {/* Optional breakdown card */}
          {result.sub_scores && (
            <ScoreBreakdown scores={result.sub_scores} />
          )}

          {/* Mobile sticky section nav (horizontal chip row) */}
          <div className="lg:hidden sticky top-16 -mx-5 px-5 py-2 bg-background/80 backdrop-blur-xl border-b border-border-subtle/60 z-10">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
              {sections.map((s) => {
                const active = activeSection === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => scrollToSection(s.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                      active
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border bg-surface/60 text-foreground-muted hover:text-foreground",
                    )}
                  >
                    <s.icon className="h-3 w-3" />
                    {s.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main grid: sticky nav + content */}
          <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
            {/* Desktop sticky nav */}
            <nav className="hidden lg:block">
              <div className="sticky top-24">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Sections
                </p>
                <ul className="mt-2 space-y-0.5">
                  {sections.map((s) => {
                    const active = activeSection === s.key;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(s.key)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-accent/10 text-accent"
                              : "text-foreground-muted hover:text-foreground hover:bg-surface-2",
                          )}
                        >
                          <s.icon className="h-3.5 w-3.5" />
                          {s.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 mx-3 rounded-lg border border-border bg-surface-2/50 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    <Info className="h-3 w-3" />
                    Not legal advice
                  </p>
                  <p className="mt-1.5 text-xs text-foreground-subtle leading-relaxed">
                    For high-stakes or precedent-setting deals, consult a
                    licensed attorney.
                  </p>
                </div>
              </div>
            </nav>

            {/* Content */}
            <div className="min-w-0 space-y-10">
              {/* SUMMARY */}
              <Section id="summary" title="Plain-English summary" icon={Sparkles}>
                <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-surface/20 p-6">
                  <p className="text-base leading-relaxed text-foreground/95">
                    {result.overall_summary}
                  </p>
                </div>
              </Section>

              {/* RED FLAGS */}
              <Section
                id="flags"
                title="Red flags"
                icon={AlertTriangle}
                count={result.red_flags.length}
              >
                <FlagList
                  flags={result.red_flags}
                  activeIndex={activeFlag}
                  onSelect={(_f: RedFlag, i: number) => setActiveFlag(i)}
                />
              </Section>

              {/* MISSING PROTECTIONS */}
              <Section
                id="missing"
                title="Missing protections"
                icon={ShieldCheck}
                count={result.missing_protections.length}
              >
                {result.missing_protections.length === 0 ? (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-sm text-foreground">
                      No critical protections missing. You're covered on the
                      basics.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-surface/70 divide-y divide-border/60 overflow-hidden">
                    {result.missing_protections.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 px-5 py-4"
                      >
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
                )}
              </Section>

              {/* GREEN FLAGS (optional) */}
              {hasGreen && (
                <Section
                  id="green"
                  title="In your favor"
                  icon={CheckCircle2}
                  count={result.green_flags!.length}
                >
                  <GreenFlagList flags={result.green_flags!} />
                </Section>
              )}

              {/* NEGOTIATION */}
              <Section
                id="negotiate"
                title="Negotiation draft"
                icon={MessageSquareQuote}
              >
                <NegotiationComposer
                  suggestions={result.negotiation_suggestions}
                  contractType={result.contract_type}
                />
              </Section>

              {/* CLAUSE HIGHLIGHTER */}
              <Section id="clauses" title="Clause highlighter" icon={FileText}>
                {job.text_preview ? (
                  <ClauseHighlighter
                    text={job.text_preview}
                    flags={result.red_flags}
                    activeIndex={activeFlag}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-surface/70 p-8 text-center text-sm text-foreground-muted">
                    No extracted text available for this contract.
                  </div>
                )}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper with anchor
// ---------------------------------------------------------------------------
function Section({
  id,
  title,
  icon: Icon,
  count,
  children,
}: {
  id: SectionKey;
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${id}`} className="scroll-mt-32">
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
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// At-a-glance stat row
// ---------------------------------------------------------------------------
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
        className={cn(
          "text-base font-semibold tabular-nums",
          colorMap[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}
