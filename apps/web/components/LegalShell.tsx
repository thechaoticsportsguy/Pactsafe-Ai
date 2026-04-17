import * as React from "react";
import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  updated: string;
  intro?: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for prose-heavy pages (privacy, terms, security, contact).
 * Handles TopNav + Footer, the hero, and wraps content in a typographic
 * container. Each caller provides MDX-like children.
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
      <main className="flex-1 bg-section">
        <div className="container-app pt-16 md:pt-24 pb-6">
          <Badge tone="accent" size="xs">
            {eyebrow}
          </Badge>
          <h1 className="mt-4 text-3xl md:text-[48px] md:leading-[1.05] font-semibold tracking-tight text-gradient max-w-3xl">
            {title}
          </h1>
          <p className="mt-4 text-xs text-foreground-subtle tabular-nums">
            Last updated · {updated}
          </p>
          {intro && (
            <p className="mt-6 max-w-2xl text-base text-foreground-muted leading-relaxed">
              {intro}
            </p>
          )}
        </div>
        <div className="container-app pb-24">
          <div className="hairline mb-12" />
          <article className="max-w-3xl prose-legal">{children}</article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
