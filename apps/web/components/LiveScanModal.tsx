"use client";

/**
 * LiveScanModal
 *
 * A fixed-position, full-viewport modal that renders over the /analyze
 * page while a job is in flight. It surfaces three step rows driven by
 * the backend's `JobStatus`:
 *
 *     "queued"      → step 0   "Scanning document…"
 *     "extracting"  → step 1   "Extracting clauses…"
 *     "analyzing"   → step 2   "Scoring risks…"
 *     "completed"   → all done  "Report ready"
 *
 * Visual rules:
 *   - Steps below the current index render as done (green check, muted).
 *   - The current step pulses and shows a spinning loader in place of
 *     its icon.
 *   - Future steps are dim and wear their default icon.
 *
 * The modal is intentionally non-cancellable — analysis can't be
 * stopped mid-flight, so there's no close button, no ESC handler, and
 * no backdrop-click-to-dismiss. It unmounts itself when `open` flips
 * to `false` (which the parent page does after the completedJob
 * payload is ready).
 *
 * Respects `prefers-reduced-motion` by letting the globals.css
 * override neutralize the pulse/spin animations.
 */

import * as React from "react";
import {
  FileSearch,
  ScanLine,
  Gauge,
  Loader2,
  Check,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// Step table
// ---------------------------------------------------------------------------

interface Step {
  /** JobStatus value that activates this step. */
  key: Exclude<JobStatus, "completed" | "failed">;
  title: string;
  detail: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    key: "queued",
    title: "Scanning document…",
    detail: "Uploading your contract and queueing it for analysis.",
    icon: FileSearch,
  },
  {
    key: "extracting",
    title: "Extracting clauses…",
    detail: "Parsing sections, headings, and clause boundaries.",
    icon: ScanLine,
  },
  {
    key: "analyzing",
    title: "Scoring risks…",
    detail: "Matching risk patterns and drafting plain-English findings.",
    icon: Gauge,
  },
];

function statusToStepIndex(status: JobStatus): number {
  switch (status) {
    case "queued":
      return 0;
    case "extracting":
      return 1;
    case "analyzing":
      return 2;
    case "completed":
      return STEPS.length; // past the last step
    case "failed":
      return -1;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Props + component
// ---------------------------------------------------------------------------

export interface LiveScanModalProps {
  /** When false, the component returns null and nothing is rendered. */
  open: boolean;
  /** Current job status from the backend poller. */
  status: JobStatus;
  /** Progress, 0..1. Drives the thin progress bar at the top. */
  progress: number;
  /** Filename shown under the title. Falls back to "Pasted contract". */
  filename?: string | null;
  /** Seconds since the job started, shown in the header. */
  elapsed?: number;
}

export default function LiveScanModal({
  open,
  status,
  progress,
  filename,
  elapsed = 0,
}: LiveScanModalProps) {
  // Lock the <body> scroll while the modal is open so the page behind
  // doesn't scroll under the overlay.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const current = statusToStepIndex(status);
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const allDone = status === "completed";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-scan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />

      {/* Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated/95 shadow-card-lg ring-1 ring-accent/20 animate-fade-in-up">
        {/* Progress bar along the top */}
        <div className="h-1 w-full bg-surface-3">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out",
              allDone ? "bg-success" : "bg-accent",
            )}
            style={{
              width: `${pct}%`,
              boxShadow: allDone
                ? "0 0 14px rgba(16,185,129,0.5)"
                : "0 0 14px rgba(124,92,252,0.55)",
            }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1",
                allDone
                  ? "bg-success/15 text-success ring-success/30"
                  : "bg-accent/15 text-accent ring-accent/30",
              )}
            >
              {allDone ? (
                <Check className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Loader2
                  className="h-5 w-5 animate-spin"
                  strokeWidth={2.25}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="live-scan-title"
                className="text-[15px] font-semibold tracking-tight text-foreground"
              >
                {allDone ? "Report ready" : "Running live scan"}
              </h2>
              <p className="mt-0.5 truncate text-xs text-foreground-muted">
                {filename?.trim() || "Pasted contract"}
                {elapsed > 0 && (
                  <span className="text-foreground-subtle">
                    {" "}
                    · {formatElapsed(elapsed)}
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs tabular-nums text-foreground-muted">
              {pct}%
            </span>
          </div>

          {/* Steps */}
          <ul className="mt-6 space-y-4" aria-live="polite">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isDone = allDone || i < current;
              const isActive = !allDone && i === current;
              const isPending = !allDone && i > current;
              return (
                <li
                  key={step.key}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-1 transition-colors",
                    isActive && "animate-pulse-soft",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                      isDone && "border-success/40 bg-success/10 text-success",
                      isActive &&
                        "border-accent/60 bg-accent/15 text-accent",
                      isPending &&
                        "border-border bg-surface/60 text-foreground-subtle",
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight transition-colors",
                        isDone && "text-foreground-muted",
                        isActive && "text-foreground",
                        isPending && "text-foreground-subtle",
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-snug transition-colors",
                        isDone && "text-foreground-subtle",
                        isActive && "text-foreground-muted",
                        isPending && "text-foreground-subtle/70",
                      )}
                    >
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer hint */}
          <div className="mt-6 flex items-center gap-2 border-t border-border-subtle/60 pt-4 text-[11px] text-foreground-subtle">
            <Lock className="h-3 w-3" />
            <span>
              Encrypted · Please keep this tab open until the scan finishes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  if (seconds <= 0) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
