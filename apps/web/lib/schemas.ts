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
  text_preview?: string | null;
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
