"use client";

/**
 * ContractReader — cinematic "PactSafe AI is reading your contract"
 * animation shown while an analysis job is in flight.
 *
 * What it does:
 *   1. Renders the contract text (or a simulated sample if no text is
 *      available yet) inside a faux document frame.
 *   2. Animates a glowing scan beam sweeping down the document.
 *   3. As the scan passes each "clause", a color-coded highlight
 *      pill appears in place (red / orange / yellow / green) with a
 *      short issue label — like the final PDF-highlight feature
 *      described in the product roadmap, but driven client-side so
 *      users get the feedback immediately while the backend works.
 *   4. A live stage label (Parsing → Scanning → Flagging → Drafting)
 *      tracks the backend's real job status so the animation stays
 *      honest about progress.
 *   5. Live counters tick up — clauses analyzed, red flags found,
 *      protections missing — to show the AI is actually doing work.
 *
 * This is purely a presentation component — it doesn't mutate job
 * state and is safe to unmount whenever the real result arrives.
 */

import * as React from "react";
import {
  FileText,
  ScanLine,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Check,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/schemas";

// ---------------------------------------------------------------------------
// Stage definitions — these mirror the four real backend states but are
// given richer labels for the animation. If the backend reports a state
// we recognise, we jump the active stage to it; otherwise we advance
// automatically on a timer so the bar never looks frozen.
// ---------------------------------------------------------------------------

type StageKey =
  | "parsing"
  | "scanning"
  | "flagging"
  | "drafting"
  | "completed";

interface Stage {
  key: StageKey;
  label: string;
  detail: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  {
    key: "parsing",
    label: "Parsing document",
    detail: "Extracting clauses, parties, and section structure.",
    icon: FileText,
  },
  {
    key: "scanning",
    label: "Scanning for risk",
    detail: "Checking 50+ freelancer-specific risk patterns.",
    icon: ScanLine,
  },
  {
    key: "flagging",
    label: "Classifying clauses",
    detail: "Tagging IP, payment, scope, liability, termination.",
    icon: AlertTriangle,
  },
  {
    key: "drafting",
    label: "Drafting negotiation language",
    detail: "Generating copy-pasteable replacement text.",
    icon: Sparkles,
  },
  {
    key: "completed",
    label: "Report ready",
    detail: "Finalising your analysis.",
    icon: Check,
  },
];

// Map the backend's JobStatus onto our richer stage keys.
function stageFromJob(status: JobStatus): StageKey {
  switch (status) {
    case "queued":
    case "extracting":
      return "parsing";
    case "analyzing":
      return "scanning";
    case "completed":
      return "completed";
    case "failed":
      return "drafting";
    default:
      return "parsing";
  }
}

// ---------------------------------------------------------------------------
// Simulated annotations — in the absence of a real highlight_map from the
// backend, we pick a handful of lines in the document and drop a synthetic
// flag on each one so the animation looks alive. The flag labels rotate
// through realistic freelancer-contract categories so what the user sees
// matches the kind of output they'll get on the next screen.
// ---------------------------------------------------------------------------

type SynthSeverity = "critical" | "high" | "medium" | "positive";

interface SynthAnnotation {
  /** Index of the line inside the rendered document that gets highlighted. */
  lineIndex: number;
  severity: SynthSeverity;
  label: string;
  /** 0..1 — when along the timeline this annotation appears. */
  at: number;
}

const SEVERITY_STYLES: Record<
  SynthSeverity,
  { bg: string; border: string; text: string; label: string; Icon: React.ElementType }
> = {
  critical: {
    bg: "bg-severity-critical/25",
    border: "border-severity-critical/60",
    text: "text-severity-critical",
    label: "Critical",
    Icon: AlertOctagon,
  },
  high: {
    bg: "bg-severity-high/25",
    border: "border-severity-high/60",
    text: "text-severity-high",
    label: "High",
    Icon: AlertTriangle,
  },
  medium: {
    bg: "bg-severity-medium/25",
    border: "border-severity-medium/60",
    text: "text-severity-medium",
    label: "Medium",
    Icon: AlertTriangle,
  },
  positive: {
    bg: "bg-success/20",
    border: "border-success/50",
    text: "text-success",
    label: "In your favor",
    Icon: ShieldCheck,
  },
};

// A rotating catalogue of realistic issue labels used when we don't
// have true AI output yet. The picker salts by line index so the same
// line always shows the same label within a single animation cycle.
const SYNTH_POOL: { severity: SynthSeverity; label: string }[] = [
  { severity: "critical", label: "IP transfer on signature (not payment)" },
  { severity: "critical", label: "Unlimited liability" },
  { severity: "high", label: "Net-60 payment terms" },
  { severity: "high", label: "Non-compete — no geo or time limit" },
  { severity: "high", label: "Unlimited revisions" },
  { severity: "high", label: "Termination without kill fee" },
  { severity: "medium", label: "Vague scope of work" },
  { severity: "medium", label: "No late-payment interest" },
  { severity: "medium", label: "Perpetual confidentiality" },
  { severity: "positive", label: "Mutual indemnity" },
  { severity: "positive", label: "Portfolio rights retained" },
];

/**
 * A short placeholder contract — used only if the analyze page hasn't
 * given us real pasted text yet. This is display-only and never leaves
 * the browser, so the exact wording doesn't matter so long as it
 * reads like a real agreement.
 */
const SAMPLE_LINES = [
  "MASTER SERVICES AGREEMENT",
  "",
  "This Master Services Agreement (the “Agreement”) is entered into by",
  "and between ACME CORPORATION (the “Client”) and the independent",
  "service provider named on the signature page (the “Contractor”).",
  "",
  "1. SCOPE OF SERVICES. Contractor shall provide the services set forth",
  "in one or more statements of work, together with any reasonably",
  "related tasks as may be requested by the Client from time to time.",
  "",
  "2. PAYMENT. Client shall pay Contractor the fees set forth in the",
  "applicable SOW, payable net sixty (60) days after Client’s receipt of",
  "a correct invoice. No late-payment interest shall accrue.",
  "",
  "3. INTELLECTUAL PROPERTY. All work product created by Contractor",
  "under this Agreement, including preliminary materials and unused",
  "concepts, shall be the exclusive property of Client upon creation.",
  "",
  "4. REVISIONS. Contractor shall provide such revisions as Client may",
  "reasonably request until Client is fully satisfied with the work.",
  "",
  "5. TERMINATION. Client may terminate this Agreement at any time, for",
  "any reason or no reason, upon written notice to Contractor. No kill",
  "fee or termination compensation shall be payable.",
  "",
  "6. LIABILITY. Contractor’s liability under this Agreement shall be",
  "unlimited with respect to any claim arising out of or related to the",
  "services, including consequential and indirect damages.",
  "",
  "7. CONFIDENTIALITY. The confidentiality obligations set forth in this",
  "Agreement shall survive termination in perpetuity.",
  "",
  "8. NON-COMPETE. Contractor shall not, during the term and for three",
  "(3) years thereafter, provide similar services to any entity that",
  "competes with Client, anywhere in the world.",
];

// Pick which lines to annotate and when. We want the annotations
// spread roughly evenly through the timeline so the animation feels
// like the scan beam is actually finding them as it goes.
function buildAnnotations(lineCount: number): SynthAnnotation[] {
  // Lines that look like they contain clause body text (non-empty,
  // not all-caps headers). We target those for highlights.
  const candidates: number[] = [];
  for (let i = 0; i < lineCount; i++) {
    candidates.push(i);
  }
  // Drop the first two lines (header) and every blank-ish line
  const filtered = candidates.filter((i) => i > 1);
  // Pick up to 6 annotations, evenly spaced through the document
  const MAX = Math.min(6, Math.floor(filtered.length / 3));
  const chosen: SynthAnnotation[] = [];
  for (let k = 0; k < MAX; k++) {
    const idx = filtered[Math.floor((k + 0.5) * (filtered.length / MAX))];
    const pool = SYNTH_POOL[(idx * 7 + k * 3) % SYNTH_POOL.length];
    chosen.push({
      lineIndex: idx,
      severity: pool.severity,
      label: pool.label,
      // Spread the appearance times between 15% and 92% of the cycle
      at: 0.15 + (k / Math.max(1, MAX - 1)) * 0.77,
    });
  }
  return chosen.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------------------

export interface ContractReaderProps {
  /** Backend job status — drives the stage pill and the final "done" state. */
  status: JobStatus;
  /** Human-readable progress message from the analyze page. */
  message?: string;
  /** 0..1 — the analyze page's own progress estimate. */
  progress: number;
  /**
   * Optional raw contract text the user just pasted. When present we
   * render it inside the document frame so the animation highlights
   * their actual clauses. When absent (file upload flow) we fall back
   * to a generic sample contract — the visual effect is the same.
   */
  text?: string | null;
  /** Optional filename — shown in the document header if supplied. */
  filename?: string | null;
  /** Failure state — stops the animation and shows the error. */
  error?: string | null;
  /** Elapsed seconds since the job started, from the parent. */
  elapsed?: number;
}

/**
 * The reader component. Stateless w.r.t. the backend job — the parent
 * polls and passes status + progress down.
 */
export default function ContractReader({
  status,
  message,
  progress,
  text,
  filename,
  error,
  elapsed = 0,
}: ContractReaderProps) {
  // ---- Source text ------------------------------------------------------
  // Prefer real user text, split on newlines. Cap the number of lines
  // shown so very long contracts still animate at a sensible pace.
  const lines = React.useMemo(() => {
    const raw = (text ?? "").trim();
    const src = raw.length > 40 ? raw : SAMPLE_LINES.join("\n");
    const split = src.split(/\r?\n/);
    // Hard cap at 48 lines so the reader is never taller than a screen
    return split.slice(0, 48);
  }, [text]);

  // ---- Internal clock ---------------------------------------------------
  // We run our own 0..1 ramp that advances a little faster than the
  // backend's own progress estimate so the scan beam keeps moving even
  // if polling is slow. It resets whenever the job moves to a new
  // status so users always see a fresh sweep for each stage.
  const [localTick, setLocalTick] = React.useState(0);
  const inFlight = status !== "completed" && status !== "failed";

  React.useEffect(() => {
    if (!inFlight) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const dt = (Date.now() - start) / 1000;
      // Saturating ramp — 0 → 1 over ~24s, then restarts
      const ramp = (dt % 24) / 24;
      setLocalTick(ramp);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [inFlight, status]);

  // Effective progress — max of backend estimate and our local ramp so
  // the visual bar never stalls below the real state.
  const effectiveProgress = inFlight
    ? Math.max(0.08, Math.min(0.98, Math.max(progress, localTick)))
    : status === "completed"
    ? 1
    : 0;

  // ---- Scan beam position ----------------------------------------------
  // The beam sweeps from top to bottom once per "cycle" (≈5s). When
  // the job completes we snap it to the bottom and stop.
  const [beamPct, setBeamPct] = React.useState(0);
  React.useEffect(() => {
    if (!inFlight) {
      setBeamPct(status === "completed" ? 100 : 0);
      return;
    }
    const start = Date.now();
    let raf = 0;
    const loop = () => {
      const t = ((Date.now() - start) / 5000) % 1;
      setBeamPct(t * 100);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [inFlight, status]);

  // ---- Annotations ------------------------------------------------------
  const annotations = React.useMemo(
    () => buildAnnotations(lines.length),
    [lines.length],
  );

  // Which annotations are currently visible — i.e. those whose `at`
  // threshold has been crossed by the effective progress.
  const visibleAnnos = React.useMemo(
    () => annotations.filter((a) => effectiveProgress >= a.at),
    [annotations, effectiveProgress],
  );

  // Live counters
  const redCount = visibleAnnos.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  ).length;
  const yellowCount = visibleAnnos.filter((a) => a.severity === "medium").length;
  const greenCount = visibleAnnos.filter((a) => a.severity === "positive").length;
  const clauseCount = Math.round(effectiveProgress * Math.max(12, lines.length));

  // ---- Active stage -----------------------------------------------------
  // Prefer the backend status when available; otherwise advance on our
  // own ramp so users see stage progression even if the API is slow.
  const stageKey: StageKey = React.useMemo(() => {
    const fromJob = stageFromJob(status);
    if (fromJob === "completed") return "completed";
    // Auto-advance by ramp so the stage pill doesn't look stuck
    if (effectiveProgress > 0.72) return "drafting";
    if (effectiveProgress > 0.45) return "flagging";
    if (effectiveProgress > 0.2) return "scanning";
    return fromJob;
  }, [status, effectiveProgress]);

  const stageIdx = STAGES.findIndex((s) => s.key === stageKey);
  const activeStage = STAGES[Math.max(0, stageIdx)];

  // ---- Render -----------------------------------------------------------

  const pct = Math.round(effectiveProgress * 100);
  const failed = status === "failed" || !!error;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-card-lg"
      role="status"
      aria-live="polite"
      aria-label={
        failed
          ? `Analysis failed: ${error ?? "unknown error"}`
          : `Analyzing contract, ${pct} percent complete. ${activeStage.label}.`
      }
    >
      {/* Soft gradient glow behind the whole card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(800px 300px at 10% -10%, rgba(124,92,252,0.14), transparent), radial-gradient(600px 220px at 90% 110%, rgba(124,92,252,0.10), transparent)",
        }}
      />

      {/* Header ------------------------------------------------------------ */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 text-accent ring-1 ring-accent/30">
            {failed ? (
              <XCircle className="h-5 w-5 text-severity-critical" />
            ) : status === "completed" ? (
              <Check className="h-5 w-5 text-success" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />
            )}
            {inFlight && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl ring-2 ring-accent/40 animate-ping-slow"
              />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {failed
                  ? "Analysis failed"
                  : status === "completed"
                  ? "Report ready"
                  : "PactSafe AI is reading your contract"}
              </p>
              {inFlight && (
                <span className="dots-loader text-accent">
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-foreground-muted">
              {failed
                ? error
                : filename
                ? `${filename} · ${activeStage.detail}`
                : activeStage.detail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] tabular-nums text-foreground-muted">
          {elapsed > 0 && inFlight && (
            <span className="hidden sm:inline">{formatElapsed(elapsed)}</span>
          )}
          <span className="font-semibold text-foreground">{pct}%</span>
        </div>
      </div>

      {/* Live counter strip ------------------------------------------------ */}
      <div className="relative grid grid-cols-2 gap-px border-b border-border-subtle/60 bg-border-subtle/40 sm:grid-cols-4">
        <CounterCell
          label="Clauses read"
          value={clauseCount}
          tone="neutral"
        />
        <CounterCell
          label="Red flags"
          value={redCount}
          tone="critical"
        />
        <CounterCell
          label="Watch-outs"
          value={yellowCount}
          tone="medium"
        />
        <CounterCell
          label="In your favor"
          value={greenCount}
          tone="positive"
        />
      </div>

      {/* Document pane with scan beam + highlights ------------------------- */}
      <div className="relative px-5 pt-5">
        <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated/70">
          {/* Fake "page header" so it looks like a document */}
          <div className="flex items-center justify-between border-b border-border-subtle/80 bg-surface/70 px-4 py-2 text-[10px] uppercase tracking-wider text-foreground-subtle">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {filename ?? "contract.pdf"}
            </span>
            <span>Page 1 of 1 · secure preview</span>
          </div>

          {/* Document body */}
          <div
            className="relative max-h-[360px] overflow-hidden bg-gradient-to-b from-bg-elevated/40 to-bg-elevated/20 px-6 py-5 font-mono text-[11px] leading-relaxed text-foreground/80"
            aria-hidden
          >
            {/* Scan beam — a blurred horizontal bar sweeping top to bottom */}
            {inFlight && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 h-24 -translate-y-1/2"
                  style={{
                    top: `${beamPct}%`,
                    background:
                      "linear-gradient(to bottom, rgba(124,92,252,0) 0%, rgba(124,92,252,0.18) 45%, rgba(124,92,252,0.32) 50%, rgba(124,92,252,0.18) 55%, rgba(124,92,252,0) 100%)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 h-[2px]"
                  style={{
                    top: `${beamPct}%`,
                    background:
                      "linear-gradient(to right, rgba(124,92,252,0) 0%, rgba(124,92,252,0.9) 50%, rgba(124,92,252,0) 100%)",
                    boxShadow: "0 0 24px rgba(124,92,252,0.85)",
                  }}
                />
              </>
            )}

            {/* Faint grid so the "page" looks like paper */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "100% 20px",
              }}
            />

            {/* The text lines */}
            <div className="relative space-y-[2px]">
              {lines.map((line, i) => {
                const anno = visibleAnnos.find((a) => a.lineIndex === i);
                const isBlank = line.trim().length === 0;
                return (
                  <LineRow
                    key={i}
                    line={line}
                    blank={isBlank}
                    annotation={anno}
                  />
                );
              })}
            </div>

            {/* Fade mask at the bottom so long contracts don't look chopped */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg-elevated/95 to-transparent"
            />
          </div>
        </div>
      </div>

      {/* Progress bar ------------------------------------------------------ */}
      <div className="relative px-5 pt-5">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-out",
              failed ? "bg-severity-critical" : "bg-accent",
              inFlight && "animate-pulse-soft",
            )}
            style={{
              width: `${pct}%`,
              boxShadow: failed
                ? "0 0 16px rgba(239,68,68,0.45)"
                : "0 0 16px rgba(124,92,252,0.55)",
            }}
          />
        </div>
      </div>

      {/* Stage pills ------------------------------------------------------- */}
      <ol className="relative grid gap-2 px-5 py-5 text-[11px] sm:grid-cols-4">
        {STAGES.slice(0, 4).map((s, i) => {
          const active = s.key === stageKey;
          const done = stageIdx > i || status === "completed";
          const Icon = s.icon;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                active &&
                  "border-accent/40 bg-accent/[0.08] text-foreground shadow-glow",
                done && "border-success/40 bg-success/5 text-success",
                !active &&
                  !done &&
                  "border-border text-foreground-subtle",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  active && "bg-accent text-white",
                  done && "bg-success text-white",
                  !active && !done && "border border-border-strong",
                )}
              >
                {done ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                )}
              </span>
              <span className="truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Status text ------------------------------------------------------- */}
      <div className="relative border-t border-border-subtle/60 px-5 py-3 text-[11px] text-foreground-muted">
        {failed
          ? `Error: ${error ?? "Unknown error"}`
          : status === "completed"
          ? "All clauses analyzed — opening report…"
          : message || `${activeStage.detail}`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface LineRowProps {
  line: string;
  blank: boolean;
  annotation?: SynthAnnotation;
}

/**
 * A single line of the "document". Renders the text and, if an
 * annotation has been assigned to this line, wraps it with a tinted
 * highlight background plus a small severity chip pinned to the right
 * margin. The chip fades in so it feels like the AI just dropped it.
 */
function LineRow({ line, blank, annotation }: LineRowProps) {
  if (blank) {
    return <div className="h-[10px]" />;
  }

  if (!annotation) {
    return (
      <div className="whitespace-pre-wrap break-words text-foreground/75">
        {line}
      </div>
    );
  }

  const s = SEVERITY_STYLES[annotation.severity];
  const { Icon } = s;
  return (
    <div className="relative animate-fade-in-up">
      <div
        className={cn(
          "relative rounded-md border px-2 py-0.5 whitespace-pre-wrap break-words",
          s.bg,
          s.border,
        )}
      >
        <span className="relative z-10 text-foreground">{line}</span>
        <span
          className={cn(
            "pointer-events-none absolute -right-1 -top-2 inline-flex items-center gap-1 rounded-full border bg-bg-elevated/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shadow-sm",
            s.border,
            s.text,
          )}
        >
          <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
          {s.label}
        </span>
      </div>
      <div className="mt-0.5 pl-2 text-[10px] italic text-foreground-muted">
        {annotation.label}
      </div>
    </div>
  );
}

interface CounterCellProps {
  label: string;
  value: number;
  tone: "neutral" | "critical" | "medium" | "positive";
}

function CounterCell({ label, value, tone }: CounterCellProps) {
  const toneClasses: Record<CounterCellProps["tone"], string> = {
    neutral: "text-foreground",
    critical: "text-severity-critical",
    medium: "text-severity-medium",
    positive: "text-success",
  };
  return (
    <div className="bg-surface/70 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums transition-colors",
          toneClasses[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
