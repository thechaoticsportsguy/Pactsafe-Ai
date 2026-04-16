/**
 * lib/review — risk score + empty-analysis helpers.
 *
 * This module used to host the split-pane evidence viewer's
 * `buildHighlights` adapter, but that viewer has been removed. The
 * remaining helpers compute a deterministic client-side risk score
 * and detect "empty" analyses (no flags, no summary) so the results
 * page can render a recovery state instead of the stale
 * "50/100 MODERATE" default.
 */

import type {
  AnalysisResult,
  GreenFlag,
  HighlightSpan,
  JobStatusResponse,
  RedFlag,
} from "./schemas";

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Single source of truth for "what does a usable AnalysisResult look
 * like to the UI?"
 *
 * Every renderer below AnalysisReport — FlagList, ClauseHighlighter,
 * NegotiationComposer, RiskGauge — assumes required list fields are
 * real arrays. When the backend short-circuits (rate-limit, truncated
 * model output, older record) or the transport drops a default, those
 * fields can arrive as `null`/`undefined` and the component tree
 * throws `Cannot read properties of undefined (reading 'filter')`,
 * which bubbles up to the root error boundary and shows
 * "That didn't go as planned."
 *
 * Running every result through this normalizer at the page boundary
 * keeps the renderers simple and guarantees they never see a missing
 * array or object.
 */
export function normalizeAnalysisResult(
  raw: AnalysisResult | null | undefined,
): AnalysisResult | null {
  if (!raw) return null;

  const redFlags: RedFlag[] = Array.isArray(raw.red_flags)
    ? raw.red_flags.filter((f): f is RedFlag => !!f && typeof f === "object")
    : [];
  const greenFlags: GreenFlag[] | undefined = Array.isArray(raw.green_flags)
    ? raw.green_flags.filter((f): f is GreenFlag => !!f && typeof f === "object")
    : undefined;
  const highlightMap: HighlightSpan[] | undefined = Array.isArray(
    raw.highlight_map,
  )
    ? raw.highlight_map.filter(
        (h): h is HighlightSpan => !!h && typeof h === "object",
      )
    : undefined;

  return {
    contract_type:
      typeof raw.contract_type === "string" && raw.contract_type.length > 0
        ? raw.contract_type
        : "Contract analysis",
    risk_score:
      typeof raw.risk_score === "number" && Number.isFinite(raw.risk_score)
        ? Math.max(0, Math.min(100, Math.round(raw.risk_score)))
        : 0,
    overall_summary:
      typeof raw.overall_summary === "string" ? raw.overall_summary : "",
    red_flags: redFlags,
    missing_protections: Array.isArray(raw.missing_protections)
      ? raw.missing_protections.filter(
          (m): m is string => typeof m === "string" && m.length > 0,
        )
      : [],
    negotiation_suggestions: Array.isArray(raw.negotiation_suggestions)
      ? raw.negotiation_suggestions.filter(
          (s): s is string => typeof s === "string" && s.length > 0,
        )
      : [],
    model_used: typeof raw.model_used === "string" ? raw.model_used : "",
    provider: raw.provider ?? null,
    error: raw.error ?? null,
    truncated: raw.truncated === true,
    ...(greenFlags !== undefined ? { green_flags: greenFlags } : {}),
    ...(raw.sub_scores && typeof raw.sub_scores === "object"
      ? { sub_scores: raw.sub_scores }
      : {}),
    ...(highlightMap !== undefined ? { highlight_map: highlightMap } : {}),
  };
}

/**
 * Normalize an entire job-status envelope. Wraps
 * `normalizeAnalysisResult` and passes the outer shell through
 * untouched — handy for the homepage + /analyze + /analysis/[id]
 * flows which all consume `JobStatusResponse` from the same API.
 */
export function normalizeJobStatus(
  job: JobStatusResponse | null | undefined,
): JobStatusResponse | null {
  if (!job) return null;
  return { ...job, result: normalizeAnalysisResult(job.result ?? null) };
}

// ---------------------------------------------------------------------------
// Risk score helpers
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
 * default score.
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
 * to 0 when there are no flags (and only so callers who don't branch
 * on `isEmptyAnalysis` get *something*).
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
