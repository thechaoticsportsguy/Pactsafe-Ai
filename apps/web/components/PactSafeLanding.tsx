"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { createJobFromFile, createJobFromText, getJob } from "@/lib/api";
import type { JobStatus, JobStatusResponse } from "@/lib/schemas";
import { normalizeJobStatus } from "@/lib/review";
import ContractPreview from "@/components/ContractPreview";
import LiveScanSidebar from "@/components/LiveScanSidebar";
import AnalysisReport from "@/components/AnalysisReport";
import AnalysisErrorBoundary from "@/components/AnalysisErrorBoundary";
import {
  Paperclip,
  ArrowUp,
  ArrowRight,
  Shield,
  FileText,
  Scale,
  Sparkles,
  X,
  Upload,
  ScanSearch,
  FileCheck2,
  Lock,
  Eye,
  Gavel,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Quote,
  ChevronDown,
  Palette,
  PenLine,
  Megaphone,
  Briefcase,
  Camera,
  Code2,
  ShieldCheck,
  GitFork,
  ClipboardPaste,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import AnnouncementBar from "@/components/AnnouncementBar";
import { FaqJsonLd, SoftwareAppJsonLd } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Quick-action samples (prefill contract types)
// ---------------------------------------------------------------------------
interface QuickAction {
  icon: React.ReactNode;
  label: string;
  sample: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Shield className="h-3.5 w-3.5" />,
    label: "NDA",
    sample:
      'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement (the "Agreement") is entered into as of the date last signed below between the parties for the purpose of preventing the unauthorized disclosure of Confidential Information...',
  },
  {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "Freelance SOW",
    sample:
      'FREELANCE SERVICES AGREEMENT\n\nThis Freelance Services Agreement ("Agreement") is made between Client and Contractor for the provision of design, development, and related creative services as described in the Statement of Work...',
  },
  {
    icon: <Scale className="h-3.5 w-3.5" />,
    label: "SaaS MSA",
    sample:
      'MASTER SUBSCRIPTION AGREEMENT\n\nThis Master Subscription Agreement ("MSA") governs Customer\'s access to and use of the Service, including all exhibits, order forms, and statements of work incorporated herein...',
  },
  {
    icon: <FileCheck2 className="h-3.5 w-3.5" />,
    label: "Consulting",
    sample:
      'INDEPENDENT CONSULTING AGREEMENT\n\nThis Consulting Agreement is entered into between the Company and Consultant for the performance of consulting services, subject to the terms and conditions set forth herein...',
  },
];

// ---------------------------------------------------------------------------
// Main landing component
// ---------------------------------------------------------------------------
export default function PactSafeLanding() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SoftwareAppJsonLd />
      <FaqJsonLd />
      <AnnouncementBar
        text="New: changelog, shareable analysis links, and PWA install."
        ctaLabel="See what's shipped"
        href="/changelog"
      />
      <TopNav variant="marketing" />
      <main id="main-content" className="flex-1">
        <Hero />
        <TrustBar />
        <HowItWorks />
        <SampleReport />
        <WhatWeCatch />
        <UseCases />
        <Security />
        <RealClauses />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <MobileStickyCTA />
      <BackToTop />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back to top — desktop-only floating button, appears after 70% scroll
// ---------------------------------------------------------------------------
function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setShow(total > 0 && window.scrollY / total > 0.5);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="hidden md:flex fixed bottom-6 right-6 z-20 h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-bg-elevated/95 text-foreground shadow-card-lg backdrop-blur-xl ring-1 ring-accent/20 hover:ring-accent/40 hover:-translate-y-0.5 transition-all animate-fade-in"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sticky mobile CTA — fixed at bottom on mobile after hero
// ---------------------------------------------------------------------------
function MobileStickyCTA() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (dismissed) return;
      setShow(window.scrollY > 520);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [dismissed]);

  if (!show || dismissed) return null;
  return (
    <div className="md:hidden fixed inset-x-3 bottom-3 z-30 animate-fade-in-up">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-bg-elevated/95 p-2 shadow-card-lg backdrop-blur-xl ring-1 ring-accent/20">
        <div className="flex-1 pl-2">
          <p className="text-[11px] font-semibold text-foreground">
            Ready to analyze?
          </p>
          <p className="text-[10px] text-foreground-muted">
            Free · under 60 seconds
          </p>
        </div>
        <Link href="/analyze" className="flex-shrink-0">
          <Button size="sm">
            Start now
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero — eyebrow, headline, inline upload card, quick pills, trust row
// ---------------------------------------------------------------------------
function Hero() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasted, setPasted] = useState(false);

  // Live-scan state — mirrors the /analyze page's three-phase flow but
  // keeps the landing layout (nav / hero copy) visible above.
  const [status, setStatus] = useState<JobStatus>("queued");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completedJob, setCompletedJob] =
    useState<JobStatusResponse | null>(null);
  const [showReport, setShowReport] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mount guard — a late poll / refetch resolving after unmount would
  // otherwise call setState on a dead tree and throw a React warning.
  const mountedRef = useRef(true);
  // Completion lock — once we've captured a normalized completed result,
  // any late poll response (in-flight tick that predated stopPolling, or
  // a rogue retry) must be ignored. Locking prevents partial data from
  // clobbering the final payload.
  const hasFinalResultRef = useRef(false);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "64px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, []);

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      stopHold();
    };
  }, []);

  // Elapsed counter — runs while polling.
  useEffect(() => {
    if (!loading) return;
    const startTime = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [loading]);

  const handleSubmit = async () => {
    setError(null);
    if (!file && !text.trim()) return;
    if (!file && text.trim().length < 50) {
      setError("Paste at least 50 characters of contract text.");
      return;
    }

    setLoading(true);
    setStatus("queued");
    setProgress(0.08);
    setElapsed(0);
    setCompletedJob(null);
    setShowReport(false);
    hasFinalResultRef.current = false;
    stopHold();

    let jobId: string;
    try {
      // Home-page preview uses the fast "flash" tier for near-instant
      // feedback. The dedicated /analyze page uses "pro".
      const job = file
        ? await createJobFromFile(file, "flash")
        : await createJobFromText(text.trim(), "flash");
      jobId = job.job_id;
      setProgress(0.15);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the backend. Is it running?",
      );
      setLoading(false);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        if (!mountedRef.current) return;
        // Completion lock — a late poll firing after we've already
        // captured the final result must not overwrite the UI state.
        if (hasFinalResultRef.current) return;
        setStatus(job.status);

        if (job.status === "extracting") {
          setProgress((p) => Math.max(p, 0.35));
        } else if (job.status === "analyzing") {
          setProgress((p) => Math.max(p, 0.65));
        } else if (job.status === "completed") {
          hasFinalResultRef.current = true;
          stopPolling();
          // Refetch on completion — poll responses sometimes arrive with
          // a partially-populated `result` (missing arrays, half-shaped
          // object) because the worker flushes progress before the final
          // payload settles. A fresh GET is authoritative. Mirrors the
          // /analyze page's behavior so both flows converge on the same
          // result shape.
          let finalJob: JobStatusResponse;
          try {
            finalJob = await getJob(jobId);
          } catch {
            finalJob = job;
          }
          if (!mountedRef.current) return;
          const normalized = normalizeJobStatus(finalJob) ?? finalJob;
          setStatus("completed");
          setProgress(1);
          setCompletedJob(normalized);
          setLoading(false);
          // Hold the "scan complete" frame for ~2 s before swapping in
          // the full report, matching /analyze's behavior.
          stopHold();
          holdRef.current = setTimeout(() => {
            if (mountedRef.current) setShowReport(true);
          }, 2000);
        } else if (job.status === "failed") {
          stopPolling();
          setError(job.error || "Analysis failed.");
          setLoading(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        stopPolling();
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }, 1500);
  };

  const resetAnalysis = () => {
    stopPolling();
    stopHold();
    hasFinalResultRef.current = false;
    setLoading(false);
    setError(null);
    setCompletedJob(null);
    setShowReport(false);
    setProgress(0);
    setElapsed(0);
    setFile(null);
    setText("");
  };

  // Gates for the three phases — mirrors AnalyzePage so both flows stay
  // visually consistent. "scanning" covers both the live run and the
  // ~2 s post-complete hold.
  const inScanningPhase = loading || (completedJob !== null && !showReport);
  const inReportPhase =
    completedJob !== null && completedJob.result != null && showReport;

  const acceptFile = (f: File) => {
    const ALLOWED = /\.(pdf|docx|doc|txt|md)$/i;
    if (!ALLOWED.test(f.name)) {
      setError("Only PDF, DOCX, or TXT files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds the 10 MB limit.");
      return;
    }
    setFile(f);
    setText("");
    setError(null);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    acceptFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) setIsDragging(false);
  };

  const pasteFromClipboard = async () => {
    setError(null);
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || clipText.trim().length === 0) {
        setError("Clipboard is empty.");
        return;
      }
      setFile(null);
      setText(clipText);
      setTimeout(adjustHeight, 0);
      textareaRef.current?.focus();
      setPasted(true);
      setTimeout(() => setPasted(false), 1400);
    } catch {
      setError(
        "Couldn't read clipboard. Paste directly with ⌘V or Ctrl+V.",
      );
    }
  };

  const clearFile = () => {
    setFile(null);
    setText("");
  };

  const prefill = (sample: string) => {
    setFile(null);
    setText(sample);
    setTimeout(adjustHeight, 0);
    textareaRef.current?.focus();
  };

  const canSubmit = !loading && (!!file || text.trim().length > 0);

  // ── Phase 3 — full report renders in place of the input card.
  if (inReportPhase && completedJob?.result) {
    return (
      <section className="relative overflow-hidden bg-hero">
        <div className="container-app py-12 md:py-16 space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-success inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live scan complete
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-gradient">
                Your contract analysis
              </h1>
            </div>
            <button
              type="button"
              onClick={resetAnalysis}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Analyze another
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_340px]">
            <ContractPreview
              frozen
              status="completed"
              progress={1}
              text={file ? null : text}
              filename={completedJob.filename ?? file?.name ?? null}
              elapsed={elapsed}
              done
            />
            <LiveScanSidebar
              frozen
              status="completed"
              progress={1}
              filename={completedJob.filename ?? file?.name ?? null}
              elapsed={elapsed}
              clausesFound={Math.max(0, Math.round(1 * 16))}
              risksIdentified={Math.max(0, Math.round(1 * 7))}
              done
            />
          </div>

          <AnalysisErrorBoundary onRetry={resetAnalysis}>
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
        </div>
      </section>
    );
  }

  // ── Phase 2 — live scanner replaces the input card while work is in flight.
  if (inScanningPhase) {
    const isDone = status === "completed" || completedJob !== null;
    return (
      <section className="relative overflow-hidden bg-hero">
        <div className="container-app py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center mb-8 animate-fade-in-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Analyzing with Gemini Flash · fast preview
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gradient">
              Scanning your contract…
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-foreground-muted">
              Watch the live scan on the left. Your full report appears below
              as soon as the scan finishes.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_340px]">
            <ContractPreview
              status={status}
              progress={progress}
              text={file ? null : text}
              filename={file?.name ?? null}
              elapsed={elapsed}
              done={isDone}
            />
            <LiveScanSidebar
              status={status}
              progress={progress}
              filename={file?.name ?? null}
              elapsed={elapsed}
              clausesFound={Math.max(0, Math.round(progress * 16))}
              risksIdentified={Math.max(0, Math.round(progress * 7))}
              done={isDone}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-hero">
      {/* subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] bg-grid-dot"
      />
      {/* top fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      <div className="container-app pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            AI contract review · built for freelancers
          </div>

          <h1 className="text-[40px] leading-[1.05] md:text-[58px] md:leading-[1.02] font-semibold tracking-tightest text-gradient">
            Never sign a bad contract again.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base md:text-lg text-foreground-muted leading-relaxed">
            Drop a freelance contract, NDA, or SOW. In under a minute, get a
            risk score, plain-English red flags, and ready-to-send negotiation
            edits.
          </p>

          {/* Reassurance row */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No signup required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Free on your first few
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Private by default
            </span>
          </div>
        </div>

        {/* Input card */}
        <div
          className="mx-auto mt-10 max-w-3xl animate-fade-in-up"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div
            className={cn(
              "relative rounded-2xl border bg-surface/80 p-1.5 shadow-card-lg backdrop-blur-xl transition-all",
              error
                ? "border-severity-critical/50"
                : isDragging
                  ? "border-accent/70 scale-[1.01] shadow-glow-lg"
                  : "border-white/10 hover:border-white/15",
            )}
          >
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-accent/10 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-7 w-7 text-accent" strokeWidth={1.75} />
                  <p className="text-sm font-medium text-accent">
                    Drop it here
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-[14px] bg-bg-elevated/70 ring-1 ring-white/5">
              <div className="px-4 pt-4">
                {file ? (
                  <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-3">
                    <FileText className="h-4 w-4 flex-shrink-0 text-accent" />
                    <span className="flex-1 truncate text-sm font-medium text-accent">
                      {file.name}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="ml-1 rounded p-0.5 text-foreground-muted hover:bg-accent/20 hover:text-accent"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      adjustHeight();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder="Paste a contract here — or attach a PDF / DOCX below"
                    disabled={loading}
                    className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-foreground-muted focus:outline-none disabled:opacity-60"
                    style={{ minHeight: 64, maxHeight: 220, overflow: "auto" }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between px-3 pb-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={handleFilePick}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    aria-label="Attach file"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </button>
                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    disabled={loading}
                    aria-label="Paste from clipboard"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
                  >
                    {pasted ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        Pasted
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Paste
                      </>
                    )}
                  </button>
                  <span className="hidden md:block text-xs text-foreground-muted">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(1)} MB attached`
                      : "PDF · DOCX · TXT · 10 MB"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-all",
                    "bg-accent text-white shadow-glow",
                    "hover:bg-accent-hover active:translate-y-px",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                  )}
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      Analyze
                      <ArrowUp className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-severity-critical/30 bg-severity-critical/10 px-3 py-2 text-xs text-severity-critical">
                <AlertOctagon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Hint + quick samples */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-xs text-foreground-muted">
              Press <kbd>⌘</kbd> <kbd>Enter</kbd> to analyze ·{" "}
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Encrypted & never sold
              </span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-foreground-subtle">Try a sample:</span>
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => prefill(qa.sample)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 text-xs text-foreground-muted transition-all hover:border-accent/40 hover:bg-surface-2 hover:text-foreground"
                >
                  {qa.icon}
                  {qa.label}
                </button>
              ))}
            </div>

            <Link
              href="/demo"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline underline-offset-2"
            >
              Or see a full sample report without signing up
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust bar — honest product stats + tech stack
// ---------------------------------------------------------------------------
function TrustBar() {
  const items = [
    { k: "Free", v: "no account required" },
    { k: "< 60 s", v: "average review time" },
    { k: "6", v: "contract types supported" },
    { k: "0 %", v: "data sold or trained on" },
  ];
  return (
    <section className="border-y border-border-subtle/60 bg-bg-elevated/40">
      <div className="container-app py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {items.map((item) => (
            <div key={item.k} className="text-center md:text-left">
              <p className="text-2xl md:text-[32px] font-semibold tracking-tight text-foreground tabular-nums">
                {item.k}
              </p>
              <p className="mt-1 text-xs md:text-sm text-foreground-muted">
                {item.v}
              </p>
            </div>
          ))}
        </div>

        {/* Powered-by row */}
        <div className="mt-8 pt-8 border-t border-border-subtle/60 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
            Powered by
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Anthropic Claude
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Groq · Llama&nbsp;3.3
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5" />
              Open source on GitHub
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-success" />
              TLS 1.3 · AES-256
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works — 3 steps
// ---------------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Drop your contract",
      body: "Paste text or upload a PDF, DOCX, or TXT. Everything stays private — we never train on your files.",
    },
    {
      icon: ScanSearch,
      title: "AI scans every clause",
      body: "Every risk we flag is tied to the exact clause in your contract — grounded citations, no hallucinations, verifiable against the document itself.",
    },
    {
      icon: FileCheck2,
      title: "Get a clear report",
      body: "Risk score, ranked issues, plain-English explanations, and negotiation language you can copy-paste.",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="relative py-20 md:py-28 bg-section"
    >
      <div className="container-app">
        <SectionHeader
          eyebrow="How it works"
          title="From contract to clarity in three steps"
          subtitle="No legalese. No waiting on lawyers. No $500 bills."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="relative group surface-card p-6 md:p-7 transition-all hover:border-white/10 hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                    <s.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="text-xs font-mono text-foreground-subtle">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sample report — fake demo of the output
// ---------------------------------------------------------------------------
function SampleReport() {
  return (
    <section id="features" className="relative py-20 md:py-28">
      <div className="container-app">
        <SectionHeader
          eyebrow="What you get"
          title="A legal-grade report, built for humans"
          subtitle="Risk score. Red flags. Missing protections. Negotiation language. All in one scannable view."
        />

        <div className="mt-14 relative">
          <div
            aria-hidden
            className="absolute -inset-x-10 -inset-y-12 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 50%, rgba(124,92,252,0.15) 0%, transparent 60%)",
            }}
          />

          <Reveal className="mx-auto max-w-5xl" distance={28}>
            <div className="surface-card-lg p-5 md:p-7">
              {/* window chrome */}
              <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-severity-critical/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-severity-medium/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-severity-low/70" />
                </div>
                <p className="ml-2 text-xs font-mono text-foreground-subtle">
                  pactsafe.ai / analysis / freelance-services-agreement.pdf
                </p>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-foreground-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Complete
                </div>
              </div>

              {/* top row: score + summary */}
              <div className="mt-5 grid gap-4 md:grid-cols-5">
                <div className="md:col-span-2 rounded-xl border border-border bg-bg-elevated/60 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Overall risk
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl font-semibold tabular-nums">72</span>
                    <span className="text-sm text-foreground-muted">/ 100</span>
                    <Badge tone="high" className="ml-auto">
                      High risk
                    </Badge>
                  </div>
                  <div className="mt-4 h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "72%",
                        background:
                          "linear-gradient(90deg, #f97316, #ef4444)",
                        boxShadow: "0 0 18px rgba(249,115,22,0.45)",
                      }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-surface-2 px-2.5 py-2">
                      <p className="text-foreground-muted">Red flags</p>
                      <p className="mt-0.5 font-semibold tabular-nums">7</p>
                    </div>
                    <div className="rounded-md bg-surface-2 px-2.5 py-2">
                      <p className="text-foreground-muted">Missing</p>
                      <p className="mt-0.5 font-semibold tabular-nums">4</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3 rounded-xl border border-border bg-bg-elevated/60 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Plain-English summary
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    This agreement{" "}
                    <mark className="rounded bg-severity-critical/20 text-severity-critical px-1">
                      lets the client cancel at any time with no kill fee
                    </mark>
                    , grants them full IP ownership before you're even paid,
                    and caps your liability at{" "}
                    <mark className="rounded bg-severity-high/20 text-severity-high px-1">
                      unlimited
                    </mark>
                    . Payment terms are net-60 with no late-fee protection.
                    Negotiate before signing.
                  </p>
                </div>
              </div>

              {/* flags */}
              <div className="mt-5 grid gap-4 md:grid-cols-2" id="sample-flags">
                <div className="rounded-xl border border-border bg-bg-elevated/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Top red flags
                    </h4>
                    <Badge tone="critical" size="xs">
                      2 critical
                    </Badge>
                  </div>
                  <ul className="space-y-2.5">
                    <SampleFlag
                      tone="critical"
                      title="Unlimited liability"
                      body="Section 9 exposes you to unlimited damages with no cap."
                    />
                    <SampleFlag
                      tone="critical"
                      title="IP transfer before payment"
                      body="Client owns all work on delivery, not on full payment."
                    />
                    <SampleFlag
                      tone="high"
                      title="Termination without kill fee"
                      body="Client may cancel any time with no compensation for work done."
                    />
                    <SampleFlag
                      tone="medium"
                      title="Unlimited revisions"
                      body="Scope says ‘until client is satisfied.’ No revision cap."
                    />
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Missing protections
                    </h4>
                    <Badge tone="warning" size="xs">
                      4 missing
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {[
                      "Late payment fee clause",
                      "Upfront deposit (25–50%)",
                      "Defined revision rounds",
                      "Liability cap (fees paid)",
                    ].map((m) => (
                      <li
                        key={m}
                        className="flex items-start gap-2 text-sm text-foreground/85"
                      >
                        <span className="mt-1 h-1 w-1 rounded-full bg-warning flex-shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 pt-4 border-t border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted mb-2">
                      Suggested negotiation
                    </p>
                    <div className="rounded-md bg-surface-2/70 p-3 text-[13px] leading-relaxed text-foreground/80 font-mono">
                      "Before we proceed, we'll need a 50% upfront deposit, a
                      liability cap equal to fees paid, and IP transfer on
                      final payment rather than delivery."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function SampleFlag({
  tone,
  title,
  body,
}: {
  tone: "critical" | "high" | "medium" | "low";
  title: string;
  body: string;
}) {
  const toneMap = {
    critical: "border-severity-critical/40 bg-severity-critical/[0.06]",
    high: "border-severity-high/40 bg-severity-high/[0.06]",
    medium: "border-severity-medium/40 bg-severity-medium/[0.06]",
    low: "border-severity-low/40 bg-severity-low/[0.06]",
  } as const;
  const iconMap = {
    critical: "text-severity-critical",
    high: "text-severity-high",
    medium: "text-severity-medium",
    low: "text-severity-low",
  } as const;
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        toneMap[tone],
      )}
    >
      <AlertTriangle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconMap[tone])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted leading-snug">
          {body}
        </p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// What we catch — common traps grid
// ---------------------------------------------------------------------------
function WhatWeCatch() {
  const traps = [
    {
      icon: Gavel,
      title: "IP ownership traps",
      body: "Catches clauses that transfer your work before the client pays in full.",
    },
    {
      icon: Clock,
      title: "Payment & kill fees",
      body: "Flags vague payment terms, missing deposits, and cancellation without compensation.",
    },
    {
      icon: ScanSearch,
      title: "Scope creep language",
      body: "Detects unlimited revisions, vague deliverables, and ‘satisfaction’ clauses.",
    },
    {
      icon: Shield,
      title: "Liability & indemnity",
      body: "Warns when you’re on the hook for unlimited damages or client-side mistakes.",
    },
    {
      icon: AlertOctagon,
      title: "Exclusivity & non-compete",
      body: "Spots overly broad clauses that could block your other client work.",
    },
    {
      icon: Eye,
      title: "Missing protections",
      body: "Tells you what a fair contract should have — and what’s quietly missing.",
    },
  ];
  return (
    <section className="relative py-20 md:py-28 bg-section">
      <div className="container-app">
        <SectionHeader
          eyebrow="Risk coverage"
          title="We catch the traps buried in the fine print."
          subtitle="Tuned for the contracts people actually sign — contractor agreements, NDAs, employment offers, SaaS terms, service agreements, and freelance SOWs."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {traps.map((t, i) => (
            <Reveal key={t.title} delay={i * 60}>
              <div className="group h-full rounded-xl border border-border-subtle bg-surface/40 p-6 transition-all hover:border-accent/30 hover:bg-surface-2/50">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20 transition-colors group-hover:bg-accent/15">
                  <t.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                  {t.title}
                </h3>
                <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
                  {t.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Use cases — targeted at freelancer personas
// ---------------------------------------------------------------------------
function UseCases() {
  const personas = [
    {
      icon: Palette,
      role: "Designers",
      line: "Protect your IP. Catch unlimited revisions. Never transfer work before payment.",
    },
    {
      icon: PenLine,
      role: "Writers & copywriters",
      line: "Spot rights-grab clauses, ghost edits, and kill-fee loopholes.",
    },
    {
      icon: Camera,
      role: "Creators & videographers",
      line: "Flag usage-rights overreach, perpetual licenses, and missing deposits.",
    },
    {
      icon: Briefcase,
      role: "Consultants",
      line: "Cap your liability, tighten scope, and control termination terms.",
    },
    {
      icon: Megaphone,
      role: "Marketers & social",
      line: "Check deliverables, approval rounds, and non-compete language.",
    },
    {
      icon: Code2,
      role: "Developers & agencies",
      line: "Secure source ownership, warranty terms, and subcontractor rights.",
    },
  ];
  return (
    <section id="use-cases" className="relative py-20 md:py-28">
      <div className="container-app">
        <SectionHeader
          eyebrow="Built for independents"
          title="Freelancers, creators, and small teams"
          subtitle="PactSafe is tuned to the contracts you actually sign — not corporate M&A paperwork."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((p, i) => (
            <Reveal key={p.role} delay={i * 60}>
              <div className="group relative h-full overflow-hidden rounded-xl border border-border-subtle bg-surface/40 p-6 transition-all hover:border-white/10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      "radial-gradient(300px 120px at 0% 0%, rgba(124,92,252,0.08), transparent 60%)",
                  }}
                />
                <div className="relative flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-accent/20">
                    <p.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      {p.role}
                    </h3>
                    <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
                      {p.line}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Security — privacy reassurance
// ---------------------------------------------------------------------------
function Security() {
  const items = [
    {
      icon: Lock,
      title: "Encrypted in transit and at rest",
      body: "All uploads are TLS-encrypted and stored with industry-standard AES-256.",
    },
    {
      icon: Eye,
      title: "We don't train on your contracts",
      body: "Your files are never used to train models. Ever. Delete anytime.",
    },
    {
      icon: ShieldCheck,
      title: "Not legal advice — but close",
      body: "Built on public legal patterns. For bet-the-company deals, still call a lawyer.",
    },
  ];
  return (
    <section className="relative py-20 md:py-28 bg-section">
      <div className="container-app">
        <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-surface/40 p-8 md:p-14 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(50% 40% at 0% 0%, rgba(124,92,252,0.12), transparent 55%), radial-gradient(50% 40% at 100% 100%, rgba(99,102,241,0.08), transparent 55%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                <ShieldCheck className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Privacy & security
                </p>
                <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  Your contracts stay yours.
                </h2>
              </div>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {items.map((it) => (
                <div key={it.title}>
                  <it.icon
                    className="h-5 w-5 text-accent"
                    strokeWidth={2}
                  />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">
                    {it.title}
                  </h3>
                  <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
                    {it.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Real clauses — what PactSafe actually catches in contracts we've tested
// ---------------------------------------------------------------------------
function RealClauses() {
  const examples = [
    {
      tone: "critical" as const,
      contract: "Freelance Services Agreement",
      label: "Unlimited IP transfer",
      clause:
        '"All work product, including drafts, concepts, and unused variations, shall become the sole property of Client upon creation, irrespective of payment status."',
      explanation:
        "Client owns everything you make — even before paying. If they ghost mid-project, they still walk away with your work.",
    },
    {
      tone: "critical" as const,
      contract: "Consulting Agreement",
      label: "Uncapped liability",
      clause:
        '"Consultant shall indemnify and hold harmless Company from any and all damages, losses, or liabilities arising from the services, without limitation."',
      explanation:
        "No liability cap means a single bad outcome could bankrupt you. A fair contract caps this at fees paid.",
    },
    {
      tone: "high" as const,
      contract: "SaaS MSA",
      label: "Auto-renewal trap",
      clause:
        '"This Agreement shall automatically renew for successive one-year terms unless Customer provides written notice at least 90 days prior to expiration."',
      explanation:
        "90-day pre-notice windows are designed to trap you. Calendar it — or miss it and you're locked in for another year.",
    },
    {
      tone: "high" as const,
      contract: "NDA",
      label: "Perpetual confidentiality",
      clause:
        '"Recipient shall maintain the confidentiality of all Confidential Information in perpetuity following termination of this Agreement."',
      explanation:
        'Most NDAs should expire in 2–5 years. "Perpetuity" is an unusual ask and worth negotiating down.',
    },
    {
      tone: "medium" as const,
      contract: "Design SOW",
      label: "Unlimited revisions",
      clause:
        '"Contractor shall provide revisions as reasonably requested by Client until Client is satisfied with the final deliverable."',
      explanation:
        '"Until satisfied" is a black hole. Fair SOWs cap revisions at 2–3 rounds with hourly fees beyond that.',
    },
    {
      tone: "medium" as const,
      contract: "Vendor Terms",
      label: "Net-60 with no late fee",
      clause:
        '"Payment terms are Net 60 from receipt of properly-submitted invoice. No late fees or interest shall accrue on overdue balances."',
      explanation:
        "Net-60 is borderline predatory for a solo freelancer. No late-fee clause means zero leverage if they stall.",
    },
  ];

  const toneMeta = {
    critical: {
      chip: "Critical",
      badge: "critical" as const,
      ring: "border-severity-critical/30",
      bg: "bg-severity-critical/[0.05]",
      label: "text-severity-critical",
    },
    high: {
      chip: "High",
      badge: "high" as const,
      ring: "border-severity-high/30",
      bg: "bg-severity-high/[0.05]",
      label: "text-severity-high",
    },
    medium: {
      chip: "Medium",
      badge: "medium" as const,
      ring: "border-severity-medium/30",
      bg: "bg-severity-medium/[0.05]",
      label: "text-severity-medium",
    },
  };

  return (
    <section className="relative py-20 md:py-28">
      <div className="container-app">
        <SectionHeader
          eyebrow="Real examples"
          title="What PactSafe actually catches"
          subtitle="Not marketing fluff — real clause patterns we flag, pulled from contracts we've analyzed in testing."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {examples.map((ex, i) => {
            const meta = toneMeta[ex.tone];
            return (
              <Reveal key={ex.label} delay={i * 60}>
                <div
                  className={cn(
                    "group h-full rounded-xl border p-6 transition-all hover:-translate-y-0.5",
                    meta.ring,
                    meta.bg,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={meta.badge} size="xs">
                      {meta.chip}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
                      {ex.contract}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-4 text-sm font-semibold tracking-tight",
                      meta.label,
                    )}
                  >
                    {ex.label}
                  </p>
                  <blockquote className="mt-3 text-[13px] font-mono leading-relaxed text-foreground/85 border-l-2 border-border pl-3">
                    {ex.clause}
                  </blockquote>
                  <p className="mt-4 text-xs text-foreground-muted leading-relaxed">
                    {ex.explanation}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-foreground-subtle">
          These are real clause patterns from sample contracts — not
          customer quotes or testimonials.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
function FAQ() {
  const faqs = [
    {
      q: "Is this a replacement for a lawyer?",
      a: "No. PactSafe flags risks and gives you negotiation starting points — but for high-stakes or precedent-setting deals, you should still consult a licensed attorney. Think of it as your first line of defense, not your only line.",
    },
    {
      q: "What kinds of contracts can I analyze?",
      a: "NDAs, freelance SOWs, service agreements, consulting contracts, MSAs, employment offers, vendor terms, and creative licensing agreements. Anything under 200 pages.",
    },
    {
      q: "How private is my data?",
      a: "Uploads are TLS 1.3-encrypted in transit and AES-256-encrypted at rest. We set zero-retention flags on all LLM API calls, and your contracts are never used to train any model. You can delete any analysis from your history with one click and the underlying file is purged within 24 hours. See the Security page for the full breakdown.",
    },
    {
      q: "How accurate is the analysis?",
      a: "PactSafe catches patterns across 50+ well-known risk categories with high precision. It won't catch everything a domain-specialist attorney would — we're a screening tool, not a replacement. On tested freelance contracts, we typically surface the top risks a lawyer would flag in a first-read review.",
    },
    {
      q: "Which file formats are supported?",
      a: "PDF, DOCX, and TXT files up to 10 MB on the Free tier (25 MB on Pro, 50 MB on Team). You can also paste raw contract text directly — no upload needed.",
    },
    {
      q: "Do I need an account?",
      a: "No. You can analyze a contract without signing up. Accounts are optional and unlock history, search, comparison across analyses, and the negotiation composer.",
    },
    {
      q: "What models do you use?",
      a: "Primary analysis runs on Groq + Llama 3.3 70B for speed. Anthropic Claude is available as a fallback provider. We pick whichever gives the best precision for the contract type, with zero-retention enforced at the API layer.",
    },
    {
      q: "Can I use this for client contracts I send out?",
      a: "Yes — running your own outbound contracts through PactSafe is one of the best use cases. You'll catch the language you accidentally made too client-friendly and tighten protections before you send it.",
    },
    {
      q: "What about non-English contracts?",
      a: "Right now we're tuned for English (US and UK). Contracts in other languages will run, but the analysis quality drops. We plan to add Spanish, French, and German next.",
    },
    {
      q: "What happens if the model gets something wrong?",
      a: "It will sometimes miss things or raise soft alarms on safe clauses. Every flag shows the exact quoted text so you can judge it yourself. The risk score is a starting point for negotiation, not a verdict.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. No annual lock-ins. Cancel from your account settings; we'll honor a pro-rata refund for the current month if you're on Pro or Team, and you get a 30-day money-back guarantee on your first paid month.",
    },
    {
      q: "Is this built by a law firm?",
      a: "No. PactSafe is built by engineers who got tired of signing lopsided contracts. That's why we're very explicit: we're a tool, not a law firm. The risk patterns are grounded in publicly documented legal best practices.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-20 md:py-28 bg-section">
      <div className="container-app">
        <SectionHeader
          eyebrow="FAQ"
          title="Answers, straight up"
        />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-border/50 rounded-xl border border-border bg-surface/40 overflow-hidden">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-2/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-foreground">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-foreground-muted transition-transform flex-shrink-0",
                      isOpen && "rotate-180 text-accent",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-foreground-muted leading-relaxed animate-fade-in">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------
function FinalCTA() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="container-app">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-surface-2 to-surface p-10 md:p-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(124,92,252,0.25), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              The next contract you sign
              <br className="hidden md:block" />
              <span className="text-gradient-accent"> shouldn’t cost you sleep.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-foreground-muted">
              Analyze your first contract in under a minute. No account, no
              credit card, no catch.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/analyze">
                <Button size="lg" className="w-full sm:w-auto">
                  Analyze a contract
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-xs text-foreground-subtle">
              PDF · DOCX · TXT · up to 10 MB · private by default
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared section header
// ---------------------------------------------------------------------------
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl md:text-[40px] md:leading-[1.1] font-semibold tracking-tight text-gradient">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-foreground-muted leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
