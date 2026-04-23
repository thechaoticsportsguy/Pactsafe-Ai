"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { SEVERITY_ORDER, type RedFlag } from "@/lib/schemas";
import { locateQuote } from "@/lib/locate-quote";

interface ClauseHighlighterProps {
  /** Null-safe — a missing text preview just renders the header row. */
  text?: string | null;
  /** Null-safe — a missing flag list renders the plain text with no marks. */
  flags?: RedFlag[] | null;
  activeIndex?: number | null;
  /**
   * Fires when the user clicks a highlighted span. Lets the parent
   * (AnalysisReport) drive the inverse mark→card scroll+flash without
   * this component owning any cross-section DOM knowledge.
   */
  onMarkClick?: (flagIndex: number) => void;
  className?: string;
}

interface Segment {
  start: number;
  end: number;
  flagIndex: number | null;
}

// Soft-tinted severity highlights that read on beige: the mark keeps
// its severity signal via background tint + border, but the clause
// text inherits the surrounding ink-800 so long runs stay readable.
// Hex values match the FlagList / GreenFlagList card tints so the
// clause viewer and the flag list share one visual language.
const SEVERITY_HL: Record<string, string> = {
  CRITICAL: "bg-[#F8EAEA] border border-[#E9CBCB] text-ink-800",
  HIGH: "bg-[#F5E6D6] border border-[#E3C7A8] text-ink-800",
  MEDIUM: "bg-[#F6EDCD] border border-[#E2D6A2] text-ink-800",
  LOW: "bg-[#E8F0E5] border border-[#C6D7BE] text-ink-800",
};

/**
 * Build non-overlapping severity-tinted segments from the red-flag list.
 *
 * Prefers explicit character offsets when the backend supplies them
 * (`start_offset` / `end_offset`). When both are absent — as in every v2
 * flag, which carries a `quote` instead — falls back to locating the
 * verbatim quote inside the document via `locateQuote`. Flags whose
 * quote can't be located are skipped with a `console.warn`; the caller
 * still renders the flag card, just without a jump target.
 *
 * Overlap resolution: sort by `start` then by severity (Critical first),
 * then drop any later span that overlaps a previously kept one. The
 * higher-severity span wins its range via the tiebreaker; losing one
 * highlight is acceptable when two flags genuinely cite the same text
 * (rare, and the sidebar still surfaces both flag cards).
 */
function buildSegments(text: string, flags: RedFlag[]): Segment[] {
  const spans: Array<{
    start: number;
    end: number;
    flagIndex: number;
    sev: number;
  }> = [];

  flags.forEach((f, i) => {
    // Prefer explicit character offsets when both are present and valid.
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
      return;
    }
    // v2 fallback: locate the verbatim quote in the document text.
    if (f.quote) {
      const loc = locateQuote(text, f.quote);
      if (loc) {
        spans.push({
          start: loc.start,
          end: loc.end,
          flagIndex: i,
          sev: SEVERITY_ORDER[f.severity],
        });
        return;
      }
      // Don't block render — the flag card still appears in the sidebar,
      // just without a jump target.
      console.warn(
        `[ClauseHighlighter] Could not locate quote for flag #${i}`,
        {
          section: f.section_number,
          title: f.clause,
          quote: f.quote.slice(0, 120),
        },
      );
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
  onMarkClick,
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

  return (
    <div className="overflow-hidden rounded-lg border border-ink-800/10 bg-beige-50">
      <div className="flex items-center justify-between border-b border-ink-800/10 px-5 py-3 text-xs text-ink-600">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#A82020]" />
            Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#A56A20]" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#8A6D1A]" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3C7428]" />
            Low
          </span>
        </span>
        <span className="tabular-nums">
          {safeText.length.toLocaleString()} characters
        </span>
      </div>
      <div
        className={cn(
          // Scrollable container — the backend now returns the full
          // extracted document (not a 500-char preview), so long
          // contracts need a local scroll to keep the surrounding
          // report readable. `max-h-[600px]` is enough for about two
          // pages of contract text on a laptop; `overflow-y-auto`
          // shows a scrollbar only when needed. Without this, a 60k-
          // char Handshake-style contract would push every section
          // below it off the bottom of the viewport.
          //
          // Typography previously came from the `prose-contract` global
          // rule, which forces workspace-zinc text color. On the
          // editorial /analyze page that reads wrong, so inline the
          // mono font + leading here and let text-ink-700 be the color
          // source of truth.
          "px-6 py-5",
          "max-h-[600px] overflow-y-auto",
          "whitespace-pre-wrap font-mono text-[13px] leading-[1.7] text-ink-700",
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
          const flagIdx = seg.flagIndex;
          return (
            <mark
              key={idx}
              // `highlight-flag-${i}` is the jump target AnalysisReport
              // scrolls+flashes when a card is clicked in the sidebar.
              id={`highlight-flag-${flagIdx}`}
              // Kept for any external consumer that queries by attr (the
              // scroll-spy used to, before we centralized it in the
              // parent). Harmless duplicate of the `id`.
              data-flag-index={flagIdx}
              data-severity={flag.severity}
              data-section={flag.section_number ?? undefined}
              title={flag.explanation}
              onClick={() => onMarkClick?.(flagIdx)}
              className={cn(
                "cursor-pointer rounded px-0.5 transition-all",
                SEVERITY_HL[flag.severity],
                isActive &&
                  "ring-2 ring-ink-800 ring-offset-1 ring-offset-beige-50",
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
