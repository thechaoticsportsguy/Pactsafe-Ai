"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listJobs, exportPdfUrl } from "@/lib/api";
import type { JobStatusResponse } from "@/lib/schemas";
import { riskBand } from "@/lib/severity";

export default function HistoryPage() {
  const [jobs, setJobs] = React.useState<JobStatusResponse[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    listJobs(100).then(setJobs).catch((e) =>
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
      return (
        name.includes(q) || type.includes(q) || summary.includes(q)
      );
    });
  }, [jobs, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="mt-1 text-sm text-muted">
            Past contract analyses, newest first.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search filename, type, or summary…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-severity-critical/50 bg-severity-critical/10 p-3 text-sm">
          {error}
        </div>
      )}

      {!jobs && !error && (
        <div className="space-y-2">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      )}

      {jobs && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface/60 p-10 text-center">
          <p className="text-sm text-muted">
            {query ? "No results match your search." : "No analyses yet."}
          </p>
          <div className="mt-3">
            <Link href="/analyze">
              <Button>Analyze a contract</Button>
            </Link>
          </div>
        </div>
      )}

      {jobs && filtered.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface/40 overflow-hidden">
          {filtered.map((j) => {
            const score = j.result?.risk_score;
            const band = score != null ? riskBand(score) : null;
            return (
              <li key={j.job_id}>
                <div className="flex flex-wrap items-center gap-3 p-4 hover:bg-surface/80 transition-colors">
                  <Link
                    href={`/analysis/${j.job_id}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="font-medium truncate">
                      {j.filename ?? "(pasted text)"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {j.result?.contract_type ?? "—"} ·{" "}
                      {new Date(j.created_at).toLocaleString()}
                    </p>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">{j.status}</Badge>
                    {band && score != null && (
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
                        style={{
                          color: band.color,
                          borderColor: band.color,
                          backgroundColor: `${band.color}1f`,
                        }}
                      >
                        {score}
                      </span>
                    )}
                    {j.status === "completed" && (
                      <a
                        href={exportPdfUrl(j.job_id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" size="sm">
                          PDF
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
