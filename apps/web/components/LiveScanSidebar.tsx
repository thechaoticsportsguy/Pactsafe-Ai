"use client";

/**
 * LiveScanSidebar — right column of the side-by-side scanner layout.
 *
 * Shows the live progress of the current analysis: three-step progress
 * box, progress bar, filename + elapsed timer, live clause count, and
 * a "scan complete" success state when done=true.
 *
 * The sidebar is intentionally self-contained — it takes all its data
 * via props so the parent page owns the polling loop and just feeds
 * the sidebar whatever's freshest.
 */

import * as React from "react";
import {
  Loader2,
  CheckCircle2,
  Lock,
  FileText,
  Clock,
  Search,
  ScanLine,
  Gauge,
  Sparkles,
} from "lucide-react";
import type { JobStatus } from "@/lib/schemas";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------

export interface LiveScanSidebarProps {
  /** Backend job status for contextual messaging. */
  status: JobStatus;
  /** Normalized 0..1 progress. */
  progress: number;
  /** Uploaded filename, or null for pasted text. */
  filename: string | null;
  /** Seconds elapsed since the job started. */
  elapsed: number;
  /** Number of clauses the analyzer has identified so far. */
  clausesFound: number;
  /** Number of findings flagged as risky so far. */
  risksIdentified: number;
  /**
   * When true, the sidebar flips to its success state: steps all
   * green, progress bar fills, "Scan complete in Xs" headline. Used
   * for the ~500 ms transition between "completed" and the report
   * unmounting the sidebar altogether.
   */
  done?: boolean;
  /**
   * Frozen mode — renders a short (~80 px) compact success banner
   * instead of the full scanner sidebar. Used in the Phase 3 sticky
   * header on the /analyze page where the report sits underneath and
   * we want the banner to take minimal vertical space. Implies done.
   */
  frozen?: boolean;
}

// ---------------------------------------------------------------------------

interface Step {
  key: string;
  label: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { key: "scan", label: "Scanning document", icon: ScanLine },
  { key: "extract", label: "Extracting clauses", icon: FileText },
  { key: "score", label: "Scoring risks", icon: Gauge },
];

type StepState = "pending" | "active" | "complete";

function stepStateFor(
  idx: number,
  progress: number,
  done: boolean,
): StepState {
  if (done) return "complete";
  // Map 0..1 progress onto 3 steps with overlap thresholds.
  const activeIdx = progress >= 0.66 ? 2 : progress >= 0.33 ? 1 : 0;
  if (idx < activeIdx) return "complete";
  if (idx === activeIdx) return "active";
  return "pending";
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---------------------------------------------------------------------------

export default function LiveScanSidebar({
  status,
  progress,
  filename,
  elapsed,
  clausesFound,
  risksIdentified,
  done = false,
  frozen = false,
}: LiveScanSidebarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  // ── Frozen compact mode (Phase 3 sticky banner) ──────────────────────────
  if (frozen) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-severity-low-border bg-severity-low-bg">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-severity-low-bg text-severity-low-accent ring-1 ring-severity-low-border">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-severity-low-accent">
              Analysis complete
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-zinc-400">
              <Clock className="h-3 w-3" />
              Scanned in {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-4 border-l border-white/10 pl-4 text-right">
            <div>
              <div className="text-sm font-semibold tabular-nums text-zinc-100">
                {clausesFound}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Clauses
              </div>
            </div>
            <div>
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  risksIdentified > 0
                    ? "text-severity-critical-accent"
                    : "text-zinc-100",
                )}
              >
                {risksIdentified}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                Risks
              </div>
            </div>
          </div>
        </div>
        {/* Locked full progress bar — no shimmer */}
        <div className="mt-auto h-1 w-full bg-severity-low-accent" />
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-md border bg-surface-1 transition-colors duration-500",
        done
          ? "border-severity-low-border bg-severity-low-bg"
          : "border-white/5",
      )}
    >
      {/* Header */}
      <div className="border-b border-white/5 bg-surface-2 px-5 py-4">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-severity-low-accent" />
          ) : (
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping-slow" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              done ? "text-severity-low-accent" : "text-accent",
            )}
          >
            {done ? "Scan complete" : "Live scan"}
          </span>
        </div>
        <h2 className="mt-2 truncate text-[15px] font-semibold text-zinc-100">
          {filename ?? "Pasted contract"}
        </h2>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums text-zinc-400">
          <Clock className="h-3 w-3" />
          {done ? (
            <span>Scanned in {formatElapsed(elapsed)}</span>
          ) : (
            <span>{formatElapsed(elapsed)} elapsed</span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {/* Step list */}
        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const state = stepStateFor(idx, progress, done);
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3.5 py-2.5 transition-all duration-500",
                  state === "active" &&
                    "border-accent/40 bg-accent/10",
                  state === "complete" &&
                    "border-severity-low-border bg-severity-low-bg",
                  state === "pending" &&
                    "border-white/5 bg-surface-2 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    state === "active" && "bg-accent/20 text-accent",
                    state === "complete" && "bg-severity-low-bg text-severity-low-accent",
                    state === "pending" &&
                      "bg-surface-3 text-zinc-500",
                  )}
                >
                  {state === "complete" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : state === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[12px] font-semibold transition-colors",
                      state === "active" && "text-zinc-100",
                      state === "complete" && "text-severity-low-accent",
                      state === "pending" && "text-zinc-500",
                    )}
                  >
                    {step.label}
                    {state === "active" && !done && (
                      <span className="ml-1 animate-pulse-soft">…</span>
                    )}
                  </p>
                </div>
                {state === "active" && (
                  <span className="text-[10px] font-medium text-accent">
                    active
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-semibold uppercase tracking-wider">
              Progress
            </span>
            <span className="tabular-nums text-zinc-100">
              {done ? 100 : pct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                done
                  ? "bg-severity-low-accent"
                  : "bg-gradient-to-r from-accent via-accent-hover to-accent animate-shimmer bg-[length:200%_100%]",
              )}
              style={{ width: `${done ? 100 : pct}%` }}
            />
          </div>
        </div>

        {/* Live counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/5 bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <Search className="h-3 w-3" />
              Clauses
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
              {clausesFound}
            </div>
            <div className="text-[10px] text-zinc-500">
              {clausesFound === 1 ? "found so far" : "found so far"}
            </div>
          </div>
          <div
            className={cn(
              "rounded-md border px-3 py-2.5 transition-colors",
              risksIdentified > 0
                ? "border-severity-critical-border bg-severity-critical-bg"
                : "border-white/5 bg-surface-2",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
                risksIdentified > 0
                  ? "text-severity-critical-accent"
                  : "text-zinc-500",
              )}
            >
              <Sparkles className="h-3 w-3" />
              Risks
            </div>
            <div
              className={cn(
                "mt-1 text-xl font-semibold tabular-nums",
                risksIdentified > 0
                  ? "text-severity-critical-accent"
                  : "text-zinc-100",
              )}
            >
              {risksIdentified}
            </div>
            <div className="text-[10px] text-zinc-500">
              {risksIdentified === 1 ? "flagged" : "flagged"}
            </div>
          </div>
        </div>

        {/* Contextual status blurb */}
        <div className="rounded-md border border-white/5 bg-surface-2 px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-400">
          {done ? (
            <>
              <span className="font-semibold text-severity-low-accent">All done.</span>{" "}
              Generating your full report…
            </>
          ) : status === "queued" ? (
            <>Queued — starting in a moment…</>
          ) : status === "extracting" ? (
            <>
              Pulling clause text from the document and normalizing it for
              analysis.
            </>
          ) : status === "analyzing" ? (
            <>
              Running every clause through the risk engine and drafting
              negotiation language.
            </>
          ) : (
            <>Waiting for the analyzer to start…</>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 border-t border-white/5 bg-surface-2 px-5 py-3 text-[10px] text-zinc-500">
        <Lock className="h-3 w-3" />
        Encrypted · Never used for training · Private by default
      </div>
    </aside>
  );
}
