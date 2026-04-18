"use client";

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { severityColor, severityLabel } from "@/lib/severity";
import { SEVERITY_ORDER, type RedFlag, type Severity } from "@/lib/schemas";
import { Badge, type SeverityLevel } from "@/components/primitives/Badge";

interface FlagListProps {
  flags: RedFlag[];
  onSelect?: (flag: RedFlag, index: number) => void;
  activeIndex?: number | null;
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_ICON: Record<Severity, React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Info,
};

// Maps Severity (screaming-case, matches schema) → primitives/Badge level.
const SEVERITY_LEVEL: Record<Severity, SeverityLevel> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

// Severity accent for the flag-card left border. Phase 1's severity-{level}-
// accent nested tokens. Read as the severity signal — the card body is
// flat surface-1 so the accent reads loud without background tinting.
const SEVERITY_BORDER: Record<Severity, string> = {
  CRITICAL: "border-l-severity-critical-accent",
  HIGH: "border-l-severity-high-accent",
  MEDIUM: "border-l-severity-medium-accent",
  LOW: "border-l-severity-low-accent",
};

// Small tinted bubble behind the severity icon on each card — kept as a
// second signal but confined to a 32px square so it doesn't dilute the
// border accent.
const SEVERITY_ICON_BG: Record<Severity, string> = {
  CRITICAL: "bg-severity-critical-bg",
  HIGH: "bg-severity-high-bg",
  MEDIUM: "bg-severity-medium-bg",
  LOW: "bg-severity-low-bg",
};

export default function FlagList({
  flags,
  onSelect,
  activeIndex,
}: FlagListProps) {
  const indexed = flags.map((f, i) => ({ flag: f, originalIndex: i }));
  indexed.sort(
    (a, b) =>
      SEVERITY_ORDER[a.flag.severity] - SEVERITY_ORDER[b.flag.severity],
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
      <div className="rounded-md border border-success/30 bg-success/10 p-8 text-center">
        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-100">
          No red flags detected
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          This contract is in the clear on our known risk patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {SEVERITIES.map((sev) => {
        const items = grouped[sev];
        if (items.length === 0) return null;
        const Icon = SEVERITY_ICON[sev];
        return (
          <section key={sev}>
            <div className="mb-3 flex items-center gap-2">
              <Icon className={cn("h-3.5 w-3.5", severityColor[sev])} />
              <h3
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  severityColor[sev],
                )}
              >
                {severityLabel[sev]}
              </h3>
              <Badge variant="severity" level={SEVERITY_LEVEL[sev]}>
                {items.length}
              </Badge>
            </div>
            <ul className="space-y-2.5">
              {items.map(({ flag, originalIndex }) => {
                const isActive = activeIndex === originalIndex;
                return (
                  <li key={`${sev}-${originalIndex}`}>
                    <button
                      type="button"
                      // `card-flag-${i}` is the jump target AnalysisReport
                      // scrolls+flashes when a highlight in the clause
                      // viewer is clicked. Index is paired with
                      // `highlight-flag-${i}` on the mark side.
                      id={`card-flag-${originalIndex}`}
                      onClick={() => onSelect?.(flag, originalIndex)}
                      className={cn(
                        "group w-full text-left rounded-md border border-white/5 border-l-2 bg-surface-1 p-4 transition-all",
                        SEVERITY_BORDER[sev],
                        "hover:bg-surface-2 hover:-translate-y-px",
                        isActive && "ring-2 ring-accent/60 ring-offset-2 ring-offset-background",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md",
                            SEVERITY_ICON_BG[sev],
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4", severityColor[sev])}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-zinc-100">
                            <span
                              className={cn(
                                "mr-1.5 text-[10px] font-bold uppercase tracking-wider",
                                severityColor[sev],
                              )}
                            >
                              {severityLabel[sev]}
                            </span>
                            <span className="text-zinc-400">·</span>{" "}
                            <span className="text-zinc-200">
                              “{truncate(flag.clause, 160)}”
                            </span>
                          </p>
                          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                            {flag.explanation}
                          </p>
                          {flag.page != null && (
                            <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
                              Page {flag.page}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 flex-shrink-0 text-zinc-500 transition-all",
                            "group-hover:text-zinc-100 group-hover:translate-x-0.5",
                            isActive && "text-accent",
                          )}
                        />
                      </div>
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
