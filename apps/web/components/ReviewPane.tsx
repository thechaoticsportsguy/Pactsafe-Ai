"use client";

/**
 * ReviewPane — the right pane of the split-pane review screen.
 *
 * Renders the normalized HighlightItem[] from `buildHighlights()` as a
 * grouped, scrollable findings list. Each card is keyed by `flag_id`
 * so the left pane (PdfReviewViewer) can focus/scroll it in response
 * to an evidence click, and vice versa — clicking a card here calls
 * `onCardClick(flag_id)` which the page promotes to `activeFlagId`.
 *
 * This component deliberately owns no state of its own beyond the
 * ref used for auto-scrolling. Filter state, active state, and the
 * cross-pane join all live on the parent page.
 */

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles,
  MapPin,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  FILTER_LABEL,
  groupBySeverity,
  type FilterKey,
  type HighlightItem,
} from "@/lib/review";

// ---------------------------------------------------------------------------
// Severity visuals — mirrored from PdfReviewViewer so the two panes
// feel like one surface.
// ---------------------------------------------------------------------------

const SEV_ICON: Record<FilterKey, React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertTriangle,
  LOW: Info,
  POSITIVE: ShieldCheck,
};

const SEV_RING: Record<FilterKey, string> = {
  CRITICAL: "border-severity-critical/40 bg-severity-critical/5",
  HIGH: "border-severity-high/40 bg-severity-high/5",
  MEDIUM: "border-severity-medium/40 bg-severity-medium/5",
  LOW: "border-severity-low/40 bg-severity-low/5",
  POSITIVE: "border-success/40 bg-success/5",
};

const SEV_TEXT: Record<FilterKey, string> = {
  CRITICAL: "text-severity-critical",
  HIGH: "text-severity-high",
  MEDIUM: "text-severity-medium",
  LOW: "text-severity-low",
  POSITIVE: "text-success",
};

const SEV_DOT: Record<FilterKey, string> = {
  CRITICAL: "bg-severity-critical",
  HIGH: "bg-severity-high",
  MEDIUM: "bg-severity-medium",
  LOW: "bg-severity-low",
  POSITIVE: "bg-success",
};

// ---------------------------------------------------------------------------

export interface ReviewPaneProps {
  /** Normalized findings from `buildHighlights()`. */
  items: HighlightItem[];
  /** The currently active finding's `flag_id`, or null. */
  activeFlagId: string | null;
  /**
   * Fired when the user clicks a card. The page promotes this id to
   * `activeFlagId` and the left pane (PdfReviewViewer) scrolls its
   * matching overlay into view.
   */
  onCardClick: (flagId: string) => void;
  /**
   * Optional severity filter set. Items whose severity isn't in the
   * set are hidden. `null` means "show everything".
   */
  visibleSeverities?: Set<FilterKey> | null;
  /**
   * Whether the backend actually emitted a `highlight_map`. When
   * false, we show a subtle footer explaining that offsets were
   * derived from client-side clause matching.
   */
  usedHighlightMap: boolean;
  /** Extra classes on the outer container. */
  className?: string;
}

// ---------------------------------------------------------------------------

export default function ReviewPane({
  items,
  activeFlagId,
  onCardClick,
  visibleSeverities,
  usedHighlightMap,
  className,
}: ReviewPaneProps) {
  // Filter then group — groups preserve severity order (critical first).
  const filtered = React.useMemo(() => {
    if (!visibleSeverities) return items;
    return items.filter((i) => visibleSeverities.has(i.severity));
  }, [items, visibleSeverities]);

  const groups = React.useMemo(() => groupBySeverity(filtered), [filtered]);

  // Auto-scroll the active card into view when activeFlagId changes
  // from an external source (e.g. a click on the left pane).
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!activeFlagId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>(
      `[data-card-flag="${cssEscape(activeFlagId)}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeFlagId]);

  // ---- Empty states ------------------------------------------------------

  if (!items.length) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 p-10 text-center text-sm text-foreground-muted",
          className,
        )}
      >
        <Sparkles className="h-8 w-8 text-foreground-subtle" />
        <p className="mt-3 font-medium text-foreground">No findings yet</p>
        <p className="mt-1 text-xs">
          Once the analysis completes, your risks and wins will appear here.
        </p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-surface/70 p-10 text-center text-sm text-foreground-muted",
          className,
        )}
      >
        <Info className="h-8 w-8 text-foreground-subtle" />
        <p className="mt-3 font-medium text-foreground">
          No findings match the current filter
        </p>
        <p className="mt-1 text-xs">
          Turn a severity back on in the toolbar to see more items.
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
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-bg-elevated/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground-muted">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Findings</span>
          <span className="text-foreground-subtle">
            · {filtered.length} of {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-foreground-subtle">
          <MapPin className="h-3 w-3" />
          <span>
            {usedHighlightMap ? "positional" : "inferred"} offsets
          </span>
        </div>
      </div>

      {/* Grouped list */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4"
      >
        {groups.map(({ severity, items: groupItems }) => {
          const Icon = SEV_ICON[severity];
          return (
            <section key={severity} className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                <Icon className={cn("h-3.5 w-3.5", SEV_TEXT[severity])} />
                <span className={SEV_TEXT[severity]}>
                  {FILTER_LABEL[severity]}
                </span>
                <span className="text-foreground-subtle">
                  · {groupItems.length}
                </span>
                <span className="ml-2 h-px flex-1 bg-border/60" />
              </div>

              <ul className="space-y-2">
                {groupItems.map((item) => (
                  <FindingCard
                    key={item.flag_id}
                    item={item}
                    active={activeFlagId === item.flag_id}
                    onClick={() => onCardClick(item.flag_id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Footer — only when the backend hasn't yet emitted highlight_map */}
      {!usedHighlightMap && (
        <div className="border-t border-border/60 bg-bg-elevated/50 px-4 py-2.5 text-[10px] text-foreground-subtle">
          Highlights positioned via client-side clause matching. Precise
          offsets will appear once the backend emits{" "}
          <code className="font-mono text-foreground-muted">highlight_map</code>
          .
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface FindingCardProps {
  item: HighlightItem;
  active: boolean;
  onClick: () => void;
}

function FindingCard({ item, active, onClick }: FindingCardProps) {
  const sev = item.severity;
  const hasAnchor = item.start != null && item.end != null;

  return (
    <li>
      <button
        type="button"
        data-card-flag={item.flag_id}
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "group block w-full rounded-xl border px-3.5 py-3 text-left transition-all",
          SEV_RING[sev],
          "hover:border-border-strong hover:bg-surface-2/60",
          active &&
            "ring-2 ring-accent ring-offset-2 ring-offset-background border-transparent",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", SEV_DOT[sev])}
            />
            <h3 className="truncate text-[13px] font-semibold text-foreground">
              {item.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!hasAnchor && (
              <span className="rounded-full bg-surface-3/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground-subtle">
                unanchored
              </span>
            )}
            {item.category && (
              <span className="rounded-full bg-surface-3/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground-muted">
                {item.category}
              </span>
            )}
          </div>
        </div>

        {item.explanation && (
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-foreground-muted">
            {item.explanation}
          </p>
        )}

        {item.quote && (
          <blockquote
            className={cn(
              "mt-2 border-l-2 pl-2.5 font-mono text-[11px] leading-relaxed text-foreground/75",
              sev === "CRITICAL" && "border-severity-critical/60",
              sev === "HIGH" && "border-severity-high/60",
              sev === "MEDIUM" && "border-severity-medium/60",
              sev === "LOW" && "border-severity-low/60",
              sev === "POSITIVE" && "border-success/60",
            )}
          >
            <span className="line-clamp-2">
              &ldquo;{item.quote.trim()}&rdquo;
            </span>
          </blockquote>
        )}

        {item.suggested_fix && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-accent-soft px-2 py-1.5 text-[11px] text-foreground/85">
            <Wand2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
            <span className="line-clamp-2">{item.suggested_fix}</span>
          </div>
        )}
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cssEscape(value: string): string {
  if (typeof window !== "undefined" && typeof window.CSS?.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}
