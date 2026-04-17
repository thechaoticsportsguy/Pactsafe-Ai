import * as React from "react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Badge } from "@/components/primitives/Badge";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for prose-heavy pages (privacy, terms).
 * Handles TopNav + Footer, the hero, and wraps content in a typographic
 * container. Each caller provides MDX-like children.
 *
 * Editorial palette: cream bg, ink-800 headlines, ink-500 meta. The
 * prose-legal class in globals.css handles body typography; keep the
 * two in sync.
 */
export default function LegalShell({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: LegalShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="editorial" />
      <main className="flex-1 bg-beige-100">
        <div className="container-app pt-16 pb-6 md:pt-24">
          <Badge variant="eyebrow">{eyebrow}</Badge>
          <h1 className="mt-5 max-w-3xl text-3xl font-medium tracking-tightest text-ink-800 md:text-h1 md:leading-[1.05]">
            {title}
          </h1>
          <p className="mt-5 text-xs tabular-nums text-ink-500">
            Last updated · {updated}
          </p>
          {intro && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-600 md:text-body-lg">
              {intro}
            </p>
          )}
        </div>
        <div className="container-app pb-24">
          <div className="mb-12 h-px w-full bg-ink-800/10" />
          <article className="prose-legal max-w-3xl">{children}</article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
