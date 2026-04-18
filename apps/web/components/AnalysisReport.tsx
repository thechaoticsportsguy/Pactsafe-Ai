"use client";

/**
 * AnalysisReport — the full results dashboard.
 *
 * Pure presentation component. Takes a completed `AnalysisResult` plus
 * some identity metadata (jobId, filename, createdAt) and renders:
 *
 *   - Header with contract-type badges, filename, timestamp, and a
 *     compact toolbar (Copy link + Export PDF).
 *   - Risk gauge + "At a glance" stat card.
 *   - Optional sub-score breakdown when the backend emits one.
 *   - Mobile sticky section chip row + desktop sticky side nav with
 *     scroll-spy tracking the active section.
 *   - Sections: Plain-English summary, Red flags, Missing protections,
 *     In your favor (optional), Negotiation, Clause highlighter.
 *
 * The component intentionally does NO data fetching — both the
 * `/analysis/[id]` route and the inline post-scan render inside
 * `/analyze` can mount it with already-loaded data.
 *
 * It is the single source of truth for the "Target Full Results" view
 * the product spec calls for.
 */

import * as React from "react";
import Link from "next/link";
import {
  Download,
  AlertTriangle,
  ShieldCheck,
  MessageSquareQuote,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Info,
  Link2,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Badge } from "@/components/primitives/Badge";
import { useToast } from "@/components/Toast";
import RiskGauge from "@/components/RiskGauge";
import FlagList from "@/components/FlagList";
import GreenFlagList from "@/components/GreenFlagList";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ClauseHighlighter from "@/components/ClauseHighlighter";
import NegotiationComposer from "@/components/NegotiationComposer";
import { exportPdfUrl } from "@/lib/api";
import {
  displayRiskScore,
  isEmptyAnalysis,
  normalizeAnalysisResult,
} from "@/lib/review";
import type { AnalysisResult, RedFlag } from "@/lib/schemas";
import { getDocumentTypeLabel } from "@/lib/document-type-labels";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Section table
// ---------------------------------------------------------------------------

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
  {
    key: "flags",
    label: "Red flags",
    shortLabel: "Flags",
    icon: AlertTriangle,
  },
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
    label: "Recommendations",
    shortLabel: "Recs",
    icon: MessageSquareQuote,
  },
  {
    key: "clauses",
    label: "Clause highlighter",
    shortLabel: "Clauses",
    icon: FileText,
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnalysisReportProps {
  /** Job identifier. Used for the PDF export URL + share link. */
  jobId: string;
  /** Completed analysis result from the backend. */
  result: AnalysisResult;
  /** Displayed in the header. `null` for pasted-text submissions. */
  filename?: string | null;
  /** ISO timestamp. Formatted for display. */
  createdAt?: string | null;
  /**
   * Legacy preview (~500 chars) kept for back-compat. Used only if
   * `documentText` is not provided. New call sites should pass both so
   * the highlighter can render the full contract; this one is the
   * fallback for older backend builds that don't expose the full text.
   */
  textPreview?: string | null;
  /**
   * Full extracted document text for the clause highlighter. When
   * present, takes precedence over `textPreview` so the full contract
   * renders with v2 citations visible in context.
   */
  documentText?: string | null;
  /**
   * When true, renders a breadcrumb link back to `/history`. Hidden by
   * default so the inline analyze-page render stays clean.
   */
  showBreadcrumb?: boolean;
  /**
   * When true, the Copy-link button copies `window.location.href`.
   * When false (default on inline), it copies the canonical
   * `/analysis/{jobId}` URL so shares always point at a persistent
   * report route.
   */
  copyWindowHref?: boolean;
  /** Narrow the max content width. Defaults to fluid. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalysisReport({
  jobId,
  result: rawResult,
  filename,
  createdAt,
  textPreview,
  documentText,
  showBreadcrumb = false,
  copyWindowHref = true,
  className,
}: AnalysisReportProps) {
  // Prefer the full document when the backend ships it; fall back to the
  // 500-char preview otherwise. Keeps the component functional on older
  // backend builds that predate the `document_text` field.
  const highlighterText = documentText ?? textPreview ?? null;
  const { toast } = useToast();
  /**
   * The "selected" flag. `source` tracks which side the user clicked so
   * the scroll+flash effect below knows which side is the target (card
   * clicks jump to the highlight; highlight clicks jump to the card).
   * Storing the timestamp lets us re-trigger the effect when the user
   * re-clicks the same flag — the index alone wouldn't change.
   */
  const [activeFlag, setActiveFlag] = React.useState<{
    index: number;
    source: "card" | "mark";
    ts: number;
  } | null>(null);
  const activeFlagIndex = activeFlag?.index ?? null;
  const [activeSection, setActiveSection] =
    React.useState<SectionKey>("summary");
  const [linkCopied, setLinkCopied] = React.useState(false);

  // Defensive normalization — upstream callers should already pass a
  // normalized result, but rerunning here keeps the component safe when
  // mounted directly from tests, storybook, or a third-party page.
  const result = React.useMemo(
    () => normalizeAnalysisResult(rawResult) ?? rawResult,
    [rawResult],
  );

  // Memoize every derived array against `result` identity. Without this,
  // each render allocates a fresh `[]` literal for missing fields, which
  // cascades into child useEffects that treat the prop identity as "new"
  // and churn their own state (NegotiationComposer's selected-set reset,
  // ClauseHighlighter's safeFlags memo, etc.). Stable references keep
  // the downstream render graph idempotent.
  const redFlags: RedFlag[] = React.useMemo(
    () => (Array.isArray(result.red_flags) ? result.red_flags : []),
    [result],
  );
  const missingProtections: string[] = React.useMemo(
    () =>
      Array.isArray(result.missing_protections)
        ? result.missing_protections
        : [],
    [result],
  );
  const negotiationSuggestions: string[] = React.useMemo(
    () =>
      Array.isArray(result.negotiation_suggestions)
        ? result.negotiation_suggestions
        : [],
    [result],
  );
  const greenFlags = React.useMemo(
    () => (Array.isArray(result.green_flags) ? result.green_flags : []),
    [result],
  );
  const hasGreen = greenFlags.length > 0;
  const sections = React.useMemo<SectionDef[]>(
    () => ALL_SECTIONS.filter((s) => (s.key === "green" ? hasGreen : true)),
    [hasGreen],
  );

  // Scroll-spy — updates `activeSection` based on which anchor is above
  // the 140px offset from the top of the viewport.
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

  function scrollToSection(key: SectionKey) {
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveSection(key);
  }

  // Bidirectional jump — when a user clicks a flag card in the sidebar we
  // scroll the matching highlight into view and flash it; clicking a
  // highlight does the inverse and flashes the card. The flash class is
  // defined in app/globals.css and self-removes after 1500ms so repeated
  // clicks re-trigger the animation cleanly.
  React.useEffect(() => {
    if (!activeFlag) return;
    const targetId =
      activeFlag.source === "card"
        ? `highlight-flag-${activeFlag.index}`
        : `card-flag-${activeFlag.index}`;
    const el = document.getElementById(targetId);
    if (!el) {
      // No jump target — the quote wasn't locatable for this flag. Fall
      // back to scrolling the clause-highlighter section into view so the
      // user at least lands in the right neighbourhood and can scan by
      // eye. (Card-side miss is impossible: every flag renders a card.)
      if (activeFlag.source === "card") {
        const section = document.getElementById("section-clauses");
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
        toast({
          tone: "info",
          message: "Couldn't pin the exact clause",
          description:
            "We know which section the risk lives in, but couldn't locate the verbatim quote. Scan the highlighted text for the matching phrase.",
        });
      }
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flag-flash");
    const t = window.setTimeout(() => {
      el.classList.remove("flag-flash");
    }, 1500);
    return () => {
      window.clearTimeout(t);
      el.classList.remove("flag-flash");
    };
  }, [activeFlag, toast]);

  const handleCardClick = React.useCallback((_f: RedFlag, i: number) => {
    setActiveFlag({ index: i, source: "card", ts: Date.now() });
  }, []);

  const handleMarkClick = React.useCallback((i: number) => {
    setActiveFlag({ index: i, source: "mark", ts: Date.now() });
  }, []);

  async function copyShareLink() {
    try {
      const href = copyWindowHref
        ? window.location.href
        : `${window.location.origin}/analysis/${jobId}`;
      await navigator.clipboard.writeText(href);
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

  // --- Early exits -------------------------------------------------------

  // Empty-analysis detection — backends can return status=completed with
  // zero flags and an empty summary (LLM returned nothing usable). Swap
  // the default dashboard for an explicit recovery state so we don't
  // render the "50/100 moderate" bug from the old flow.
  if (isEmptyAnalysis(result)) {
    return (
      <div className={cn("space-y-6", className)}>
        {showBreadcrumb && (
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            All analyses
          </Link>
        )}
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning ring-1 ring-warning/30">
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-zinc-100">
                Analysis came back empty
              </h2>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed max-w-2xl">
                We finished the scan but the model didn&rsquo;t return any
                flagged clauses, missing protections, or summary content.
                This usually means the extracted text was too short or the
                upstream model rate-limited. Try again &mdash; or re-upload
                a different format of the same contract.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/analyze">
                  <Button palette="workspace" variant="primary" size="sm" radius="md">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run a new analysis
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button palette="workspace" variant="secondary" size="sm" radius="md">
                    See a sample report instead
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Derived numbers ---------------------------------------------------

  const critical = redFlags.filter((f) => f.severity === "CRITICAL").length;
  const high = redFlags.filter((f) => f.severity === "HIGH").length;
  const medium = redFlags.filter((f) => f.severity === "MEDIUM").length;
  const low = redFlags.filter((f) => f.severity === "LOW").length;
  const displayScore = displayRiskScore(result);

  // --- Main --------------------------------------------------------------

  return (
    <div className={cn("space-y-8", className)}>
      {showBreadcrumb && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
          >
            All analyses
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="gap-1 border-accent/40 bg-accent/10 text-accent">
              <Sparkles className="h-3 w-3" />
              {getDocumentTypeLabel(result.metadata?.document_type)}
            </Badge>
            {result.provider && (
              <Badge variant="neutral">
                {result.provider}
              </Badge>
            )}
            {result.truncated && (
              <Badge className="border-warning/40 bg-warning/10 text-warning">
                Truncated
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl md:text-[28px] font-semibold tracking-tight truncate max-w-2xl text-zinc-100">
            {filename ?? "Pasted contract"}
          </h1>
          {createdAt && (
            <p className="mt-1.5 text-xs text-zinc-400 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Analyzed {new Date(createdAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <Button
            palette="workspace"
            variant="secondary"
            size="sm"
            radius="md"
            onClick={copyShareLink}
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
          <a href={exportPdfUrl(jobId)} target="_blank" rel="noreferrer">
            <Button palette="workspace" variant="primary" size="sm" radius="md">
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Top strip: Risk + key counts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RiskGauge score={displayScore} className="lg:col-span-2" />
        <div className="rounded-lg border border-white/5 bg-surface-1 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            At a glance
          </p>
          <dl className="mt-4 space-y-3">
            <StatRow
              label="Red flags"
              value={redFlags.length}
              tone={
                redFlags.length === 0
                  ? "success"
                  : critical > 0
                    ? "critical"
                    : "warning"
              }
            />
            <StatRow
              label="High"
              value={critical + high}
              tone={critical + high > 0 ? "critical" : "success"}
            />
            <StatRow
              label="Medium"
              value={medium}
              tone={medium > 0 ? "warning" : "success"}
            />
            <StatRow
              label="Low"
              value={low}
              tone={low > 0 ? "success" : "success"}
            />
            <StatRow
              label="Missing protections"
              value={missingProtections.length}
              tone={missingProtections.length === 0 ? "success" : "warning"}
            />
            {hasGreen && (
              <StatRow
                label="In your favor"
                value={greenFlags.length}
                tone="success"
              />
            )}
          </dl>
        </div>
      </div>

      {/* Optional breakdown */}
      {result.sub_scores && <ScoreBreakdown scores={result.sub_scores} />}

      {/* Mobile sticky section nav (horizontal chip row) */}
      <div className="lg:hidden sticky top-16 -mx-5 px-5 py-2 bg-surface-0/95 border-b border-white/5 z-10">
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
                    : "border-white/5 bg-surface-1 text-zinc-400 hover:text-zinc-100",
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
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-surface-2",
                      )}
                    >
                      <s.icon className="h-3.5 w-3.5" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 mx-3 rounded-md border border-white/5 bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <Info className="h-3 w-3" />
                Not legal advice
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                For high-stakes or precedent-setting deals, consult a
                licensed attorney.
              </p>
            </div>
          </div>
        </nav>

        {/* Content — deliberately no overflow/height traps so the page
            scrolls naturally all the way to the last finding. */}
        <div className="min-w-0 space-y-10">
          {/* Summary */}
          <Section id="summary" title="Plain-English summary" icon={Sparkles}>
            <div className="rounded-md border border-white/5 border-l-2 border-l-accent bg-surface-1 p-6">
              <p className="text-base leading-relaxed text-zinc-100 whitespace-pre-line">
                {result.overall_summary && result.overall_summary.trim().length > 0
                  ? result.overall_summary
                  : "The analyzer did not return a plain-English summary for this contract. Check the red flags and missing protections below for the specific findings."}
              </p>
            </div>
          </Section>

          {/* Red flags */}
          <Section
            id="flags"
            title="Red flags"
            icon={AlertTriangle}
            count={redFlags.length}
          >
            <FlagList
              flags={redFlags}
              activeIndex={activeFlagIndex}
              onSelect={handleCardClick}
            />
          </Section>

          {/* Missing protections */}
          <Section
            id="missing"
            title="Missing protections"
            icon={ShieldCheck}
            count={missingProtections.length}
          >
            {missingProtections.length === 0 ? (
              <div className="rounded-md border border-success/30 bg-success/10 p-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm text-zinc-100">
                  No critical protections missing. You&rsquo;re covered on
                  the basics.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-white/5 bg-surface-1 divide-y divide-white/5 overflow-hidden">
                {missingProtections.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-warning/40 bg-warning/10 text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        {m}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Green flags (optional) */}
          {hasGreen && (
            <Section
              id="green"
              title="In your favor"
              icon={CheckCircle2}
              count={greenFlags.length}
            >
              <GreenFlagList flags={greenFlags} />
            </Section>
          )}

          {/* Recommendations / Negotiation */}
          <Section
            id="negotiate"
            title="Recommendations"
            icon={MessageSquareQuote}
          >
            <NegotiationComposer
              suggestions={negotiationSuggestions}
              contractType={getDocumentTypeLabel(result.metadata?.document_type)}
            />
          </Section>

          {/* Clause highlighter */}
          <Section id="clauses" title="Clause highlighter" icon={FileText}>
            {highlighterText ? (
              <ClauseHighlighter
                text={highlighterText}
                flags={redFlags}
                activeIndex={activeFlagIndex}
                onMarkClick={handleMarkClick}
              />
            ) : (
              <div className="rounded-md border border-white/5 bg-surface-1 p-8 text-center text-sm text-zinc-400">
                No extracted text available for this contract.
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helpers
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
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          {title}
        </h2>
        {typeof count === "number" && (
          <Badge variant="neutral">{count}</Badge>
        )}
      </div>
      {children}
    </section>
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
      <dt className="text-sm text-zinc-400">{label}</dt>
      <dd
        className={cn("text-base font-semibold tabular-nums", colorMap[tone])}
      >
        {value}
      </dd>
    </div>
  );
}
