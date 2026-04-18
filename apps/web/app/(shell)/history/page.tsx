"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Download,
  FileText,
  Sparkles,
  Clock,
  ArrowRight,
  FolderOpen,
  Filter,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { listJobs, exportPdfUrl } from "@/lib/api";
import type { JobStatusResponse } from "@/lib/schemas";
import { riskBand } from "@/lib/severity";
import { getDocumentTypeLabel } from "@/lib/document-type-labels";
import { cn } from "@/lib/cn";

type RiskFilter = "all" | "low" | "medium" | "high" | "critical";

const RISK_FILTERS: { value: RiskFilter; label: string; color: string }[] = [
  { value: "all", label: "All risks", color: "#8b8fa6" },
  { value: "low", label: "Low", color: "#10b981" },
  { value: "medium", label: "Moderate", color: "#eab308" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "critical", label: "Critical", color: "#ef4444" },
];

function riskTier(score: number): Exclude<RiskFilter, "all"> {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

export default function HistoryPage() {
  const [jobs, setJobs] = React.useState<JobStatusResponse[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState<RiskFilter>("all");
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    listJobs(100)
      .then(setJobs)
      .catch((e) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  // ⌘/Ctrl + K focuses the search box
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Counts per risk tier for filter chip badges
  const tierCounts = React.useMemo(() => {
    const counts: Record<RiskFilter, number> = {
      all: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    if (!jobs) return counts;
    counts.all = jobs.length;
    for (const j of jobs) {
      const score = j.result?.risk_score;
      if (score == null) continue;
      counts[riskTier(score)] += 1;
    }
    return counts;
  }, [jobs]);

  const filtered = React.useMemo(() => {
    if (!jobs) return [];
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      // Text search
      if (q) {
        const name = (j.filename ?? "").toLowerCase();
        const type = (j.result?.contract_type ?? "").toLowerCase();
        const summary = (j.result?.overall_summary ?? "").toLowerCase();
        if (!name.includes(q) && !type.includes(q) && !summary.includes(q)) {
          return false;
        }
      }
      // Risk filter
      if (riskFilter !== "all") {
        const score = j.result?.risk_score;
        if (score == null || riskTier(score) !== riskFilter) return false;
      }
      return true;
    });
  }, [jobs, query, riskFilter]);

  const hasActiveFilters = query.trim() !== "" || riskFilter !== "all";

  function clearFilters() {
    setQuery("");
    setRiskFilter("all");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="eyebrow-accent" className="mb-3">
            <Clock className="h-3 w-3" />
            Past analyses
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Your contract history
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Every contract you've analyzed — searchable, filterable, re-exportable.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder="Search by name, type, or summary…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-md border-white/10 bg-surface-2 pl-9 pr-16 text-zinc-100"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-block pointer-events-none">
              ⌘K
            </kbd>
          </div>
          <Link href="/analyze" className="flex-shrink-0">
            <Button palette="workspace" variant="primary" radius="md">
              New analysis
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Risk filter chips */}
      {jobs && jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 mr-1">
            <Filter className="h-3 w-3" />
            Filter
          </span>
          {RISK_FILTERS.map((f) => {
            const active = riskFilter === f.value;
            const count = tierCounts[f.value];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setRiskFilter(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-white/20 bg-surface-2 text-zinc-100"
                    : "border-white/5 bg-surface-1 text-zinc-400 hover:border-white/10 hover:text-zinc-100",
                )}
              >
                {f.value !== "all" && (
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: f.color }}
                  />
                )}
                {f.label}
                <span className="text-zinc-500 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-surface-1 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-severity-critical/40 bg-severity-critical/10 p-4 text-sm text-severity-critical">
          {error}
        </div>
      )}

      {!jobs && !error && (
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      )}

      {jobs && filtered.length === 0 && (
        <div className="rounded-lg border border-white/5 bg-surface-1 px-6 py-16 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-zinc-100">
            {query ? "No matches found" : "No analyses yet"}
          </h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">
            {query
              ? "Try a different search term."
              : "Upload your first contract and we'll save it here for easy reference."}
          </p>
          {!query && (
            <div className="mt-6">
              <Link href="/analyze">
                <Button palette="workspace" variant="primary" radius="md">
                  Analyze a contract
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {jobs && filtered.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 text-xs text-zinc-400">
            <span>
              {filtered.length} {filtered.length === 1 ? "analysis" : "analyses"}
            </span>
            <span>Newest first</span>
          </div>
          <ul className="divide-y divide-white/5">
            {filtered.map((j) => {
              const rawScore = j.result?.risk_score;
              const score = rawScore != null ? Math.min(rawScore, 95) : undefined;
              const band = score != null ? riskBand(score) : null;
              return (
                <li
                  key={j.job_id}
                  className="group hover:bg-surface-2 transition-colors"
                >
                  <Link
                    href={`/analysis/${j.job_id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-4"
                  >
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-zinc-100">
                        {j.filename ?? "Pasted contract"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400 flex items-center gap-2 truncate">
                        {j.result && (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              {getDocumentTypeLabel(j.result.metadata?.document_type)}
                            </span>
                            <span className="text-zinc-500">·</span>
                          </>
                        )}
                        {new Date(j.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {band && score != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
                          )}
                          style={{
                            color: band.color,
                            borderColor: `${band.color}66`,
                            backgroundColor: `${band.color}14`,
                          }}
                        >
                          {score}
                        </span>
                      ) : (
                        <Badge className="capitalize">{j.status}</Badge>
                      )}
                      {j.status === "completed" && (
                        <a
                          href={exportPdfUrl(j.job_id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            palette="workspace"
                            variant="secondary"
                            size="sm"
                            radius="md"
                            className="opacity-70 group-hover:opacity-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
