"use client";

/**
 * Stat — the big-number + uppercase-label block used in the hero
 * stats row, metric tiles, and workspace sidebar summaries.
 *
 * Deliberately palette-agnostic. Defaults render correctly on beige
 * (editorial) because text-ink-800 / text-ink-500 live in the unified
 * palette. On dark surfaces pass `palette="workspace"` to get
 * foreground tokens instead.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg";
type Palette = "editorial" | "workspace";

export interface StatProps {
  value: React.ReactNode;
  label: React.ReactNode;
  size?: Size;
  palette?: Palette;
  className?: string;
}

const valueSize: Record<Size, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

const labelSize: Record<Size, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-[12px]",
};

const palettes: Record<Palette, { value: string; label: string }> = {
  editorial: {
    value: "text-ink-800 tabular-nums",
    label: "text-ink-500",
  },
  workspace: {
    value: "text-foreground tabular-nums",
    label: "text-foreground-muted",
  },
};

export function Stat({
  value,
  label,
  size = "md",
  palette = "editorial",
  className,
}: StatProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(
          "font-medium tracking-tight",
          valueSize[size],
          palettes[palette].value,
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          "mt-1 font-medium uppercase tracking-[0.15em]",
          labelSize[size],
          palettes[palette].label,
        )}
      >
        {label}
      </div>
    </div>
  );
}
