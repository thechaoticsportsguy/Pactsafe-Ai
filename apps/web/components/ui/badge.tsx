import * as React from "react";
import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "critical"
  | "high"
  | "medium"
  | "low";

type Size = "xs" | "sm";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

const tones: Record<Tone, string> = {
  neutral: "border-border bg-surface-2/80 text-foreground/80",
  accent: "border-accent/40 bg-accent/12 text-accent",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  critical: "border-severity-critical/50 bg-severity-critical/10 text-severity-critical",
  high: "border-severity-high/50 bg-severity-high/10 text-severity-high",
  medium: "border-severity-medium/50 bg-severity-medium/10 text-severity-medium",
  low: "border-severity-low/50 bg-severity-low/10 text-severity-low",
};

const sizes: Record<Size, string> = {
  xs: "h-5 px-1.5 text-[10px] gap-1",
  sm: "h-6 px-2 text-[11px] gap-1.5",
};

export function Badge({
  className,
  tone = "neutral",
  size = "sm",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium uppercase tracking-wide",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
