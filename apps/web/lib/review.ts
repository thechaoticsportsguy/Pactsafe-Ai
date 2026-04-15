/**
 * Review page — shared types and data-shaping helpers for the
 * split-pane evidence viewer.
 *
 * This module is the "adapter layer" between the backend-facing
 * AnalysisResult and the two review panes (PdfReviewViewer + ReviewPane).
 * Its single job is to produce a normalized array of HighlightItem
 * records keyed by a stable `flag_id`, so both panes can render the
 * exact same set of findings and cross-link by string identifier.
 *
 * Data sources, in order of preference:
 *   1. `result.highlight_map` — if the backend has started emitting
 *      structured positional data per the AI prompt roadmap, we use it
 *      verbatim. Each span already carries `flag_id` + offsets.
 *   2. `result.red_flags` / `result.green_flags` — the legacy shape.
 *      We derive `flag_id` client-side (`red-{i}` / `green-{i}`) and
 *      fall back to substring search against the extracted text when
 *      `start_offset`/`end_offset` are missing.
 *
 * The two sources are merged: a highlight_map entry whose `flag_id`
 * matches a derived red/green key enriches that key's record with
 * better positional data; otherwise it's added as a standalone item.
 */

import type {
  AnalysisResult,
  GreenFlag,
  HighlightCategory,
  HighlightSpan,
  RedFlag,
  Severity,
} from "./schemas";

// ---------------------------------------------------------------------------
// Severity filter keys
// ---------------------------------------------------------------------------
// The ReviewPage severity filter pills track a Set<FilterKey>. We use a
// single union across red + green flags so filter state is flat.

export type FilterKey = Severity | "POSITIVE";

export const ALL_FILTERS: FilterKey[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "POSITIVE",
];

export const FILTER_LABEL: Record<FilterKey, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  POSITIVE: "In your favor",
};

// ---------------------------------------------------------------------------
// Normalized item shape
// ---------------------------------------------------------------------------

export type HighlightKind = "red" | "green";

export interface HighlightItem {
  /**
   * Stable identifier used as the canonical join key between the
   * evidence overlay (left pane) and the finding card (right pane).
   * Format: `red-{index}` | `green-{index}` | `hmap-{flag_id}` when
   * the source is an orphan highlight_map entry.
   */
  flag_id: string;
  kind: HighlightKind;
  /**
   * Severity for filtering and color. Red flags inherit from the
   * underlying RedFlag. Green flags become "POSITIVE".
   */
  severity: Severity | "POSITIVE";
  category?: HighlightCategory | null;
  /** Short issue title (≤ 6 words) — used as the card headline. */
  title: string;
  /** Full plain-English explanation. */
  explanation: string;
  /** Verbatim clause text — the actual words that triggered the flag. */
  quote: string;
  /** Optional replacement language. */
  suggested_fix?: string | null;
  /**
   * Character offsets within the extracted text. Populated when the
   * backend provided offsets OR when we successfully located the
   * quote via substring search. `null` when we couldn't anchor it.
   */
  start?: number | null;
  end?: number | null;
  /**
   * One-based page number within the source document. Kept for
   * forward-compat with a future raster PDF.js viewer — unused today.
   */
  page?: number | null;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/** Canonical id for a red flag at a given index in `red_flags`. */
export function redFlagKey(index: number): string {
  return `red-${index}`;
}

/** Canonical id for a green flag at a given index in `green_flags`. */
export function greenFlagKey(index: number): string {
  return `green-${index}`;
}

/** Orphan highlight_map entries (not yet tied to a red/green flag). */
export function orphanKey(flagId: string, index: number): string {
  return `hmap-${flagId || index}`;
}

// ---------------------------------------------------------------------------
// Substring-search fallback
// ---------------------------------------------------------------------------

/**
 * Locate a quote inside the extracted text.
 *
 * We're intentionally forgiving: collapse runs of whitespace in both
 * the haystack and needle before matching, then walk the raw haystack
 * back out to the original offsets. This handles the very common case
 * where PDF extraction introduces stray newlines or double-spaces
 * inside a clause without making the match brittle.
 *
 * Returns `null` when the quote isn't found at all.
 */
function findQuoteOffsets(
  text: string,
  quote: string,
): { start: number; end: number } | null {
  if (!text || !quote) return null;
  const needle = quote.trim();
  if (needle.length < 8) return null; // too short to anchor reliably

  // Fast path: exact match.
  const exact = text.indexOf(needle);
  if (exact !== -1) {
    return { start: exact, end: exact + needle.length };
  }

  // Whitespace-tolerant path. Build a map from "collapsed" char
  // positions back to the original text so we can restore offsets.
  const collapsed: string[] = [];
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (prevSpace) continue;
      collapsed.push(" ");
      map.push(i);
      prevSpace = true;
    } else {
      collapsed.push(ch);
      map.push(i);
      prevSpace = false;
    }
  }
  const collapsedText = collapsed.join("");
  const collapsedNeedle = needle.replace(/\s+/g, " ");

  const idx = collapsedText.indexOf(collapsedNeedle);
  if (idx === -1) return null;

  const start = map[idx];
  const endIdx = Math.min(idx + collapsedNeedle.length - 1, map.length - 1);
  const end = map[endIdx] + 1;
  if (end <= start) return null;
  return { start, end };
}

// ---------------------------------------------------------------------------
// Merge helpers
// ---------------------------------------------------------------------------

/**
 * Match a highlight_map span to one of the derived red/green items.
 * We try three strategies in order:
 *   1. Exact `flag_id` equality (backend-provided).
 *   2. Quote equality — the span's verbatim text matches an item's.
 *   3. Substring inclusion — the item's quote contains the span's.
 */
function matchSpanToItem(
  span: HighlightSpan,
  items: HighlightItem[],
): HighlightItem | undefined {
  if (span.flag_id) {
    const byId = items.find((i) => i.flag_id === span.flag_id);
    if (byId) return byId;
  }
  const q = (span.quote || "").trim();
  if (q.length < 8) return undefined;
  const byQuote = items.find((i) => i.quote.trim() === q);
  if (byQuote) return byQuote;
  return items.find(
    (i) =>
      i.quote.toLowerCase().includes(q.toLowerCase()) ||
      q.toLowerCase().includes(i.quote.toLowerCase()),
  );
}

/**
 * Map the legacy `Severity` plus the optional "POSITIVE" used by
 * highlight_map spans back onto our unified `FilterKey` union.
 */
function normalizeSeverity(
  s: Severity | "POSITIVE" | undefined,
): Severity | "POSITIVE" {
  if (s === "POSITIVE") return "POSITIVE";
  if (s === "CRITICAL" || s === "HIGH" || s === "MEDIUM" || s === "LOW") {
    return s;
  }
  return "MEDIUM";
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

/**
 * Best-effort short title for a finding. Red flags don't carry an
 * explicit title today; we pull the first 6 words of the explanation
 * or fall back to the clause.
 */
function shortTitle(primary: string, fallback: string): string {
  const source = (primary || fallback || "").trim().replace(/\s+/g, " ");
  if (!source) return "Clause of concern";
  const words = source.split(" ");
  if (words.length <= 8) return source.replace(/[.:;]$/, "");
  return words.slice(0, 8).join(" ") + "…";
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export interface BuildHighlightsResult {
  items: HighlightItem[];
  /**
   * True if the backend emitted a `highlight_map`. Used by the review
   * page footer to caption the precision: "Positional highlights from
   * the backend" vs "Offsets derived from clause matching".
   */
  usedHighlightMap: boolean;
  /**
   * True if any item has non-null offsets — i.e. we have something to
   * anchor in the evidence pane at all. When this is false for every
   * item the review page renders a "no positional data" fallback.
   */
  hasAnyOffsets: boolean;
}

/**
 * Build the normalized `HighlightItem[]` for a completed analysis.
 *
 * `text` is the extracted contract body from `job.text_preview`.
 * Passing an empty string is fine — items will still be built, but
 * every item will have `null` offsets and the viewer will render them
 * as un-anchored cards.
 */
export function buildHighlights(
  result: AnalysisResult | null | undefined,
  text: string,
): BuildHighlightsResult {
  const items: HighlightItem[] = [];

  if (!result) {
    return { items, usedHighlightMap: false, hasAnyOffsets: false };
  }

  // --- Red flags ---------------------------------------------------------
  const reds: RedFlag[] = Array.isArray(result.red_flags)
    ? result.red_flags
    : [];
  reds.forEach((f, i) => {
    const flag_id = redFlagKey(i);
    let start = f.start_offset ?? null;
    let end = f.end_offset ?? null;

    // Offsets missing or clearly out of bounds — try substring search.
    if (
      text &&
      (start == null ||
        end == null ||
        end <= start ||
        start < 0 ||
        end > text.length)
    ) {
      const located = findQuoteOffsets(text, f.clause || "");
      if (located) {
        start = located.start;
        end = located.end;
      } else {
        start = null;
        end = null;
      }
    }

    items.push({
      flag_id,
      kind: "red",
      severity: f.severity,
      category: null, // red flags don't carry category in the legacy schema
      title: shortTitle(f.explanation, f.clause),
      explanation: f.explanation || "",
      quote: f.clause || "",
      suggested_fix: null,
      start,
      end,
      page: f.page ?? null,
    });
  });

  // --- Green flags -------------------------------------------------------
  const greens: GreenFlag[] = Array.isArray(result.green_flags)
    ? result.green_flags
    : [];
  greens.forEach((g, i) => {
    const flag_id = greenFlagKey(i);
    let start = g.start_offset ?? null;
    let end = g.end_offset ?? null;
    if (
      text &&
      (start == null ||
        end == null ||
        end <= start ||
        start < 0 ||
        end > text.length)
    ) {
      const located = findQuoteOffsets(text, g.clause || "");
      if (located) {
        start = located.start;
        end = located.end;
      } else {
        start = null;
        end = null;
      }
    }
    items.push({
      flag_id,
      kind: "green",
      severity: "POSITIVE",
      category: "positive",
      title: shortTitle(g.explanation, g.clause),
      explanation: g.explanation || "",
      quote: g.clause || "",
      suggested_fix: null,
      start,
      end,
      page: g.page ?? null,
    });
  });

  // --- highlight_map (forward-compat enrichment) ------------------------
  const hmap: HighlightSpan[] = Array.isArray(result.highlight_map)
    ? result.highlight_map
    : [];
  const usedHighlightMap = hmap.length > 0;

  hmap.forEach((span, i) => {
    // If the span's severity is POSITIVE we treat it as green.
    const matched = matchSpanToItem(span, items);
    if (matched) {
      // Enrich the existing item with better positional data,
      // category, and optional suggested_fix / title. Don't clobber
      // fields that are already populated to avoid losing backend data.
      if (matched.start == null || matched.end == null) {
        if (
          span.char_start != null &&
          span.char_end != null &&
          span.char_end > span.char_start
        ) {
          matched.start = span.char_start;
          matched.end = span.char_end;
        } else if (text && span.quote) {
          const located = findQuoteOffsets(text, span.quote);
          if (located) {
            matched.start = located.start;
            matched.end = located.end;
          }
        }
      }
      if (!matched.category && span.category) {
        matched.category = span.category;
      }
      if (!matched.suggested_fix && span.suggested_fix) {
        matched.suggested_fix = span.suggested_fix;
      }
      if (span.page != null && matched.page == null) {
        matched.page = span.page;
      }
      return;
    }

    // Orphan span — add it as a standalone item so we don't lose the
    // finding, even if there's no matching red/green flag.
    let start: number | null =
      span.char_start != null &&
      span.char_end != null &&
      span.char_end > span.char_start
        ? span.char_start
        : null;
    let end: number | null = start != null ? span.char_end! : null;
    if ((start == null || end == null) && text && span.quote) {
      const located = findQuoteOffsets(text, span.quote);
      if (located) {
        start = located.start;
        end = located.end;
      }
    }
    items.push({
      flag_id: orphanKey(span.flag_id, i),
      kind: span.severity === "POSITIVE" ? "green" : "red",
      severity: normalizeSeverity(span.severity),
      category: span.category ?? null,
      title:
        span.issue_title?.trim() ||
        shortTitle(span.explanation || "", span.quote || ""),
      explanation: span.explanation || "",
      quote: span.quote || "",
      suggested_fix: span.suggested_fix ?? null,
      start,
      end,
      page: span.page ?? null,
    });
  });

  const hasAnyOffsets = items.some((i) => i.start != null && i.end != null);
  return { items, usedHighlightMap, hasAnyOffsets };
}

// ---------------------------------------------------------------------------
// Risk score + empty-analysis helpers
// ---------------------------------------------------------------------------

/**
 * Client-side risk-score formula ported from the "live scanner" UX.
 *
 *   reds    = CRITICAL + HIGH  (weight 3.0 each)
 *   yellows = MEDIUM  + LOW    (weight 1.5 each)
 *   total   = number of flagged clauses
 *
 *   score = round(((reds * 3 + yellows * 1.5) / (total * 3)) * 100)
 *
 * Normalized to 0–100 where higher = riskier. Returns `null` when
 * there are no flagged clauses at all — the caller should treat that
 * as "analysis returned nothing" rather than silently rendering a
 * default score. That was the 50/100-with-zero-flags bug.
 */
export function computeRiskScore(
  result: AnalysisResult | null | undefined,
): number | null {
  if (!result) return null;
  const flags = Array.isArray(result.red_flags) ? result.red_flags : [];
  const total = flags.length;
  if (total === 0) return null;
  const reds = flags.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
  ).length;
  const yellows = flags.filter(
    (f) => f.severity === "MEDIUM" || f.severity === "LOW",
  ).length;
  const score = ((reds * 3 + yellows * 1.5) / (total * 3)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * True when the analysis came back with nothing usable — no red flags,
 * no green flags, no missing-protection findings, and a summary that's
 * empty or too short to be meaningful.
 *
 * Used by the results page to swap the default dashboard for a clear
 * "analysis incomplete, retry" recovery card instead of the confusing
 * "50/100 MODERATE" default.
 */
export function isEmptyAnalysis(
  result: AnalysisResult | null | undefined,
): boolean {
  if (!result) return true;
  const reds = Array.isArray(result.red_flags) ? result.red_flags : [];
  const greens = Array.isArray(result.green_flags) ? result.green_flags : [];
  const missing = Array.isArray(result.missing_protections)
    ? result.missing_protections
    : [];
  const summary = (result.overall_summary || "").trim();
  return (
    reds.length === 0 &&
    greens.length === 0 &&
    missing.length === 0 &&
    summary.length < 20
  );
}

/**
 * Display-friendly risk score that always prefers the deterministic
 * client-side formula when we have data to compute from. Falls back
 * to the backend's number only when there are no flags (and only so
 * callers who don't branch on `isEmptyAnalysis` get *something*).
 */
export function displayRiskScore(
  result: AnalysisResult | null | undefined,
): number {
  const computed = computeRiskScore(result);
  if (computed != null) return computed;
  // Final fallback — never > 0 when there are no flags, so we don't
  // re-introduce the 50/100-with-zero-flags bug.
  return 0;
}

/**
 * Text band matching `displayRiskScore`. Keeps the labels aligned with
 * the live scanner: High ≥ 65, Medium ≥ 35, otherwise Low.
 */
export function riskBandFromScore(score: number): {
  label: string;
  color: string;
} {
  if (score >= 65) return { label: "High risk", color: "#ef4444" };
  if (score >= 35) return { label: "Medium risk", color: "#f59e0b" };
  return { label: "Low risk", color: "#10b981" };
}

// ---------------------------------------------------------------------------
// Severity ordering — critical first, positive last.
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<FilterKey, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  POSITIVE: 4,
};

export function compareSeverity(
  a: Severity | "POSITIVE",
  b: Severity | "POSITIVE",
): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

/** Sort items by severity then document position. */
export function sortHighlights(items: HighlightItem[]): HighlightItem[] {
  return [...items].sort((a, b) => {
    const s = compareSeverity(a.severity, b.severity);
    if (s !== 0) return s;
    const aStart = a.start ?? Number.POSITIVE_INFINITY;
    const bStart = b.start ?? Number.POSITIVE_INFINITY;
    return aStart - bStart;
  });
}

/** Group items by severity for the grouped findings list. */
export function groupBySeverity(
  items: HighlightItem[],
): Array<{ severity: FilterKey; items: HighlightItem[] }> {
  const groups = new Map<FilterKey, HighlightItem[]>();
  for (const it of items) {
    const key = it.severity;
    const arr = groups.get(key);
    if (arr) arr.push(it);
    else groups.set(key, [it]);
  }
  return ALL_FILTERS.filter((k) => groups.has(k)).map((k) => ({
    severity: k,
    items: groups.get(k)!,
  }));
}
