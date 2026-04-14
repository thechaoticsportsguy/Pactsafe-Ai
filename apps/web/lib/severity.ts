import type { Severity } from "./schemas";

/**
 * Severity-related visual helpers.
 * Colors match tailwind.config.ts `severity.*` tokens.
 */
export const severityColor: Record<Severity, string> = {
  LOW: "text-severity-low",
  MEDIUM: "text-severity-medium",
  HIGH: "text-severity-high",
  CRITICAL: "text-severity-critical",
};

export const severityBg: Record<Severity, string> = {
  LOW: "bg-severity-low/10 border-severity-low/40",
  MEDIUM: "bg-severity-medium/10 border-severity-medium/40",
  HIGH: "bg-severity-high/10 border-severity-high/40",
  CRITICAL: "bg-severity-critical/10 border-severity-critical/40",
};

export const severityRing: Record<Severity, string> = {
  LOW: "ring-severity-low/40",
  MEDIUM: "ring-severity-medium/40",
  HIGH: "ring-severity-high/40",
  CRITICAL: "ring-severity-critical/40",
};

/** Short human label for each severity. */
export const severityLabel: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/**
 * Kept for backwards compatibility with any caller still rendering an emoji
 * badge. New code should prefer <Badge tone=... /> from components/ui/badge.
 */
export const severityEmoji: Record<Severity, string> = {
  LOW: "•",
  MEDIUM: "•",
  HIGH: "•",
  CRITICAL: "•",
};

export function riskBand(score: number): {
  color: string;
  label: string;
  cssVar: string;
} {
  if (score <= 30)
    return { color: "#10b981", label: "Low risk", cssVar: "low" };
  if (score <= 60)
    return { color: "#eab308", label: "Moderate", cssVar: "medium" };
  if (score <= 80)
    return { color: "#f97316", label: "High risk", cssVar: "high" };
  return { color: "#ef4444", label: "Critical", cssVar: "critical" };
}
