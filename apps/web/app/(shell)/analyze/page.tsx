"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  Type,
  Lock,
  ShieldCheck,
  Zap,
  AlertOctagon,
  RefreshCw,
  ArrowRight,
  ClipboardPaste,
  CheckCircle2,
} from "lucide-react";
import Dropzone from "@/components/Dropzone";
import ContractReader from "@/components/ContractReader";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import { createJobFromFile, createJobFromText, getJob } from "@/lib/api";
import type { JobStatus } from "@/lib/schemas";
import { cn } from "@/lib/cn";

type Mode = "file" | "text";

export default function AnalyzePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<Mode>("file");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<JobStatus>("queued");
  const [message, setMessage] = React.useState("Uploading…");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [isDraggingGlobal, setIsDraggingGlobal] = React.useState(false);
  // Filename of the uploaded file (if any) — surfaced in the live
  // "PactSafe AI is reading" animation so the user sees their own
  // document inside the reader frame.
  const [filename, setFilename] = React.useState<string | null>(null);
  // Seconds elapsed since the current job started, for the reader header.
  const [elapsed, setElapsed] = React.useState(0);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const dragDepthRef = React.useRef(0);

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  React.useEffect(() => () => stopPolling(), []);

  // Tick the elapsed-time counter while a job is in flight. Reset on
  // each new job via the `busy` dep so every analysis starts at 0.
  React.useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [busy]);

  async function start(
    promise: Promise<{ job_id: string; status: JobStatus }>,
  ) {
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
    setFilename(file.name);
    start(createJobFromFile(file));
  }

  function onAnalyzeText() {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      setError("Paste at least 50 characters of contract text.");
      return;
    }
    setFilename(null);
    start(createJobFromText(trimmed));
  }

  async function pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || clipText.trim().length === 0) {
        toast({
          tone: "error",
          message: "Clipboard is empty",
          description: "Copy your contract text first, then try again.",
        });
        return;
      }
      setMode("text");
      setText(clipText);
      setError(null);
      toast({
        tone: "success",
        message: "Pasted from clipboard",
        description: `${clipText.length.toLocaleString()} characters loaded.`,
      });
    } catch {
      toast({
        tone: "error",
        message: "Couldn't read clipboard",
        description: "Your browser blocked access — paste with ⌘V instead.",
      });
    }
  }

  // ⌘/Ctrl + Enter submits from either mode
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (mode === "text" && text.trim().length >= 50) {
          e.preventDefault();
          onAnalyzeText();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, mode, text]);

  // Global drag-and-drop over the entire analyze page
  React.useEffect(() => {
    if (busy) return;

    const hasFiles = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i++) {
        if (types[i] === "Files") return true;
      }
      return false;
    };

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepthRef.current += 1;
      setIsDraggingGlobal(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingGlobal(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingGlobal(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) {
        setMode("file");
        onFile(f);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  function reset() {
    setError(null);
    setBusy(false);
    setProgress(0);
    setJobId(null);
    setText("");
    setFilename(null);
    setElapsed(0);
  }

  return (
    <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      {isDraggingGlobal && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in"
        >
          <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-accent/60 bg-accent/[0.08] backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-accent/40 bg-bg-elevated/95 px-8 py-6 shadow-card-lg ring-1 ring-accent/30">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-accent/30">
              <Upload className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Drop your contract anywhere
            </p>
            <p className="text-xs text-foreground-muted">
              PDF · DOCX · TXT · up to 10 MB
            </p>
          </div>
        </div>
      )}
      {/* Main */}
      <div className="min-w-0 space-y-8">
        <div>
          <Badge tone="accent" size="xs" className="mb-3">
            <Zap className="h-3 w-3" />
            New analysis
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Analyze a contract
          </h1>
          <p className="mt-2 text-sm text-foreground-muted max-w-xl leading-relaxed">
            Upload a PDF, DOCX, or TXT — or paste raw text. We’ll extract it,
            flag risks, and give you ready-to-send negotiation language.
          </p>
        </div>

        {!busy && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface/60 p-1">
                {(
                  [
                    ["file", "Upload file", Upload],
                    ["text", "Paste text", Type],
                  ] as [Mode, string, React.ElementType][]
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                      mode === m
                        ? "bg-accent text-white shadow-glow"
                        : "text-foreground-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={pasteFromClipboard}
                disabled={busy}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste from clipboard
              </Button>
            </div>

            {mode === "file" && <Dropzone onFile={onFile} disabled={busy} />}

            {mode === "text" && (
              <div className="rounded-xl border border-border bg-surface/60 p-5">
                <TextArea
                  placeholder="Paste your contract text here (at least 50 characters)…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (text.trim().length >= 50) onAnalyzeText();
                    }
                  }}
                  rows={14}
                  disabled={busy}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-foreground-muted">
                    <span className="tabular-nums">
                      {text.trim().length.toLocaleString()} characters
                    </span>
                    {text.trim().length >= 50 && (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-xs text-foreground-subtle">
                      <kbd>⌘</kbd> <kbd>Enter</kbd>
                    </span>
                    <Button
                      onClick={onAnalyzeText}
                      disabled={busy || text.trim().length < 50}
                    >
                      Analyze text
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {busy && (
          <ContractReader
            status={status}
            message={message}
            progress={progress}
            text={mode === "text" ? text : null}
            filename={filename}
            elapsed={elapsed}
          />
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-5"
          >
            <div className="flex items-start gap-3">
              <AlertOctagon className="h-5 w-5 text-severity-critical mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-severity-critical">
                  Something went wrong
                </p>
                <p className="mt-1 text-xs text-foreground/85">{error}</p>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={reset}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Start over
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {jobId && !busy && !error && (
          <p className="text-xs text-foreground-muted">
            Job ID: <span className="font-mono">{jobId}</span>
          </p>
        )}
      </div>

      {/* Side reassurance panel */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-border bg-surface/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private by default
          </p>
          <ul className="mt-4 space-y-3 text-xs text-foreground-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
              <span>Uploads are encrypted in transit and at rest.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
              <span>We never train on your contracts.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
              <span>Delete any analysis anytime from history.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
            Quick facts
          </p>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-foreground-muted">Typical review</dt>
              <dd className="text-foreground font-medium">&lt; 60 s</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-foreground-muted">File size</dt>
              <dd className="text-foreground font-medium">up to 10 MB</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-foreground-muted">Formats</dt>
              <dd className="text-foreground font-medium">PDF · DOCX · TXT</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface/30 p-5">
          <p className="text-xs text-foreground-subtle leading-relaxed">
            PactSafe AI is a screening tool, not a law firm. For high-stakes
            deals, consult a licensed attorney.{" "}
            <Link
              href="/#faq"
              className="text-accent hover:underline underline-offset-2"
            >
              Learn more
            </Link>
            .
          </p>
        </div>
      </aside>
    </div>
  );
}
