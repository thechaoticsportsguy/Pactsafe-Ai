"use client";

/**
 * PdfReviewViewer — the left pane of the split-pane review screen.
 *
 * v1 scope (this file): renders the extracted contract text inside a
 * document-shaped frame with absolutely-positioned, color-coded
 * highlight overlays anchored to character offsets. Clicking any
 * highlight calls `onHighlightClick(flag_id)`; the `activeFlagId`
 * prop is reflected as a focus ring and auto-scrolls the matching
 * overlay into view.
 *
 * v2 plan: when the backend begins serving the original PDF bytes
 * (`GET /api/jobs/{id}/file`) and `pdfjs-dist` is added as a
 * dependency, this component will gain a "raster" mode that renders
 * real PDF pages via a canvas layer and places the same overlays on
 * top — the `HighlightItem[]` contract and the scroll/click API do
 * not change.
 *
 * Deliberately *not* doing in v1:
 *  - page-sync scroll (simple scroll is enough for useful click-to-jump)
 *  - zoom controls
 *  - multiline span healing across text-layer line breaks
 *  - persistent annotations (read-only review only)
 */

import * as React from "react";
import {
  FileText,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { HighlightItem } from "@/lib/review";

// ---------------------------------------------------------------------------
// Visual styles per severity. Matches the severity tokens in
// tailwind.config.ts. The ring class is applied when an item is the
// currently active one so it stands out even at a glance.
// ---------------------------------------------------------------------------

const HL_BG: Record<HighlightItem["severity"], string> = {
  CRITICAL: "bg-severity-critical/30 border-severity-critical/60",
  HIGH: "bg-severity-high/30 border-severity-high/60",
  MEDIUM: "bg-severity-medium/30 border-severity-medium/60",
  LOW: "bg-severity-low/25 border-severity-low/50",
  POSITIVE: "bg-success/25 border-success/50",
};

const HL_TEXT: Record<HighlightItem["severity"], string> = {
  CRITICAL: "text-severity-critical",
  HIGH: "text-severity-high",
  MEDIUM: "text-severity-medium",
  LOW: "text-severity-low",
  POSITIVE: "text-success",
};

const HL_ICON: Record<HighlightItem["severity"], React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertTriangle,
  LOW: Info,
  POSITIVE: ShieldCheck,
};

// ---------------------------------------------------------------------------
// Segment construction — same non-overlap rule as ClauseHighlighter:
// when two spans collide, the higher-severity one wins.
// ---------------------------------------------------------------------------

interface Segment {
  start: number;
  end: number;
  /** Index into the `items` array, or null for plain text. */
  itemIndex: number | null;
}

const SEV_RANK: Record<HighlightItem["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  POSITIVE: 4,
};

function buildSegments(text: string, items: HighlightItem[]): Segment[] {
  const spans = items
    .map((it, idx) => ({ it, idx }))
    .filter(
      ({ it }) =>
        it.start != null &&
        it.end != null &&
        it.end > it.start &&
        it.start >= 0 &&
        it.end <= text.length,
    )
    .map(({ it, idx }) => ({
      start: it.start as number,
      end: it.end as number,
      idx,
      rank: SEV_RANK[it.severity],
    }));

  // Sort by start, then by severity (lower rank = higher severity wins).
  spans.sort((a, b) => a.start - b.start || a.rank - b.rank);

  // Drop any span that overlaps a span we've already kept.
  const kept: typeof spans = [];
  for (const s of spans) {
    const hit = kept.find((k) => !(s.end <= k.start || s.start >= k.end));
    if (!hit) kept.push(s);
  }
  kept.sort((a, b) => a.start - b.start);

  const segs: Segment[] = [];
  let cursor = 0;
  for (const s of kept) {
    if (s.start > cursor) {
      segs.push({ start: cursor, end: s.start, itemIndex: null });
    }
    segs.push({ start: s.start, end: s.end, itemIndex: s.idx });
    cursor = s.end;
  }
  if (cursor < text.length) {
    segs.push({ start: cursor, end: text.length, itemIndex: null });
  }
  return segs;
}

// ---------------------------------------------------------------------------

export interface PdfReviewViewerProps {
  /**
   * Extracted contract text. Pass the empty string or `null` to show
   * the fallback state. The viewer never mutates this string.
   */
  text: string | null | undefined;
  /** Optional filename — shown in the faux-PDF page header. */
  filename?: string | null;
  /** Normalized findings from `buildHighlights()`. */
  items: HighlightItem[];
  /** The currently active finding's `flag_id`, or null. */
  activeFlagId: string | null;
  /**
   * Fired when the user clicks a highlight overlay. The review page
   * promotes this id to `activeFlagId` and, in turn, scrolls the
   * matching card into view in the right pane.
   */
  onHighlightClick: (flagId: string) => void;
  /**
   * Optional filter set — only items whose `severity` is included
   * will be rendered as overlays. Items that are filtered out fall
   * back to plain unstyled text so the underlying clause stays
   * readable. `null` means "show everything".
   */
  visibleSeverities?: Set<HighlightItem["severity"]> | null;
  /** Extra classes on the outer container. */
  className?: string;
}

// ---------------------------------------------------------------------------

export default function PdfReviewViewer({
  text,
  filename,
  items,
  activeFlagId,
  onHighlightClick,
  visibleSeverities,
  className,
}: PdfReviewViewerProps) {
  // Filter items by severity — the segment builder then drops any
  // that get filtered out so the text underneath reverts to plain.
  const filteredItems = React.useMemo(() => {
    if (!visibleSeverities) return items;
    return items.filter((i) => visibleSeverities.has(i.severity));
  }, [items, visibleSeverities]);

  const segments = React.useMemo(
    () => (text ? buildSegments(text, filteredItems) : []),
    [text, filteredItems],
  );

  // Total character count used in the footer — mirrors ClauseHighlighter.
  const charCount = text?.length ?? 0;
  const anchoredCount = filteredItems.filter(
    (i) => i.start != null && i.end != null,
  ).length;
  const unanchoredCount = filteredItems.length - anchoredCount;

  // Auto-scroll the active highlight into view when it changes.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!activeFlagId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>(
      `[data-evidence-flag="${cssEscape(activeFlagId)}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeFlagId]);

  // ---- Empty states ------------------------------------------------------

  if (!text) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-surface/70 p-10 text-center text-sm text-foreground-muted",
          className,
        )}
      >
        <FileText className="mx-auto h-8 w-8 text-foreground-subtle" />
        <p className="mt-3 font-medium text-foreground">
          No extracted text available
        </p>
        <p className="mt-1 text-xs">
          This analysis didn&rsquo;t include a text preview, so we
          can&rsquo;t anchor highlights to a source document. Open the
          report for the full list of findings.
        </p>
      </div>
    );
  }

  // ---- Main render -------------------------------------------------------

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/70",
        className,
      )}
    >
      {/* Faux-PDF header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-bg-elevated/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-wider text-foreground-muted">
          <FileText className="h-3.5 w-3.5" />
          <span className="truncate font-medium text-foreground">
            {filename ?? "contract.txt"}
          </span>
          <span className="text-foreground-subtle">· evidence view</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] tabular-nums text-foreground-subtle">
          <span>{charCount.toLocaleString()} chars</span>
          <span>·</span>
          <span>
            {anchoredCount} anchored
            {unanchoredCount > 0 && ` · ${unanchoredCount} unanchored`}
          </span>
        </div>
      </div>

      {/* Severity legend */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-2 text-[10px] text-foreground-muted">
        <LegendDot tone="critical" label="Critical" />
        <LegendDot tone="high" label="High" />
        <LegendDot tone="medium" label="Medium" />
        <LegendDot tone="low" label="Low" />
        <LegendDot tone="positive" label="In your favor" />
      </div>

      {/* Document body */}
      <div
        ref={scrollRef}
        className="prose-contract relative min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-6 font-mono text-[12px] leading-relaxed text-foreground/85"
      >
        {segments.map((seg, idx) => {
          const chunk = text.slice(seg.start, seg.end);
          if (seg.itemIndex == null) {
            return <span key={idx}>{chunk}</span>;
          }
          const item = filteredItems[seg.itemIndex];
          const isActive = activeFlagId === item.flag_id;
          const Icon = HL_ICON[item.severity];
          return (
            <mark
              key={idx}
              role="button"
              tabIndex={0}
              data-evidence-flag={item.flag_id}
              title={item.explanation || item.title}
              onClick={() => onHighlightClick(item.flag_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onHighlightClick(item.flag_id);
                }
              }}
              className={cn(
                "relative cursor-pointer rounded-sm border px-0.5 text-foreground transition-all",
                HL_BG[item.severity],
                isActive &&
                  "ring-2 ring-accent ring-offset-2 ring-offset-background",
              )}
            >
              {chunk}
              {isActive && (
                <span
                  className={cn(
                    "pointer-events-none absolute -right-1 -top-2 inline-flex items-center gap-1 rounded-full border bg-bg-elevated/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm",
                    HL_BG[item.severity],
                    HL_TEXT[item.severity],
                  )}
                >
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {item.severity === "POSITIVE" ? "In favor" : item.severity}
                </span>
              )}
            </mark>
          );
        })}
      </div>

      {/* Unanchored items footer — keeps them visible even though they
          don't have offsets to render as overlays. */}
      {unanchoredCount > 0 && (
        <div className="border-t border-border/60 bg-bg-elevated/50 px-4 py-3 text-[11px] text-foreground-muted">
          <p className="mb-1.5 font-semibold text-foreground">
            {unanchoredCount} finding{unanchoredCount === 1 ? "" : "s"} without
            a matching clause in the extracted text
          </p>
          <p>
            These items are still available on the right — they just
            couldn&rsquo;t be located precisely in the source. This is
            common when the backend hasn&rsquo;t yet emitted{" "}
            <code className="font-mono">highlight_map</code>.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LegendDot({
  tone,
  label,
}: {
  tone: "critical" | "high" | "medium" | "low" | "positive";
  label: string;
}) {
  const dot: Record<typeof tone, string> = {
    critical: "bg-severity-critical",
    high: "bg-severity-high",
    medium: "bg-severity-medium",
    low: "bg-severity-low",
    positive: "bg-success",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot[tone])} />
      {label}
    </span>
  );
}

/**
 * CSS.escape fallback — IDs coming from the backend could contain
 * characters that need quoting in a selector. In every modern browser
 * CSS.escape exists, but we guard for SSR just in case.
 */
function cssEscape(value: string): string {
  if (typeof window !== "undefined" && typeof window.CSS?.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}
