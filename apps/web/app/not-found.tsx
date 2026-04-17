import Link from "next/link";
import { FileSearch, ArrowRight, Home, Sparkles } from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1 bg-hero relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035] bg-grid-dot"
        />
        <div className="container-app flex flex-col items-center justify-center py-24 md:py-32 text-center relative">
          <Badge tone="accent" size="xs">
            <Sparkles className="h-3 w-3" />
            404 · not found
          </Badge>
          <div className="mt-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/30">
            <FileSearch
              className="h-8 w-8 text-accent"
              strokeWidth={1.75}
            />
          </div>
          <h1 className="mt-6 text-[40px] md:text-[64px] md:leading-[1] font-semibold tracking-tightest text-gradient">
            This page wandered off.
          </h1>
          <p className="mt-4 max-w-lg text-base text-foreground-muted leading-relaxed">
            Either the link is stale or we broke something. Nothing dramatic —
            head back to the dashboard and start a fresh analysis.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/">
              <Button size="lg" variant="outline">
                <Home className="h-4 w-4" />
                Back home
              </Button>
            </Link>
            <Link href="/analyze">
              <Button size="lg">
                Analyze a contract
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-10 text-xs text-foreground-subtle">
            Still stuck?{" "}
            <Link
              href="/contact"
              className="text-accent hover:underline underline-offset-2"
            >
              Tell us what you were looking for
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
