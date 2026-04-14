"use client";

import * as React from "react";
import Link from "next/link";
import { GitCompare, FileText, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listJobs } from "@/lib/api";
import type {
  AnalysisResult,
  JobStatusResponse,
} from "@/lib/schemas";
import {
  riskBand,
  severityColor,
} from "@/lib/severity";
import { SEVERITY_ORDER, type Severity } from "@/lib/schemas";
import { cn } from "@/lib/cn";

export default function ComparePage() {
  const [jobs, setJobs] = React.useState<JobStatusResponse[] | null>(null);
  const [leftId, setLeftId] = React.useState<string | "">("");
  const [rightId, setRightId] = React.useState<string | "">("");

  React.useEffect(() => {
    listJobs(100)
      .then((all) =>
        setJobs(all.filter((j) => j.status === "completed" && j.result)),
      )
      .catch(() => setJobs([]));
  }, []);

  const left = jobs?.find((j) => j.job_id === leftId) ?? null;
  const right = jobs?.find((j) => j.job_id === rightId) ?? null;

  if (!jobs) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-1/3" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Badge tone="accent" size="xs" className="mb-3">
          <GitCompare className="h-3 w-3" />
          Side by side
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Compare contracts
        </h1>
        <p className="mt-2 text-sm text-foreground-muted max-w-2xl">
          Pick two completed analyses to see risk scores, flag counts, and
          missing protections side by side — great for comparing two versions
          of the same deal.
        </p>
      </div>

      {jobs.length < 2 ? (
        <div className="rounded-2xl border border-border bg-surface/40 px-6 py-16 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-foreground">
            Need at least two analyses to compare
          </h3>
          <p className="mt-2 text-sm text-foreground-muted max-w-sm mx-auto">
            Once you have two completed contracts in your history, come back
            here to see them side by side.
          </p>
          <div className="mt-6">
            <Link href="/analyze">
              <Button>
                Analyze a contract
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
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

      {(leftId || rightId) && !(left && right) && jobs.length >= 2 && (
        <p className="text-xs text-foreground-muted">
          Pick both contracts to see the comparison.
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
    <div className="rounded-xl border border-border bg-surface/60 p-5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </label>
      <div className="relative mt-2">
        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-border bg-surface pl-9 pr-9 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
        >
          <option value="">— choose an analysis —</option>
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
    <div className="rounded-2xl border border-border bg-surface/70 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted truncate">
            {job.filename ?? "(text)"}
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight truncate">
            {result.contract_type}
          </h3>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tabular-nums"
          style={{
            color: band.color,
            borderColor: `${band.color}66`,
            backgroundColor: `${band.color}14`,
          }}
        >
          {result.risk_score}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/85 line-clamp-4">
        {result.overall_summary}
      </p>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          Flags by severity
        </p>
        <ul className="mt-3 space-y-2">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[])
            .sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])
            .map((sev) => (
              <li
                key={sev}
                className="flex items-center gap-2.5 text-sm"
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    severityColor[sev].replace("text-", "bg-"),
                  )}
                  aria-hidden
                />
                <span className="capitalize text-foreground/85">
                  {sev.toLowerCase()}
                </span>
                <span className="ml-auto tabular-nums font-medium text-foreground">
                  {countsBySeverity[sev]}
                </span>
              </li>
            ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          Missing protections
        </p>
        {result.missing_protections.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">
            None flagged.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {result.missing_protections.slice(0, 6).map((m, i) => (
              <li key={i} className="flex gap-2 text-foreground/85">
                <span aria-hidden className="mt-1.5 h-1 w-1 rounded-full bg-warning flex-shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.truncated && (
        <div className="mt-5">
          <Badge tone="warning" size="xs">
            Truncated
          </Badge>
        </div>
      )}
    </div>
  );
}
