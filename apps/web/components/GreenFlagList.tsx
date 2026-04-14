"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import type { GreenFlag } from "@/lib/schemas";

interface GreenFlagListProps {
  flags: GreenFlag[];
}

export default function GreenFlagList({ flags }: GreenFlagListProps) {
  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface/40 p-6 text-sm text-foreground-muted">
        No explicitly protective clauses identified — but that doesn't mean
        the contract is bad, just that it's neutral.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {flags.map((f, i) => (
        <li
          key={i}
          className="group rounded-xl border border-success/30 bg-success/[0.06] p-4 transition-colors hover:bg-success/[0.08]"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  In your favor
                </span>
                <span className="text-foreground-muted">·</span>{" "}
                <span className="text-foreground/95">
                  {truncate(f.clause, 140)}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed">
                {f.explanation}
              </p>
              {f.page != null && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-foreground-subtle">
                  Page {f.page}
                </p>
              )}
            </div>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
