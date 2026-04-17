import Link from "next/link";
import { FileSearch, ArrowRight, Home } from "lucide-react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/primitives/Button";
import { Badge } from "@/components/primitives/Badge";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1 bg-beige-100">
        <div className="container-app relative flex flex-col items-center justify-center py-24 text-center md:py-32">
          <Badge variant="eyebrow">404 · not found</Badge>
          <div className="mt-8 inline-flex h-16 w-16 items-center justify-center bg-ink-800 text-beige-50">
            <FileSearch className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h1 className="mt-6 text-[40px] font-medium tracking-tightest text-ink-800 md:text-display md:leading-[1]">
            This page wandered off.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-600 md:text-body-lg">
            Either the link is stale or we broke something. Nothing dramatic —
            head back home and start a fresh analysis.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/">
              <Button
                palette="editorial"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Home className="h-4 w-4" />
                Back home
              </Button>
            </Link>
            <Link href="/analyze">
              <Button
                palette="editorial"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Analyze a contract
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-10 text-xs text-ink-500">
            Still stuck?{" "}
            <Link
              href="/contact"
              className="text-ink-800 underline decoration-ink-800/35 underline-offset-2 hover:decoration-ink-800/85"
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
