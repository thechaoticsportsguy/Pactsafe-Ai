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
}: LiveScanSidebarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-surface/70 backdrop-blur-sm transition-colors duration-500",
        done
          ? "border-success/40 bg-success/[0.03] shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_20px_60px_-30px_rgba(16,185,129,0.45)]"
          : "border-border shadow-card",
      )}
    >
      {/* Header */}
      <div className="border-b border-border/70 bg-bg-elevated/70 px-5 py-4">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping-slow" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
          )}
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              done ? "text-success" : "text-accent",
            )}
          >
            {done ? "Scan complete" : "Live scan"}
          </span>
        </div>
        <h2 className="mt-2 truncate text-[15px] font-semibold text-foreground">
          {filename ?? "Pasted contract"}
        </h2>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums text-foreground-muted">
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
                  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500",
                  state === "active" &&
                    "border-accent/40 bg-accent-soft shadow-[0_0_0_1px_rgba(124,92,252,0.2)]",
                  state === "complete" &&
                    "border-success/30 bg-success/5",
                  state === "pending" &&
                    "border-border/60 bg-surface-2/40 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                    state === "active" && "bg-accent/20 text-accent",
                    state === "complete" && "bg-success/15 text-success",
                    state === "pending" &&
                      "bg-surface-3/60 text-foreground-subtle",
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
                      state === "active" && "text-foreground",
                      state === "complete" && "text-success",
                      state === "pending" && "text-foreground-subtle",
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
          <div className="flex items-center justify-between text-[11px] text-foreground-muted">
            <span className="font-semibold uppercase tracking-wider">
              Progress
            </span>
            <span className="tabular-nums text-foreground">
              {done ? 100 : pct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                done
                  ? "bg-gradient-to-r from-success via-success to-success"
                  : "bg-gradient-to-r from-accent via-accent-hover to-accent animate-shimmer bg-[length:200%_100%]",
              )}
              style={{ width: `${done ? 100 : pct}%` }}
            />
          </div>
        </div>

        {/* Live counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
              <Search className="h-3 w-3" />
              Clauses
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {clausesFound}
            </div>
            <div className="text-[10px] text-foreground-subtle">
              {clausesFound === 1 ? "found so far" : "found so far"}
            </div>
          </div>
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5 transition-colors",
              risksIdentified > 0
                ? "border-severity-critical/30 bg-severity-critical/[0.06]"
                : "border-border/60 bg-surface-2/50",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
                risksIdentified > 0
                  ? "text-severity-critical"
                  : "text-foreground-subtle",
              )}
            >
              <Sparkles className="h-3 w-3" />
              Risks
            </div>
            <div
              className={cn(
                "mt-1 text-xl font-semibold tabular-nums",
                risksIdentified > 0
                  ? "text-severity-critical"
                  : "text-foreground",
              )}
            >
              {risksIdentified}
            </div>
            <div className="text-[10px] text-foreground-subtle">
              {risksIdentified === 1 ? "flagged" : "flagged"}
            </div>
          </div>
        </div>

        {/* Contextual status blurb */}
        <div className="rounded-xl border border-border/60 bg-surface-2/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-foreground-muted">
          {done ? (
            <>
              <span className="font-semibold text-success">All done.</span>{" "}
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
      <div className="flex items-center justify-center gap-1.5 border-t border-border/60 bg-bg-elevated/40 px-5 py-3 text-[10px] text-foreground-subtle">
        <Lock className="h-3 w-3" />
        Encrypted · Never used for training · Private by default
      </div>
    </aside>
  );
}
