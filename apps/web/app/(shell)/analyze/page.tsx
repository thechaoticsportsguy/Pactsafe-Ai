"use client";

/**
 * /analyze — live-scan flow, three distinct phases.
 *
 * PHASE 1 — UPLOAD  (!busy && !completedJob)
 *   Standard form: file dropzone or text paste, drag-and-drop overlay.
 *
 * PHASE 2 — SCANNING  (busy || (completedJob && !showReport))
 *   Full-viewport two-column grid that *escapes* the shell container.
 *   Left  → <ContractPreview> (document + animated scan beam + highlights)
 *   Right → <LiveScanSidebar>  (steps, progress bar, live counters)
 *
 *   When the backend reports "completed" we IMMEDIATELY flip both
 *   panels to their `done` state (beam stops, steps all green, progress
 *   locks at 100%, sidebar header switches to "Scan complete in Xs")
 *   and hold there for ~2 s so the user actually sees the success
 *   transition. Only after the hold does `showReport` flip to true and
 *   the page re-renders in Phase 3.
 *
 * PHASE 3 — REPORT  (completedJob && showReport)
 *   Plain-flow container. A sticky compact banner at the top keeps the
 *   frozen ContractPreview + LiveScanSidebar visible as the user scrolls
 *   through the full <AnalysisReport/> below.
 */

import * as React from "react";
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
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import Dropzone from "@/components/Dropzone";
import ContractPreview from "@/components/ContractPreview";
import LiveScanSidebar from "@/components/LiveScanSidebar";
import AnalysisReport from "@/components/AnalysisReport";
import AnalysisErrorBoundary from "@/components/AnalysisErrorBoundary";
import { Button } from "@/components/primitives/Button";
import { TextArea } from "@/components/primitives/TextArea";
import { Badge } from "@/components/primitives/Badge";
import {
  fadeInUp,
  scaleIn,
  staggerChildren,
} from "@/components/primitives/Motion";
import { useToast } from "@/components/Toast";
import { createJobFromFile, createJobFromText, getJob } from "@/lib/api";
import type { JobStatus, JobStatusResponse } from "@/lib/schemas";
import { normalizeJobStatus } from "@/lib/review";
import { cn } from "@/lib/cn";

type Mode = "file" | "text";

// ---------------------------------------------------------------------------
// Clause / risk counters
// Derived from progress because the API doesn't emit real-time clause
// counts. These feel live even though they're approximations.
// ---------------------------------------------------------------------------

function estimateClauses(progress: number) {
  return Math.max(0, Math.round(progress * 16));
}
function estimateRisks(progress: number) {
  return Math.max(0, Math.round(progress * 7));
}

// ---------------------------------------------------------------------------

export default function AnalyzePage() {
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
  const [filename, setFilename] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [completedJob, setCompletedJob] =
    React.useState<JobStatusResponse | null>(null);
  // Gates the Phase 3 report render. Stays `false` for ~2 s after the
  // backend reports "completed" so the scanner can visibly finish in
  // Phase 2 instead of vanishing the instant polling ends. Controlled
  // by the setTimeout inside the completion branch below.
  const [showReport, setShowReport] = React.useState(false);

  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDepthRef = React.useRef(0);
  // Completion lock — late polls must not overwrite the final result.
  const hasFinalResultRef = React.useRef(false);

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function stopHold() {
    if (holdRef.current !== null) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }

  React.useEffect(() => {
    return () => {
      stopPolling();
      stopHold();
    };
  }, []);

  // Elapsed timer — runs while a job is in flight. Intentionally does
  // NOT reset to 0 on `busy -> false`; we want to keep the final count
  // visible in the Phase 2 hold-state header ("Scanned in 7s") and in
  // the Phase 3 sticky banner. Only the `reset()` helper and a fresh
  // `start()` call reset it to 0.
  React.useEffect(() => {
    if (!busy) return;
    const startTime = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [busy]);

  // ---------------------------------------------------------------------------
  // Job lifecycle
  // ---------------------------------------------------------------------------

  async function start(
    promise: Promise<{ job_id: string; status: JobStatus }>,
  ) {
    setError(null);
    setCompletedJob(null);
    setShowReport(false);
    setElapsed(0);
    hasFinalResultRef.current = false;
    stopHold();
    setBusy(true);
    setStatus("queued");
    setMessage("Scanning document…");
    setProgress(0.05);

    let job_id: string;
    try {
      ({ job_id } = await promise);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
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
        // Completion lock — an in-flight poll that predates the final
        // refetch must never overwrite the already-captured payload.
        if (hasFinalResultRef.current) return;
        setStatus(job.status);

        if (job.status === "extracting") {
          setMessage("Extracting clauses…");
          setProgress(0.35);
        } else if (job.status === "analyzing") {
          setMessage("Scoring risks…");
          setProgress(0.65);
        } else if (job.status === "completed") {
          // ── Job finished. Flip the scanner into its frozen success
          //    state IMMEDIATELY, then hold Phase 2 for 2 000 ms before
          //    swapping in Phase 3's sticky-banner + report layout.
          hasFinalResultRef.current = true;
          stopPolling();
          setStatus("completed");
          setProgress(1);
          setMessage("Analysis complete");

          let finalJob: JobStatusResponse;
          try { finalJob = await getJob(job_id); }
          catch { finalJob = job; }

          // Normalize at the page boundary so every renderer below —
          // AnalysisReport, ClauseHighlighter, NegotiationComposer,
          // RiskGauge — receives guaranteed-shape arrays instead of
          // `null`/`undefined`. Prevents the "Cannot read properties of
          // undefined (reading 'filter')" crash that used to bubble up
          // to the root error boundary when the backend returned a
          // truncated or partially-populated AnalysisResult.
          const normalized = normalizeJobStatus(finalJob) ?? finalJob;

          // Flip both scanner panels to "done" without unmounting.
          // Phase 2 renders while `busy` OR `completedJob && !showReport`.
          setCompletedJob(normalized);
          setBusy(false);

          // ...then after 2 s, unmount Phase 2 and render Phase 3.
          stopHold();
          holdRef.current = setTimeout(() => {
            setShowReport(true);
          }, 2000);
        } else if (job.status === "failed") {
          stopPolling();
          setError(job.error || "Analysis failed.");
          setBusy(false);
        }
      } catch (e: unknown) {
        stopPolling();
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    }, 2000);
  }

  function onFile(file: File) {
    setFilename(file.name);
    // /analyze = dedicated deep-analysis page → use the "pro" tier.
    start(createJobFromFile(file, "pro"));
  }

  function onAnalyzeText() {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      setError("Paste at least 50 characters of contract text.");
      return;
    }
    setFilename(null);
    start(createJobFromText(trimmed, "pro"));
  }

  async function pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText?.trim()) {
        toast({ tone: "error", message: "Clipboard is empty", description: "Copy your contract text first." });
        return;
      }
      setMode("text");
      setText(clipText);
      setError(null);
      toast({ tone: "success", message: "Pasted from clipboard", description: `${clipText.length.toLocaleString()} characters loaded.` });
    } catch {
      toast({ tone: "error", message: "Couldn't read clipboard", description: "Your browser blocked access — paste with ⌘V instead." });
    }
  }

  // ⌘/Ctrl+Enter in text mode
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && mode === "text" && text.trim().length >= 50) {
        e.preventDefault();
        onAnalyzeText();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, mode, text]);

  // Global drag-and-drop (upload phase only)
  React.useEffect(() => {
    if (busy || completedJob) return;
    const hasFiles = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i++) if (types[i] === "Files") return true;
      return false;
    };
    const onDragEnter = (e: DragEvent) => { if (!hasFiles(e)) return; dragDepthRef.current++; setIsDraggingGlobal(true); };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingGlobal(false);
    };
    const onDragOver  = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingGlobal(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) { setMode("file"); onFile(f); }
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover",  onDragOver);
    window.addEventListener("drop",      onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover",  onDragOver);
      window.removeEventListener("drop",      onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, completedJob]);

  function reset() {
    stopPolling();
    stopHold();
    hasFinalResultRef.current = false;
    setError(null);
    setBusy(false);
    setProgress(0);
    setJobId(null);
    setText("");
    setFilename(null);
    setElapsed(0);
    setCompletedJob(null);
    setShowReport(false);
  }

  // Derived gates — declared once so the JSX below reads like a truth table.
  const inScanningPhase = busy || (completedJob !== null && !showReport);
  const inReportPhase = completedJob !== null && completedJob.result !== null && showReport;
  const scannerFinalClauses = estimateClauses(progress);
  const scannerFinalRisks = estimateRisks(progress);

  // ---------------------------------------------------------------------------
  // PHASE 3 — REPORT (sticky frozen scanner at top + full AnalysisReport)
  // ---------------------------------------------------------------------------
  if (inReportPhase && completedJob?.result) {
    return (
      <motion.div
        className="space-y-10"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        {/* Sticky frozen scanner banner — solid fill matches the Phase 1
            workspace surface system (no backdrop-blur); horizontal break-
            out keeps the bar flush to the viewport edge with its inner
            grid re-inset. */}
        <motion.div
          variants={scaleIn}
          className="sticky top-16 z-30 -mx-5 -mt-10 border-b border-white/5 bg-surface-0/95 md:-mx-8 md:-mt-14"
        >
          <div className="px-5 pt-4 md:px-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live scan complete
              </div>
              <Button palette="workspace" variant="secondary" size="sm" radius="md" onClick={reset}>
                <Plus className="h-3.5 w-3.5" />
                Analyze another
              </Button>
            </div>
            <div className="grid gap-3 pb-4 md:grid-cols-[1fr_340px]">
              <ContractPreview
                frozen
                status="completed"
                progress={1}
                text={mode === "text" ? text : null}
                filename={completedJob.filename ?? filename}
                elapsed={elapsed}
                done
              />
              <LiveScanSidebar
                frozen
                status="completed"
                progress={1}
                filename={completedJob.filename ?? filename}
                elapsed={elapsed}
                clausesFound={scannerFinalClauses}
                risksIdentified={scannerFinalRisks}
                done
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <AnalysisErrorBoundary onRetry={reset}>
            <AnalysisReport
              jobId={completedJob.job_id}
              result={completedJob.result}
              filename={completedJob.filename}
              createdAt={completedJob.created_at}
              textPreview={completedJob.text_preview}
              documentText={completedJob.document_text}
              showBreadcrumb={false}
              copyWindowHref={false}
            />
          </AnalysisErrorBoundary>
        </motion.div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 2 — SCANNING (full viewport side-by-side, animated → frozen)
  //
  // Rendered both while `busy` is true AND during the ~2 s hold after
  // completion (completedJob set, showReport still false). `done=true`
  // is passed to the panels once the backend flips to "completed",
  // which freezes the beam and turns everything green — so the hold
  // period is visually "here's your finished scan, read it".
  // ---------------------------------------------------------------------------
  if (inScanningPhase) {
    const isDone = status === "completed" || completedJob !== null;
    return (
      <div
        className={cn(
          // Break out of container-app (px-5 md:px-8) + py-10 md:py-14
          "-mx-5 -mt-10 md:-mx-8 md:-mt-14",
          // Fill remaining viewport below the sticky TopNav (≈60px)
          "grid h-[calc(100dvh-60px)] overflow-hidden",
          // Responsive: stack on mobile, side-by-side on md+
          "grid-rows-[1fr_auto] md:grid-cols-[1fr_340px] md:grid-rows-1",
        )}
      >
        {/* LEFT — Document preview with live highlights */}
        <ContractPreview
          status={status}
          progress={progress}
          text={mode === "text" ? text : null}
          filename={filename}
          elapsed={elapsed}
          done={isDone}
        />

        {/* RIGHT — Live scan sidebar */}
        <LiveScanSidebar
          status={status}
          progress={progress}
          filename={filename}
          elapsed={elapsed}
          clausesFound={scannerFinalClauses}
          risksIdentified={scannerFinalRisks}
          done={isDone}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 1 — UPLOAD FORM
  // ---------------------------------------------------------------------------
  return (
    <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">

      {/* Global drag overlay */}
      {isDraggingGlobal && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in"
        >
          <div className="absolute inset-4 rounded-lg border-2 border-dashed border-accent/60 bg-accent/[0.08]" />
          <div className="relative flex flex-col items-center gap-3 rounded-md border border-accent/40 bg-surface-2 px-8 py-6 shadow-elevated ring-1 ring-accent/30">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-accent/30">
              <Upload className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-semibold text-zinc-100">Drop your contract anywhere</p>
            <p className="text-xs text-zinc-400">PDF · DOCX · TXT · up to 10 MB</p>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="min-w-0 space-y-8">
        <div>
          <Badge variant="eyebrow-accent" className="mb-3">
            <Zap className="h-3 w-3" />
            New analysis
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Analyze a contract
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Upload a PDF, DOCX, or TXT — or paste raw text. We&rsquo;ll extract
            it, flag risks, and give you ready-to-send negotiation language.
            Your full report appears right here when the scan finishes.
          </p>
        </div>

        {/* Mode toggle + clipboard paste */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-surface-1 p-1">
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
                    ? "bg-accent text-white shadow-glow-accent"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button palette="workspace" variant="secondary" size="sm" radius="md" onClick={pasteFromClipboard}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste from clipboard
          </Button>
        </div>

        {mode === "file" && <Dropzone onFile={onFile} />}

        {mode === "text" && (
          <div className="rounded-md border border-white/5 bg-surface-1 p-5">
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
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
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
                <span className="hidden text-xs text-zinc-500 sm:inline">
                  <kbd>⌘</kbd> <kbd>Enter</kbd>
                </span>
                <Button
                  palette="workspace"
                  variant="primary"
                  radius="md"
                  onClick={onAnalyzeText}
                  disabled={text.trim().length < 50}
                >
                  Analyze text
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-severity-critical/40 bg-severity-critical/10 p-5"
          >
            <div className="flex items-start gap-3">
              <AlertOctagon className="mt-0.5 h-5 w-5 flex-shrink-0 text-severity-critical" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-severity-critical">
                  Something went wrong
                </p>
                <p className="mt-1 text-xs text-zinc-200">{error}</p>
                <div className="mt-3">
                  <Button palette="workspace" variant="secondary" size="sm" radius="md" onClick={reset}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Start over
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {jobId && !busy && !error && !completedJob && (
          <p className="text-xs text-zinc-400">
            Job ID: <span className="font-mono">{jobId}</span>
          </p>
        )}
      </div>

      {/* Side reassurance panel */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-md border border-white/5 bg-surface-1 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private by default
          </p>
          <ul className="mt-4 space-y-3 text-xs leading-relaxed text-zinc-400">
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
              <span>Uploads are encrypted in transit and at rest.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
              <span>We never train on your contracts.</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
              <span>Delete any analysis anytime from history.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-white/5 bg-surface-1 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Quick facts
          </p>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-zinc-400">Typical review</dt>
              <dd className="font-medium text-zinc-100">&lt; 60 s</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-400">File size</dt>
              <dd className="font-medium text-zinc-100">up to 10 MB</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-400">Formats</dt>
              <dd className="font-medium text-zinc-100">PDF · DOCX · TXT</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-white/5 bg-surface-1/60 p-5">
          <p className="text-xs leading-relaxed text-zinc-500">
            PactSafe AI is a screening tool, not a law firm. For high-stakes
            deals, consult a licensed attorney.{" "}
            <Link href="/#faq" className="text-accent hover:underline underline-offset-2">
              Learn more
            </Link>
            .
          </p>
        </div>
      </aside>
    </div>
  );
}
