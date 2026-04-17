"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook up to observability here when we add it
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1 bg-hero relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035] bg-grid-dot"
        />
        <div className="container-app flex flex-col items-center justify-center py-24 md:py-32 text-center relative">
          <Badge tone="critical" size="xs">
            <AlertOctagon className="h-3 w-3" />
            Something broke
          </Badge>
          <div className="mt-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-severity-critical/10 ring-1 ring-severity-critical/30">
            <AlertOctagon
              className="h-8 w-8 text-severity-critical"
              strokeWidth={1.75}
            />
          </div>
          <h1 className="mt-6 text-[40px] md:text-[56px] md:leading-[1.02] font-semibold tracking-tightest text-gradient">
            That didn&rsquo;t go as planned.
          </h1>
          <p className="mt-4 max-w-lg text-base text-foreground-muted leading-relaxed">
            An unexpected error occurred while rendering this page. It&rsquo;s
            probably not your fault. You can retry, head home, or tell us
            what you were doing.
          </p>

          {error.digest && (
            <p className="mt-4 font-mono text-[11px] text-foreground-subtle">
              Reference: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button size="lg" variant="outline" onClick={() => reset()}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Link href="/">
              <Button size="lg">
                <Home className="h-4 w-4" />
                Back home
              </Button>
            </Link>
          </div>
          <p className="mt-10 text-xs text-foreground-subtle">
            Keeps happening?{" "}
            <Link
              href="/contact"
              className="text-accent hover:underline underline-offset-2"
            >
              Let us know
            </Link>{" "}
            — we log every error.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
