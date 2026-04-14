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
