"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RiskGauge from "@/components/RiskGauge";
import FlagList from "@/components/FlagList";
import ClauseHighlighter from "@/components/ClauseHighlighter";
import NegotiationComposer from "@/components/NegotiationComposer";
import UploadProgress from "@/components/UploadProgress";
import {
  exportJsonUrl,
  exportPdfUrl,
  getJob,
  subscribeToJob,
} from "@/lib/api";
import type { JobStatusResponse, RedFlag } from "@/lib/schemas";

type Tab = "flags" | "clauses" | "negotiate";

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("flags");
  const [activeFlag, setActiveFlag] = React.useState<number | null>(null);

  // initial load + live subscription if not yet done
  React.useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const j = await getJob(jobId);
        setJob(j);
        if (j.status !== "completed" && j.status !== "failed") {
          cleanup = subscribeToJob(
            jobId,
            (ev) => {
              setJob((prev) =>
                prev
                  ? {
                      ...prev,
                      status: ev.status,
                      result: ev.partial ?? prev.result,
                    }
                  : prev,
              );
              if (ev.status === "completed" || ev.status === "failed") {
                // final refresh to load meta from DB
                getJob(jobId).then(setJob).catch(() => {});
              }
            },
            () => {},
          );
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => cleanup();
  }, [jobId]);

  if (error) {
    return (
      <div className="rounded-lg border border-severity-critical/50 bg-severity-critical/10 p-4 text-sm">
        Could not load analysis: {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  const result = job.result;
  const stillRunning = job.status !== "completed" && job.status !== "failed";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {job.filename ?? "Analysis"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {result?.contract_type ?? "Working…"}
          </h1>
          <p className="mt-1 text-xs text-muted">
            Created {new Date(job.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportJsonUrl(jobId)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" disabled={!result}>
              Export JSON
            </Button>
          </a>
          <a href={exportPdfUrl(jobId)} target="_blank" rel="noreferrer">
            <Button size="sm" disabled={!result}>
              Export PDF
            </Button>
          </a>
        </div>
      </div>

      {stillRunning && (
        <UploadProgress
          status={job.status}
          message="Analyzing contract…"
          progress={job.status === "analyzing" ? 0.6 : 0.25}
        />
      )}

      {job.status === "failed" && (
        <div className="rounded-lg border border-severity-critical/50 bg-severity-critical/10 p-4 text-sm">
          Analysis failed. {job.error ?? ""}
          <div className="mt-2">
            <Link href="/analyze">
              <Button size="sm" variant="outline">
                Try again
              </Button>
            </Link>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <RiskGauge score={result.risk_score} className="md:col-span-2" />
            <div className="rounded-xl border border-border bg-surface/70 p-5">
              <p className="text-xs uppercase tracking-wide text-muted">
                Summary
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                {result.overall_summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{result.red_flags.length} red flags</Badge>
                <Badge>
                  {result.missing_protections.length} missing protections
                </Badge>
                {result.truncated && <Badge>Truncated input</Badge>}
                {result.provider && (
                  <Badge className="uppercase tracking-wide">
                    {result.provider}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs w-fit">
            {(
              [
                ["flags", "Red flags"],
                ["clauses", "Clause highlighter"],
                ["negotiate", "Negotiate"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={
                  "px-3 py-1.5 rounded " +
                  (tab === key
                    ? "bg-accent text-white"
                    : "text-muted hover:text-foreground")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "flags" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <FlagList
                flags={result.red_flags}
                activeIndex={activeFlag}
                onSelect={(_f: RedFlag, i: number) => setActiveFlag(i)}
              />
              <div className="rounded-xl border border-border bg-surface/70 p-5">
                <h3 className="text-sm font-semibold">Missing protections</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                  {result.missing_protections.length === 0 ? (
                    <li className="text-muted">None flagged.</li>
                  ) : (
                    result.missing_protections.map((m, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-accent">•</span>
                        <span>{m}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {tab === "clauses" && job.text_preview && (
            <ClauseHighlighter
              text={job.text_preview}
              flags={result.red_flags}
              activeIndex={activeFlag}
            />
          )}
          {tab === "clauses" && !job.text_preview && (
            <div className="rounded-xl border border-border bg-surface/70 p-5 text-sm text-muted">
              No extracted text available.
            </div>
          )}

          {tab === "negotiate" && (
            <NegotiationComposer
              suggestions={result.negotiation_suggestions}
              contractType={result.contract_type}
            />
          )}
        </>
      )}
    </div>
  );
}
