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

export const severityEmoji: Record<Severity, string> = {
  LOW: "🟢",
  MEDIUM: "🟡",
  HIGH: "🔴",
  CRITICAL: "💀",
};

export function riskBand(score: number): {
  color: string;
  label: string;
  cssVar: string;
} {
  if (score <= 30) return { color: "#22c55e", label: "LOW RISK", cssVar: "low" };
  if (score <= 60)
    return { color: "#eab308", label: "MODERATE RISK", cssVar: "medium" };
  if (score <= 80)
    return { color: "#f97316", label: "HIGH RISK", cssVar: "high" };
  return { color: "#ef4444", label: "CRITICAL RISK", cssVar: "critical" };
}
