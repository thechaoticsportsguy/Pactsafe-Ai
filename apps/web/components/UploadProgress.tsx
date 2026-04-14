"use client";

import * as React from "react";
import { Check, Loader2, XCircle } from "lucide-react";
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

export default function UploadProgress({
  status,
  message,
  progress,
}: UploadProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const activeIndex = STEPS.findIndex((s) => s.key === status);
  const failed = status === "failed";

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {!failed && status !== "completed" && (
            <Loader2 className="h-4 w-4 text-accent animate-spin flex-shrink-0" />
          )}
          {failed && (
            <XCircle className="h-4 w-4 text-severity-critical flex-shrink-0" />
          )}
          {status === "completed" && (
            <Check className="h-4 w-4 text-success flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {failed ? "Failed" : message || "Working on it…"}
          </span>
          {!failed && status !== "completed" && (
            <span className="dots-loader text-accent">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
        <span className="text-xs text-foreground-muted tabular-nums">
          {pct}%
        </span>
      </div>

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            failed ? "bg-severity-critical" : "bg-accent",
            !failed && status !== "completed" && "animate-pulse-soft",
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
          const done = status === "completed" || (activeIndex >= 0 && i < activeIndex);
          const active = s.key === status;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors",
                active &&
                  "border-accent/40 bg-accent/5 text-foreground",
                done &&
                  "border-success/40 bg-success/5 text-success",
                !active &&
                  !done &&
                  "border-border text-foreground-subtle",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-accent text-white",
                  done && "bg-success text-white",
                  !active && !done && "border border-border-strong",
                )}
              >
                {done ? (
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
    </div>
  );
}
