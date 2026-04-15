"use client";

/**
 * Split-pane review screen.
 *
 * Left pane  → PdfReviewViewer: the extracted contract with clickable,
 *              color-coded highlight overlays.
 * Right pane → ReviewPane: grouped findings list, severity filters,
 *              click-to-focus cards.
 *
 * Shared state (owned here):
 *   - `activeFlagId` joins the two panes by stable `flag_id`.
 *   - `visibleSeverities` filters both panes in sync.
 *   - `splitPct` is the left pane's width fraction, persisted to
 *     localStorage so it survives reloads.
 *
 * Shared actions:
 *   - `scrollToFlag(id)` — set activeFlagId, which both panes watch to
 *     scroll the matching element into view.
 *   - `focusFlag(id)` — alias of scrollToFlag used from the left pane.
 *
 * The route is deliberately `/analysis/[id]/review` instead of
 * replacing the main `/analysis/[id]` page — the existing page is
 * already a full report; this is the dedicated evidence-view mode.
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertTriangle,
  FileSearch,
  GripVertical,
  ShieldCheck,
  AlertOctagon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PdfReviewViewer from "@/components/PdfReviewViewer";
import ReviewPane from "@/components/ReviewPane";
import { getJob, subscribeToJob } from "@/lib/api";
import type { JobStatusResponse } from "@/lib/schemas";
import {
  ALL_FILTERS,
  buildHighlights,
  FILTER_LABEL,
  type FilterKey,
} from "@/lib/review";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPLIT_STORAGE_KEY = "pactsafe.review.splitPct";
const SPLIT_MIN = 0.3;
const SPLIT_MAX = 0.75;
const SPLIT_DEFAULT = 0.58;

const FILTER_ICON: Record<FilterKey, React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertTriangle,
  LOW: Info,
  POSITIVE: ShieldCheck,
};

const FILTER_TONE: Record<FilterKey, string> = {
  CRITICAL:
    "border-severity-critical/50 text-severity-critical hover:bg-severity-critical/10",
  HIGH: "border-severity-high/50 text-severity-high hover:bg-severity-high/10",
  MEDIUM:
    "border-severity-medium/50 text-severity-medium hover:bg-severity-medium/10",
  LOW: "border-severity-low/50 text-severity-low hover:bg-severity-low/10",
  POSITIVE: "border-success/50 text-success hover:bg-success/10",
};

// ---------------------------------------------------------------------------

export default function ReviewSplitPanePage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [activeFlagId, setActiveFlagId] = React.useState<string | null>(null);
  const [visibleSeverities, setVisibleSeverities] = React.useState<
    Set<FilterKey>
  >(() => new Set(ALL_FILTERS));

  // --- Fetch + live subscribe --------------------------------------------
  React.useEffect(() => {
    if (!jobId) return;
    let alive = true;

    getJob(jobId)
      .then((j) => {
        if (alive) setJob(j);
      })
      .catch((err) => {
        if (alive) setLoadError(err instanceof Error ? err.message : String(err));
      });

    const unsub = subscribeToJob(
      jobId,
      (ev) => {
        if (!alive) return;
        setJob((prev) =>
          prev
            ? {
                ...prev,
                status: ev.status ?? prev.status,
                result: ev.partial ?? prev.result,
              }
            : prev,
        );
      },
      () => {
        if (alive) getJob(jobId).then(setJob).catch(() => {});
      },
    );

    return () => {
      alive = false;
      unsub();
    };
  }, [jobId]);

  // --- Resizable split pane ----------------------------------------------
  const [splitPct, setSplitPct] = React.useState<number>(SPLIT_DEFAULT);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  // Restore from localStorage on mount.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (!Number.isNaN(n) && n >= SPLIT_MIN && n <= SPLIT_MAX) {
        setSplitPct(n);
      }
    }
  }, []);

  const onDragStart = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const clamped = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
      setSplitPct(clamped);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem(SPLIT_STORAGE_KEY, String(splitPct));
      } catch {
        /* ignore storage errors */
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [splitPct]);

  // --- Derived highlights -------------------------------------------------
  const result = job?.result ?? null;
  const text = job?.text_preview ?? "";

  const { items, usedHighlightMap, hasAnyOffsets } = React.useMemo(
    () => buildHighlights(result, text),
    [result, text],
  );

  // --- Shared actions -----------------------------------------------------
  const scrollToFlag = React.useCallback((flagId: string) => {
    setActiveFlagId(flagId);
  }, []);
  const focusFlag = scrollToFlag;

  const toggleSeverity = React.useCallback((key: FilterKey) => {
    setVisibleSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetFilters = React.useCallback(() => {
    setVisibleSeverities(new Set(ALL_FILTERS));
  }, []);

  // --- Loading + error states --------------------------------------------
  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-severity-critical" />
        <h1 className="mt-3 text-lg font-semibold">Couldn&rsquo;t load review</h1>
        <p className="mt-1 text-sm text-foreground-muted">{loadError}</p>
        <Link href={`/analysis/${jobId ?? ""}`} className="mt-4">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to report
          </Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-foreground-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading review…
      </div>
    );
  }

  const stillProcessing = job.status !== "completed" && job.status !== "failed";

  // --- Main ---------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-3 px-4 py-4 md:px-6">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/analysis/${jobId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to report
            </Button>
          </Link>
          <div className="hidden h-5 w-px bg-border/60 md:block" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-foreground-subtle">
              Evidence review
            </p>
            <h1 className="truncate text-[15px] font-semibold text-foreground">
              {job.filename ?? "Pasted contract"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-foreground-muted">
          <FileSearch className="h-3.5 w-3.5" />
          <span>
            {items.length} finding{items.length === 1 ? "" : "s"}
            {hasAnyOffsets ? "" : " · no positional data"}
          </span>
        </div>
      </header>

      {/* Severity filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_FILTERS.map((k) => {
          const Icon = FILTER_ICON[k];
          const active = visibleSeverities.has(k);
          const count = items.filter((i) => i.severity === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleSeverity(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? FILTER_TONE[k]
                  : "border-border/60 text-foreground-subtle hover:bg-surface-2/60",
              )}
              aria-pressed={active}
            >
              <Icon className="h-3 w-3" />
              {FILTER_LABEL[k]}
              <span className="rounded-full bg-surface-3/70 px-1.5 py-0.5 text-[9px] tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
        {visibleSeverities.size !== ALL_FILTERS.length && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-1 text-[11px] text-accent underline-offset-2 hover:underline"
          >
            Show all
          </button>
        )}
      </div>

      {/* Still-processing banner */}
      {stillProcessing && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          <span>
            Analysis is still running — findings will stream in as they&rsquo;re
            ready.
          </span>
        </div>
      )}

      {/* Split pane */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-0"
      >
        {/* Left: evidence */}
        <div
          className="min-h-0 md:pr-1.5"
          style={{ flexBasis: `${splitPct * 100}%` }}
        >
          <PdfReviewViewer
            text={text}
            filename={job.filename}
            items={items}
            activeFlagId={activeFlagId}
            onHighlightClick={focusFlag}
            visibleSeverities={visibleSeverities}
            className="h-full"
          />
        </div>

        {/* Drag handle (desktop only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          onPointerDown={onDragStart}
          className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center md:flex"
        >
          <span className="flex h-10 w-1 items-center justify-center rounded-full bg-border/60 transition-colors group-hover:bg-accent">
            <GripVertical className="h-3 w-3 text-foreground-subtle group-hover:text-accent" />
          </span>
        </div>

        {/* Right: findings */}
        <div
          className="min-h-0 md:pl-1.5"
          style={{ flexBasis: `${(1 - splitPct) * 100}%` }}
        >
          <ReviewPane
            items={items}
            activeFlagId={activeFlagId}
            onCardClick={scrollToFlag}
            visibleSeverities={visibleSeverities}
            usedHighlightMap={usedHighlightMap}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
