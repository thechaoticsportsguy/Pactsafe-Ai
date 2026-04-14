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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listJobs, exportPdfUrl } from "@/lib/api";
import type { JobStatusResponse } from "@/lib/schemas";
import { riskBand } from "@/lib/severity";
import { cn } from "@/lib/cn";

export default function HistoryPage() {
  const [jobs, setJobs] = React.useState<JobStatusResponse[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    listJobs(100)
      .then(setJobs)
      .catch((e) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  const filtered = React.useMemo(() => {
    if (!jobs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const name = (j.filename ?? "").toLowerCase();
      const type = (j.result?.contract_type ?? "").toLowerCase();
      const summary = (j.result?.overall_summary ?? "").toLowerCase();
      return name.includes(q) || type.includes(q) || summary.includes(q);
    });
  }, [jobs, query]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge tone="accent" size="xs" className="mb-3">
            <Clock className="h-3 w-3" />
            Past analyses
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your contract history
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Every contract you've analyzed — searchable, filterable, re-exportable.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted pointer-events-none" />
            <Input
              placeholder="Search by name, type, or summary…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Link href="/analyze" className="flex-shrink-0">
            <Button>
              New analysis
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-4 text-sm text-severity-critical">
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
        <div className="rounded-2xl border border-border bg-surface/40 px-6 py-16 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-foreground">
            {query ? "No matches found" : "No analyses yet"}
          </h3>
          <p className="mt-2 text-sm text-foreground-muted max-w-sm mx-auto">
            {query
              ? "Try a different search term."
              : "Upload your first contract and we'll save it here for easy reference."}
          </p>
          {!query && (
            <div className="mt-6">
              <Link href="/analyze">
                <Button>
                  Analyze a contract
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {jobs && filtered.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 text-xs text-foreground-muted">
            <span>
              {filtered.length} {filtered.length === 1 ? "analysis" : "analyses"}
            </span>
            <span>Newest first</span>
          </div>
          <ul className="divide-y divide-border/60">
            {filtered.map((j) => {
              const score = j.result?.risk_score;
              const band = score != null ? riskBand(score) : null;
              return (
                <li
                  key={j.job_id}
                  className="group hover:bg-surface-2/40 transition-colors"
                >
                  <Link
                    href={`/analysis/${j.job_id}`}
                    className="flex flex-wrap items-center gap-4 px-5 py-4"
                  >
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-foreground">
                        {j.filename ?? "Pasted contract"}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-muted flex items-center gap-2 truncate">
                        {j.result?.contract_type && (
                          <>
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" />
                              {j.result.contract_type}
                            </span>
                            <span className="text-foreground-subtle">·</span>
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
                        <Badge tone="neutral" size="xs" className="capitalize">
                          {j.status}
                        </Badge>
                      )}
                      {j.status === "completed" && (
                        <a
                          href={exportPdfUrl(j.job_id)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
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
