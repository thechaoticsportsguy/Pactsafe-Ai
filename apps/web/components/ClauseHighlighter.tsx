"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { severityColor } from "@/lib/severity";
import { SEVERITY_ORDER, type RedFlag } from "@/lib/schemas";

interface ClauseHighlighterProps {
  text: string;
  flags: RedFlag[];
  activeIndex?: number | null;
  className?: string;
}

interface Segment {
  start: number;
  end: number;
  flagIndex: number | null;
}

/**
 * Builds non-overlapping segments from offsets. If offsets are missing or
 * overlap, higher-severity flags win.
 */
function buildSegments(text: string, flags: RedFlag[]): Segment[] {
  const spans: Array<{ start: number; end: number; flagIndex: number; sev: number }> =
    [];
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

  // Sort by start, then by severity (lower ordinal = more critical = wins).
  spans.sort((a, b) => a.start - b.start || a.sev - b.sev);

  // Deoverlap by severity priority
  const kept: typeof spans = [];
  for (const span of spans) {
    const overlaps = kept.find(
      (k) => !(span.end <= k.start || span.start >= k.end),
    );
    if (!overlaps) kept.push(span);
    // else drop (kept earlier more-critical wins due to sort)
  }
  kept.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of kept) {
    if (s.start > cursor) {
      segments.push({ start: cursor, end: s.start, flagIndex: null });
    }
    segments.push({ start: s.start, end: s.end, flagIndex: s.flagIndex });
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
  const segments = React.useMemo(() => buildSegments(text, flags), [text, flags]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Scroll active flag into view
  React.useEffect(() => {
    if (activeIndex == null || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(
      `[data-flag-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl border border-border bg-surface/70 p-5",
        "max-h-[600px] overflow-y-auto",
        "font-mono text-sm leading-relaxed whitespace-pre-wrap",
        className,
      )}
    >
      {segments.map((seg, idx) => {
        const chunk = text.slice(seg.start, seg.end);
        if (seg.flagIndex == null) {
          return <span key={idx}>{chunk}</span>;
        }
        const flag = flags[seg.flagIndex];
        const isActive = activeIndex === seg.flagIndex;
        return (
          <mark
            key={idx}
            data-flag-index={seg.flagIndex}
            title={flag.explanation}
            className={cn(
              "rounded px-0.5 cursor-help transition-colors",
              severityColor[flag.severity],
              "bg-surface-hi/60",
              isActive && "ring-2 ring-accent bg-accent/10",
            )}
          >
            {chunk}
          </mark>
        );
      })}
    </div>
  );
}
