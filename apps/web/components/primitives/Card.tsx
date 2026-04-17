"use client";

/**
 * Card — canonical container primitive for the redesign.
 *
 * Three variants cover the two palette contexts:
 *  • editorial  — beige surface, 1px ink-900 border, sharp corners.
 *                 Landing page sections, use-case tiles.
 *  • surface    — surface-1 bg, subtle inset highlight, rounded-md.
 *                 Analysis workspace default card.
 *  • elevated   — surface-2 bg with shadow-elevated. Flag cards,
 *                 modals, dropdown content.
 *
 * Padding scale (sm 12px / md 20px / lg 28px) is consistent across
 * variants so sections using different card styles still align on a
 * shared rhythm.
 *
 * Legacy Card at components/ui/card.tsx is preserved for in-flight
 * callers. New code should import this primitive.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type CardVariant = "editorial" | "surface" | "elevated";
type Padding = "sm" | "md" | "lg" | "none";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: Padding;
}

const variants: Record<CardVariant, string> = {
  editorial: "bg-beige-50 border border-ink-900 rounded-none",
  surface:
    "bg-surface-1 border border-border/80 rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  elevated: "bg-surface-2 border border-border rounded-md shadow-elevated",
};

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  className,
  variant = "surface",
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(variants[variant], paddings[padding], className)}
      {...props}
    />
  );
}
