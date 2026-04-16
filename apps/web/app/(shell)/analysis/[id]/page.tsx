"use client";

/**
 * /analysis/[id] — shareable report URL.
 *
 * Thin wrapper around `AnalysisReport`: fetches the job, subscribes to
 * progress events, and hands the completed result to the reusable
 * report component. No section state, no toolbar logic, and no scroll
 * container lives here — all of that belongs to AnalysisReport.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalysisReport from "@/components/AnalysisReport";
import UploadProgress from "@/components/UploadProgress";
import { getJob, subscribeToJob } from "@/lib/api";
import { normalizeJobStatus } from "@/lib/review";
import type { JobStatusResponse } from "@/lib/schemas";

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const j = await getJob(jobId);
        setJob(normalizeJobStatus(j) ?? j);
        if (j.status !== "completed" && j.status !== "failed") {
          cleanup = subscribeToJob(
            jobId,
            (ev) => {
              setJob((prev) => {
                if (!prev) return prev;
                const merged: JobStatusResponse = {
                  ...prev,
                  status: ev.status,
                  result: ev.partial ?? prev.result,
                };
                return normalizeJobStatus(merged) ?? merged;
              });
              if (ev.status === "completed" || ev.status === "failed") {
                getJob(jobId)
                  .then((fresh) => setJob(normalizeJobStatus(fresh) ?? fresh))
                  .catch(() => {});
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

  // --- Error ---------------------------------------------------------------
  if (error) {
    return (
      <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-severity-critical mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-severity-critical">
              Could not load analysis
            </h2>
            <p className="mt-1 text-sm text-foreground/80">{error}</p>
            <div className="mt-3 flex gap-2">
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back to history
                </Button>
              </Link>
              <Link href="/analyze">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Initial loading -----------------------------------------------------
  if (!job) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-32 w-full md:col-span-2" />
          <div className="skeleton h-32 w-full" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  // --- Still running / failed ---------------------------------------------
  const stillRunning =
    job.status !== "completed" && job.status !== "failed";

  if (stillRunning) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All analyses
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Live scan in progress — streaming results from the model.
        </div>
        <UploadProgress
          status={job.status}
          message="Analyzing your contract…"
          progress={job.status === "analyzing" ? 0.6 : 0.25}
        />
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-foreground-muted">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All analyses
          </Link>
        </div>
        <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-severity-critical mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-severity-critical">
                Analysis failed
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {job.error ??
                  "Something went wrong processing your contract."}
              </p>
              <div className="mt-3">
                <Link href="/analyze">
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Completed -----------------------------------------------------------
  if (!job.result) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-6 text-sm text-foreground-muted">
        Analysis finished but no result payload was returned.
      </div>
    );
  }

  return (
    <AnalysisReport
      jobId={jobId}
      result={job.result}
      filename={job.filename}
      createdAt={job.created_at}
      textPreview={job.text_preview}
      showBreadcrumb
      copyWindowHref
    />
  );
}
