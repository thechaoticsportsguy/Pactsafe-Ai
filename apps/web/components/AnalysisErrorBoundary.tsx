"use client";

/**
 * AnalysisErrorBoundary — local safety net around the analysis results UI.
 *
 * The root `app/error.tsx` boundary shows "That didn't go as planned." for
 * any uncaught render error, which is the wrong UX for a scan that
 * otherwise completed successfully. A malformed flag, a nullish array the
 * normalizer couldn't heal, or a missing optional field should show a
 * graceful fallback with retry — not blow away the whole layout.
 *
 * Wrap every call site of `<AnalysisReport />` in this boundary. Between
 * this and the defensive guards inside the report components, the user
 * should never lose the analysis view to a render crash.
 */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/primitives/Button";

interface AnalysisErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional override for the retry action — defaults to resetting local state. */
  onRetry?: () => void;
}

interface AnalysisErrorBoundaryState {
  error: Error | null;
}

export default class AnalysisErrorBoundary extends React.Component<
  AnalysisErrorBoundaryProps,
  AnalysisErrorBoundaryState
> {
  constructor(props: AnalysisErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AnalysisErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surfaces in the browser console but never reaches the root boundary.
    console.error("[AnalysisErrorBoundary]", error, info);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning ring-1 ring-warning/30">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-100">
              We hit a snag displaying your report
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed max-w-2xl">
              The analysis finished, but we couldn&rsquo;t render it cleanly.
              This is almost always fixed by retrying. Your contract text is
              never stored client-side, so nothing is lost.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                palette="workspace"
                variant="primary"
                size="sm"
                radius="md"
                onClick={this.handleRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
              <Link href="/analyze">
                <Button palette="workspace" variant="secondary" size="sm" radius="md">
                  Run a new analysis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
