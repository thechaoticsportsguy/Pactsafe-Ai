"use client";

/**
 * ContractPreview — left column of the side-by-side scan layout.
 *
 * Renders the uploaded contract as a simulated "PDF viewer":
 *   • A toolbar at the top (filename, page count, scan status dot)
 *   • A thin shimmer progress bar
 *   • A scrollable white-paper document area with:
 *       – Serif body text split into lines
 *       – A glowing scan beam sweeping top→bottom
 *       – Color-coded annotation chips that appear as the scan
 *         passes each clause (CRITICAL=red, HIGH=orange, MEDIUM=amber,
 *         POSITIVE=green)
 *   • When done=true the beam stops and all highlights lock in
 *
 * This component owns only its own scroll and animation state; it
 * never mutates job state and is safe to unmount at any time.
 */

import * as React from "react";
import {
  FileText,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SynthSeverity = "critical" | "high" | "medium" | "positive";

interface SynthAnnotation {
  lineIndex: number;
  severity: SynthSeverity;
  label: string;
  /** 0..1 — progress threshold at which this annotation appears */
  at: number;
}

// ---------------------------------------------------------------------------
// Annotation pool — realistic freelancer-contract issues
// ---------------------------------------------------------------------------

const SYNTH_POOL: { severity: SynthSeverity; label: string }[] = [
  { severity: "critical", label: "IP transfers on signature, not payment" },
  { severity: "critical", label: "Unlimited contractor liability" },
  { severity: "critical", label: "One-sided termination — no kill fee" },
  { severity: "critical", label: "Company can amend without signature" },
  { severity: "high",     label: "Net-60 payment window" },
  { severity: "high",     label: "Non-compete — 3 yr, all of North America" },
  { severity: "high",     label: "Perpetual confidentiality — no sunset" },
  { severity: "high",     label: "Scope changeable at sole discretion" },
  { severity: "medium",   label: "Auto-renews — 90-day notice required" },
  { severity: "medium",   label: "All expenses on contractor" },
  { severity: "medium",   label: "Arbitration in company's jurisdiction" },
  { severity: "positive", label: "Mutual indemnification" },
  { severity: "positive", label: "Portfolio rights retained" },
];

// ---------------------------------------------------------------------------
// Sample fallback text for file-upload mode (user's text isn't available)
// ---------------------------------------------------------------------------

const SAMPLE_LINES = [
  "MASTER SERVICES AGREEMENT",
  "",
  'This Agreement is entered into by and between NORTHFIELD GROWTH LABS LLC',
  '("Company") and the Contractor named on the signature page ("Contractor").',
  "",
  "1. SCOPE OF SERVICES",
  "Contractor shall provide the services set forth in one or more statements",
  "of work, together with any related tasks as Company may request from time",
  "to time, at Company's sole and exclusive discretion.",
  "",
  "2. COMPENSATION",
  "Company will pay Contractor the amounts specified in the applicable SOW,",
  "within 60 days after Company determines, in its sole judgment, that the",
  "services were satisfactorily completed.",
  "",
  "3. INTELLECTUAL PROPERTY",
  "All work product, drafts, ideas, suggestions, processes, templates,",
  "discoveries, and improvements conceived or developed during the engagement",
  "shall be the exclusive property of Company, whether or not related to",
  "Company's business.",
  "",
  "4. CONFIDENTIALITY",
  "Contractor shall keep confidential all non-public information learned",
  "during the relationship and shall continue to do so permanently.",
  "",
  "5. NON-COMPETE",
  "During the term and for 3 years after, Contractor may not provide similar",
  "services to any business that competes, or may compete, with Company",
  "anywhere in North America.",
  "",
  "6. INDEMNIFICATION",
  "Contractor shall defend, indemnify, and hold Company harmless from any",
  "and all claims, losses, penalties, fines, legal fees, and damages arising",
  "out of or related in any way to the services or this Agreement.",
  "",
  "7. LIMITATION OF LIABILITY",
  "Company's total liability under this Agreement shall not exceed $100.",
  "",
  "8. TERMINATION",
  "Company may terminate this Agreement at any time for convenience.",
  "Contractor may terminate only upon 120 days' prior written notice and",
  "only if all assigned work is fully completed.",
  "",
  "9. ENTIRE AGREEMENT",
  "Any amendment may be made by Company alone; Contractor's signature is",
  "not required for changes Company deems administrative or operational.",
];

// ---------------------------------------------------------------------------
// Severity styling (maps to dark theme design tokens)
// ---------------------------------------------------------------------------

const SEV_STYLE: Record<
  SynthSeverity,
  { bg: string; border: string; text: string; chip: string; Icon: React.ElementType }
> = {
  critical: {
    bg:     "bg-severity-critical/10",
    border: "border-severity-critical/40",
    text:   "text-severity-critical",
    chip:   "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
    Icon:   AlertOctagon,
  },
  high: {
    bg:     "bg-severity-high/10",
    border: "border-severity-high/40",
    text:   "text-severity-high",
    chip:   "bg-severity-high/15 text-severity-high border-severity-high/30",
    Icon:   AlertTriangle,
  },
  medium: {
    bg:     "bg-severity-medium/8",
    border: "border-severity-medium/35",
    text:   "text-severity-medium",
    chip:   "bg-severity-medium/12 text-severity-medium border-severity-medium/30",
    Icon:   AlertTriangle,
  },
  positive: {
    bg:     "bg-success/8",
    border: "border-success/30",
    text:   "text-success",
    chip:   "bg-success/12 text-success border-success/25",
    Icon:   ShieldCheck,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAnnotations(lineCount: number): SynthAnnotation[] {
  const candidates = Array.from({ length: lineCount }, (_, i) => i).filter(
    (i) => i > 1,
  );
  const MAX = Math.min(7, Math.floor(candidates.length / 3));
  const chosen: SynthAnnotation[] = [];
  for (let k = 0; k < MAX; k++) {
    const idx = candidates[Math.floor((k + 0.5) * (candidates.length / MAX))];
    const pool = SYNTH_POOL[(idx * 7 + k * 3) % SYNTH_POOL.length];
    chosen.push({
      lineIndex: idx,
      severity: pool.severity,
      label: pool.label,
      at: 0.12 + (k / Math.max(1, MAX - 1)) * 0.8,
    });
  }
  return chosen.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContractPreviewProps {
  status: JobStatus;
  /** Normalized 0..1 progress from the parent's poll loop. */
  progress: number;
  /** Raw pasted text — rendered verbatim when available. */
  text?: string | null;
  /** Uploaded filename. */
  filename?: string | null;
  /** Seconds elapsed since the job started. */
  elapsed?: number;
  /** True once the backend reports "completed" — freezes beam, locks highlights. */
  done?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContractPreview({
  status,
  progress,
  text,
  filename,
  elapsed = 0,
  done = false,
}: ContractPreviewProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const lineRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  // ── Source lines ──────────────────────────────────────────────────────────
  const lines = React.useMemo(() => {
    const raw = (text ?? "").trim();
    const src = raw.length >= 40 ? raw : SAMPLE_LINES.join("\n");
    return src.split(/\r?\n/).slice(0, 56);
  }, [text]);

  // ── Local progress ramp ───────────────────────────────────────────────────
  // Keeps the beam moving even when polling is slow.
  const [localTick, setLocalTick] = React.useState(0);
  const inFlight = !done && status !== "failed";

  React.useEffect(() => {
    if (!inFlight) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const ramp = ((Date.now() - start) / 1000 / 28) % 1;
      setLocalTick(ramp);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [inFlight, status]);

  const effectiveProg = done
    ? 1
    : Math.max(0.06, Math.min(0.98, Math.max(progress, localTick)));

  // ── Scan beam position ────────────────────────────────────────────────────
  const [beamPct, setBeamPct] = React.useState(0);

  React.useEffect(() => {
    if (done) { setBeamPct(100); return; }
    if (!inFlight) return;
    const start = Date.now();
    let raf = 0;
    const loop = () => {
      const t = ((Date.now() - start) / 6000) % 1;
      setBeamPct(t * 100);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [inFlight, done, status]);

  // ── Annotations ───────────────────────────────────────────────────────────
  const annotations = React.useMemo(
    () => buildAnnotations(lines.length),
    [lines.length],
  );
  const visible = annotations.filter((a) => effectiveProg >= a.at);

  // ── Auto-scroll to keep the scan beam visible ─────────────────────────────
  React.useEffect(() => {
    if (done || !scrollRef.current) return;
    const container = scrollRef.current;
    const targetY = (beamPct / 100) * container.scrollHeight;
    const halfVp = container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetY - halfVp), behavior: "smooth" });
  }, [Math.round(beamPct / 5), done]); // throttle scroll updates

  // ── Counts for the toolbar ────────────────────────────────────────────────
  const reds    = visible.filter((a) => a.severity === "critical" || a.severity === "high").length;
  const yellows = visible.filter((a) => a.severity === "medium").length;

  // ── Progress percent ─────────────────────────────────────────────────────
  const pct = done ? 100 : Math.round(effectiveProg * 100);

  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-0 flex-col overflow-hidden border-r border-border/50 bg-[#e8e8ec] dark:bg-[#13131a]">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border/60 bg-surface/90 px-4 py-2.5 backdrop-blur-sm">
        {/* Dot indicator */}
        {done ? (
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" />
        ) : (
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="absolute inset-0 animate-ping-slow rounded-full bg-accent/50" />
            <span className="relative h-3 w-3 rounded-full bg-accent" />
          </span>
        )}

        {/* Filename */}
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-foreground-muted">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate font-medium text-foreground">
            {filename ?? "contract.pdf"}
          </span>
        </span>

        {/* Status / counts */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-4 text-[10px] tabular-nums">
          {!done && reds > 0 && (
            <span className="font-semibold text-severity-critical">
              {reds} risk{reds !== 1 ? "s" : ""}
            </span>
          )}
          {!done && yellows > 0 && (
            <span className="font-semibold text-severity-medium">
              {yellows} caution{yellows !== 1 ? "s" : ""}
            </span>
          )}
          {done ? (
            <span className="font-semibold text-success">Complete</span>
          ) : (
            <span className="text-foreground-muted">{pct}%</span>
          )}
        </div>
      </div>

      {/* ── Progress shimmer bar ──────────────────────────────────────────── */}
      <div className="h-[3px] flex-shrink-0 bg-surface-3/60">
        <div
          className={cn(
            "h-full transition-[width] duration-700 ease-out",
            done
              ? "bg-success"
              : "animate-shimmer bg-gradient-to-r from-accent via-accent-hover to-accent bg-[length:200%_100%]",
          )}
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>

      {/* ── Document scroll area ──────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-6"
      >
        {/* White paper page */}
        <div
          className={cn(
            "relative mx-auto max-w-2xl rounded-sm bg-white shadow-[0_1px_8px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.08)] transition-shadow duration-1000",
            inFlight && "shadow-[0_2px_24px_rgba(99,102,241,0.12),0_0_1px_rgba(0,0,0,0.08)]",
          )}
          style={{ minHeight: "80vh" }}
        >
          {/* Page number badge */}
          <div className="absolute right-4 top-3 text-[9px] font-medium text-gray-300 select-none">
            Page 1
          </div>

          {/* Scan beam — inside the paper */}
          {inFlight && (
            <>
              {/* Soft glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 h-28 -translate-y-1/2 transition-none"
                style={{
                  top: `${beamPct}%`,
                  background:
                    "linear-gradient(to bottom, rgba(99,102,241,0) 0%, rgba(99,102,241,0.06) 45%, rgba(99,102,241,0.1) 50%, rgba(99,102,241,0.06) 55%, rgba(99,102,241,0) 100%)",
                }}
              />
              {/* Sharp beam line */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 h-[2px] -translate-y-1/2"
                style={{
                  top: `${beamPct}%`,
                  background:
                    "linear-gradient(to right, rgba(99,102,241,0) 0%, rgba(99,102,241,0.7) 20%, rgba(99,102,241,0.9) 50%, rgba(99,102,241,0.7) 80%, rgba(99,102,241,0) 100%)",
                  boxShadow: "0 0 20px 2px rgba(99,102,241,0.4)",
                }}
              />
            </>
          )}

          {/* Document body */}
          <div className="px-10 pb-16 pt-12">
            {lines.map((line, i) => {
              const anno = visible.find((a) => a.lineIndex === i);
              const isBlank = line.trim().length === 0;

              if (isBlank) {
                return <div key={i} className="h-3" />;
              }

              // Heading detection: all-caps or short line at top
              const isHeading =
                i === 0 ||
                (line === line.toUpperCase() && line.length < 60 && line.trim().length > 0);

              if (isHeading) {
                return (
                  <div
                    key={i}
                    ref={(el) => { lineRefs.current[i] = el; }}
                    className="mb-1 text-center font-serif text-[14px] font-bold tracking-tight text-gray-900"
                  >
                    {line}
                  </div>
                );
              }

              if (!anno) {
                return (
                  <div
                    key={i}
                    ref={(el) => { lineRefs.current[i] = el; }}
                    className="font-serif text-[12.5px] leading-[1.85] text-gray-700"
                  >
                    {line}
                  </div>
                );
              }

              // Annotated line
              const s = SEV_STYLE[anno.severity];
              const { Icon } = s;
              return (
                <div
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  className="animate-fade-in-up"
                >
                  <div
                    className={cn(
                      "relative rounded-[3px] border-l-2 py-0.5 pl-2 font-serif text-[12.5px] leading-[1.85]",
                      s.bg,
                      s.border.replace("border-", "border-l-"),
                      "text-gray-800",
                    )}
                  >
                    {line}
                    {/* Chip pinned top-right */}
                    <span
                      className={cn(
                        "pointer-events-none absolute -right-1 -top-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm",
                        s.chip,
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                      {anno.severity === "positive" ? "Safe" : anno.severity}
                    </span>
                  </div>
                  {/* Annotation label below the line */}
                  <div className={cn("pb-0.5 pl-2 text-[10px] italic", s.text)}>
                    {anno.label}
                  </div>
                </div>
              );
            })}

            {/* Done overlay */}
            {done && (
              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>All clauses reviewed · generating report…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
