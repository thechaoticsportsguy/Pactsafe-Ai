"use client";

import * as React from "react";
import { Check, Loader2, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/schemas";

interface UploadProgressProps {
  status: JobStatus;
  message?: string;
  progress: number; // 0..1
}

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "queued", label: "Queued" },
  { key: "extracting", label: "Extracting text" },
  { key: "analyzing", label: "Analyzing clauses" },
  { key: "completed", label: "Report ready" },
];

/**
 * Rotating "did you know" tips shown during the analysis. These are
 * factual, not marketing fluff — they educate the user on common
 * contract traps while they wait.
 */
const TIPS: string[] = [
  "Most freelance contracts transfer IP on delivery, not on payment. A fair one ties IP transfer to full payment.",
  "Net-60 payment terms are borderline predatory for a solo freelancer. Push for Net-15 or Net-30 with a late-fee clause.",
  "A contract with no liability cap puts your entire business on the line. Cap it at total fees paid.",
  "“Unlimited revisions until satisfied” is a scope-creep black hole. Cap revisions at 2–3 rounds.",
  "A kill fee (25–50% of remaining fees) is standard for termination-for-convenience. Don’t sign without one.",
  "Perpetuity NDAs are unusual. 2–5 year terms are industry standard for most freelance work.",
  "Indemnification clauses should be mutual. If only one side indemnifies, the other side has all the leverage.",
  "Always keep portfolio-use rights for your final work. It costs the client nothing and protects your career.",
];

export default function UploadProgress({
  status,
  message,
  progress,
}: UploadProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const failed = status === "failed";
  const done = status === "completed";
  const inFlight = !failed && !done;

  // Elapsed time counter for reassurance
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!inFlight) return;
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [inFlight]);

  // Rotating tip index.
  //
  // IMPORTANT: the initial value must be deterministic — `useState(() =>
  // Math.random())` runs on BOTH the SSR render and the initial client
  // render, producing different values and a hydration mismatch (React
  // error #418 in minified builds). We start at 0 so SSR and the first
  // client render agree, then jitter to a random starting tip in a
  // mount-only effect (effects don't run during SSR, so this is safe).
  const [tipIdx, setTipIdx] = React.useState(0);
  React.useEffect(() => {
    // Runs once on mount only; randomizes the starting tip so users
    // don't always see tip #1 first.
    setTipIdx(Math.floor(Math.random() * TIPS.length));
  }, []);
  React.useEffect(() => {
    if (!inFlight) return;
    const id = window.setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [inFlight]);

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {inFlight && (
            <Loader2 className="h-4 w-4 text-accent animate-spin flex-shrink-0" />
          )}
          {failed && (
            <XCircle className="h-4 w-4 text-severity-critical flex-shrink-0" />
          )}
          {done && (
            <Check className="h-4 w-4 text-success flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {failed ? "Failed" : message || "Working on it…"}
          </span>
          {inFlight && (
            <span className="dots-loader text-accent">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground-muted tabular-nums">
          {inFlight && elapsed > 0 && (
            <span className="hidden sm:inline">{formatElapsed(elapsed)}</span>
          )}
          <span>{pct}%</span>
        </div>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            failed ? "bg-severity-critical" : "bg-accent",
            inFlight && "animate-pulse-soft",
          )}
          style={{
            width: `${pct}%`,
            boxShadow: failed
              ? "0 0 16px rgba(239,68,68,0.5)"
              : "0 0 16px rgba(124,92,252,0.5)",
          }}
        />
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-2 text-[11px]">
        {STEPS.map((s, i) => {
          const stepDone =
            status === "completed" || (activeIndex >= 0 && i < activeIndex);
          const active = s.key === status;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors",
                active && "border-accent/40 bg-accent/5 text-foreground",
                stepDone && "border-success/40 bg-success/5 text-success",
                !active &&
                  !stepDone &&
                  "border-border text-foreground-subtle",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-accent text-white",
                  stepDone && "bg-success text-white",
                  !active && !stepDone && "border border-border-strong",
                )}
              >
                {stepDone ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {inFlight && (
        <div
          key={tipIdx}
          className="mt-5 flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-elevated/50 p-4 animate-fade-in"
          role="status"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
            <Lightbulb className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
              While you wait
            </p>
            <p className="mt-1 text-xs text-foreground/85 leading-relaxed">
              {TIPS[tipIdx]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s elapsed`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s elapsed`;
}
