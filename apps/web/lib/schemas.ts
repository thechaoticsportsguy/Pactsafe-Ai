// ----------------------------------------------------------------------
// Shared types — mirrors apps/api/app/schemas.py (AnalysisResult, etc.).
// The /packages/schemas/typescript/index.ts file is the canonical source;
// this file is a vendored copy to avoid cross-workspace Docker builds.
// Regenerate by copy-paste when the backend schema changes.
// ----------------------------------------------------------------------

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type JobStatus =
  | "queued"
  | "extracting"
  | "analyzing"
  | "completed"
  | "failed";

export interface RedFlag {
  clause: string;
  explanation: string;
  severity: Severity;
  page?: number | null;
  start_offset?: number | null;
  end_offset?: number | null;
  /**
   * Section identifier from the source document ("5.1", "14.2", etc.)
   * Populated only by the v2 analyzer. Legacy (non-v2) analyses leave
   * this null — callers should render the citation block only when both
   * `section_number` and `quote` are present.
   */
  section_number?: string | null;
  /**
   * Verbatim quote from the cited section (≤500 chars, may contain
   * ellipses for omitted middle text). The backend's citation validator
   * has already confirmed this quote appears in the source at
   * rapidfuzz partial_ratio ≥85, so the frontend can reliably locate it
   * via `locateQuote` in lib/locate-quote.ts. Populated only by v2.
   */
  quote?: string | null;
}

/**
 * Clauses that work in the freelancer's favor — e.g. a proper IP transfer
 * tied to final payment, a late-fee clause, a reasonable termination notice.
 *
 * Optional on the wire for now: older backends don't emit this field, so
 * callers should treat `undefined` as "not available" rather than "none".
 */
export interface GreenFlag {
  clause: string;
  explanation: string;
  page?: number | null;
  start_offset?: number | null;
  end_offset?: number | null;
}

/**
 * Per-dimension breakdown of the overall risk. Each score is 0–100 where
 * higher is better (safer) — the inverse of the overall risk_score which
 * is 0–100 where higher means riskier.
 *
 * Optional on the wire: older backends don't emit this.
 */
export interface SubScores {
  fairness: number;
  clarity: number;
  protection: number;
  payment_safety: number;
}

/**
 * Structured location data for a single flagged clause. Allows the
 * frontend to overlay highlights directly on the rendered PDF (and the
 * "AI reading" animation to show the exact spans as they get marked).
 *
 * Optional on the wire: frontends should gracefully fall back to
 * plain-text highlighting (search-based) when `highlight_map` is absent.
 */
export type HighlightCategory =
  | "ip_ownership"
  | "payment_terms"
  | "scope_creep"
  | "liability_indemnity"
  | "termination"
  | "non_compete"
  | "confidentiality"
  | "dispute_resolution"
  | "missing_protection"
  | "positive";

export interface HighlightSpan {
  flag_id: string;
  quote: string;
  severity: Severity | "POSITIVE";
  category?: HighlightCategory;
  page?: number | null;
  paragraph_index?: number | null;
  char_start?: number | null;
  char_end?: number | null;
  issue_title?: string | null;
  explanation?: string | null;
  suggested_fix?: string | null;
}

/**
 * v2-pipeline metadata — the typed enum, kept alongside the human label in
 * `contract_type`. Frontend uses `document_type` to pick its own display
 * label via `getDocumentTypeLabel`. Absent on legacy responses.
 */
export interface AnalysisMetadata {
  document_type?: string;
}

export interface AnalysisResult {
  contract_type: string;
  risk_score: number;
  overall_summary: string;
  red_flags: RedFlag[];
  missing_protections: string[];
  negotiation_suggestions: string[];
  model_used: string;
  provider?: "ollama" | "anthropic" | "groq" | null;
  error?: string | null;
  truncated: boolean;
  // Optional forward-compat additions
  green_flags?: GreenFlag[];
  sub_scores?: SubScores;
  /**
   * Character-offset highlight spans keyed back to red/green flags.
   * Enables the split-pane "PDF + highlights" viewer described in the
   * product roadmap. Absent on older backends.
   */
  highlight_map?: HighlightSpan[];
  /**
   * v2 pipeline metadata. Absent on legacy (non-v2) responses — callers
   * should treat `undefined` as "not available" and fall back to the
   * generic "Contract" label.
   */
  metadata?: AnalysisMetadata;
}

export interface JobCreateResponse {
  job_id: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  filename?: string | null;
  created_at: string;
  updated_at: string;
  /**
   * First ~500 chars of extracted text. Kept for back-compat with any
   * consumer that reads this field directly; new UI should prefer
   * `document_text` (returned by GET /api/jobs/{id} only) so the clause
   * highlighter can render the full contract with v2 citations visible
   * in context.
   */
  text_preview?: string | null;
  /**
   * Full extracted document text. Returned by the single-job endpoint
   * only (the history endpoint omits it to keep the list response fast).
   * Optional — older backend builds that predate this field will have
   * it undefined, so callers should fall back to `text_preview`.
   */
  document_text?: string | null;
  result?: AnalysisResult | null;
  error?: string | null;
}

export interface JobProgressEvent {
  job_id: string;
  status: JobStatus;
  message: string;
  progress: number;
  partial?: AnalysisResult | null;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
