"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Dropzone from "@/components/Dropzone";
import UploadProgress from "@/components/UploadProgress";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";
import { createJobFromFile, createJobFromText, getJob } from "@/lib/api";
import type { JobStatus } from "@/lib/schemas";

type Mode = "file" | "text";

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("file");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<JobStatus>("queued");
  const [message, setMessage] = React.useState("Uploading…");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Clean up interval if the component unmounts mid-analysis
  React.useEffect(() => () => stopPolling(), []);

  async function start(promise: Promise<{ job_id: string; status: JobStatus }>) {
    setError(null);
    setBusy(true);
    setStatus("queued");
    setMessage("Creating job…");
    setProgress(0.05);

    let job_id: string;
    try {
      ({ job_id } = await promise);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analyze] job creation failed", e);
      setError(msg);
      setBusy(false);
      return;
    }

    setJobId(job_id);
    setMessage("Queued for processing…");
    setProgress(0.12);

    // Poll GET /api/jobs/{id} every 2 s instead of using WebSocket
    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(job_id);
        setStatus(job.status);

        if (job.status === "extracting") {
          setMessage("Extracting text…");
          setProgress(0.35);
        } else if (job.status === "analyzing") {
          setMessage("Analyzing contract…");
          setProgress(0.65);
        } else if (job.status === "completed") {
          stopPolling();
          setProgress(1);
          setMessage("Done!");
          setTimeout(() => router.push(`/analysis/${job_id}`), 400);
        } else if (job.status === "failed") {
          stopPolling();
          console.error("[analyze] job failed", job.error);
          setError(job.error || "Analysis failed.");
          setBusy(false);
        }
      } catch (e: unknown) {
        stopPolling();
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[analyze] poll failed", e);
        setError(msg);
        setBusy(false);
      }
    }, 2000);
  }

  function onFile(file: File) {
    start(createJobFromFile(file));
  }

  function onAnalyzeText() {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      setError("Paste at least 50 characters of contract text.");
      return;
    }
    start(createJobFromText(trimmed));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analyze a contract</h1>
          <p className="mt-1 text-sm text-muted">
            Upload a file or paste text. We'll extract, analyze, and highlight
            risks.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
          {(["file", "text"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy}
              onClick={() => setMode(m)}
              className={
                "px-3 py-1.5 rounded capitalize " +
                (mode === m
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground")
              }
            >
              {m === "file" ? "Upload file" : "Paste text"}
            </button>
          ))}
        </div>
      </div>

      {!busy && mode === "file" && <Dropzone onFile={onFile} disabled={busy} />}

      {!busy && mode === "text" && (
        <div className="rounded-xl border border-border bg-surface/60 p-5">
          <TextArea
            placeholder="Paste contract text here (at least 50 characters)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            disabled={busy}
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={onAnalyzeText} disabled={busy}>
              Analyze text
            </Button>
          </div>
        </div>
      )}

      {busy && (
        <UploadProgress
          status={status}
          message={message}
          progress={progress}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-severity-critical/50 bg-severity-critical/10 p-3 text-sm text-severity-critical"
        >
          {error}
        </div>
      )}

      {jobId && !busy && !error && (
        <p className="text-xs text-muted">
          Job ID: <span className="font-mono">{jobId}</span>
        </p>
      )}
    </div>
  );
}
