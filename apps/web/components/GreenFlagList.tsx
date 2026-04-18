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
      <div className="rounded-md border border-white/5 bg-surface-1 p-6 text-sm text-zinc-400">
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
          className="group rounded-md border border-white/5 border-l-2 border-l-success/60 bg-surface-1 p-4 transition-all hover:bg-surface-2 hover:-translate-y-px"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-zinc-100">
                <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  In your favor
                </span>
                <span className="text-zinc-400">·</span>{" "}
                <span className="text-zinc-200">
                  {truncate(f.clause, 140)}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                {f.explanation}
              </p>
              {f.page != null && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
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
