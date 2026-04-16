"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { severityColor } from "@/lib/severity";
import { SEVERITY_ORDER, type RedFlag } from "@/lib/schemas";

interface ClauseHighlighterProps {
  /** Null-safe — a missing text preview just renders the header row. */
  text?: string | null;
  /** Null-safe — a missing flag list renders the plain text with no marks. */
  flags?: RedFlag[] | null;
  activeIndex?: number | null;
  className?: string;
}

interface Segment {
  start: number;
  end: number;
  flagIndex: number | null;
}

const SEVERITY_HL: Record<string, string> = {
  CRITICAL: "bg-severity-critical/25 text-severity-critical",
  HIGH: "bg-severity-high/25 text-severity-high",
  MEDIUM: "bg-severity-medium/25 text-severity-medium",
  LOW: "bg-severity-low/25 text-severity-low",
};

/**
 * Builds non-overlapping segments from offsets. If offsets are missing or
 * overlap, higher-severity flags win.
 */
function buildSegments(text: string, flags: RedFlag[]): Segment[] {
  const spans: Array<{
    start: number;
    end: number;
    flagIndex: number;
    sev: number;
  }> = [];
  flags.forEach((f, i) => {
    if (
      f.start_offset != null &&
      f.end_offset != null &&
      f.end_offset > f.start_offset &&
      f.start_offset >= 0 &&
      f.end_offset <= text.length
    ) {
      spans.push({
        start: f.start_offset,
        end: f.end_offset,
        flagIndex: i,
        sev: SEVERITY_ORDER[f.severity],
      });
    }
  });

  spans.sort((a, b) => a.start - b.start || a.sev - b.sev);

  const kept: typeof spans = [];
  for (const span of spans) {
    const overlaps = kept.find(
      (k) => !(span.end <= k.start || span.start >= k.end),
    );
    if (!overlaps) kept.push(span);
  }
  kept.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of kept) {
    if (s.start > cursor) {
      segments.push({ start: cursor, end: s.start, flagIndex: null });
    }
    segments.push({
      start: s.start,
      end: s.end,
      flagIndex: s.flagIndex,
    });
    cursor = s.end;
  }
  if (cursor < text.length) {
    segments.push({ start: cursor, end: text.length, flagIndex: null });
  }
  return segments;
}

export default function ClauseHighlighter({
  text,
  flags,
  activeIndex,
  className,
}: ClauseHighlighterProps) {
  const safeText = typeof text === "string" ? text : "";
  const safeFlags = React.useMemo<RedFlag[]>(
    () =>
      Array.isArray(flags)
        ? flags.filter((f): f is RedFlag => !!f && typeof f === "object")
        : [],
    [flags],
  );
  const segments = React.useMemo(
    () => buildSegments(safeText, safeFlags),
    [safeText, safeFlags],
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeIndex == null || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-flag-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  return (
    <div className="rounded-xl border border-border bg-surface/70 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/70 text-xs text-foreground-muted">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-severity-critical" />
            Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-severity-high" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-severity-medium" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-severity-low" />
            Low
          </span>
        </span>
        <span className="tabular-nums">
          {safeText.length.toLocaleString()} characters
        </span>
      </div>
      <div
        ref={containerRef}
        className={cn(
          // No height trap — let the outer page scroll naturally.
          // The clause highlighter flows inline with the rest of the
          // results so users can scroll from the risk score down to
          // the last finding without getting caught in a nested
          // scroll container.
          "px-6 py-5",
          "prose-contract whitespace-pre-wrap",
          className,
        )}
      >
        {segments.map((seg, idx) => {
          const chunk = safeText.slice(seg.start, seg.end);
          if (seg.flagIndex == null) {
            return <span key={idx}>{chunk}</span>;
          }
          const flag = safeFlags[seg.flagIndex];
          if (!flag) return <span key={idx}>{chunk}</span>;
          const isActive = activeIndex === seg.flagIndex;
          return (
            <mark
              key={idx}
              data-flag-index={seg.flagIndex}
              title={flag.explanation}
              className={cn(
                "rounded px-0.5 cursor-help transition-all",
                SEVERITY_HL[flag.severity],
                isActive &&
                  "ring-2 ring-accent ring-offset-1 ring-offset-background",
              )}
            >
              {chunk}
            </mark>
          );
        })}
      </div>
    </div>
  );
}
