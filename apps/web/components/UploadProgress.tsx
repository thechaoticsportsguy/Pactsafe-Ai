"use client";

import * as React from "react";
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
  { key: "analyzing", label: "Calling model" },
  { key: "completed", label: "Done" },
];

export default function UploadProgress({
  status,
  message,
  progress,
}: UploadProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const activeIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="rounded-xl border border-border bg-surface/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">
          {status === "failed" ? "Failed" : message || "Working on it…"}
        </span>
        <span className="text-xs text-muted tabular-nums">{pct}%</span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-hi">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === "failed" ? "bg-severity-critical" : "bg-accent",
            status !== "completed" && status !== "failed" && "animate-pulse-soft",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-4 flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => {
          const done =
            status === "completed" ||
            (activeIndex >= 0 && i < activeIndex);
          const active = s.key === status;
          return (
            <li
              key={s.key}
              className={cn(
                "flex-1 rounded-md border px-2 py-1 text-center",
                active && "border-accent text-foreground",
                done && "border-severity-low/60 text-severity-low",
                !active && !done && "border-border text-muted",
              )}
            >
              {s.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
