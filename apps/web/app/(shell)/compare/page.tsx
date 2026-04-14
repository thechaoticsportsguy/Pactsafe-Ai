"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listJobs } from "@/lib/api";
import type { AnalysisResult, JobStatusResponse } from "@/lib/schemas";
import { riskBand, severityColor, severityEmoji } from "@/lib/severity";
import { SEVERITY_ORDER, type Severity } from "@/lib/schemas";

export default function ComparePage() {
  const [jobs, setJobs] = React.useState<JobStatusResponse[] | null>(null);
  const [leftId, setLeftId] = React.useState<string | "">("");
  const [rightId, setRightId] = React.useState<string | "">("");

  React.useEffect(() => {
    listJobs(100)
      .then((all) => setJobs(all.filter((j) => j.status === "completed" && j.result)))
      .catch(() => setJobs([]));
  }, []);

  const left = jobs?.find((j) => j.job_id === leftId) ?? null;
  const right = jobs?.find((j) => j.job_id === rightId) ?? null;

  if (!jobs) {
    return (
      <div className="space-y-2">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare contracts</h1>
        <p className="mt-1 text-sm text-muted">
          Pick two completed analyses to compare side by side.
        </p>
      </div>

      {jobs.length < 2 ? (
        <div className="rounded-xl border border-border bg-surface/60 p-8 text-center text-sm text-muted">
          You need at least two completed analyses to compare.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <JobPicker
            label="Contract A"
            jobs={jobs}
            value={leftId}
            onChange={setLeftId}
            disabledValue={rightId}
          />
          <JobPicker
            label="Contract B"
            jobs={jobs}
            value={rightId}
            onChange={setRightId}
            disabledValue={leftId}
          />
        </div>
      )}

      {left && right && left.result && right.result && (
        <div className="grid gap-4 md:grid-cols-2">
          <ComparePanel job={left} />
          <ComparePanel job={right} />
        </div>
      )}

      {(leftId || rightId) && !(left && right) && (
        <p className="text-xs text-muted">
          Select both contracts to see the comparison.
        </p>
      )}
    </div>
  );
}

function JobPicker({
  label,
  jobs,
  value,
  onChange,
  disabledValue,
}: {
  label: string;
  jobs: JobStatusResponse[];
  value: string;
  onChange: (id: string) => void;
  disabledValue: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <label className="text-xs uppercase tracking-wide text-muted">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none"
      >
        <option value="">— pick an analysis —</option>
        {jobs.map((j) => (
          <option
            key={j.job_id}
            value={j.job_id}
            disabled={j.job_id === disabledValue}
          >
            {(j.filename ?? "(text)") +
              " · " +
              (j.result?.contract_type ?? "") +
              " · " +
              new Date(j.created_at).toLocaleDateString()}
          </option>
        ))}
      </select>
    </div>
  );
}

function ComparePanel({ job }: { job: JobStatusResponse }) {
  const result = job.result as AnalysisResult;
  const band = riskBand(result.risk_score);
  const countsBySeverity: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const f of result.red_flags) countsBySeverity[f.severity] += 1;

  return (
    <div className="rounded-xl border border-border bg-surface/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted truncate">
            {job.filename ?? "(text)"}
          </p>
          <h3 className="mt-1 text-lg font-semibold truncate">
            {result.contract_type}
          </h3>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums"
          style={{
            color: band.color,
            borderColor: band.color,
            backgroundColor: `${band.color}1f`,
          }}
        >
          {result.risk_score}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {result.overall_summary}
      </p>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Flags by severity
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[])
            .sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])
            .map((sev) => (
              <li key={sev} className={"flex items-center gap-2 " + severityColor[sev]}>
                <span aria-hidden>{severityEmoji[sev]}</span>
                <span>{sev}</span>
                <span className="ml-auto tabular-nums">
                  {countsBySeverity[sev]}
                </span>
              </li>
            ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Missing protections
        </p>
        {result.missing_protections.length === 0 ? (
          <p className="mt-1 text-sm text-muted">None flagged.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {result.missing_protections.slice(0, 6).map((m, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-accent">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.truncated && (
        <div className="mt-4">
          <Badge>Truncated</Badge>
        </div>
      )}
    </div>
  );
}
