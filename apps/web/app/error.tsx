"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/primitives/Button";

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
      <main className="flex-1 bg-beige-100">
        <div className="container-app relative flex flex-col items-center justify-center py-24 text-center md:py-32">
          {/* Danger eyebrow — inline editorial pill matching severity red on cream */}
          <span className="inline-flex items-center gap-1.5 border border-[#ef4444]/40 bg-[#ef4444]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#991b1b]">
            <AlertOctagon className="h-3 w-3" />
            Something broke
          </span>
          <div className="mt-8 inline-flex h-16 w-16 items-center justify-center border border-[#ef4444]/40 bg-[#ef4444]/10 text-[#991b1b]">
            <AlertOctagon className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h1 className="mt-6 text-[40px] font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.02]">
            That didn&rsquo;t go as planned.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-600 md:text-body-lg">
            An unexpected error occurred while rendering this page. It&rsquo;s
            probably not your fault. You can retry, head home, or tell us what
            you were doing.
          </p>

          {error.digest && (
            <p className="mt-4 font-mono text-[11px] text-ink-500">
              Reference: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              palette="editorial"
              variant="secondary"
              size="lg"
              onClick={() => reset()}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Link href="/">
              <Button
                palette="editorial"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Home className="h-4 w-4" />
                Back home
              </Button>
            </Link>
          </div>
          <p className="mt-10 text-xs text-ink-500">
            Keeps happening?{" "}
            <Link
              href="/contact"
              className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
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
