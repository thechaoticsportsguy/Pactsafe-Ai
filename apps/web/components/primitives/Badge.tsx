"use client";

/**
 * Badge — canonical eyebrow/severity/neutral pill for the redesign.
 *
 * Three variants serve distinct information patterns:
 *  • eyebrow  — solid ink on beige with 0.15em tracking + 11px.
 *               Used above hero headlines, section titles.
 *  • severity — takes level: 'critical' | 'high' | 'medium' | 'low'.
 *               Reads the nested severity palette; consistent across
 *               flag cards, risk gauge, sidebar counts.
 *  • neutral  — low-contrast label (counts, metadata).
 *
 * Legacy Badge at components/ui/badge.tsx stays for callers that
 * already import `tone={severity}`. New code: use `variant="severity"
 * level={severity}`.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

export type SeverityLevel = "critical" | "high" | "medium" | "low";

type Variant = "eyebrow" | "severity" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  /** Required when variant="severity". */
  level?: SeverityLevel;
}

// Severity pills: dark surface tint + lighter text for on-dark
// contexts (flag cards, sidebar). Sharp corners to match workspace
// card aesthetic.
const severityStyles: Record<SeverityLevel, string> = {
  critical:
    "bg-severity-critical-bg border-severity-critical-border text-severity-critical-text",
  high: "bg-severity-high-bg border-severity-high-border text-severity-high-text",
  medium:
    "bg-severity-medium-bg border-severity-medium-border text-severity-medium-text",
  low: "bg-severity-low-bg border-severity-low-border text-severity-low-text",
};

export function Badge({
  className,
  variant = "neutral",
  level,
  children,
  ...props
}: BadgeProps) {
  if (variant === "eyebrow") {
    return (
      <span
        className={cn(
          "inline-flex items-center bg-ink-800 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-beige-50",
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (variant === "severity") {
    const styles = level ? severityStyles[level] : severityStyles.medium;
    return (
      <span
        className={cn(
          "inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
          styles,
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  // neutral
  return (
    <span
      className={cn(
        "inline-flex items-center border border-border bg-surface-2/80 px-2 py-0.5 text-[11px] font-medium text-foreground/80",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
