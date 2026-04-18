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
 *   • When done=true the beam stops and the status flips to Complete
 *
 * This component previously painted synthetic severity chips (e.g.
 * "Net-60 payment window") onto randomly-chosen lines using a hardcoded
 * label pool. That was a pre-v2 UX gimmick and became a correctness
 * problem once the analyzer started grounding every label to a cited
 * clause: the preview's fake labels looked just like real findings and
 * didn't reflect what the v2 pipeline actually flagged. Labels are now
 * owned exclusively by the AnalysisReport below (which renders the
 * grounded v2 red_flags). The preview is pure visual feedback.
 *
 * This component owns only its own scroll and animation state; it
 * never mutates job state and is safe to unmount at any time.
 */

import * as React from "react";
import { FileText, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/schemas";

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
  /**
   * Frozen mode — renders a short (~80 px) compact document strip
   * instead of the full scanning viewer. Used in the Phase 3 sticky
   * header on the /analyze page where the full report sits beneath.
   * Implies done.
   */
  frozen?: boolean;
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
  frozen = false,
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
  //
  // IMPORTANT: every hook below MUST run unconditionally on every render,
  // including when `frozen` is true. The frozen compact branch returns at
  // the bottom of this function — NOT before the hook calls. Hoisting the
  // early return above the hooks breaks Rules of Hooks when the Hero /
  // /analyze page transitions the same mounted instance from
  // `frozen={false}` to `frozen={true}`: React sees fewer hooks on the
  // second render, throws "Rendered fewer hooks than expected," and the
  // recovery re-render cycles until #300 ("Too many re-renders") bubbles
  // past the analysis error boundary (ContractPreview is a sibling of
  // AnalysisErrorBoundary, not a child).
  const [localTick, setLocalTick] = React.useState(0);
  const inFlight = !frozen && !done && status !== "failed";

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
    if (frozen) return;
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
  }, [inFlight, done, status, frozen]);

  // ── Auto-scroll to keep the scan beam visible ─────────────────────────────
  // Throttle via Math.round(beamPct/5) — the effect only re-runs on ~5%
  // jumps, not every rAF tick. Guarded by `frozen` so the compact banner
  // doesn't try to scroll a non-existent container.
  const beamBucket = Math.round(beamPct / 5);
  React.useEffect(() => {
    if (frozen || done || !scrollRef.current) return;
    const container = scrollRef.current;
    const targetY = (beamPct / 100) * container.scrollHeight;
    const halfVp = container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetY - halfVp), behavior: "smooth" });
    // beamPct is read fresh each tick but we only fire when beamBucket
    // changes (5% granularity). done + frozen gate the work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beamBucket, done, frozen]);

  // ── Frozen compact mode (Phase 3 sticky banner) ───────────────────────────
  // Placed AFTER every hook so the hook call order stays identical across
  // the Phase 2 → Phase 3 transition. See the note above for why this
  // ordering is load-bearing.
  if (frozen) {
    const pageCount = Math.max(1, Math.round(lines.length / 40));
    return (
      <div className="flex h-full min-h-0 items-center gap-4 overflow-hidden rounded-md border border-white/10 bg-surface-1 px-4 py-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/30">
          <FileText className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Scanned document
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-zinc-100">
            {filename ?? "Pasted contract"}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">
            {pageCount} page{pageCount !== 1 ? "s" : ""} · {lines.length} lines
            {elapsed > 0 && ` · analyzed in ${elapsed}s`}
          </p>
        </div>
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-severity-low-bg text-severity-low-accent ring-1 ring-severity-low-border">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>
    );
  }

  // ── Progress percent ─────────────────────────────────────────────────────
  // Real counts now come from the v2 pipeline via LiveScanSidebar /
  // AnalysisReport — this panel only shows the document + beam + %.
  const pct = done ? 100 : Math.round(effectiveProg * 100);

  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-0 flex-col overflow-hidden border-r border-white/5 bg-[#e8e8ec] dark:bg-surface-0">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/5 bg-surface-1 px-4 py-2.5">
        {/* Dot indicator */}
        {done ? (
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-severity-low-accent" />
        ) : (
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="absolute inset-0 animate-ping-slow rounded-full bg-accent/50" />
            <span className="relative h-3 w-3 rounded-full bg-accent" />
          </span>
        )}

        {/* Filename */}
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-400">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate font-medium text-zinc-100">
            {filename ?? "contract.pdf"}
          </span>
        </span>

        {/* Progress indicator */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-4 text-[10px] tabular-nums">
          {done ? (
            <span className="font-semibold text-severity-low-accent">Complete</span>
          ) : (
            <span className="text-zinc-400">{pct}%</span>
          )}
        </div>
      </div>

      {/* ── Progress shimmer bar ──────────────────────────────────────────── */}
      <div className="h-[3px] flex-shrink-0 bg-surface-3">
        <div
          className={cn(
            "h-full transition-[width] duration-700 ease-out",
            done
              ? "bg-severity-low-accent"
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

              return (
                <div
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el; }}
                  className="font-serif text-[12.5px] leading-[1.85] text-gray-700"
                >
                  {line}
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
