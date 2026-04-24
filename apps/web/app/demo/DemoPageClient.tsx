"use client";

/**
 * DemoPageClient — client-side state machine for the /demo page.
 *
 * Three pre-loaded sample contracts ride on the real v2 pipeline (same
 * Pass 0 / Pass 1 / Pass 2 / citation firewall as an actual upload).
 * Visitors pick a sample, watch the scan cinema, and see a real
 * `AnalysisReport` — not a hand-rolled static fake.
 *
 * Phases:
 *   1. picker    → three cards, cheap client-rendered from /api/demo/samples
 *   2. scanning  → ContractPreview + LiveScanSidebar (same panels as
 *                  /analyze Phase 2) driven by a simulated progress
 *                  animation while the real POST is in-flight
 *   3. report    → AnalysisReport keyed on the sample id
 *
 * Guardrails live on the backend (demo-layer 24 h cache + 30/hr IP rate
 * limit). This file is client-side presentation only.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Lock,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import ContractPreview from "@/components/ContractPreview";
import LiveScanSidebar from "@/components/LiveScanSidebar";
import AnalysisReport from "@/components/AnalysisReport";
import AnalysisErrorBoundary from "@/components/AnalysisErrorBoundary";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { normalizeAnalysisResult } from "@/lib/review";
import type { AnalysisResult } from "@/lib/schemas";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Types — matching /api/demo response shapes
// ---------------------------------------------------------------------------

interface DemoSample {
  id: string;
  title: string;
  description: string;
  doc_type: string;
  word_count: string;
}

interface DemoSamplesResponse {
  samples: DemoSample[];
}

interface DemoAnalyzeResponse {
  sample_id: string;
  cached: boolean;
  result: AnalysisResult;
}

// ---------------------------------------------------------------------------
// API helpers — demo-scoped, not hoisted into lib/api.ts since they're
// only used on this page
// ---------------------------------------------------------------------------

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

async function fetchSamples(): Promise<DemoSample[]> {
  const res = await fetch(`${API_URL}/api/demo/samples`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Samples fetch failed: ${res.status}`);
  const body = (await res.json()) as DemoSamplesResponse;
  return body.samples;
}

async function analyzeSample(sampleId: string): Promise<DemoAnalyzeResponse> {
  const res = await fetch(
    `${API_URL}/api/demo/analyze?sample_id=${encodeURIComponent(sampleId)}`,
    { method: "POST", cache: "no-store" },
  );
  if (!res.ok) {
    let msg = `Analyze failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) msg = String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as DemoAnalyzeResponse;
}

// ---------------------------------------------------------------------------
// Page state machine
// ---------------------------------------------------------------------------

type Phase = "picker" | "scanning" | "report" | "error";

// Fallback metadata used pre-hydration or if the samples endpoint is
// slow/unavailable. Keep in sync with SAMPLE_METADATA in
// apps/api/app/routers/demo.py.
const FALLBACK_SAMPLES: DemoSample[] = [
  {
    id: "contractor_agreement",
    title: "Contractor Agreement",
    description:
      "A typical platform-style independent contractor agreement with IP assignment, liability cap, and mandatory arbitration.",
    doc_type: "Independent Contractor",
    word_count: "~2,300",
  },
  {
    id: "nda_mutual",
    title: "Mutual NDA",
    description:
      "A two-way non-disclosure agreement with a 5-year survival tail, no-solicitation clause, and injunctive-relief remedy.",
    doc_type: "Non-Disclosure Agreement",
    word_count: "~1,800",
  },
  {
    id: "saas_terms",
    title: "SaaS Subscription",
    description:
      "A SaaS subscription agreement with auto-renewal, data portability, and a fee-cap liability limit.",
    doc_type: "SaaS Subscription",
    word_count: "~1,800",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function DemoPageClient() {
  const [phase, setPhase] = React.useState<Phase>("picker");
  const [samples, setSamples] = React.useState<DemoSample[]>(FALLBACK_SAMPLES);
  const [activeSampleId, setActiveSampleId] = React.useState<string | null>(
    null,
  );
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  const [documentText, setDocumentText] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Simulated scan progress + elapsed seconds + "done" flip
  const [progress, setProgress] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [scanDone, setScanDone] = React.useState(false);

  // ---- Fetch samples on mount ----
  React.useEffect(() => {
    let cancelled = false;
    fetchSamples()
      .then((list) => {
        if (!cancelled && list.length > 0) setSamples(list);
      })
      .catch((err) => {
        // Silent fallback — we already have FALLBACK_SAMPLES hydrated.
        console.warn("[demo] samples fetch failed, using fallback", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Kick off a sample analysis ----
  const startSample = React.useCallback(async (sample: DemoSample) => {
    setActiveSampleId(sample.id);
    setResult(null);
    setErrorMsg(null);
    setProgress(0);
    setElapsed(0);
    setScanDone(false);
    setPhase("scanning");

    // Fire-and-forget: also fetch the raw text so the ContractPreview has
    // something to render. The endpoint isn't exposed — we just pass a
    // short SAMPLE_LINES fallback, so skip for now and let ContractPreview
    // fall through to its built-in sample. The demo is primarily about
    // the report; the preview is atmospheric.

    try {
      const data = await analyzeSample(sample.id);
      setResult(normalizeAnalysisResult(data.result));
      // Hard-snap to 1.0 + flip "done" for the scanner freeze animation.
      setProgress(1);
      setScanDone(true);
      // Give the scan-complete animation ~800 ms to breathe before
      // cross-fading to the report. Matches /analyze Phase 2→3.
      window.setTimeout(() => {
        setPhase("report");
      }, 800);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setPhase("error");
    }
  }, []);

  // ---- Simulated progress + elapsed timer (scanning phase only) ----
  React.useEffect(() => {
    if (phase !== "scanning" || scanDone) return;

    // Progress climbs fast at first, then logs out to ~0.85 until the
    // real response lands. This keeps the scan feeling alive even on a
    // cache hit (<200 ms) and realistic on a cold Pro call (~8 s).
    let raf = 0;
    const startedAt = performance.now();

    const tick = () => {
      const now = performance.now();
      const secs = (now - startedAt) / 1000;
      setElapsed(secs);
      // 1 − e^(−t/4) asymptotes to 1 around t=16s. We cap at 0.88 so the
      // bar never finishes before the real response does.
      const curve = 1 - Math.exp(-secs / 4);
      setProgress(Math.min(0.88, curve));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, scanDone]);

  // ---- Reset to picker ----
  const resetToPicker = React.useCallback(() => {
    setPhase("picker");
    setActiveSampleId(null);
    setResult(null);
    setDocumentText(null);
    setErrorMsg(null);
    setProgress(0);
    setElapsed(0);
    setScanDone(false);
  }, []);

  // ---------------------------------------------------------------------------
  // PHASE 2 — SCANNING
  // ---------------------------------------------------------------------------
  if (phase === "scanning") {
    const activeSample = samples.find((s) => s.id === activeSampleId);
    const filename = activeSample ? `${activeSample.title}.txt` : "sample.txt";
    // Fake clause/risk counters that advance with progress. Cosmetic only —
    // the real counts come from the final AnalysisReport.
    const pseudoClauses = Math.floor(progress * 48);
    const pseudoRisks = Math.floor(progress * 9);

    return (
      <div className="flex min-h-screen flex-col">
        <TopNav variant="editorial" />
        <main
          id="main-content"
          className={cn(
            "flex-1",
            // Fill remaining viewport below the sticky TopNav.
            "grid h-[calc(100dvh-60px)] overflow-hidden",
            "grid-rows-[1fr_auto] md:grid-cols-[1fr_340px] md:grid-rows-1",
          )}
        >
          <ContractPreview
            status={scanDone ? "completed" : "analyzing"}
            progress={progress}
            text={documentText}
            filename={filename}
            elapsed={elapsed}
            done={scanDone}
          />
          <LiveScanSidebar
            status={scanDone ? "completed" : "analyzing"}
            progress={progress}
            filename={filename}
            elapsed={elapsed}
            clausesFound={pseudoClauses}
            risksIdentified={pseudoRisks}
            done={scanDone}
          />
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 3 — REPORT
  // ---------------------------------------------------------------------------
  if (phase === "report" && result && activeSampleId) {
    const activeSample = samples.find((s) => s.id === activeSampleId);
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav variant="editorial" />
        <main id="main-content" className="flex-1 bg-beige-100">
          <div className="container-app space-y-8 py-10 md:py-14">
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 text-sm text-ink-600">
                <Badge variant="eyebrow" className="bg-beige-50 text-ink-800">
                  <Sparkles className="h-3 w-3" />
                  Live demo
                </Badge>
                <span className="text-xs">
                  {activeSample?.title} — rendered from a real v2 pipeline
                  run.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  palette="editorial"
                  variant="secondary"
                  size="sm"
                  onClick={resetToPicker}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try another sample
                </Button>
                <Link href="/analyze">
                  <Button palette="editorial" variant="primary" size="sm">
                    Upload your own
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <AnalysisErrorBoundary onRetry={resetToPicker}>
              <AnalysisReport
                jobId={`demo-${activeSampleId}`}
                result={result}
                filename={activeSample?.title ?? null}
                createdAt={new Date().toISOString()}
                documentText={documentText}
                showBreadcrumb={false}
                copyWindowHref
              />
            </AnalysisErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 4 — ERROR (rare; surfaces rate-limit 429s or backend outages)
  // ---------------------------------------------------------------------------
  if (phase === "error") {
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav variant="editorial" />
        <main
          id="main-content"
          className="flex-1 bg-beige-100 py-14 md:py-20"
        >
          <div className="container-app">
            <div className="mx-auto max-w-2xl border-l-[3px] border-l-ink-800 bg-beige-50 p-8 md:p-10">
              <Badge variant="eyebrow" className="bg-beige-100 text-ink-800">
                Demo unavailable
              </Badge>
              <h1 className="mt-4 text-2xl font-medium tracking-tight text-ink-800 md:text-h3">
                Couldn&rsquo;t run the sample
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {errorMsg ??
                  "Something went wrong reaching the demo endpoint."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  palette="editorial"
                  variant="secondary"
                  size="sm"
                  onClick={resetToPicker}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Back to samples
                </Button>
                <Link href="/analyze">
                  <Button palette="editorial" variant="primary" size="sm">
                    Upload your own contract
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 1 — PICKER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main id="main-content" className="flex-1 bg-beige-100">
        {/* Hero */}
        <section className="relative">
          <div className="container-app pt-16 pb-12 md:pt-24">
            <Badge variant="eyebrow">Live demo</Badge>
            <h1 className="mt-5 max-w-3xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
              Pick a contract.
              <br />
              Watch the real analyzer run.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 md:text-body-lg">
              These aren&rsquo;t mock results. Each sample below runs through
              the same v2 pipeline — Pass 0 contract gate, Pass 1 clause
              extraction, Pass 2 risk analysis, citation firewall — that
              powers every real upload.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
              <Lock className="h-3 w-3" strokeWidth={2} />
              Nothing you click here is stored against your account. Results
              are cached by sample for speed.
            </p>
          </div>
        </section>

        {/* Sample picker grid */}
        <section className="relative border-t border-ink-800/10 py-14">
          <div className="container-app">
            <div className="grid gap-5 md:grid-cols-3">
              {samples.map((sample) => (
                <motion.button
                  key={sample.id}
                  variants={fadeInUp}
                  initial="hidden"
                  animate="visible"
                  type="button"
                  onClick={() => startSample(sample)}
                  className={cn(
                    "group flex flex-col items-start border border-ink-800/10 bg-beige-50 p-6 text-left transition-colors",
                    "hover:border-ink-800/25 hover:bg-beige-50/80",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-800/40",
                  )}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center bg-ink-800 text-beige-50">
                    <FileText className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center border border-ink-800/10 bg-beige-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-ink-600">
                      {sample.doc_type}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-ink-500">
                      {sample.word_count} words
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-medium tracking-tight text-ink-800">
                    {sample.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {sample.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-800">
                    <Play className="h-3.5 w-3.5" strokeWidth={2} />
                    Run live analysis
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </motion.button>
              ))}
            </div>

            {/* "Bring your own" CTA */}
            <div className="mx-auto mt-14 max-w-2xl border border-ink-800/10 bg-beige-50 p-6 text-center">
              <p className="text-sm text-ink-800">
                Want to analyze your own contract?
              </p>
              <p className="mt-1.5 text-xs text-ink-500">
                No account needed. Free on your first few uploads.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href="/analyze">
                  <Button palette="editorial" variant="primary" size="sm">
                    Upload a contract
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button palette="editorial" variant="secondary" size="sm">
                    See pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
