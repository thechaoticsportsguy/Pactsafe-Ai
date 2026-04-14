/**
 * API client — wraps the FastAPI backend.
 *
 * NEVER calls api.anthropic.com / api.groq.com / openrouter.ai directly.
 * All LLM traffic goes through our own backend.
 */

import type {
  AnalysisResult,
  JobCreateResponse,
  JobProgressEvent,
  JobStatusResponse,
} from "./schemas";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

const WS_URL = (
  process.env.NEXT_PUBLIC_WS_URL ??
  API_URL.replace(/^http/, "ws")
).replace(/\/+$/, "");

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[api] fetch failed — ${url}`, err);
    throw new Error(
      `Cannot reach the API at ${API_URL}. ` +
      `Verify NEXT_PUBLIC_API_URL is set and the backend is running. ` +
      `(${err instanceof Error ? err.message : String(err)})`,
    );
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) msg = `${res.status} ${body.detail}`;
    } catch {
      // ignore
    }
    console.error(`[api] ${init?.method ?? "GET"} ${url} → ${msg}`);
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/** POST /api/jobs (multipart file) */
export async function createJobFromFile(
  file: File,
): Promise<JobCreateResponse> {
  const fd = new FormData();
  fd.append("file", file);
  return req<JobCreateResponse>("/api/jobs", { method: "POST", body: fd });
}

/** POST /api/jobs (raw text) */
export async function createJobFromText(
  text: string,
): Promise<JobCreateResponse> {
  const fd = new FormData();
  fd.append("text", text);
  return req<JobCreateResponse>("/api/jobs", { method: "POST", body: fd });
}

/** GET /api/jobs/{id} */
export async function getJob(jobId: string): Promise<JobStatusResponse> {
  return req<JobStatusResponse>(`/api/jobs/${jobId}`);
}

/** GET /api/jobs?limit=... */
export async function listJobs(limit = 50): Promise<JobStatusResponse[]> {
  return req<JobStatusResponse[]>(`/api/jobs?limit=${limit}`);
}

/** GET /api/analyses/{id} */
export async function getAnalysis(jobId: string): Promise<AnalysisResult> {
  return req<AnalysisResult>(`/api/analyses/${jobId}`);
}

/** Health probe */
export async function getHealth(): Promise<{
  status: string;
  provider: string;
  ollama_reachable: boolean;
  anthropic_configured: boolean;
  groq_configured: boolean;
}> {
  return req("/api/health");
}

/** WebSocket URL for live job progress. */
export function jobWsUrl(jobId: string): string {
  return `${WS_URL}/ws/jobs/${jobId}`;
}

/** Export URLs (open directly from the browser for download). */
export const exportPdfUrl = (jobId: string): string =>
  `${API_URL}/api/export/${jobId}.pdf`;

export const exportJsonUrl = (jobId: string): string =>
  `${API_URL}/api/export/${jobId}.json`;

/**
 * Subscribe to job progress events. Returns a cleanup fn.
 * The onEvent callback fires for every JobProgressEvent; onClose fires when
 * the WS closes (usually when status becomes completed/failed).
 */
export function subscribeToJob(
  jobId: string,
  onEvent: (ev: JobProgressEvent) => void,
  onClose?: () => void,
): () => void {
  let closed = false;
  const ws = new WebSocket(jobWsUrl(jobId));
  ws.onmessage = (e) => {
    try {
      const ev = JSON.parse(e.data) as JobProgressEvent;
      onEvent(ev);
    } catch {
      // ignore malformed
    }
  };
  ws.onerror = () => {
    // Errors show as a close event after
  };
  ws.onclose = () => {
    if (!closed) onClose?.();
  };
  return () => {
    closed = true;
    try {
      ws.close();
    } catch {
      /* no-op */
    }
  };
}
