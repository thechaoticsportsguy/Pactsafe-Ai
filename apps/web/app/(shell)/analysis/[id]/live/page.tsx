"use client";

/**
 * Live-scan replay page.
 *
 * Loads a completed (or in-progress) analysis and mounts
 * `LiveScanReview` so the user can "watch" the AI scan the contract
 * clause-by-clause with the demo's cinematic vibe.
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LiveScanReview from "@/components/LiveScanReview";
import { getJob, subscribeToJob } from "@/lib/api";
import type { JobStatusResponse } from "@/lib/schemas";
import { buildHighlights, isEmptyAnalysis } from "@/lib/review";

export default function LiveScanPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = React.useState<JobStatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!jobId) return;
    let alive = true;
    getJob(jobId)
      .then((j) => alive && setJob(j))
      .catch((e) =>
        alive && setError(e instanceof Error ? e.message : String(e)),
      );

    const unsub = subscribeToJob(
      jobId,
      (ev) => {
        if (!alive) return;
        setJob((prev) =>
          prev
            ? {
                ...prev,
                status: ev.status ?? prev.status,
                result: ev.partial ?? prev.result,
              }
            : prev,
        );
      },
      () => {
        if (alive) getJob(jobId).then(setJob).catch(() => {});
      },
    );

    return () => {
      alive = false;
      unsub();
    };
  }, [jobId]);

  const result = job?.result ?? null;
  const text = job?.text_preview ?? "";

  const { items } = React.useMemo(
    () => buildHighlights(result, text),
    [result, text],
  );

  const emptyResult = !!result && isEmptyAnalysis(result);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-severity-critical" />
        <h1 className="mt-3 text-lg font-semibold">
          Couldn&rsquo;t load live scan
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">{error}</p>
        <Link href={`/analysis/${jobId ?? ""}`} className="mt-4">
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to report
          </Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-foreground-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading live scan…
      </div>
    );
  }

  if (emptyResult) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-warning/40 bg-warning/[0.06] p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning ring-1 ring-warning/30">
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Nothing to replay yet
              </h2>
              <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
                This analysis came back without any flagged clauses, so
                there&rsquo;s nothing for the live scanner to highlight. Run
                a fresh analysis or view the pre-baked sample report.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/analyze">
                  <Button size="sm">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run a new analysis
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="sm" variant="outline">
                    See a sample scan
                  </Button>
                </Link>
                <Link href={`/analysis/${jobId}`}>
                  <Button size="sm" variant="ghost">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back to report
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-5 md:px-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/analysis/${jobId}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to report
          </Button>
        </Link>
        <div className="h-5 w-px bg-border/60" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground-subtle">
            Live scan replay
          </p>
          <h1 className="text-[15px] font-semibold text-foreground">
            {job.filename ?? "Pasted contract"}
          </h1>
        </div>
      </div>

      <LiveScanReview
        items={items}
        text={text}
        filename={job.filename}
        autoStart
      />
    </div>
  );
}
