"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { createJobFromFile, createJobFromText } from "@/lib/api";
import {
  Paperclip,
  ArrowUp,
  Shield,
  FileText,
  Scale,
  Users,
  GitCompare,
  Clock,
  Sparkles,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Quick-action pill definitions
// ---------------------------------------------------------------------------
interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href?: string;
  sample?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Shield className="h-3.5 w-3.5" />,
    label: "NDA Scan",
    sample:
      "NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement (the \"Agreement\") is entered into as of the date last signed below...",
  },
  {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "SaaS MSA",
    sample:
      "MASTER SUBSCRIPTION AGREEMENT\n\nThis Master Subscription Agreement (\"MSA\") governs Customer's access to and use of the Service...",
  },
  {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Employment",
    sample:
      "EMPLOYMENT AGREEMENT\n\nThis Employment Agreement is entered into between the Company and Employee on the date signed below...",
  },
  {
    icon: <Scale className="h-3.5 w-3.5" />,
    label: "Vendor Terms",
    sample:
      "VENDOR SERVICES AGREEMENT\n\nThis Vendor Services Agreement (\"Agreement\") is made between Vendor and Client for the provision of services...",
  },
  {
    icon: <GitCompare className="h-3.5 w-3.5" />,
    label: "Compare",
    href: "/compare",
  },
  {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "History",
    href: "/history",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PactSafeLanding() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-resize the textarea up to 200px
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "56px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!file && !text.trim()) return;

    if (!file && text.trim().length < 50) {
      setError("Paste at least 50 characters of contract text.");
      return;
    }

    setLoading(true);
    try {
      const job = file
        ? await createJobFromFile(file)
        : await createJobFromText(text.trim());
      router.push(`/analysis/${job.job_id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the backend. Is it running?",
      );
      setLoading(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds the 10 MB limit.");
      return;
    }
    setFile(f);
    setText("");
    setError(null);
    // reset so the same file can be picked again if removed
    e.target.value = "";
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

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ----------------------------------------------------------------
          Background: layered radial gradients + subtle grid
      ---------------------------------------------------------------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 15% -5%, rgba(124,92,252,0.28) 0%, transparent 55%),
            radial-gradient(ellipse 55% 40% at 90% 10%, rgba(124,92,252,0.14) 0%, transparent 50%),
            radial-gradient(ellipse 45% 35% at 50% 95%, rgba(124,92,252,0.07) 0%, transparent 50%),
            #0a0a0f
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,92,252,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,92,252,1) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* ----------------------------------------------------------------
          Transparent navigation header
      ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-20 flex items-center gap-6 px-6 h-14 border-b border-white/5 bg-background/40 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded-md bg-accent shadow-glow"
          />
          PactSafe AI
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/analyze" className="hover:text-foreground transition-colors">
            Analyze
          </Link>
          <Link href="/history" className="hover:text-foreground transition-colors">
            History
          </Link>
          <Link href="/compare" className="hover:text-foreground transition-colors">
            Compare
          </Link>
        </nav>
        <div className="flex-1" />
        <span className="hidden text-xs text-muted sm:block">Not legal advice.</span>
      </header>

      {/* ----------------------------------------------------------------
          Hero text
      ---------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-4 pt-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Sparkles className="h-3 w-3" />
          AI-powered contract review
        </div>

        <h1 className="max-w-2xl text-5xl font-semibold tracking-tight leading-[1.1]">
          Spot the traps in any contract,{" "}
          <span className="text-accent">before</span> you sign.
        </h1>

        <p className="mt-5 max-w-lg text-base text-muted">
          Paste contract text or drop a PDF / DOCX. Get a plain-English risk
          score, ranked red flags, and a negotiation draft in under a minute.
        </p>
      </div>

      {/* ----------------------------------------------------------------
          Input card + quick actions
      ---------------------------------------------------------------- */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-20">
        {/* Card */}
        <div
          className={cn(
            "rounded-2xl border bg-surface/80 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 transition-colors",
            error ? "border-severity-critical/50" : "border-border",
          )}
        >
          {/* ---- textarea / file pill ---- */}
          <div className="px-4 pt-4">
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-3">
                <FileText className="h-4 w-4 flex-shrink-0 text-accent" />
                <span className="flex-1 truncate text-sm font-medium text-accent">
                  {file.name}
                </span>
                <span className="text-xs text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-1 rounded p-0.5 text-muted hover:bg-accent/20 hover:text-accent"
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
                placeholder="Paste contract text here, or use the paperclip to upload PDF / DOCX…"
                disabled={loading}
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-60"
                style={{ minHeight: 56, maxHeight: 200, overflow: "auto" }}
              />
            )}
          </div>

          {/* ---- toolbar ---- */}
          <div className="flex items-center justify-between px-3 pb-3 pt-2">
            <div className="flex items-center gap-1.5">
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
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hi hover:text-foreground disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(1)} MB attached`
                  : "PDF · DOCX · TXT · 10 MB limit"}
              </span>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors",
                "bg-accent text-white shadow-glow",
                "hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              )}
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing…
                </>
              ) : (
                <>
                  <ArrowUp className="h-3.5 w-3.5" />
                  Analyze
                </>
              )}
            </button>
          </div>

          {/* ---- error banner ---- */}
          {error && (
            <div className="border-t border-severity-critical/30 bg-severity-critical/10 px-4 py-2.5 text-xs text-severity-critical rounded-b-2xl">
              {error}
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="mt-2 text-center text-xs text-muted">
          Press{" "}
          <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px]">
            ⌘ Enter
          </kbd>{" "}
          to analyze
        </p>

        {/* Quick-action pills */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <QuickActionPill
              key={qa.label}
              icon={qa.icon}
              label={qa.label}
              onClick={
                qa.href
                  ? () => router.push(qa.href!)
                  : qa.sample
                    ? () => prefill(qa.sample!)
                    : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-action pill
// ---------------------------------------------------------------------------
function QuickActionPill({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 text-xs text-muted transition-colors hover:border-accent/40 hover:bg-surface-hi hover:text-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
