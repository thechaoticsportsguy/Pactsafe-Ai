"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { severityBg, severityColor, severityEmoji } from "@/lib/severity";
import { SEVERITY_ORDER, type RedFlag, type Severity } from "@/lib/schemas";

interface FlagListProps {
  flags: RedFlag[];
  onSelect?: (flag: RedFlag, index: number) => void;
  activeIndex?: number | null;
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function FlagList({ flags, onSelect, activeIndex }: FlagListProps) {
  // Sort by severity (CRITICAL first), preserving original index for callbacks.
  const indexed = flags.map((f, i) => ({ flag: f, originalIndex: i }));
  indexed.sort(
    (a, b) => SEVERITY_ORDER[a.flag.severity] - SEVERITY_ORDER[b.flag.severity],
  );

  const grouped: Record<Severity, typeof indexed> = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };
  for (const item of indexed) {
    grouped[item.flag.severity].push(item);
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/70 p-8 text-center text-sm text-muted">
        No red flags detected in this contract. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SEVERITIES.map((sev) => {
        const items = grouped[sev];
        if (items.length === 0) return null;
        return (
          <section key={sev}>
            <h3
              className={cn(
                "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
                severityColor[sev],
              )}
            >
              <span aria-hidden>{severityEmoji[sev]}</span>
              {sev}
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                {items.length}
              </span>
            </h3>
            <ul className="space-y-2">
              {items.map(({ flag, originalIndex }) => {
                const isActive = activeIndex === originalIndex;
                return (
                  <li key={`${sev}-${originalIndex}`}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(flag, originalIndex)}
                      className={cn(
                        "w-full text-left rounded-lg border p-3 transition-colors",
                        severityBg[sev],
                        "hover:bg-surface-hi/60",
                        isActive && "ring-2 ring-accent",
                      )}
                    >
                      <p className="text-sm font-medium leading-snug">
                        “{truncate(flag.clause, 140)}”
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {flag.explanation}
                      </p>
                      {flag.page != null && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                          Page {flag.page}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}
