"use client";

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { severityLabel } from "@/lib/severity";
import { SEVERITY_ORDER, type RedFlag, type Severity } from "@/lib/schemas";

interface FlagListProps {
  flags: RedFlag[];
  onSelect?: (flag: RedFlag, index: number) => void;
  activeIndex?: number | null;
  /**
   * "cards" (default) — each flag is a rounded, bordered card on its
   *   own row, suitable for standalone sections (e.g. /demo).
   *
   * "embedded" — each flag is a full-bleed severity-tinted row
   *   separated by `border-t border-ink-800/10` dividers, designed to
   *   sit inside a larger shared container (the consolidated findings
   *   column on /analyze and /analysis/[id]). Severity group headers
   *   become tighter inline bars instead of loose label rows.
   */
  variant?: "cards" | "embedded";
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_ICON: Record<Severity, React.ElementType> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: AlertCircle,
  LOW: Info,
};

// Soft, hand-tuned severity tints that read as "emphasized beige" rather
// than full severity panels. Each card's background communicates the
// severity via warm-neutral tinting; the explicit left-stripe accent is
// gone now that the whole card carries the signal.
const SEVERITY_CARD: Record<Severity, string> = {
  CRITICAL: "bg-[#F8EAEA] border-[#E9CBCB]",
  HIGH: "bg-[#F5E6D6] border-[#E3C7A8]",
  MEDIUM: "bg-[#F6EDCD] border-[#E2D6A2]",
  LOW: "bg-[#E8F0E5] border-[#C6D7BE]",
};

// Pill chip (e.g. "CRITICAL" label) sitting inside each card — slightly
// darker tint than the card bg, paired with a deeper severity-accent
// text color so it still reads as the canonical severity without the
// high-contrast red/orange blocks of the workspace palette.
const SEVERITY_PILL: Record<Severity, string> = {
  CRITICAL: "bg-[#EDD0D0] text-[#A82020]",
  HIGH: "bg-[#EDDAC0] text-[#A56A20]",
  MEDIUM: "bg-[#E8D998] text-[#8A6D1A]",
  LOW: "bg-[#CCDCC3] text-[#3C7428]",
};

// Severity-accent text — used for the severity-group heading label and
// the icon on the left of each card. Same hex as the pill text so the
// card reads with a single consistent accent hue.
const SEVERITY_ACCENT_TEXT: Record<Severity, string> = {
  CRITICAL: "text-[#A82020]",
  HIGH: "text-[#A56A20]",
  MEDIUM: "text-[#8A6D1A]",
  LOW: "text-[#3C7428]",
};

export default function FlagList({
  flags,
  onSelect,
  activeIndex,
  variant = "cards",
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

  // Empty-state card — same visuals in both variants. When embedded we
  // reduce side padding and drop the outer rounded corners so the sage
  // tint reads as a section row inside the shared container.
  if (flags.length === 0) {
    return (
      <div
        className={cn(
          "bg-[#E8F0E5] text-center",
          variant === "embedded"
            ? "px-6 py-8 border-t border-[#C6D7BE]"
            : "rounded-md border border-[#C6D7BE] p-8",
        )}
      >
        <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#CCDCC3] text-[#3C7428]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm font-medium text-ink-800">
          No red flags detected
        </p>
        <p className="mt-1 text-xs text-ink-600">
          This contract is in the clear on our known risk patterns.
        </p>
      </div>
    );
  }

  // ── Embedded variant ────────────────────────────────────────────────────
  // Full-bleed severity-tinted rows inside the shared findings container.
  // - Severity group headers: slim inline bars with severity-accent label,
  //   no bordered card.
  // - Flag rows: severity tint background, `border-t border-ink-800/10`
  //   between adjacent rows, no individual rounded corners.
  // `card-flag-${i}` ID stays on the <button> so Fix 4 click-to-jump +
  // the `.flag-flash` box-shadow animation keep working verbatim.
  if (variant === "embedded") {
    return (
      <div>
        {SEVERITIES.map((sev) => {
          const items = grouped[sev];
          if (items.length === 0) return null;
          const Icon = SEVERITY_ICON[sev];
          return (
            <React.Fragment key={sev}>
              {/* Severity group header — tight inline bar */}
              <div className="flex items-center gap-2 border-t border-ink-800/10 bg-beige-100/70 px-6 py-2 first:border-t-0">
                <Icon
                  className={cn("h-3.5 w-3.5", SEVERITY_ACCENT_TEXT[sev])}
                />
                <h3
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.12em]",
                    SEVERITY_ACCENT_TEXT[sev],
                  )}
                >
                  {severityLabel[sev]}
                </h3>
                <span className="inline-flex items-center bg-ink-800 text-beige-50 px-2 py-0.5 text-[11px] font-medium tabular-nums">
                  {items.length}
                </span>
              </div>
              {items.map(({ flag, originalIndex }) => {
                const isActive = activeIndex === originalIndex;
                return (
                  <button
                    key={`${sev}-${originalIndex}`}
                    type="button"
                    // ID kept on the row itself — Fix 4 scroll+flash on
                    // the .flag-flash animation reads cleanly on
                    // non-rounded row buttons (box-shadow outline pulse
                    // stays legible).
                    id={`card-flag-${originalIndex}`}
                    onClick={() => onSelect?.(flag, originalIndex)}
                    className={cn(
                      "group relative block w-full border-t border-ink-800/10 px-6 py-4 text-left transition-colors",
                      SEVERITY_CARD[sev].split(" ")[0], // just bg, drop border
                      "hover:brightness-[0.98]",
                      isActive &&
                        "ring-2 ring-inset ring-ink-800/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          SEVERITY_ACCENT_TEXT[sev],
                        )}
                        strokeWidth={2.25}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                              SEVERITY_PILL[sev],
                            )}
                          >
                            {severityLabel[sev]}
                          </span>
                        </div>
                        <p className="mt-2 text-[15px] font-medium leading-[1.4] text-ink-800">
                          “{truncate(flag.clause, 160)}”
                        </p>
                        <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-700">
                          {flag.explanation}
                        </p>
                        {flag.page != null && (
                          <span className="mt-2 inline-flex items-center gap-1.5 border border-ink-800/10 bg-beige-50 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                            Page {flag.page}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 flex-shrink-0 text-ink-600 transition-all",
                          "group-hover:translate-x-0.5 group-hover:text-ink-800",
                          isActive && "text-ink-800",
                        )}
                      />
                    </div>
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // ── Cards variant (default) — used by /demo ─────────────────────────────
  return (
    <div className="space-y-6">
      {SEVERITIES.map((sev) => {
        const items = grouped[sev];
        if (items.length === 0) return null;
        const Icon = SEVERITY_ICON[sev];
        return (
          <section key={sev}>
            <div className="mb-3 flex items-center gap-2">
              <Icon className={cn("h-3.5 w-3.5", SEVERITY_ACCENT_TEXT[sev])} />
              <h3
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.12em]",
                  SEVERITY_ACCENT_TEXT[sev],
                )}
              >
                {severityLabel[sev]}
              </h3>
              <span className="inline-flex items-center bg-ink-800 text-beige-50 px-2 py-0.5 text-[11px] font-medium tabular-nums">
                {items.length}
              </span>
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
                        "group w-full text-left rounded-md border p-4 transition-all",
                        SEVERITY_CARD[sev],
                        "hover:-translate-y-px hover:shadow-panel",
                        isActive &&
                          "ring-2 ring-ink-800/40 ring-offset-2 ring-offset-beige-100",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={cn(
                            "mt-0.5 h-4 w-4 flex-shrink-0",
                            SEVERITY_ACCENT_TEXT[sev],
                          )}
                          strokeWidth={2.25}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                                SEVERITY_PILL[sev],
                              )}
                            >
                              {severityLabel[sev]}
                            </span>
                          </div>
                          <p className="mt-2 text-[15px] font-medium leading-[1.4] text-ink-800">
                            “{truncate(flag.clause, 160)}”
                          </p>
                          <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-700">
                            {flag.explanation}
                          </p>
                          {flag.page != null && (
                            <span className="mt-2 inline-flex items-center gap-1.5 border border-ink-800/10 bg-beige-50 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-600">
                              Page {flag.page}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 flex-shrink-0 text-ink-600 transition-all",
                            "group-hover:translate-x-0.5 group-hover:text-ink-800",
                            isActive && "text-ink-800",
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
