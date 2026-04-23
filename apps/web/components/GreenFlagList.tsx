"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import type { GreenFlag } from "@/lib/schemas";
import { cn } from "@/lib/cn";

interface GreenFlagListProps {
  flags: GreenFlag[];
  /**
   * "cards" (default) — two-column grid of sage-tinted cards, used by
   *   standalone sections (/demo).
   *
   * "embedded" — full-bleed sage-tinted rows separated by
   *   `border-t border-ink-800/10` dividers for the consolidated
   *   findings column on /analyze and /analysis/[id].
   */
  variant?: "cards" | "embedded";
}

export default function GreenFlagList({
  flags,
  variant = "cards",
}: GreenFlagListProps) {
  if (flags.length === 0) {
    return (
      <div
        className={cn(
          "text-[13px] leading-[1.55] text-ink-700",
          variant === "embedded"
            ? "bg-beige-50 px-6 py-5"
            : "rounded-md border border-ink-800/10 bg-beige-50 p-6",
        )}
      >
        No explicitly protective clauses identified — but that doesn&rsquo;t
        mean the contract is bad, just that it&rsquo;s neutral.
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div>
        {flags.map((f, i) => (
          <div
            key={i}
            className="group border-t border-ink-800/10 bg-[#E8F0E5] px-6 py-4 transition-colors first:border-t-0 hover:brightness-[0.98]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#CCDCC3] text-[#3C7428]">
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center bg-[#CCDCC3] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3C7428]">
                    In your favor
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-medium leading-[1.4] text-ink-800">
                  {truncate(f.clause, 140)}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-700">
                  {f.explanation}
                </p>
                {f.page != null && (
                  <span className="mt-2 inline-flex items-center border border-ink-800/10 bg-beige-50 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                    Page {f.page}
                  </span>
                )}
              </div>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#3C7428]/60 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {flags.map((f, i) => (
        <li
          key={i}
          className="group rounded-md border border-[#C6D7BE] bg-[#E8F0E5] p-4 transition-all hover:-translate-y-px hover:shadow-panel"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#CCDCC3] text-[#3C7428]">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center bg-[#CCDCC3] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3C7428]">
                  In your favor
                </span>
              </div>
              <p className="mt-2 text-[15px] font-medium leading-[1.4] text-ink-800">
                {truncate(f.clause, 140)}
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-700">
                {f.explanation}
              </p>
              {f.page != null && (
                <span className="mt-2 inline-flex items-center border border-ink-800/10 bg-beige-50 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                  Page {f.page}
                </span>
              )}
            </div>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#3C7428]/60 opacity-0 transition-opacity group-hover:opacity-100" />
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
